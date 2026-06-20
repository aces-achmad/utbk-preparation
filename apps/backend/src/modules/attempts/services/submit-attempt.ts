import type { Pool } from "mysql2/promise";

import type { Logger } from "../../../lib/logger";
import { AttemptRepository } from "../repositories/attempt-repository";
import { buildAttemptResultPayload, calculateScorePercentage } from "./attempt-result";

export async function submitAttempt({
  pool,
  logger,
  attemptId,
}: {
  pool: Pool;
  logger: Logger;
  attemptId: number;
}) {
  const repository = new AttemptRepository(pool);
  const attempt = await repository.findById(attemptId);

  if (!attempt) {
    throw new Error("Attempt not found.");
  }

  const snapshots = await repository.listSnapshots(attemptId);

  if (attempt.status === "submitted") {
    return buildAttemptResultPayload({
      attempt,
      snapshots,
    });
  }

  const summary = snapshots.reduce(
    (result, snapshot) => {
      const selectedOptionKeys = Array.from(new Set(snapshot.selectedOptionKeys)).sort();
      const correctOptionKeys = snapshot.optionsSnapshot
        .filter((option) => option.is_correct)
        .map((option) => option.option_key)
        .sort();

      if (selectedOptionKeys.length === 0) {
        result.unansweredCount += 1;
        return result;
      }

      const isCorrect =
        selectedOptionKeys.length === correctOptionKeys.length &&
        selectedOptionKeys.every((value, index) => value === correctOptionKeys[index]);

      if (isCorrect) {
        result.correctCount += 1;
      } else {
        result.incorrectCount += 1;
      }

      return result;
    },
    {
      correctCount: 0,
      incorrectCount: 0,
      unansweredCount: 0,
    },
  );

  const finalized = await repository.finalizeAttempt({
    attemptId,
    correctCount: summary.correctCount,
    incorrectCount: summary.incorrectCount,
    unansweredCount: summary.unansweredCount,
    scorePercentage: calculateScorePercentage(summary.correctCount, attempt.questionCount),
  });

  const finalizedAttempt = finalized.attempt;

  if (!finalizedAttempt) {
    throw new Error("Attempt not found.");
  }

  logger.info("attempts.submitted", {
    attemptId,
    correctCount: finalizedAttempt.correctCount,
    incorrectCount: finalizedAttempt.incorrectCount,
    unansweredCount: finalizedAttempt.unansweredCount,
    scorePercentage: finalizedAttempt.scorePercentage,
  });

  return buildAttemptResultPayload({
    attempt: finalizedAttempt,
    snapshots,
  });
}
