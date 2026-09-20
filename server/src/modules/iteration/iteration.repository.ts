import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import {
  IIterationRepository,
  IIterationSession,
  IIterationMessage,
  IIterationSuggestion,
  ICreateIterationSessionData,
  ICreateIterationMessageData,
  ICreateIterationSuggestionData,
} from "./types/IIteration";

@Injectable()
export class IterationRepository implements IIterationRepository {
  private static instance: IterationRepository;

  constructor(private readonly db: DatabaseService) {
    IterationRepository.instance = this;
  }

  public static getInstance(): IterationRepository {
    return IterationRepository.instance;
  }

  async createSession(
    data: ICreateIterationSessionData,
  ): Promise<IIterationSession> {
    const sql = `
      INSERT INTO iteration_sessions (idea_id, status, created_at, updated_at)
      VALUES ($1, 'active', NOW(), NOW())
      ON CONFLICT (idea_id) DO UPDATE
      SET updated_at = NOW()
      RETURNING id, idea_id, status, created_at, updated_at;
    `;
    const row = await this.db.queryOne(sql, [data.ideaId]);
    return {
      id: row.id,
      ideaId: row.idea_id,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      messages: [],
    };
  }

  async getSessionByIdeaId(
    ideaId: string,
  ): Promise<IIterationSession | null> {
    const sessionSql = `
      SELECT id, idea_id, status, created_at, updated_at
      FROM iteration_sessions
      WHERE idea_id = $1
      LIMIT 1;
    `;
    const row = await this.db.queryOne(sessionSql, [ideaId]);
    if (!row) return null;

    const messages = await this.getMessagesBySessionId(row.id);

    return {
      id: row.id,
      ideaId: row.idea_id,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      messages,
    };
  }

  async addMessage(
    data: ICreateIterationMessageData,
  ): Promise<IIterationMessage> {
    const sql = `
      INSERT INTO iteration_messages (session_id, role, content, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id, session_id, role, content, created_at;
    `;
    const row = await this.db.queryOne(sql, [
      data.sessionId,
      data.role,
      data.content,
    ]);

    await this.db.execute(
      `UPDATE iteration_sessions SET updated_at = NOW() WHERE id = $1;`,
      [data.sessionId],
    );

    return {
      id: row.id,
      sessionId: row.session_id,
      role: row.role as "user" | "assistant",
      content: row.content,
      createdAt: new Date(row.created_at),
    };
  }

  async createSuggestion(
    data: ICreateIterationSuggestionData,
  ): Promise<IIterationSuggestion> {
    return this.db.withTransaction(async (client) => {
      const sugSql = `
        INSERT INTO iteration_suggestions (message_id, title, summary, status, created_at, updated_at)
        VALUES ($1, $2, $3, 'pending', NOW(), NOW())
        RETURNING id, message_id, title, summary, status, created_at, updated_at;
      `;
      const sugRows = await client.query(sugSql, [
        data.messageId,
        data.title,
        data.summary,
      ]);
      const sug = sugRows[0];

      const createdActions = [];
      for (const action of data.actions) {
        const actSql = `
          INSERT INTO iteration_suggestion_actions (suggestion_id, module, target_id, action_type, new_content, created_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          RETURNING id, suggestion_id, module, target_id, action_type, new_content, created_at;
        `;
        const actRows = await client.query(actSql, [
          sug.id,
          action.module,
          action.targetId,
          action.actionType,
          action.newContent || null,
        ]);
        const act = actRows[0];
        createdActions.push({
          id: act.id,
          suggestionId: act.suggestion_id,
          module: act.module,
          targetId: act.target_id,
          actionType: act.action_type,
          newContent: act.new_content || undefined,
          createdAt: new Date(act.created_at),
        });
      }

      return {
        id: sug.id,
        messageId: sug.message_id,
        title: sug.title,
        summary: sug.summary,
        status: sug.status,
        createdAt: new Date(sug.created_at),
        updatedAt: new Date(sug.updated_at),
        actions: createdActions,
      };
    });
  }

  async updateSuggestionStatus(
    id: string,
    status: string,
  ): Promise<IIterationSuggestion> {
    const sql = `
      UPDATE iteration_suggestions
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, message_id, title, summary, status, created_at, updated_at;
    `;
    const row = await this.db.queryOne(sql, [status, id]);
    if (!row) throw new Error("Suggestion not found");

    const actionsSql = `
      SELECT id, suggestion_id, module, target_id, action_type, new_content, created_at
      FROM iteration_suggestion_actions
      WHERE suggestion_id = $1;
    `;
    const actionRows = await this.db.query(actionsSql, [id]);

    return {
      id: row.id,
      messageId: row.message_id,
      title: row.title,
      summary: row.summary,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      actions: actionRows.map((a) => ({
        id: a.id,
        suggestionId: a.suggestion_id,
        module: a.module,
        targetId: a.target_id,
        actionType: a.action_type,
        newContent: a.new_content || undefined,
        createdAt: new Date(a.created_at),
      })),
    };
  }

  async getMessagesBySessionId(
    sessionId: string,
  ): Promise<IIterationMessage[]> {
    const msgSql = `
      SELECT id, session_id, role, content, created_at
      FROM iteration_messages
      WHERE session_id = $1
      ORDER BY created_at ASC;
    `;
    const msgRows = await this.db.query(msgSql, [sessionId]);
    if (msgRows.length === 0) return [];

    const messages: IIterationMessage[] = [];
    for (const r of msgRows) {
      const sugSql = `
        SELECT id, message_id, title, summary, status, created_at, updated_at
        FROM iteration_suggestions
        WHERE message_id = $1
        LIMIT 1;
      `;
      const sug = await this.db.queryOne(sugSql, [r.id]);

      let suggestion: IIterationSuggestion | undefined = undefined;
      if (sug) {
        const actSql = `
          SELECT id, suggestion_id, module, target_id, action_type, new_content, created_at
          FROM iteration_suggestion_actions
          WHERE suggestion_id = $1;
        `;
        const actRows = await this.db.query(actSql, [sug.id]);
        suggestion = {
          id: sug.id,
          messageId: sug.message_id,
          title: sug.title,
          summary: sug.summary,
          status: sug.status,
          createdAt: new Date(sug.created_at),
          updatedAt: new Date(sug.updated_at),
          actions: actRows.map((a) => ({
            id: a.id,
            suggestionId: a.suggestion_id,
            module: a.module,
            targetId: a.target_id,
            actionType: a.action_type,
            newContent: a.new_content || undefined,
            createdAt: new Date(a.created_at),
          })),
        };
      }

      messages.push({
        id: r.id,
        sessionId: r.session_id,
        role: r.role as "user" | "assistant",
        content: r.content,
        createdAt: new Date(r.created_at),
        suggestion,
      });
    }

    return messages;
  }

  async getSuggestionById(
    id: string,
  ): Promise<IIterationSuggestion | null> {
    const sql = `
      SELECT id, message_id, title, summary, status, created_at, updated_at
      FROM iteration_suggestions
      WHERE id = $1
      LIMIT 1;
    `;
    const row = await this.db.queryOne(sql, [id]);
    if (!row) return null;

    const actSql = `
      SELECT id, suggestion_id, module, target_id, action_type, new_content, created_at
      FROM iteration_suggestion_actions
      WHERE suggestion_id = $1;
    `;
    const actRows = await this.db.query(actSql, [id]);

    return {
      id: row.id,
      messageId: row.message_id,
      title: row.title,
      summary: row.summary,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      actions: actRows.map((a) => ({
        id: a.id,
        suggestionId: a.suggestion_id,
        module: a.module,
        targetId: a.target_id,
        actionType: a.action_type,
        newContent: a.new_content || undefined,
        createdAt: new Date(a.created_at),
      })),
    };
  }

  async getMessageById(id: string): Promise<IIterationMessage | null> {
    const sql = `
      SELECT id, session_id, role, content, created_at
      FROM iteration_messages
      WHERE id = $1
      LIMIT 1;
    `;
    const row = await this.db.queryOne(sql, [id]);
    if (!row) return null;

    return {
      id: row.id,
      sessionId: row.session_id,
      role: row.role as "user" | "assistant",
      content: row.content,
      createdAt: new Date(row.created_at),
    };
  }

  async getSessionBySessionId(
    id: string,
  ): Promise<IIterationSession | null> {
    const sql = `
      SELECT id, idea_id, status, created_at, updated_at
      FROM iteration_sessions
      WHERE id = $1
      LIMIT 1;
    `;
    const row = await this.db.queryOne(sql, [id]);
    if (!row) return null;

    const messages = await this.getMessagesBySessionId(row.id);

    return {
      id: row.id,
      ideaId: row.idea_id,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      messages,
    };
  }

  async getSessionByMessageId(
    messageId: string,
  ): Promise<IIterationSession | null> {
    const sql = `
      SELECT s.id, s.idea_id, s.status, s.created_at, s.updated_at
      FROM iteration_sessions s
      JOIN iteration_messages m ON m.session_id = s.id
      WHERE m.id = $1
      LIMIT 1;
    `;
    const row = await this.db.queryOne(sql, [messageId]);
    if (!row) return null;

    return {
      id: row.id,
      ideaId: row.idea_id,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export default IterationRepository;
