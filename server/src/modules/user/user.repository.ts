import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { IUser } from "./types/user.interface";

@Injectable()
export class UserRepository {
  constructor(private readonly db: DatabaseService) {}

  private mapRowToUser(row: any): IUser {
    return {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      username: row.username,
      email: row.email,
      phone: row.phone,
      password: row.password,
      role: row.role,
      active: row.active,
      emailVerified: row.email_verified,
      passwordChangedAt: row.password_changed_at ? new Date(row.password_changed_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  async findById(id: string): Promise<IUser | null> {
    const sql = `
      SELECT id, first_name, last_name, username, email, phone, password, role,
             active, email_verified, password_changed_at, created_at, updated_at
      FROM users
      WHERE id = $1
      LIMIT 1;
    `;
    const row = await this.db.queryOne(sql, [id]);
    return row ? this.mapRowToUser(row) : null;
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const sql = `
      SELECT id, first_name, last_name, username, email, phone, password, role,
             active, email_verified, password_changed_at, created_at, updated_at
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1;
    `;
    const row = await this.db.queryOne(sql, [email]);
    return row ? this.mapRowToUser(row) : null;
  }

  async findByUsernameOrEmail(identifier: string): Promise<IUser | null> {
    const sql = `
      SELECT id, first_name, last_name, username, email, phone, password, role,
             active, email_verified, password_changed_at, created_at, updated_at
      FROM users
      WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)
      LIMIT 1;
    `;
    const row = await this.db.queryOne(sql, [identifier]);
    return row ? this.mapRowToUser(row) : null;
  }

  async create(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    username?: string;
    phone?: string;
    role?: string;
  }): Promise<IUser> {
    const sql = `
      INSERT INTO users (first_name, last_name, email, password, username, phone, role)
      VALUES ($1, $2, LOWER($3), $4, $5, $6, $7)
      RETURNING id, first_name, last_name, username, email, phone, password, role,
                active, email_verified, password_changed_at, created_at, updated_at;
    `;
    const rows = await this.db.query(sql, [
      data.firstName,
      data.lastName,
      data.email,
      data.password,
      data.username || null,
      data.phone || null,
      data.role || "CLIENT",
    ]);
    return this.mapRowToUser(rows[0]);
  }

  async updatePassword(id: string, hashedPassword: string): Promise<boolean> {
    const sql = `
      UPDATE users
      SET password = $1, password_changed_at = NOW(), updated_at = NOW()
      WHERE id = $2;
    `;
    const count = await this.db.execute(sql, [hashedPassword, id]);
    return count > 0;
  }

  async update(
    id: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      username: string;
      phone: string;
      active: boolean;
      emailVerified: boolean;
    }>,
  ): Promise<IUser | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.firstName !== undefined) {
      setClauses.push(`first_name = $${paramIndex++}`);
      values.push(data.firstName);
    }
    if (data.lastName !== undefined) {
      setClauses.push(`last_name = $${paramIndex++}`);
      values.push(data.lastName);
    }
    if (data.username !== undefined) {
      setClauses.push(`username = $${paramIndex++}`);
      values.push(data.username);
    }
    if (data.phone !== undefined) {
      setClauses.push(`phone = $${paramIndex++}`);
      values.push(data.phone);
    }
    if (data.active !== undefined) {
      setClauses.push(`active = $${paramIndex++}`);
      values.push(data.active);
    }
    if (data.emailVerified !== undefined) {
      setClauses.push(`email_verified = $${paramIndex++}`);
      values.push(data.emailVerified);
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `
      UPDATE users
      SET ${setClauses.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING id, first_name, last_name, username, email, phone, password, role,
                active, email_verified, password_changed_at, created_at, updated_at;
    `;

    const row = await this.db.queryOne(sql, values);
    return row ? this.mapRowToUser(row) : null;
  }

  async getUserPrivileges(userId: string): Promise<string[]> {
    const sql = `
      SELECT name FROM admin_privileges WHERE user_id = $1;
    `;
    const rows = await this.db.query<{ name: string }>(sql, [userId]);
    return rows.map((r) => r.name);
  }
}
