import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { IIdea, IIdeaIntake, IdeaStatus } from "./types/idea.interface";

@Injectable()
export class IdeaRepository {
  private static instance: IdeaRepository;

  constructor(private readonly db: DatabaseService) {
    IdeaRepository.instance = this;
  }

  static getInstance(): IdeaRepository {
    return IdeaRepository.instance;
  }

  private mapRowToIdea(row: any): IIdea {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      status: row.status as IdeaStatus,
      confirmedAt: row.confirmed_at ? new Date(row.confirmed_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      rawText: row.raw_text || "",
      refinedText: row.refined_text || null,
      businessDescription: row.business_description || null,
      analysisResult: row.analysis_result || null,
    };
  }

  async createIdeaWithIntake(
    userId: string,
    rawText: string,
    title?: string,
  ): Promise<IIdea> {
    return this.db.withTransaction(async (client) => {
      const derivedTitle = title || rawText.slice(0, 60).trim();

      const ideaSql = `
        INSERT INTO ideas (user_id, title, status)
        VALUES ($1, $2, 'draft')
        RETURNING id, user_id, title, status, confirmed_at, created_at, updated_at;
      `;
      const ideaRows = await client.query(ideaSql, [userId, derivedTitle]);
      const idea = ideaRows[0];

      const intakeSql = `
        INSERT INTO idea_intakes (idea_id, raw_text)
        VALUES ($1, $2)
        RETURNING id, idea_id, raw_text, refined_text, business_description, analysis_result, created_at, updated_at;
      `;
      const intakeRows = await client.query(intakeSql, [idea.id, rawText]);
      const intake = intakeRows[0];

      return {
        id: idea.id,
        userId: idea.user_id,
        title: idea.title,
        status: idea.status,
        confirmedAt: idea.confirmed_at,
        createdAt: new Date(idea.created_at),
        updatedAt: new Date(idea.updated_at),
        rawText: intake.raw_text,
        refinedText: intake.refined_text,
        businessDescription: intake.business_description,
        analysisResult: intake.analysis_result,
      };
    });
  }

  async findById(ideaId: string): Promise<IIdea | null> {
    const sql = `
      SELECT i.id, i.user_id, i.title, i.status, i.confirmed_at, i.created_at, i.updated_at,
             k.raw_text, k.refined_text, k.business_description, k.analysis_result
      FROM ideas i
      LEFT JOIN idea_intakes k ON i.id = k.idea_id
      WHERE i.id = $1
      LIMIT 1;
    `;
    const row = await this.db.queryOne(sql, [ideaId]);
    return row ? this.mapRowToIdea(row) : null;
  }

  async getIdeaById(ideaId: string): Promise<IIdea | null> {
    return this.findById(ideaId);
  }

  async findByUserId(userId: string): Promise<IIdea[]> {
    const sql = `
      SELECT i.id, i.user_id, i.title, i.status, i.confirmed_at, i.created_at, i.updated_at,
             k.raw_text, k.refined_text, k.business_description, k.analysis_result
      FROM ideas i
      LEFT JOIN idea_intakes k ON i.id = k.idea_id
      WHERE i.user_id = $1
      ORDER BY i.created_at DESC;
    `;
    const rows = await this.db.query(sql, [userId]);
    return rows.map((r) => this.mapRowToIdea(r));
  }

  async updateStatus(
    ideaId: string,
    status: IdeaStatus,
    confirmedAt?: Date | null,
  ): Promise<IIdea | null> {
    const sql = `
      UPDATE ideas
      SET status = $1, confirmed_at = COALESCE($2, confirmed_at), updated_at = NOW()
      WHERE id = $3
      RETURNING id, user_id, title, status, confirmed_at, created_at, updated_at;
    `;
    await this.db.queryOne(sql, [status, confirmedAt || null, ideaId]);
    return this.findById(ideaId);
  }

  async updateIntake(
    ideaId: string,
    data: Partial<Pick<IIdeaIntake, "refinedText" | "businessDescription" | "analysisResult">>,
  ): Promise<void> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.refinedText !== undefined) {
      setClauses.push(`refined_text = $${paramIndex++}`);
      values.push(data.refinedText);
    }
    if (data.businessDescription !== undefined) {
      setClauses.push(`business_description = $${paramIndex++}`);
      values.push(data.businessDescription);
    }
    if (data.analysisResult !== undefined) {
      setClauses.push(`analysis_result = $${paramIndex++}`);
      values.push(data.analysisResult ? JSON.stringify(data.analysisResult) : null);
    }

    if (setClauses.length === 0) return;

    setClauses.push(`updated_at = NOW()`);
    values.push(ideaId);

    const sql = `
      UPDATE idea_intakes
      SET ${setClauses.join(", ")}
      WHERE idea_id = $${paramIndex};
    `;
    await this.db.execute(sql, values);
  }

  async deleteIdea(ideaId: string): Promise<boolean> {
    const sql = `DELETE FROM ideas WHERE id = $1;`;
    const count = await this.db.execute(sql, [ideaId]);
    return count > 0;
  }
}

export default IdeaRepository;
