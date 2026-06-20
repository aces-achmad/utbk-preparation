import { describe, expect, it } from "vitest";

import { getTestPool } from "../../lib/testing/test-database";
import { testLogger } from "../../lib/testing/test-logger";
import { autosaveAttemptAnswer } from "../../modules/attempts/services/autosave-attempt-answer";
import { getAttemptResult } from "../../modules/attempts/services/get-attempt-result";
import { startOrResumeAttempt } from "../../modules/attempts/services/start-or-resume-attempt";
import { submitAttempt } from "../../modules/attempts/services/submit-attempt";
import { createQuestion, publishQuestion } from "../../modules/questions/services/question-authoring";
import { createPackage, publishPackage, setPackageComposition } from "../../modules/packages/services/package-authoring";
import { createSubject } from "../../modules/subjects/services/subject-authoring";
import { createTopic } from "../../modules/topics/services/topic-authoring";

async function seedScoringPackage() {
  const pool = await getTestPool();

  await createSubject({
    pool,
    logger: testLogger,
    slug: "tps",
    label: "TPS",
    displayOrder: 1,
  });
  await createTopic({
    pool,
    logger: testLogger,
    slug: "penalaran-umum",
    subjectSlug: "tps",
    label: "Penalaran Umum",
    displayOrder: 1,
  });

  const first = await createQuestion({
    pool,
    logger: testLogger,
    input: {
      topicSlug: "penalaran-umum",
      type: "single_choice",
      difficulty: "easy",
      questionText: "Soal benar",
      explanationText: "Pembahasan benar",
      options: [
        { option_key: "A", option_text: "A1", is_correct: true },
        { option_key: "B", option_text: "B1", is_correct: false },
      ],
    },
  });
  const second = await createQuestion({
    pool,
    logger: testLogger,
    input: {
      topicSlug: "penalaran-umum",
      type: "multiple_response",
      difficulty: "medium",
      questionText: "Soal salah",
      explanationText: "Pembahasan salah",
      options: [
        { option_key: "A", option_text: "A2", is_correct: true },
        { option_key: "B", option_text: "B2", is_correct: true },
        { option_key: "C", option_text: "C2", is_correct: false },
      ],
    },
  });
  const third = await createQuestion({
    pool,
    logger: testLogger,
    input: {
      topicSlug: "penalaran-umum",
      type: "single_choice",
      difficulty: "hard",
      questionText: "Soal kosong",
      explanationText: "Pembahasan kosong",
      options: [
        { option_key: "A", option_text: "A3", is_correct: false },
        { option_key: "B", option_text: "B3", is_correct: true },
      ],
    },
  });

  await publishQuestion({ pool, logger: testLogger, externalId: first!.externalId });
  await publishQuestion({ pool, logger: testLogger, externalId: second!.externalId });
  await publishQuestion({ pool, logger: testLogger, externalId: third!.externalId });

  await createPackage({
    pool,
    logger: testLogger,
    slug: "paket-scoring",
    name: "Paket Scoring",
  });
  await setPackageComposition({
    pool,
    logger: testLogger,
    slug: "paket-scoring",
    questionExternalIds: [first!.externalId, second!.externalId, third!.externalId],
  });
  await publishPackage({
    pool,
    logger: testLogger,
    slug: "paket-scoring",
  });

  return { pool };
}

describe("submitAttempt", () => {
  it("finalizes scoring immediately and produces result review from runtime snapshots", async () => {
    const { pool } = await seedScoringPackage();
    const started = await startOrResumeAttempt({
      pool,
      logger: testLogger,
      packageSlug: "paket-scoring",
      shuffleQuestions: (items) => items,
      shuffleOptions: (items) => items,
    });

    await autosaveAttemptAnswer({
      pool,
      logger: testLogger,
      attemptId: started.attempt.id,
      snapshotId: started.snapshots[0]!.snapshotId,
      selectedOptionKeys: ["A"],
    });
    await autosaveAttemptAnswer({
      pool,
      logger: testLogger,
      attemptId: started.attempt.id,
      snapshotId: started.snapshots[1]!.snapshotId,
      selectedOptionKeys: ["A"],
    });

    const result = await submitAttempt({
      pool,
      logger: testLogger,
      attemptId: started.attempt.id,
    });

    expect(result.attempt.status).toBe("submitted");
    expect(result.summary).toEqual({
      totalQuestions: 3,
      correctCount: 1,
      incorrectCount: 1,
      unansweredCount: 1,
      scorePercentage: 33.33,
    });

    const incorrectReview = result.review.find((item) => item.questionText === "Soal salah");
    expect(incorrectReview).toMatchObject({
      isAnswered: true,
      isCorrect: false,
      selectedOptionKeys: ["A"],
      correctOptionKeys: ["A", "B"],
    });
    expect(incorrectReview?.options).toEqual([
      { option_key: "A", option_text: "A2", is_correct: true, selected_by_user: true },
      { option_key: "B", option_text: "B2", is_correct: true, selected_by_user: false },
      { option_key: "C", option_text: "C2", is_correct: false, selected_by_user: false },
    ]);

    const stored = await getAttemptResult({
      pool,
      attemptId: started.attempt.id,
    });

    expect(stored.summary.scorePercentage).toBe(33.33);
  });

  it("is idempotent when submit is repeated for the same attempt", async () => {
    const { pool } = await seedScoringPackage();
    const started = await startOrResumeAttempt({
      pool,
      logger: testLogger,
      packageSlug: "paket-scoring",
      shuffleQuestions: (items) => items,
      shuffleOptions: (items) => items,
    });

    await autosaveAttemptAnswer({
      pool,
      logger: testLogger,
      attemptId: started.attempt.id,
      snapshotId: started.snapshots[0]!.snapshotId,
      selectedOptionKeys: ["A"],
    });

    const firstSubmit = await submitAttempt({
      pool,
      logger: testLogger,
      attemptId: started.attempt.id,
    });
    const secondSubmit = await submitAttempt({
      pool,
      logger: testLogger,
      attemptId: started.attempt.id,
    });

    expect(secondSubmit.summary).toEqual(firstSubmit.summary);
    expect(secondSubmit.review).toEqual(firstSubmit.review);
  });
});
