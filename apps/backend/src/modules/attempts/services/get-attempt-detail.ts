import type { Pool } from "mysql2/promise";

import { AttemptRepository } from "../repositories/attempt-repository";

export async function getAttemptDetail({
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

  const snapshots = await repository.listSnapshots(attemptId);

  return {
    attempt: {
      id: attempt.id,
      packageSlug: attempt.packageSlug,
      status: attempt.status,
      questionCount: attempt.questionCount,
    },
    snapshots: snapshots.map((snapshot) => ({
      snapshotId: snapshot.id,
      questionOrder: snapshot.questionOrder,
      questionExternalId: snapshot.questionExternalId,
      subjectLabel: snapshot.subjectLabelSnapshot,
      topicLabel: snapshot.topicLabelSnapshot,
      difficulty: snapshot.difficultySnapshot,
      type: snapshot.typeSnapshot,
      questionText: snapshot.questionTextSnapshot,
      explanationText: snapshot.explanationTextSnapshot,
      options: snapshot.optionsSnapshot,
      selectedOptionKeys: snapshot.selectedOptionKeys,
    })),
  };
}
