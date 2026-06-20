import type { Pool } from "mysql2/promise";

import type { Logger } from "../../../lib/logger";
import { QuestionAuthoringRepository } from "../../questions/repositories/question-authoring-repository";
import { QuestionPackageRepository } from "../repositories/question-package-repository";

export async function listPackages(pool: Pool) {
  const repository = new QuestionPackageRepository(pool);
  const packages = await repository.list();

  return Promise.all(
    packages.map(async (item) => ({
      ...item,
      items: await repository.listItems(item.slug),
    })),
  );
}

export async function listAvailablePackagesForPractice(pool: Pool) {
  return new QuestionPackageRepository(pool).listAvailableForPractice();
}

export async function createPackage({
  pool,
  logger,
  slug,
  name,
  description,
}: {
  pool: Pool;
  logger: Logger;
  slug: string;
  name: string;
  description?: string | null;
}) {
  const repository = new QuestionPackageRepository(pool);
  const existing = await repository.findBySlug(slug);

  if (existing) {
    throw new Error("Package slug already exists.");
  }

  const record = await repository.create({
    slug,
    name: name.trim(),
    description: description?.trim() || null,
  });

  logger.info("packages.created", { slug });
  return record;
}

export async function updatePackageMetadata({
  pool,
  logger,
  slug,
  name,
  description,
}: {
  pool: Pool;
  logger: Logger;
  slug: string;
  name: string;
  description?: string | null;
}) {
  const repository = new QuestionPackageRepository(pool);
  const existing = await repository.findBySlug(slug);

  if (!existing) {
    throw new Error("Package not found.");
  }

  const record = await repository.updateMetadata(slug, {
    name: name.trim(),
    description: description?.trim() || null,
  });

  logger.info("packages.updated_metadata", { slug });
  return record;
}

export async function setPackageComposition({
  pool,
  logger,
  slug,
  questionExternalIds,
}: {
  pool: Pool;
  logger: Logger;
  slug: string;
  questionExternalIds: string[];
}) {
  const repository = new QuestionPackageRepository(pool);
  const existing = await repository.findBySlug(slug);

  if (!existing) {
    throw new Error("Package not found.");
  }

  await assertQuestionsArePublishedAndActive(pool, questionExternalIds);
  await repository.replaceItems(slug, questionExternalIds);

  const record = await repository.updateMetadata(slug, {
    name: existing.name,
    description: existing.description,
    status: "draft",
  });
  await syncPackageInvalidationBySlug({ pool, logger, slug });

  logger.info("packages.updated_composition", {
    slug,
    itemCount: questionExternalIds.length,
  });

  return record;
}

export async function publishPackage({
  pool,
  logger,
  slug,
}: {
  pool: Pool;
  logger: Logger;
  slug: string;
}) {
  const repository = new QuestionPackageRepository(pool);
  const existing = await repository.findBySlug(slug);

  if (!existing) {
    throw new Error("Package not found.");
  }

  const items = await repository.listItems(slug);

  if (items.length < 1) {
    throw new Error("Published package must contain at least one question.");
  }

  await assertQuestionsArePublishedAndActive(
    pool,
    items.map((item) => item.questionExternalId),
  );

  const record = await repository.updateMetadata(slug, {
    name: existing.name,
    description: existing.description,
    status: "published",
    isInvalid: false,
    invalidReason: null,
  });

  logger.info("packages.published", { slug });
  return record;
}

export async function archivePackage({
  pool,
  logger,
  slug,
}: {
  pool: Pool;
  logger: Logger;
  slug: string;
}) {
  const repository = new QuestionPackageRepository(pool);
  const existing = await repository.findBySlug(slug);

  if (!existing) {
    throw new Error("Package not found.");
  }

  const record = await repository.updateMetadata(slug, {
    name: existing.name,
    description: existing.description,
    isArchived: true,
  });

  logger.info("packages.archived", { slug });
  return record;
}

export async function duplicatePackage({
  pool,
  logger,
  slug,
  newSlug,
}: {
  pool: Pool;
  logger: Logger;
  slug: string;
  newSlug: string;
}) {
  const repository = new QuestionPackageRepository(pool);
  const source = await repository.findBySlug(slug);

  if (!source) {
    throw new Error("Package not found.");
  }

  const existingTarget = await repository.findBySlug(newSlug);

  if (existingTarget) {
    throw new Error("Package slug already exists.");
  }

  await repository.create({
    slug: newSlug,
    name: source.name,
    description: source.description,
  });

  const sourceItems = await repository.listItems(slug);
  await repository.replaceItems(
    newSlug,
    sourceItems.map((item) => item.questionExternalId),
  );

  const record = await repository.updateMetadata(newSlug, {
    name: source.name,
    description: source.description,
    status: "draft",
  });
  await syncPackageInvalidationBySlug({ pool, logger, slug: newSlug });

  logger.info("packages.duplicated", { slug, newSlug });
  return record;
}

export async function syncPackageInvalidationByQuestion({
  pool,
  logger,
  questionExternalId,
}: {
  pool: Pool;
  logger: Logger;
  questionExternalId: string;
}) {
  const repository = new QuestionPackageRepository(pool);
  const packageSlugs = await repository.listByQuestionExternalId(questionExternalId);

  for (const slug of packageSlugs) {
    await syncPackageInvalidationBySlug({ pool, logger, slug });
  }
}

export async function syncPackageInvalidationBySlug({
  pool,
  logger,
  slug,
}: {
  pool: Pool;
  logger: Logger;
  slug: string;
}) {
  const repository = new QuestionPackageRepository(pool);
  const record = await repository.findBySlug(slug);

  if (!record) {
    return null;
  }

  const items = await repository.listItems(slug);
  let invalidReason: string | null = null;

  if (items.some((item) => item.questionStatus !== "published")) {
    invalidReason = "Package references a question that is no longer published.";
  } else if (items.some((item) => item.questionIsArchived)) {
    invalidReason = "Package references an archived question.";
  }

  const updated = await repository.updateMetadata(slug, {
    name: record.name,
    description: record.description,
    isInvalid: invalidReason !== null,
    invalidReason,
  });

  logger.info("packages.synced_invalidation", {
    slug,
    isInvalid: invalidReason !== null,
    invalidReason,
  });

  return updated;
}

async function assertQuestionsArePublishedAndActive(pool: Pool, externalIds: string[]) {
  const repository = new QuestionAuthoringRepository(pool);

  for (const externalId of externalIds) {
    const question = await repository.findByExternalId(externalId);

    if (!question) {
      throw new Error(`Question '${externalId}' was not found.`);
    }

    if (question.isArchived) {
      throw new Error(`Question '${externalId}' is archived and cannot be used in a package.`);
    }

    if (question.status !== "published") {
      throw new Error(`Question '${externalId}' must be published before entering a package.`);
    }
  }
}
