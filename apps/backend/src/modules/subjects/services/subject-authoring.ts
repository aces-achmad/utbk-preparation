import type { Pool } from "mysql2/promise";

import type { Logger } from "../../../lib/logger";
import { SubjectRepository } from "../repositories/subject-repository";

export async function listSubjects(pool: Pool) {
  return new SubjectRepository(pool).list();
}

export async function createSubject({
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
  const repository = new SubjectRepository(pool);
  const existing = await repository.findBySlug(slug);

  if (existing) {
    throw new Error("Subject slug already exists.");
  }

  const subject = await repository.create({ slug, label, displayOrder });

  logger.info("subjects.created", { slug });
  return subject;
}

export async function updateSubject({
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
  const repository = new SubjectRepository(pool);
  const existing = await repository.findBySlug(slug);

  if (!existing) {
    throw new Error("Subject not found.");
  }

  const subject = await repository.update(slug, { label, displayOrder });
  logger.info("subjects.updated", { slug });
  return subject;
}

export async function archiveSubject({
  pool,
  logger,
  slug,
}: {
  pool: Pool;
  logger: Logger;
  slug: string;
}) {
  const repository = new SubjectRepository(pool);
  const existing = await repository.findBySlug(slug);

  if (!existing) {
    throw new Error("Subject not found.");
  }

  const activeTopics = await repository.countActiveTopics(slug);

  if (activeTopics > 0) {
    throw new Error("Subject cannot be archived while active topics still reference it.");
  }

  const subject = await repository.update(slug, {
    label: existing.label,
    displayOrder: existing.displayOrder,
    isArchived: true,
  });
  logger.info("subjects.archived", { slug });
  return subject;
}
