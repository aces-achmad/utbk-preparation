import type { Pool } from "mysql2/promise";

import type { Logger } from "../../../lib/logger";
import { SessionRepository } from "../repositories/session-repository";

type LogoutAdminOptions = {
  pool: Pool;
  logger: Logger;
  sessionToken: string;
};

export async function logoutAdmin({ pool, logger, sessionToken }: LogoutAdminOptions) {
  const repository = new SessionRepository(pool);

  await repository.revokeSessionByToken(sessionToken);

  logger.info("auth.logout.revoked_session", {
    sessionTokenPreview: sessionToken.slice(0, 8),
  });
}
