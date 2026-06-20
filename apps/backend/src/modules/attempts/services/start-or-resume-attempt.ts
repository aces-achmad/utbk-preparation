import type { Pool } from "mysql2/promise";

import type { CanonicalImportQuestionOption } from "@utbk/shared/imports";

import type { Logger } from "../../../lib/logger";
import { QuestionPackageRepository } from "../../packages/repositories/question-package-repository";
import { QuestionAuthoringRepository } from "../../questions/repositories/question-authoring-repository";
import { AttemptRepository } from "../repositories/attempt-repository";

type ShuffleFn<T> = (items: T[]) => T[];

export type StartOrResumeAttemptResult = {
  mode: "started" | "resumed";
  attempt: {
    id: number;
    packageSlug: string;
    status: "active" | "submitted";
    questionCount: number;
  };
  snapshots: Array<{
    snapshotId: number;
    questionOrder: number;
    questionExternalId: string;
    subjectLabel: string | null;
    topicLabel: string | null;
    difficulty: "easy" | "medium" | "hard";
    type: "single_choice" | "multiple_response";
    questionText: string;
    options: Array<{
      option_key: string;
      option_text: string;
    }>;
    selectedOptionKeys: string[];
  }>;
};

export async function startOrResumeAttempt({
  pool,
  logger,
  packageSlug,
  shuffleQuestions = randomShuffle,
  shuffleOptions = randomShuffle,
}: {
  pool: Pool;
  logger: Logger;
  packageSlug: string;
  shuffleQuestions?: ShuffleFn<PackageQuestionSeed>;
  shuffleOptions?: ShuffleFn<CanonicalImportQuestionOption>;
}): Promise<StartOrResumeAttemptResult> {
  const packageRepository = new QuestionPackageRepository(pool);
  const attemptRepository = new AttemptRepository(pool);

  const pkg = await packageRepository.findBySlug(packageSlug);

  if (!pkg) {
    throw new Error("Package not found.");
  }

  if (!pkg.availableForPractice) {
    throw new Error("Package is not available for practice.");
  }

  const existingAttempt = await attemptRepository.findActiveByPackageSlug(packageSlug);

  if (existingAttempt) {
    const existingSnapshots = await attemptRepository.listSnapshots(existingAttempt.id);

    logger.info("attempts.resumed", {
      attemptId: existingAttempt.id,
      packageSlug,
    });

    return {
      mode: "resumed",
      attempt: {
        id: existingAttempt.id,
        packageSlug: existingAttempt.packageSlug,
        status: existingAttempt.status,
        questionCount: existingAttempt.questionCount,
      },
      snapshots: existingSnapshots.map((snapshot) => ({
        snapshotId: snapshot.id,
        questionOrder: snapshot.questionOrder,
        questionExternalId: snapshot.questionExternalId,
        subjectLabel: snapshot.subjectLabelSnapshot,
        topicLabel: snapshot.topicLabelSnapshot,
        difficulty: snapshot.difficultySnapshot,
        type: snapshot.typeSnapshot,
        questionText: snapshot.questionTextSnapshot,
        options: snapshot.optionsSnapshot.map(toPracticeOption),
        selectedOptionKeys: snapshot.selectedOptionKeys,
      })),
    };
  }

  const packageItems = await packageRepository.listItems(packageSlug);
  const questionRepository = new QuestionAuthoringRepository(pool);
  const questionSeeds: PackageQuestionSeed[] = [];

  for (const item of packageItems) {
    const question = await questionRepository.findByExternalId(item.questionExternalId);

    if (!question || question.status !== "published" || question.isArchived) {
      throw new Error("Package is not available for practice.");
    }

    questionSeeds.push({
      externalId: question.externalId,
      subjectLabel: question.subjectLabel,
      topicLabel: question.topicLabel,
      difficulty: question.difficulty,
      type: question.type,
      questionText: question.questionText,
      explanationText: question.explanationText,
      options: question.options,
    });
  }

  const randomizedQuestions = shuffleQuestions([...questionSeeds]);
  const createdAttempt = await attemptRepository.createAttempt({
    packageSlug,
    questionCount: randomizedQuestions.length,
  });

  if (!createdAttempt) {
    throw new Error("Attempt could not be created.");
  }

  await attemptRepository.createSnapshots(
    createdAttempt.id,
    randomizedQuestions.map((question, index) => ({
      packageSlugSnapshot: packageSlug,
      questionExternalId: question.externalId,
      questionOrder: index + 1,
      subjectLabelSnapshot: question.subjectLabel,
      topicLabelSnapshot: question.topicLabel,
      difficultySnapshot: question.difficulty,
      typeSnapshot: question.type,
      questionTextSnapshot: question.questionText,
      explanationTextSnapshot: question.explanationText,
      optionsSnapshot: shuffleOptions([...question.options]),
    })),
  );

  const storedSnapshots = await attemptRepository.listSnapshots(createdAttempt.id);

  logger.info("attempts.started", {
    attemptId: createdAttempt.id,
    packageSlug,
    questionCount: createdAttempt.questionCount,
  });

  return {
    mode: "started",
    attempt: {
      id: createdAttempt.id,
      packageSlug: createdAttempt.packageSlug,
      status: createdAttempt.status,
      questionCount: createdAttempt.questionCount,
    },
    snapshots: storedSnapshots.map((snapshot) => ({
      snapshotId: snapshot.id,
      questionOrder: snapshot.questionOrder,
      questionExternalId: snapshot.questionExternalId,
      subjectLabel: snapshot.subjectLabelSnapshot,
      topicLabel: snapshot.topicLabelSnapshot,
      difficulty: snapshot.difficultySnapshot,
      type: snapshot.typeSnapshot,
      questionText: snapshot.questionTextSnapshot,
      options: snapshot.optionsSnapshot.map(toPracticeOption),
      selectedOptionKeys: snapshot.selectedOptionKeys,
    })),
  };
}

type PackageQuestionSeed = {
  externalId: string;
  subjectLabel: string | null;
  topicLabel: string | null;
  difficulty: "easy" | "medium" | "hard";
  type: "single_choice" | "multiple_response";
  questionText: string;
  explanationText: string;
  options: CanonicalImportQuestionOption[];
};

function randomShuffle<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex]!, copy[index]!];
  }

  return copy;
}

function toPracticeOption(option: CanonicalImportQuestionOption) {
  return {
    option_key: option.option_key,
    option_text: option.option_text,
  };
}
