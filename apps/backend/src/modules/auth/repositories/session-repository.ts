import type { Pool, RowDataPacket } from "mysql2/promise";

export type SessionRecord = RowDataPacket & {
  id: number;
  admin_user_id: number;
  session_token: string;
  expires_at: Date;
  revoked_at: Date | null;
};

export class SessionRepository {
  constructor(private readonly pool: Pool) {}

  async findValidSessionByToken(sessionToken: string) {
    const [rows] = await this.pool.query<SessionRecord[]>(
      `
        SELECT id, admin_user_id, session_token, expires_at, revoked_at
        FROM auth_sessions
        WHERE session_token = ?
          AND revoked_at IS NULL
          AND expires_at > CURRENT_TIMESTAMP
        LIMIT 1
      `,
      [sessionToken],
    );

    return rows[0] ?? null;
  }

  async revokeSessionByToken(sessionToken: string) {
    await this.pool.query(
      `
        UPDATE auth_sessions
        SET revoked_at = CURRENT_TIMESTAMP
        WHERE session_token = ?
          AND revoked_at IS NULL
      `,
      [sessionToken],
    );
  }
}
