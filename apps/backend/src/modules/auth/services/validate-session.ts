import type { Pool } from "mysql2/promise";

import { SessionRepository } from "../repositories/session-repository";

export async function validateSession(pool: Pool, sessionToken: string) {
  const repository = new SessionRepository(pool);
  return repository.findValidSessionByToken(sessionToken);
}
