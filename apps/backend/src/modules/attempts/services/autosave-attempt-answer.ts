import type { Pool } from "mysql2/promise";

import type { Logger } from "../../../lib/logger";
import { AttemptRepository } from "../repositories/attempt-repository";

export async function autosaveAttemptAnswer({
  pool,
  logger,
  attemptId,
  snapshotId,
  selectedOptionKeys,
}: {
  pool: Pool;
  logger: Logger;
  attemptId: number;
  snapshotId: number;
  selectedOptionKeys: string[];
}) {
  const repository = new AttemptRepository(pool);
  const attempt = await repository.findById(attemptId);

  if (!attempt) {
    throw new Error("Attempt not found.");
  }

  if (attempt.status === "submitted") {
    throw new Error("Attempt already submitted; autosave is no longer allowed.");
  }

  const snapshot = await repository.findSnapshotById(snapshotId);

  if (!snapshot || snapshot.attemptId !== attemptId) {
    throw new Error("Attempt snapshot not found.");
  }

  const allowedOptionKeys = new Set(snapshot.optionsSnapshot.map((option) => option.option_key));

  for (const key of selectedOptionKeys) {
    if (!allowedOptionKeys.has(key)) {
      throw new Error("Selected option keys must exist in the attempt snapshot.");
    }
  }

  await repository.upsertAnswer({
    attemptId,
    snapshotId,
    selectedOptionKeys,
  });

  logger.info("attempts.autosaved_answer", {
    attemptId,
    snapshotId,
    selectedOptionCount: selectedOptionKeys.length,
  });

  return {
    attemptId,
    snapshotId,
    selectedOptionKeys,
    syncState: "saved" as const,
  };
}
