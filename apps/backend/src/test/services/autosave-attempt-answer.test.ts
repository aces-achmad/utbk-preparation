import { describe, expect, it } from "vitest";

import { getTestPool } from "../../lib/testing/test-database";
import { testLogger } from "../../lib/testing/test-logger";
import { autosaveAttemptAnswer } from "../../modules/attempts/services/autosave-attempt-answer";
import { getAttemptDetail } from "../../modules/attempts/services/get-attempt-detail";
import { startOrResumeAttempt } from "../../modules/attempts/services/start-or-resume-attempt";
import {
  createQuestion,
  publishQuestion,
} from "../../modules/questions/services/question-authoring";
import {
  createPackage,
  publishPackage,
  setPackageComposition,
} from "../../modules/packages/services/package-authoring";
import { createSubject } from "../../modules/subjects/services/subject-authoring";
import { createTopic } from "../../modules/topics/services/topic-authoring";

async function seedAutosaveAttempt() {
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
  const question = await createQuestion({
    pool,
    logger: testLogger,
    input: {
      topicSlug: "penalaran-umum",
      type: "multiple_response",
      difficulty: "medium",
      questionText: "Soal autosave",
      explanationText: "Pembahasan autosave",
      options: [
        { option_key: "A", option_text: "A", is_correct: true },
        { option_key: "B", option_text: "B", is_correct: true },
        { option_key: "C", option_text: "C", is_correct: false },
      ],
    },
  });
  await publishQuestion({
    pool,
    logger: testLogger,
    externalId: question!.externalId,
  });
  await createPackage({
    pool,
    logger: testLogger,
    slug: "paket-autosave",
    name: "Paket Autosave",
  });
  await setPackageComposition({
    pool,
    logger: testLogger,
    slug: "paket-autosave",
    questionExternalIds: [question!.externalId],
  });
  await publishPackage({
    pool,
    logger: testLogger,
    slug: "paket-autosave",
  });

  return startOrResumeAttempt({
    pool,
    logger: testLogger,
    packageSlug: "paket-autosave",
  }).then((started) => ({ pool, started }));
}

describe("autosaveAttemptAnswer", () => {
  it("persists selected option keys by attempt + snapshot identity", async () => {
    const { pool, started } = await seedAutosaveAttempt();
    const snapshot = started.snapshots[0]!;

    const saved = await autosaveAttemptAnswer({
      pool,
      logger: testLogger,
      attemptId: started.attempt.id,
      snapshotId: snapshot.snapshotId,
      selectedOptionKeys: ["A", "B"],
    });

    expect(saved.syncState).toBe("saved");

    const reloaded = await getAttemptDetail({
      pool,
      attemptId: started.attempt.id,
    });

    expect(reloaded.snapshots[0]?.selectedOptionKeys).toEqual(["A", "B"]);
  });

  it("rejects autosave when the attempt is already submitted", async () => {
    const { pool, started } = await seedAutosaveAttempt();
    await pool.query(`UPDATE attempts SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP WHERE id = ?`, [
      started.attempt.id,
    ]);

    await expect(
      autosaveAttemptAnswer({
        pool,
        logger: testLogger,
        attemptId: started.attempt.id,
        snapshotId: started.snapshots[0]!.snapshotId,
        selectedOptionKeys: ["A"],
      }),
    ).rejects.toThrow("Attempt already submitted; autosave is no longer allowed.");
  });
});
