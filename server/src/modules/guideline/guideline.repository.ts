import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { IGuideline } from "./types/guideline.interface";

@Injectable()
export class GuidelineRepository {
  constructor(private readonly db: DatabaseService) {}

  private mapRowToGuideline(row: any): IGuideline {
    return {
      id: row.id,
      userId: row.user_id,
      fileId: row.file_id,
      title: row.title,
      content: row.content,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      file: row.file_name
        ? {
            id: row.file_id,
            userId: row.user_id,
            name: row.file_name,
            originalName: row.file_original_name,
            mimetype: row.file_mimetype,
            path: row.file_path,
            size: Number(row.file_size),
            createdAt: new Date(row.file_created_at),
            updatedAt: new Date(row.file_updated_at),
          }
        : null,
    };
  }

  async createGuideline(data: {
    userId: string;
    fileId?: string | null;
    title: string;
    content: string;
  }): Promise<IGuideline> {
    const sql = `
      INSERT INTO guidelines (user_id, file_id, title, content)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, file_id, title, content, created_at, updated_at;
    `;
    const rows = await this.db.query(sql, [
      data.userId,
      data.fileId || null,
      data.title,
      data.content,
    ]);
    return this.mapRowToGuideline(rows[0]);
  }

  async findById(guidelineId: string): Promise<IGuideline | null> {
    const sql = `
      SELECT g.id, g.user_id, g.file_id, g.title, g.content, g.created_at, g.updated_at,
             f.name AS file_name, f.original_name AS file_original_name,
             f.mimetype AS file_mimetype, f.path AS file_path, f.size AS file_size,
             f.created_at AS file_created_at, f.updated_at AS file_updated_at
      FROM guidelines g
      LEFT JOIN files f ON g.file_id = f.id
      WHERE g.id = $1
      LIMIT 1;
    `;
    const row = await this.db.queryOne(sql, [guidelineId]);
    return row ? this.mapRowToGuideline(row) : null;
  }

  async listByUserId(userId: string): Promise<IGuideline[]> {
    const sql = `
      SELECT g.id, g.user_id, g.file_id, g.title, g.content, g.created_at, g.updated_at,
             f.name AS file_name, f.original_name AS file_original_name,
             f.mimetype AS file_mimetype, f.path AS file_path, f.size AS file_size,
             f.created_at AS file_created_at, f.updated_at AS file_updated_at
      FROM guidelines g
      LEFT JOIN files f ON g.file_id = f.id
      WHERE g.user_id = $1
      ORDER BY g.created_at DESC;
    `;
    const rows = await this.db.query(sql, [userId]);
    return rows.map((r) => this.mapRowToGuideline(r));
  }

  async deleteGuideline(guidelineId: string): Promise<boolean> {
    const sql = `
      DELETE FROM guidelines
      WHERE id = $1;
    `;
    const count = await this.db.execute(sql, [guidelineId]);
    return count > 0;
  }
}
