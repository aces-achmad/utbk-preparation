import type { Pool } from "mysql2/promise";

import { AttemptRepository } from "../repositories/attempt-repository";
import { buildAttemptResultPayload } from "./attempt-result";

export async function getAttemptResult({
  pool,
  attemptId,
}: {
  pool: Pool;
  attemptId: number;
}) {
  const repository = new AttemptRepository(pool);
  const attempt = await repository.findById(attemptId);

  if (!attempt) {
    throw new Error("Attempt not found.");
  }

  if (attempt.status !== "submitted") {
    throw new Error("Attempt has not been submitted yet.");
  }

  const snapshots = await repository.listSnapshots(attemptId);

  return buildAttemptResultPayload({
    attempt,
    snapshots,
  });
}
