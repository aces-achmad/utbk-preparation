import { describe, expect, it } from "vitest";

import { getTestPool } from "../../lib/testing/test-database";
import { testLogger } from "../../lib/testing/test-logger";
import {
  createQuestion,
  publishQuestion,
  updateQuestion,
} from "../../modules/questions/services/question-authoring";
import {
  archivePackage,
  createPackage,
  duplicatePackage,
  listAvailablePackagesForPractice,
  publishPackage,
  setPackageComposition,
} from "../../modules/packages/services/package-authoring";
import { createSubject } from "../../modules/subjects/services/subject-authoring";
import { createTopic } from "../../modules/topics/services/topic-authoring";

async function seedPublishedQuestions() {
  const pool = await getTestPool();

  await createSubject({
    pool,
    logger: testLogger,
    slug: "matematika",
    label: "Matematika",
    displayOrder: 1,
  });
  await createTopic({
    pool,
    logger: testLogger,
    slug: "aljabar",
    subjectSlug: "matematika",
    label: "Aljabar",
    displayOrder: 1,
  });

  const first = await createQuestion({
    pool,
    logger: testLogger,
    input: {
      topicSlug: "aljabar",
      type: "single_choice",
      difficulty: "medium",
      questionText: "Q1",
      explanationText: "E1",
      options: [
        { option_key: "A", option_text: "A", is_correct: true },
        { option_key: "B", option_text: "B", is_correct: false },
      ],
    },
  });
  const second = await createQuestion({
    pool,
    logger: testLogger,
    input: {
      topicSlug: "aljabar",
      type: "single_choice",
      difficulty: "hard",
      questionText: "Q2",
      explanationText: "E2",
      options: [
        { option_key: "A", option_text: "A", is_correct: false },
        { option_key: "B", option_text: "B", is_correct: true },
      ],
    },
  });

  await publishQuestion({ pool, logger: testLogger, externalId: first!.externalId });
  await publishQuestion({ pool, logger: testLogger, externalId: second!.externalId });

  return { pool, first: first!, second: second! };
}

describe("package authoring", () => {
  it("creates a package, sets manual composition, and publish requires published questions", async () => {
    const { pool, first, second } = await seedPublishedQuestions();

    await createPackage({
      pool,
      logger: testLogger,
      slug: "paket-aljabar",
      name: "Paket Aljabar",
      description: "Paket awal",
    });

    const draftRecord = await setPackageComposition({
      pool,
      logger: testLogger,
      slug: "paket-aljabar",
      questionExternalIds: [first.externalId, second.externalId],
    });

    expect(draftRecord?.status).toBe("draft");

    const published = await publishPackage({
      pool,
      logger: testLogger,
      slug: "paket-aljabar",
    });

    expect(published?.status).toBe("published");
    expect(published?.isInvalid).toBe(false);
  });

  it("composition changes force the package back to draft", async () => {
    const { pool, first, second } = await seedPublishedQuestions();

    await createPackage({
      pool,
      logger: testLogger,
      slug: "paket-aljabar",
      name: "Paket Aljabar",
    });
    await setPackageComposition({
      pool,
      logger: testLogger,
      slug: "paket-aljabar",
      questionExternalIds: [first.externalId],
    });
    await publishPackage({
      pool,
      logger: testLogger,
      slug: "paket-aljabar",
    });

    const updated = await setPackageComposition({
      pool,
      logger: testLogger,
      slug: "paket-aljabar",
      questionExternalIds: [first.externalId, second.externalId],
    });

    expect(updated?.status).toBe("draft");
  });

  it("duplicates package with same composition into a new draft", async () => {
    const { pool, first } = await seedPublishedQuestions();

    await createPackage({
      pool,
      logger: testLogger,
      slug: "paket-aljabar",
      name: "Paket Aljabar",
    });
    await setPackageComposition({
      pool,
      logger: testLogger,
      slug: "paket-aljabar",
      questionExternalIds: [first.externalId],
    });
    await publishPackage({
      pool,
      logger: testLogger,
      slug: "paket-aljabar",
    });

    const duplicate = await duplicatePackage({
      pool,
      logger: testLogger,
      slug: "paket-aljabar",
      newSlug: "paket-aljabar-copy",
    });

    expect(duplicate?.slug).toBe("paket-aljabar-copy");
    expect(duplicate?.status).toBe("draft");
  });

  it("invalidates published packages immediately when a referenced question stops being published", async () => {
    const { pool, first } = await seedPublishedQuestions();

    await createPackage({
      pool,
      logger: testLogger,
      slug: "paket-aljabar",
      name: "Paket Aljabar",
    });
    await setPackageComposition({
      pool,
      logger: testLogger,
      slug: "paket-aljabar",
      questionExternalIds: [first.externalId],
    });
    await publishPackage({
      pool,
      logger: testLogger,
      slug: "paket-aljabar",
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
        status: "draft",
        questionText: first.questionText,
        explanationText: first.explanationText,
        options: first.options,
      },
    });

    const available = await listAvailablePackagesForPractice(pool);
    expect(available).toHaveLength(0);
  });

  it("archived packages are hidden from practice availability", async () => {
    const { pool, first } = await seedPublishedQuestions();

    await createPackage({
      pool,
      logger: testLogger,
      slug: "paket-aljabar",
      name: "Paket Aljabar",
    });
    await setPackageComposition({
      pool,
      logger: testLogger,
      slug: "paket-aljabar",
      questionExternalIds: [first.externalId],
    });
    await publishPackage({
      pool,
      logger: testLogger,
      slug: "paket-aljabar",
    });
    await archivePackage({
      pool,
      logger: testLogger,
      slug: "paket-aljabar",
    });

    const available = await listAvailablePackagesForPractice(pool);
    expect(available).toHaveLength(0);
  });
});
