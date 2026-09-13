import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { ProjectIRSchema } from "./types/ir.types";

export interface IProjectIR {
  id: string;
  ideaId: string;
  version: number;
  schemaData: ProjectIRSchema;
  createdAt: Date;
  updatedAt: Date;
  versions?: IProjectIRVersion[];
}

export interface IProjectIRVersion {
  id: string;
  projectIRId: string;
  version: number;
  schemaData: ProjectIRSchema;
  changelog: string | null;
  createdAt: Date;
}

@Injectable()
export class IRRepository {
  private static instance: IRRepository;

  constructor(private readonly db: DatabaseService) {
    IRRepository.instance = this;
  }

  static getInstance(): IRRepository {
    return IRRepository.instance;
  }

  private parseSchemaData(raw: any): ProjectIRSchema {
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return raw as unknown as ProjectIRSchema;
      }
    }
    return raw as ProjectIRSchema;
  }

  async getIRByIdeaId(ideaId: string): Promise<IProjectIR | null> {
    const sql = `
      SELECT id, idea_id, version, schema_data, created_at, updated_at
      FROM project_ir
      WHERE idea_id = $1
      LIMIT 1;
    `;
    const row = await this.db.queryOne(sql, [ideaId]);
    if (!row) return null;

    const versionsSql = `
      SELECT id, project_ir_id, version, schema_data, changelog, created_at
      FROM project_ir_versions
      WHERE project_ir_id = $1
      ORDER BY version DESC;
    `;
    const verRows = await this.db.query(versionsSql, [row.id]);

    return {
      id: row.id,
      ideaId: row.idea_id,
      version: Number(row.version),
      schemaData: this.parseSchemaData(row.schema_data),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      versions: verRows.map((v) => ({
        id: v.id,
        projectIRId: v.project_ir_id,
        version: Number(v.version),
        schemaData: this.parseSchemaData(v.schema_data),
        changelog: v.changelog || null,
        createdAt: new Date(v.created_at),
      })),
    };
  }

  async createIR(
    ideaId: string,
    schemaData: ProjectIRSchema,
  ): Promise<IProjectIR> {
    return this.db.withTransaction(async (client) => {
      const sql = `
        INSERT INTO project_ir (idea_id, version, schema_data, created_at, updated_at)
        VALUES ($1, 1, $2, NOW(), NOW())
        RETURNING id, idea_id, version, schema_data, created_at, updated_at;
      `;
      const rows = await client.query(sql, [
        ideaId,
        JSON.stringify(schemaData),
      ]);
      const projectIR = rows[0];

      const verSql = `
        INSERT INTO project_ir_versions (project_ir_id, version, schema_data, changelog, created_at)
        VALUES ($1, 1, $2, 'Initial IR generation', NOW())
        RETURNING id, project_ir_id, version, schema_data, changelog, created_at;
      `;
      await client.query(verSql, [
        projectIR.id,
        JSON.stringify(schemaData),
      ]);

      return {
        id: projectIR.id,
        ideaId: projectIR.idea_id,
        version: Number(projectIR.version),
        schemaData: this.parseSchemaData(projectIR.schema_data),
        createdAt: new Date(projectIR.created_at),
        updatedAt: new Date(projectIR.updated_at),
      };
    });
  }

  async updateIR(
    ideaId: string,
    schemaData: ProjectIRSchema,
    changelog?: string,
  ): Promise<IProjectIR> {
    return this.db.withTransaction(async (client) => {
      const existingSql = `
        SELECT id, version
        FROM project_ir
        WHERE idea_id = $1
        LIMIT 1;
      `;
      const existingRows = await client.query(existingSql, [ideaId]);
      if (!existingRows || existingRows.length === 0) {
        throw new Error("Project IR not found");
      }
      const existing = existingRows[0];
      const nextVersion = Number(existing.version) + 1;

      const updateSql = `
        UPDATE project_ir
        SET version = $1, schema_data = $2, updated_at = NOW()
        WHERE idea_id = $3
        RETURNING id, idea_id, version, schema_data, created_at, updated_at;
      `;
      const updatedRows = await client.query(updateSql, [
        nextVersion,
        JSON.stringify(schemaData),
        ideaId,
      ]);
      const updated = updatedRows[0];

      const verSql = `
        INSERT INTO project_ir_versions (project_ir_id, version, schema_data, changelog, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id, project_ir_id, version, schema_data, changelog, created_at;
      `;
      await client.query(verSql, [
        existing.id,
        nextVersion,
        JSON.stringify(schemaData),
        changelog || "IR modified manually",
      ]);

      return {
        id: updated.id,
        ideaId: updated.idea_id,
        version: Number(updated.version),
        schemaData: this.parseSchemaData(updated.schema_data),
        createdAt: new Date(updated.created_at),
        updatedAt: new Date(updated.updated_at),
      };
    });
  }

  async getIRVersion(
    projectIRId: string,
    version: number,
  ): Promise<IProjectIRVersion | null> {
    const sql = `
      SELECT id, project_ir_id, version, schema_data, changelog, created_at
      FROM project_ir_versions
      WHERE project_ir_id = $1 AND version = $2
      LIMIT 1;
    `;
    const row = await this.db.queryOne(sql, [projectIRId, version]);
    if (!row) return null;

    return {
      id: row.id,
      projectIRId: row.project_ir_id,
      version: Number(row.version),
      schemaData: this.parseSchemaData(row.schema_data),
      changelog: row.changelog || null,
      createdAt: new Date(row.created_at),
    };
  }
}

export default IRRepository;
