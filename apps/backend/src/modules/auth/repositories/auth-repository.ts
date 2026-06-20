import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";

export type AdminUserRecord = RowDataPacket & {
  id: number;
  username: string;
  password_hash: string;
};

export class AuthRepository {
  constructor(private readonly pool: Pool) {}

  async findAdminByUsername(username: string) {
    const [rows] = await this.pool.query<AdminUserRecord[]>(
      "SELECT id, username, password_hash FROM admin_users WHERE username = ? LIMIT 1",
      [username],
    );

    return rows[0] ?? null;
  }

  async findAdminById(id: number) {
    const [rows] = await this.pool.query<AdminUserRecord[]>(
      "SELECT id, username, password_hash FROM admin_users WHERE id = ? LIMIT 1",
      [id],
    );

    return rows[0] ?? null;
  }

  async createSession(adminUserId: number, sessionToken: string, expiresAt: Date) {
    const [result] = await this.pool.query<ResultSetHeader>(
      "INSERT INTO auth_sessions (admin_user_id, session_token, expires_at) VALUES (?, ?, ?)",
      [adminUserId, sessionToken, expiresAt],
    );

    return result.insertId;
  }

  async updatePasswordHash(adminUserId: number, passwordHash: string) {
    await this.pool.query("UPDATE admin_users SET password_hash = ? WHERE id = ?", [
      passwordHash,
      adminUserId,
    ]);
  }
}
