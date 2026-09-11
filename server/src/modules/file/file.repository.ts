import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { IFile } from "./types/file.interface";

@Injectable()
export class FileRepository {
  constructor(private readonly db: DatabaseService) {}

  private mapRowToFile(row: any): IFile {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      originalName: row.original_name,
      mimetype: row.mimetype,
      path: row.path,
      size: Number(row.size),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  async createFile(data: {
    userId: string;
    name: string;
    originalName: string;
    mimetype: string;
    path: string;
    size: number;
  }): Promise<IFile> {
    const sql = `
      INSERT INTO files (user_id, name, original_name, mimetype, path, size)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, user_id, name, original_name, mimetype, path, size, created_at, updated_at;
    `;
    const rows = await this.db.query(sql, [
      data.userId,
      data.name,
      data.originalName,
      data.mimetype,
      data.path,
      data.size,
    ]);
    return this.mapRowToFile(rows[0]);
  }

  async findById(fileId: string): Promise<IFile | null> {
    const sql = `
      SELECT id, user_id, name, original_name, mimetype, path, size, created_at, updated_at
      FROM files
      WHERE id = $1
      LIMIT 1;
    `;
    const row = await this.db.queryOne(sql, [fileId]);
    return row ? this.mapRowToFile(row) : null;
  }

  async findByUserId(userId: string): Promise<IFile[]> {
    const sql = `
      SELECT id, user_id, name, original_name, mimetype, path, size, created_at, updated_at
      FROM files
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `;
    const rows = await this.db.query(sql, [userId]);
    return rows.map((r) => this.mapRowToFile(r));
  }

  async deleteFile(fileId: string): Promise<boolean> {
    const sql = `
      DELETE FROM files
      WHERE id = $1;
    `;
    const count = await this.db.execute(sql, [fileId]);
    return count > 0;
  }
}
