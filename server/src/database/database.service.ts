import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool, PoolClient, QueryResultRow } from "pg";
import { ISqlExecutor, QueryParams, TransactionCallback } from "./types";

@Injectable()
export class DatabaseService
  implements ISqlExecutor, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DatabaseService.name);
  private pool!: Pool;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const connectionString =
      this.configService.get<string>("DATABASE_URL") ||
      process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        "DATABASE_URL environment variable is not defined for DatabaseService",
      );
    }

    this.pool = new Pool({
      connectionString,
      max: Number(process.env.DB_POOL_MAX || 20),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.pool.on("error", (err: Error) => {
      this.logger.error("Unexpected error on idle PostgreSQL client", err.stack);
    });

    try {
      const client = await this.pool.connect();
      client.release();
      this.logger.log("PostgreSQL connection pool initialized successfully");
    } catch (err: any) {
      this.logger.error(
        "Failed to connect to PostgreSQL database",
        err?.stack || err,
      );
      throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.logger.log("PostgreSQL connection pool drained and destroyed");
    }
  }

  /**
   * Execute a parameterized SQL query returning all matching rows.
   */
  async query<T extends QueryResultRow = any>(
    sql: string,
    params: QueryParams = [],
  ): Promise<T[]> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(sql, params);
      const duration = Date.now() - start;
      if (duration > 500) {
        this.logger.warn(`Slow query (${duration}ms): ${sql}`);
      }
      return result.rows;
    } catch (err: any) {
      this.logger.error(`Database query failed: ${err.message}`, {
        sql,
        params,
        stack: err.stack,
      });
      throw err;
    }
  }

  /**
   * Execute a parameterized SQL query returning the first matching row or null.
   */
  async queryOne<T extends QueryResultRow = any>(
    sql: string,
    params: QueryParams = [],
  ): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Execute a parameterized SQL mutation (INSERT, UPDATE, DELETE) returning affected row count.
   */
  async execute(sql: string, params: QueryParams = []): Promise<number> {
    const start = Date.now();
    try {
      const result = await this.pool.query(sql, params);
      const duration = Date.now() - start;
      if (duration > 500) {
        this.logger.warn(`Slow execute (${duration}ms): ${sql}`);
      }
      return result.rowCount ?? 0;
    } catch (err: any) {
      this.logger.error(`Database execute failed: ${err.message}`, {
        sql,
        params,
        stack: err.stack,
      });
      throw err;
    }
  }

  /**
   * Run operations inside an atomic PostgreSQL transaction.
   * Commits on success, automatically rolls back on thrown exceptions.
   */
  async withTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const txExecutor: ISqlExecutor & { rawClient: PoolClient } = {
        rawClient: client,
        query: async <R extends QueryResultRow = any>(
          sql: string,
          params: QueryParams = [],
        ): Promise<R[]> => {
          const res = await client.query<R>(sql, params);
          return res.rows;
        },
        queryOne: async <R extends QueryResultRow = any>(
          sql: string,
          params: QueryParams = [],
        ): Promise<R | null> => {
          const res = await client.query<R>(sql, params);
          return res.rows.length > 0 ? res.rows[0] : null;
        },
        execute: async (
          sql: string,
          params: QueryParams = [],
        ): Promise<number> => {
          const res = await client.query(sql, params);
          return res.rowCount ?? 0;
        },
      };

      const result = await callback(txExecutor);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}
