import type { AttemptQuestionSnapshotRecord, AttemptRecord } from "../repositories/attempt-repository";

type AttemptReviewItem = {
  snapshotId: number;
  questionOrder: number;
  questionExternalId: string;
  subjectLabel: string | null;
  topicLabel: string | null;
  difficulty: "easy" | "medium" | "hard";
  type: "single_choice" | "multiple_response";
  questionText: string;
  explanationText: string;
  selectedOptionKeys: string[];
  correctOptionKeys: string[];
  isAnswered: boolean;
  isCorrect: boolean;
  options: Array<{
    option_key: string;
    option_text: string;
    is_correct: boolean;
    selected_by_user: boolean;
  }>;
};

export type AttemptResultPayload = {
  attempt: {
    id: number;
    packageSlug: string;
    status: "active" | "submitted";
    questionCount: number;
    submittedAt: string | null;
  };
  summary: {
    totalQuestions: number;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
    scorePercentage: number;
  };
  review: AttemptReviewItem[];
};

export function buildAttemptResultPayload({
  attempt,
  snapshots,
}: {
  attempt: AttemptRecord;
  snapshots: AttemptQuestionSnapshotRecord[];
}): AttemptResultPayload {
  const review = snapshots.map((snapshot) => {
    const normalizedSelected = normalizeOptionKeys(snapshot.selectedOptionKeys);
    const correctOptionKeys = normalizeOptionKeys(
      snapshot.optionsSnapshot
        .filter((option) => option.is_correct)
        .map((option) => option.option_key),
    );
    const isAnswered = normalizedSelected.length > 0;
    const isCorrect = isAnswered && haveSameOptionKeys(normalizedSelected, correctOptionKeys);

    return {
      snapshotId: snapshot.id,
      questionOrder: snapshot.questionOrder,
      questionExternalId: snapshot.questionExternalId,
      subjectLabel: snapshot.subjectLabelSnapshot,
      topicLabel: snapshot.topicLabelSnapshot,
      difficulty: snapshot.difficultySnapshot,
      type: snapshot.typeSnapshot,
      questionText: snapshot.questionTextSnapshot,
      explanationText: snapshot.explanationTextSnapshot,
      selectedOptionKeys: normalizedSelected,
      correctOptionKeys,
      isAnswered,
      isCorrect,
      options: snapshot.optionsSnapshot.map((option) => ({
        option_key: option.option_key,
        option_text: option.option_text,
        is_correct: option.is_correct,
        selected_by_user: normalizedSelected.includes(option.option_key),
      })),
    };
  });

  const evaluatedSummary = review.reduce(
    (summary, item) => {
      if (!item.isAnswered) {
        summary.unansweredCount += 1;
        return summary;
      }

      if (item.isCorrect) {
        summary.correctCount += 1;
        return summary;
      }

      summary.incorrectCount += 1;
      return summary;
    },
    {
      correctCount: 0,
      incorrectCount: 0,
      unansweredCount: 0,
    },
  );

  return {
    attempt: {
      id: attempt.id,
      packageSlug: attempt.packageSlug,
      status: attempt.status,
      questionCount: attempt.questionCount,
      submittedAt: attempt.submittedAt,
    },
    summary: {
      totalQuestions: attempt.questionCount,
      correctCount:
        attempt.correctCount ?? evaluatedSummary.correctCount,
      incorrectCount:
        attempt.incorrectCount ?? evaluatedSummary.incorrectCount,
      unansweredCount:
        attempt.unansweredCount ?? evaluatedSummary.unansweredCount,
      scorePercentage:
        attempt.scorePercentage ??
        calculateScorePercentage(evaluatedSummary.correctCount, attempt.questionCount),
    },
    review,
  };
}

export function calculateScorePercentage(correctCount: number, totalQuestions: number) {
  if (totalQuestions <= 0) {
    return 0;
  }

  return Number(((correctCount / totalQuestions) * 100).toFixed(2));
}

function normalizeOptionKeys(optionKeys: string[]) {
  return Array.from(new Set(optionKeys)).sort();
}

function haveSameOptionKeys(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
