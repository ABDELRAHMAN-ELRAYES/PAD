import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import {
  IDocument,
  IDocumentVersion,
  ICreateDocumentData,
  IUpdateDocumentData,
  IDocumentWithVersions,
  DocumentType,
  DocumentStatus,
} from "./types/IDocument";

@Injectable()
export class DocumentRepository {
  private static instance: DocumentRepository;

  constructor(private readonly db: DatabaseService) {
    DocumentRepository.instance = this;
  }

  static getInstance(): DocumentRepository {
    return DocumentRepository.instance;
  }

  private mapRowToDocument(row: any): IDocument {
    return {
      id: row.id,
      ideaId: row.idea_id,
      type: row.type as DocumentType,
      title: row.title,
      content: row.content || "",
      status: (row.status || "draft") as DocumentStatus,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapRowToVersion(row: any): IDocumentVersion {
    return {
      id: row.id,
      documentId: row.document_id,
      version: Number(row.version),
      content: row.content || "",
      changelog: row.changelog || null,
      createdAt: new Date(row.created_at),
    };
  }

  async createDocument(data: ICreateDocumentData): Promise<IDocument> {
    const sql = `
      INSERT INTO documents (idea_id, type, title, content, status, current_version, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'draft', 1, NOW(), NOW())
      RETURNING id, idea_id, type, title, content, status, current_version, created_at, updated_at;
    `;
    const row = await this.db.queryOne(sql, [
      data.ideaId,
      data.type,
      data.title,
      data.content || "",
    ]);
    return this.mapRowToDocument(row);
  }

  async getDocumentById(id: string): Promise<IDocument | null> {
    const sql = `
      SELECT id, idea_id, type, title, content, status, current_version, created_at, updated_at
      FROM documents
      WHERE id = $1
      LIMIT 1;
    `;
    const row = await this.db.queryOne(sql, [id]);
    return row ? this.mapRowToDocument(row) : null;
  }

  async getDocumentWithVersions(id: string): Promise<IDocumentWithVersions | null> {
    const doc = await this.getDocumentById(id);
    if (!doc) return null;

    const versions = await this.getVersionHistory(id);
    return {
      ...doc,
      versions,
    };
  }

  async getDocumentsByIdeaId(ideaId: string): Promise<IDocument[]> {
    const sql = `
      SELECT id, idea_id, type, title, content, status, current_version, created_at, updated_at
      FROM documents
      WHERE idea_id = $1
      ORDER BY created_at DESC;
    `;
    const rows = await this.db.query(sql, [ideaId]);
    return rows.map((r) => this.mapRowToDocument(r));
  }

  async updateDocument(
    id: string,
    data: IUpdateDocumentData,
  ): Promise<IDocument> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.title !== undefined) {
      setClauses.push(`title = $${idx++}`);
      values.push(data.title);
    }
    if (data.content !== undefined) {
      setClauses.push(`content = $${idx++}`);
      values.push(data.content);
    }
    if (data.status !== undefined) {
      setClauses.push(`status = $${idx++}`);
      values.push(data.status);
    }

    if (setClauses.length === 0) {
      const existing = await this.getDocumentById(id);
      if (!existing) throw new Error("Document not found");
      return existing;
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `
      UPDATE documents
      SET ${setClauses.join(", ")}
      WHERE id = $${idx}
      RETURNING id, idea_id, type, title, content, status, current_version, created_at, updated_at;
    `;
    const row = await this.db.queryOne(sql, values);
    return this.mapRowToDocument(row);
  }

  async createVersion(
    documentId: string,
    version: number,
    content: string,
    changelog?: string,
  ): Promise<IDocumentVersion> {
    const sql = `
      INSERT INTO document_versions (document_id, version, content, changelog, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (document_id, version) DO UPDATE
      SET content = EXCLUDED.content, changelog = EXCLUDED.changelog
      RETURNING id, document_id, version, content, changelog, created_at;
    `;
    const row = await this.db.queryOne(sql, [
      documentId,
      version,
      content,
      changelog || null,
    ]);

    await this.db.execute(
      `UPDATE documents SET current_version = $1, updated_at = NOW() WHERE id = $2;`,
      [version, documentId],
    );

    return this.mapRowToVersion(row);
  }

  async getVersionHistory(documentId: string): Promise<IDocumentVersion[]> {
    const sql = `
      SELECT id, document_id, version, content, changelog, created_at
      FROM document_versions
      WHERE document_id = $1
      ORDER BY version DESC;
    `;
    const rows = await this.db.query(sql, [documentId]);
    return rows.map((r) => this.mapRowToVersion(r));
  }

  async getVersion(
    documentId: string,
    version: number,
  ): Promise<IDocumentVersion | null> {
    const sql = `
      SELECT id, document_id, version, content, changelog, created_at
      FROM document_versions
      WHERE document_id = $1 AND version = $2
      LIMIT 1;
    `;
    const row = await this.db.queryOne(sql, [documentId, version]);
    return row ? this.mapRowToVersion(row) : null;
  }

  async getLatestVersionNumber(documentId: string): Promise<number> {
    const sql = `
      SELECT COALESCE(MAX(version), 0) AS max_ver
      FROM document_versions
      WHERE document_id = $1;
    `;
    const row = await this.db.queryOne(sql, [documentId]);
    return Number(row?.max_ver || 0);
  }

  async deleteDocument(id: string): Promise<void> {
    const sql = `DELETE FROM documents WHERE id = $1;`;
    await this.db.execute(sql, [id]);
  }
}

export default DocumentRepository;
