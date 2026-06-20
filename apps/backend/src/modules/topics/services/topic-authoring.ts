import type { Pool } from "mysql2/promise";

import type { Logger } from "../../../lib/logger";
import { SubjectRepository } from "../../subjects/repositories/subject-repository";
import { TopicRepository } from "../repositories/topic-repository";

export async function listTopics(pool: Pool) {
  return new TopicRepository(pool).list();
}

export async function createTopic({
  pool,
  logger,
  slug,
  subjectSlug,
  label,
  displayOrder,
}: {
  pool: Pool;
  logger: Logger;
  slug: string;
  subjectSlug: string;
  label: string;
  displayOrder: number;
}) {
  const subjectRepository = new SubjectRepository(pool);
  const topicRepository = new TopicRepository(pool);
  const subject = await subjectRepository.findBySlug(subjectSlug);

  if (!subject || subject.isArchived) {
    throw new Error("Active subject is required for topic creation.");
  }

  const existing = await topicRepository.findBySlug(slug);

  if (existing) {
    throw new Error("Topic slug already exists.");
  }

  const topic = await topicRepository.create({ slug, subjectSlug, label, displayOrder });
  logger.info("topics.created", { slug, subjectSlug });
  return topic;
}

export async function updateTopic({
  pool,
  logger,
  slug,
  label,
  displayOrder,
}: {
  pool: Pool;
  logger: Logger;
  slug: string;
  label: string;
  displayOrder: number;
}) {
  const repository = new TopicRepository(pool);
  const existing = await repository.findBySlug(slug);

  if (!existing) {
    throw new Error("Topic not found.");
  }

  const topic = await repository.update(slug, { label, displayOrder });
  logger.info("topics.updated", { slug });
  return topic;
}

export async function archiveTopic({
  pool,
  logger,
  slug,
}: {
  pool: Pool;
  logger: Logger;
  slug: string;
}) {
  const repository = new TopicRepository(pool);
  const existing = await repository.findBySlug(slug);

  if (!existing) {
    throw new Error("Topic not found.");
  }

  const activeQuestions = await repository.countActiveQuestions(slug);

  if (activeQuestions > 0) {
    throw new Error("Topic cannot be archived while active questions still reference it.");
  }

  const topic = await repository.update(slug, {
    label: existing.label,
    displayOrder: existing.displayOrder,
    isArchived: true,
  });
  logger.info("topics.archived", { slug });
  return topic;
}
