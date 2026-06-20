import { describe, expect, it } from "vitest";

import { getTestPool } from "../../lib/testing/test-database";
import { testLogger } from "../../lib/testing/test-logger";
import {
  archiveSubject,
  createSubject,
  listSubjects,
} from "../../modules/subjects/services/subject-authoring";
import {
  archiveTopic,
  createTopic,
  listTopics,
} from "../../modules/topics/services/topic-authoring";
import { createQuestion } from "../../modules/questions/services/question-authoring";

describe("subject and topic authoring", () => {
  it("creates and lists subjects and topics", async () => {
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

    const subjects = await listSubjects(pool);
    const topics = await listTopics(pool);

    expect(subjects).toHaveLength(1);
    expect(topics).toHaveLength(1);
    expect(topics[0]?.subjectSlug).toBe("matematika");
  });

  it("rejects archiving a topic or subject while active references still exist", async () => {
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
    await createQuestion({
      pool,
      logger: testLogger,
      input: {
        topicSlug: "aljabar",
        type: "single_choice",
        difficulty: "medium",
        questionText: "Contoh soal",
        explanationText: "Contoh pembahasan",
        options: [
          { option_key: "A", option_text: "A", is_correct: true },
          { option_key: "B", option_text: "B", is_correct: false },
        ],
      },
    });

    await expect(
      archiveTopic({
        pool,
        logger: testLogger,
        slug: "aljabar",
      }),
    ).rejects.toThrow("Topic cannot be archived while active questions still reference it.");

    await expect(
      archiveSubject({
        pool,
        logger: testLogger,
        slug: "matematika",
      }),
    ).rejects.toThrow("Subject cannot be archived while active topics still reference it.");
  });
});
