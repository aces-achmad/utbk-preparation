import { describe, expect, it } from "vitest";

import { getTestPool } from "../../lib/testing/test-database";
import { testLogger } from "../../lib/testing/test-logger";
import { startOrResumeAttempt } from "../../modules/attempts/services/start-or-resume-attempt";
import {
  createQuestion,
  publishQuestion,
  updateQuestion,
} from "../../modules/questions/services/question-authoring";
import {
  createPackage,
  publishPackage,
  setPackageComposition,
} from "../../modules/packages/services/package-authoring";
import { createSubject } from "../../modules/subjects/services/subject-authoring";
import { createTopic } from "../../modules/topics/services/topic-authoring";

async function seedPracticePackage() {
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
      difficulty: "medium",
      questionText: "Soal pertama",
      explanationText: "Pembahasan pertama",
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
      difficulty: "hard",
      questionText: "Soal kedua",
      explanationText: "Pembahasan kedua",
      options: [
        { option_key: "A", option_text: "A2", is_correct: true },
        { option_key: "B", option_text: "B2", is_correct: true },
        { option_key: "C", option_text: "C2", is_correct: false },
      ],
    },
  });

  await publishQuestion({ pool, logger: testLogger, externalId: first!.externalId });
  await publishQuestion({ pool, logger: testLogger, externalId: second!.externalId });

  await createPackage({
    pool,
    logger: testLogger,
    slug: "paket-tps",
    name: "Paket TPS",
  });
  await setPackageComposition({
    pool,
    logger: testLogger,
    slug: "paket-tps",
    questionExternalIds: [first!.externalId, second!.externalId],
  });
  await publishPackage({
    pool,
    logger: testLogger,
    slug: "paket-tps",
  });

  return { pool, first: first!, second: second! };
}

describe("startOrResumeAttempt", () => {
  it("creates a new active attempt with stable runtime snapshots and randomized order", async () => {
    const { pool } = await seedPracticePackage();

    const result = await startOrResumeAttempt({
      pool,
      logger: testLogger,
      packageSlug: "paket-tps",
      shuffleQuestions: (items) => [...items].reverse(),
      shuffleOptions: (items) => [...items].reverse(),
    });

    expect(result.mode).toBe("started");
    expect(result.attempt.status).toBe("active");
    expect(result.attempt.questionCount).toBe(2);
    expect(result.snapshots).toHaveLength(2);
    expect(result.snapshots[0]?.questionText).toBe("Soal kedua");
    expect(result.snapshots[0]?.options[0]?.option_text).toBe("C2");
    expect(result.snapshots[1]?.questionText).toBe("Soal pertama");
  });

  it("resumes the existing active attempt for the same package", async () => {
    const { pool } = await seedPracticePackage();

    const firstRun = await startOrResumeAttempt({
      pool,
      logger: testLogger,
      packageSlug: "paket-tps",
    });

    const secondRun = await startOrResumeAttempt({
      pool,
      logger: testLogger,
      packageSlug: "paket-tps",
    });

    expect(secondRun.mode).toBe("resumed");
    expect(secondRun.attempt.id).toBe(firstRun.attempt.id);
    expect(secondRun.snapshots).toHaveLength(firstRun.snapshots.length);
  });

  it("keeps runtime snapshots isolated from later question edits", async () => {
    const { pool, first } = await seedPracticePackage();

    const started = await startOrResumeAttempt({
      pool,
      logger: testLogger,
      packageSlug: "paket-tps",
      shuffleQuestions: (items) => items,
      shuffleOptions: (items) => items,
    });

    await updateQuestion({
      pool,
      logger: testLogger,
      externalId: first.externalId,
      input: {
        topicSlug: first.topicSlug,
        type: first.type,
        source: first.source,
        difficulty: first.difficulty,
        status: "published",
        questionText: "Soal pertama revisi",
        explanationText: "Pembahasan pertama revisi",
        options: first.options.map((option) => ({
          ...option,
          option_text: `${option.option_text}-edited`,
        })),
      },
    });

    const resumed = await startOrResumeAttempt({
      pool,
      logger: testLogger,
      packageSlug: "paket-tps",
    });

    expect(resumed.attempt.id).toBe(started.attempt.id);
    expect(resumed.snapshots[0]?.questionText).toBe("Soal pertama");
    expect(resumed.snapshots[0]?.explanationText).toBe("Pembahasan pertama");
    expect(resumed.snapshots[0]?.options[0]?.option_text).toBe("A1");
  });
});
