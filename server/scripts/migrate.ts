import * as fs from "fs";
import * as path from "path";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const MIGRATIONS_DIR = path.resolve(__dirname, "../migrations");

interface MigrationFile {
  version: number;
  name: string;
  upFile: string;
  downFile: string;
}

function getMigrationFiles(): MigrationFile[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }
  const files = fs.readdirSync(MIGRATIONS_DIR);
  const upFiles = files.filter((f) => f.endsWith(".up.sql"));
  const migrations: MigrationFile[] = [];

  for (const up of upFiles) {
    const match = up.match(/^(\d+)_(.+)\.up\.sql$/);
    if (!match) continue;
    const version = parseInt(match[1], 10);
    const name = match[2];
    const down = `${match[1]}_${name}.down.sql`;
    migrations.push({
      version,
      name,
      upFile: path.join(MIGRATIONS_DIR, up),
      downFile: path.join(MIGRATIONS_DIR, down),
    });
  }

  return migrations.sort((a, b) => a.version - b.version);
}

async function ensureSchemaMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version BIGINT NOT NULL,
      dirty BOOLEAN NOT NULL DEFAULT FALSE,
      PRIMARY KEY (version)
    );
  `);
}

async function getCurrentVersion(): Promise<{ version: number; dirty: boolean } | null> {
  await ensureSchemaMigrationsTable();
  const res = await pool.query(`
    SELECT version, dirty FROM schema_migrations ORDER BY version DESC LIMIT 1;
  `);
  if (res.rows.length === 0) return null;
  return {
    version: Number(res.rows[0].version),
    dirty: Boolean(res.rows[0].dirty),
  };
}

async function migrateUp(): Promise<void> {
  const current = await getCurrentVersion();
  if (current?.dirty) {
    console.error(`❌ Migration state is dirty at version ${current.version}. Resolve manual issue first.`);
    process.exit(1);
  }

  const currentVersion = current ? current.version : 0;
  const migrations = getMigrationFiles().filter((m) => m.version > currentVersion);

  if (migrations.length === 0) {
    console.log(`✅ Database is already up to date at version ${currentVersion}.`);
    return;
  }

  console.log(`🚀 Applying ${migrations.length} pending migration(s)...`);

  for (const m of migrations) {
    console.log(`Applying [UP] ${m.version}: ${m.name}`);
    const sql = fs.readFileSync(m.upFile, "utf8");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO schema_migrations (version, dirty) VALUES ($1, true)
         ON CONFLICT (version) DO UPDATE SET dirty = true;`,
        [m.version]
      );
      await client.query(sql);
      await client.query(`UPDATE schema_migrations SET dirty = false WHERE version = $1;`, [m.version]);
      await client.query("COMMIT");
      console.log(`✔ Applied ${m.version}: ${m.name}`);
    } catch (err: any) {
      await client.query("ROLLBACK");
      console.error(`❌ Migration failed at ${m.version}: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log(`🎉 All migrations applied successfully!`);
}

async function migrateDown(): Promise<void> {
  const current = await getCurrentVersion();
  if (!current || current.version === 0) {
    console.log(`Database has no applied migrations.`);
    return;
  }

  const migrations = getMigrationFiles();
  const lastMigration = migrations.find((m) => m.version === current.version);

  if (!lastMigration) {
    console.error(`❌ Could not find migration file for version ${current.version}`);
    process.exit(1);
  }

  console.log(`Reverting [DOWN] ${lastMigration.version}: ${lastMigration.name}`);
  const sql = fs.readFileSync(lastMigration.downFile, "utf8");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (sql.trim().length > 0) {
      await client.query(sql);
    }
    await client.query(`DELETE FROM schema_migrations WHERE version = $1;`, [lastMigration.version]);
    await client.query("COMMIT");
    console.log(`✔ Reverted ${lastMigration.version}: ${lastMigration.name}`);
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error(`❌ Rollback failed at ${lastMigration.version}: ${err.message}`);
    throw err;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  const action = process.argv[2] || "up";
  try {
    if (action === "up") {
      await migrateUp();
    } else if (action === "down") {
      await migrateDown();
    } else if (action === "status" || action === "version") {
      const current = await getCurrentVersion();
      console.log(`Current migration version: ${current ? current.version : 0} (dirty: ${current?.dirty ?? false})`);
    } else {
      console.log(`Usage: tsx scripts/migrate.ts [up|down|status|version]`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
