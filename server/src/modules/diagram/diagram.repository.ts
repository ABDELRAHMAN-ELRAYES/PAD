import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import {
  IDiagram,
  IDiagramVersion,
  IDiagramWithVersions,
  ICreateDiagramRepositoryData,
  IUpdateDiagramRepositoryData,
  DiagramType,
  DiagramStatus,
} from "./types/IDiagram";

@Injectable()
export class DiagramRepository {
  private static instance: DiagramRepository;

  constructor(private readonly db: DatabaseService) {
    DiagramRepository.instance = this;
  }

  static getInstance(): DiagramRepository {
    return DiagramRepository.instance;
  }

  private mapRowToDiagram(row: any): IDiagram {
    return {
      id: row.id,
      ideaId: row.idea_id,
      type: row.type as DiagramType,
      title: row.title,
      mermaidCode: row.mermaid_code || "",
      status: (row.status || "draft") as DiagramStatus,
      tier1Code: row.tier1_code || null,
      tier2Code: row.tier2_code || null,
      tier3Code: row.tier3_code || null,
      activeTier: row.active_tier !== null && row.active_tier !== undefined ? Number(row.active_tier) : null,
      validationError: row.validation_error || null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapRowToVersion(row: any): IDiagramVersion {
    return {
      id: row.id,
      diagramId: row.diagram_id,
      version: Number(row.version),
      mermaidCode: row.mermaid_code || "",
      changelog: row.changelog || null,
      createdAt: new Date(row.created_at),
    };
  }

  async createDiagram(data: ICreateDiagramRepositoryData): Promise<IDiagram> {
    const sql = `
      INSERT INTO diagrams (
        idea_id, type, title, mermaid_code, status,
        tier1_code, tier2_code, tier3_code, active_tier, validation_error,
        current_version, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7, $8, $9, 1, NOW(), NOW())
      RETURNING
        id, idea_id, type, title, mermaid_code, status,
        tier1_code, tier2_code, tier3_code, active_tier, validation_error,
        current_version, created_at, updated_at;
    `;
    const row = await this.db.queryOne(sql, [
      data.ideaId,
      data.type,
      data.title,
      data.mermaidCode || "",
      data.tier1Code || null,
      data.tier2Code || null,
      data.tier3Code || null,
      data.activeTier || null,
      data.validationError || null,
    ]);
    return this.mapRowToDiagram(row);
  }

  async getDiagramById(id: string): Promise<IDiagram | null> {
    const sql = `
      SELECT
        id, idea_id, type, title, mermaid_code, status,
        tier1_code, tier2_code, tier3_code, active_tier, validation_error,
        current_version, created_at, updated_at
      FROM diagrams
      WHERE id = $1
      LIMIT 1;
    `;
    const row = await this.db.queryOne(sql, [id]);
    return row ? this.mapRowToDiagram(row) : null;
  }

  async getDiagramWithVersions(id: string): Promise<IDiagramWithVersions | null> {
    const diagram = await this.getDiagramById(id);
    if (!diagram) return null;

    const versions = await this.getVersionsByDiagramId(id);
    return {
      ...diagram,
      versions,
    };
  }

  async getDiagramsByIdeaId(ideaId: string): Promise<IDiagram[]> {
    const sql = `
      SELECT
        id, idea_id, type, title, mermaid_code, status,
        tier1_code, tier2_code, tier3_code, active_tier, validation_error,
        current_version, created_at, updated_at
      FROM diagrams
      WHERE idea_id = $1
      ORDER BY created_at DESC;
    `;
    const rows = await this.db.query(sql, [ideaId]);
    return rows.map((r) => this.mapRowToDiagram(r));
  }

  async updateDiagram(
    id: string,
    data: IUpdateDiagramRepositoryData,
  ): Promise<IDiagram> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.title !== undefined) {
      setClauses.push(`title = $${idx++}`);
      values.push(data.title);
    }
    if (data.mermaidCode !== undefined) {
      setClauses.push(`mermaid_code = $${idx++}`);
      values.push(data.mermaidCode);
    }
    if (data.status !== undefined) {
      setClauses.push(`status = $${idx++}`);
      values.push(data.status);
    }
    if (data.tier1Code !== undefined) {
      setClauses.push(`tier1_code = $${idx++}`);
      values.push(data.tier1Code);
    }
    if (data.tier2Code !== undefined) {
      setClauses.push(`tier2_code = $${idx++}`);
      values.push(data.tier2Code);
    }
    if (data.tier3Code !== undefined) {
      setClauses.push(`tier3_code = $${idx++}`);
      values.push(data.tier3Code);
    }
    if (data.activeTier !== undefined) {
      setClauses.push(`active_tier = $${idx++}`);
      values.push(data.activeTier);
    }
    if (data.validationError !== undefined) {
      setClauses.push(`validation_error = $${idx++}`);
      values.push(data.validationError);
    }

    if (setClauses.length === 0) {
      const existing = await this.getDiagramById(id);
      if (!existing) throw new Error("Diagram not found");
      return existing;
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `
      UPDATE diagrams
      SET ${setClauses.join(", ")}
      WHERE id = $${idx}
      RETURNING
        id, idea_id, type, title, mermaid_code, status,
        tier1_code, tier2_code, tier3_code, active_tier, validation_error,
        current_version, created_at, updated_at;
    `;
    const row = await this.db.queryOne(sql, values);
    return this.mapRowToDiagram(row);
  }

  async createVersion(
    diagramId: string,
    mermaidCode: string,
    changelog?: string,
  ): Promise<IDiagramVersion> {
    const nextVerSql = `
      SELECT COALESCE(MAX(version), 0) + 1 AS next_ver
      FROM diagram_versions
      WHERE diagram_id = $1;
    `;
    const nextRow = await this.db.queryOne(nextVerSql, [diagramId]);
    const nextVersion = Number(nextRow?.next_ver || 1);

    const sql = `
      INSERT INTO diagram_versions (diagram_id, version, mermaid_code, changelog, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, diagram_id, version, mermaid_code, changelog, created_at;
    `;
    const row = await this.db.queryOne(sql, [
      diagramId,
      nextVersion,
      mermaidCode,
      changelog || null,
    ]);

    await this.db.execute(
      `UPDATE diagrams SET current_version = $1, updated_at = NOW() WHERE id = $2;`,
      [nextVersion, diagramId],
    );

    return this.mapRowToVersion(row);
  }

  async getVersionsByDiagramId(diagramId: string): Promise<IDiagramVersion[]> {
    const sql = `
      SELECT id, diagram_id, version, mermaid_code, changelog, created_at
      FROM diagram_versions
      WHERE diagram_id = $1
      ORDER BY version DESC;
    `;
    const rows = await this.db.query(sql, [diagramId]);
    return rows.map((r) => this.mapRowToVersion(r));
  }

  async deleteDiagram(id: string): Promise<void> {
    const sql = `DELETE FROM diagrams WHERE id = $1;`;
    await this.db.execute(sql, [id]);
  }
}

export default DiagramRepository;
