<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { RouterLink, onBeforeRouteLeave, useRoute, useRouter } from "vue-router";

import { apiFetch } from "../../services/api";

type AttemptData = {
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
    explanationText: string;
    options: Array<{
      option_key: string;
      option_text: string;
      is_correct: boolean;
    }>;
    selectedOptionKeys: string[];
  }>;
};

type AttemptResultData = {
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
  review: Array<{
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
  }>;
};

type AttemptPayload = AttemptData & {
  mode?: "started" | "resumed";
};

type SyncState = "idle" | "saving" | "saved" | "error";

const route = useRoute();
const router = useRouter();
const attemptPayload = history.state.attemptPayload as AttemptPayload | undefined;
const attempt = ref<AttemptData | null>(
  attemptPayload
    ? {
        attempt: attemptPayload.attempt,
        snapshots: attemptPayload.snapshots,
      }
    : null,
);
const currentIndex = ref(0);
const isLoading = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref("");
const result = ref<AttemptResultData | null>(null);
const syncStates = ref<Record<number, SyncState>>({});
const localSelections = ref<Record<number, string[]>>({});
const dirtySnapshotIds = ref<Record<number, true>>({});
const debounceTimers = new Map<number, ReturnType<typeof setTimeout>>();
const saveRequestTokens = new Map<number, number>();

const currentSnapshot = computed(() => attempt.value?.snapshots[currentIndex.value] ?? null);
const currentReviewItem = computed(() => result.value?.review[currentIndex.value] ?? null);
const currentSnapshotId = computed(() => currentSnapshot.value?.snapshotId ?? null);
const answeredCount = computed(
  () =>
    attempt.value?.snapshots.filter((snapshot) => {
      const selection = localSelections.value[snapshot.snapshotId] ?? snapshot.selectedOptionKeys ?? [];
      return selection.length > 0;
    }).length ?? 0,
);
const unansweredCount = computed(() => (attempt.value?.snapshots.length ?? 0) - answeredCount.value);
const hasUnsyncedChanges = computed(
  () =>
    Object.keys(dirtySnapshotIds.value).length > 0 ||
    Object.values(syncStates.value).some((state) => state === "saving" || state === "error"),
);
const currentSyncState = computed(() => {
  const snapshotId = currentSnapshotId.value;

  if (!snapshotId) {
    return "idle";
  }

  return syncStates.value[snapshotId] ?? "idle";
});
const currentSelection = computed(() => {
  if (result.value && currentReviewItem.value) {
    return currentReviewItem.value.selectedOptionKeys;
  }

  const snapshot = currentSnapshot.value;

  if (!snapshot) {
    return [];
  }

  return localSelections.value[snapshot.snapshotId] ?? [];
});
const submitDisabled = computed(
  () =>
    isLoading.value ||
    isSubmitting.value ||
    !attempt.value ||
    attempt.value.attempt.status === "submitted" ||
    hasUnsyncedChanges.value,
);
const summaryCards = computed(() => {
  if (result.value) {
    return {
      answered: result.value.summary.totalQuestions - result.value.summary.unansweredCount,
      unanswered: result.value.summary.unansweredCount,
      correct: result.value.summary.correctCount,
      incorrect: result.value.summary.incorrectCount,
      percentage: result.value.summary.scorePercentage,
    };
  }

  return {
    answered: answeredCount.value,
    unanswered: unansweredCount.value,
    correct: null,
    incorrect: null,
    percentage: null,
  };
});
const currentQuestionState = computed(() => {
  if (!currentReviewItem.value) {
    return null;
  }

  if (!currentReviewItem.value.isAnswered) {
    return "unanswered";
  }

  return currentReviewItem.value.isCorrect ? "correct" : "incorrect";
});

onMounted(async () => {
  await loadAttempt();
  window.addEventListener("beforeunload", handleBeforeUnload);
});

onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);

  for (const timer of debounceTimers.values()) {
    clearTimeout(timer);
  }
});

onBeforeRouteLeave(() => {
  if (!hasUnsyncedChanges.value) {
    return true;
  }

  return window.confirm(
    "Masih ada jawaban yang belum sinkron ke server. Tetap tinggalkan halaman ini?",
  );
});

async function loadAttempt() {
  const attemptId = Number(route.params.attemptId);

  if (!Number.isFinite(attemptId) || attemptId <= 0) {
    errorMessage.value = "Attempt ID tidak valid.";
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  try {
    const response = await apiFetch<AttemptData>(`/attempts/${attemptId}`);
    attempt.value = response.data;

    localSelections.value = Object.fromEntries(
      response.data.snapshots.map((snapshot) => [snapshot.snapshotId, [...snapshot.selectedOptionKeys]]),
    );
    syncStates.value = Object.fromEntries(
      response.data.snapshots.map((snapshot) => [snapshot.snapshotId, "saved" satisfies SyncState]),
    );
    dirtySnapshotIds.value = {};

    if (response.data.attempt.status === "submitted") {
      await loadResult(attemptId);
    } else {
      result.value = null;
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Gagal memuat attempt.";
  } finally {
    isLoading.value = false;
  }
}

async function loadResult(attemptId: number) {
  const response = await apiFetch<AttemptResultData>(`/attempts/${attemptId}/result`);
  result.value = response.data;
}

function goNext() {
  if (!attempt.value) {
    return;
  }

  currentIndex.value = Math.min(currentIndex.value + 1, attempt.value.snapshots.length - 1);
}

function goPrevious() {
  currentIndex.value = Math.max(currentIndex.value - 1, 0);
}

function jumpTo(index: number) {
  if (!attempt.value) {
    return;
  }

  currentIndex.value = Math.max(0, Math.min(index, attempt.value.snapshots.length - 1));
}

function handleSingleChoiceChange(optionKey: string) {
  if (attempt.value?.attempt.status === "submitted") {
    return;
  }

  const snapshot = currentSnapshot.value;

  if (!snapshot) {
    return;
  }

  applySelectionChange(snapshot.snapshotId, [optionKey]);
}

function handleMultipleResponseToggle(optionKey: string, checked: boolean) {
  if (attempt.value?.attempt.status === "submitted") {
    return;
  }

  const snapshot = currentSnapshot.value;

  if (!snapshot) {
    return;
  }

  const previous = localSelections.value[snapshot.snapshotId] ?? [];
  const nextSelection = checked
    ? Array.from(new Set([...previous, optionKey]))
    : previous.filter((item) => item !== optionKey);

  applySelectionChange(snapshot.snapshotId, nextSelection);
}

function applySelectionChange(snapshotId: number, selectedOptionKeys: string[]) {
  localSelections.value = {
    ...localSelections.value,
    [snapshotId]: selectedOptionKeys,
  };
  dirtySnapshotIds.value = {
    ...dirtySnapshotIds.value,
    [snapshotId]: true,
  };
  syncStates.value = {
    ...syncStates.value,
    [snapshotId]: "saving",
  };

  scheduleAutosave(snapshotId);
}

function scheduleAutosave(snapshotId: number) {
  const existingTimer = debounceTimers.get(snapshotId);

  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    void persistSnapshotAnswer(snapshotId);
  }, 450);

  debounceTimers.set(snapshotId, timer);
}

async function persistSnapshotAnswer(snapshotId: number) {
  const attemptId = attempt.value?.attempt.id;

  if (!attemptId) {
    return;
  }

  const requestToken = (saveRequestTokens.get(snapshotId) ?? 0) + 1;
  saveRequestTokens.set(snapshotId, requestToken);

  syncStates.value = {
    ...syncStates.value,
    [snapshotId]: "saving",
  };

  try {
    const response = await apiFetch<{
      attemptId: number;
      snapshotId: number;
      selectedOptionKeys: string[];
      syncState: "saved";
    }>(`/attempts/${attemptId}/snapshots/${snapshotId}/answer`, {
      method: "PUT",
      body: JSON.stringify({
        selectedOptionKeys: localSelections.value[snapshotId] ?? [],
      }),
    });

    if (saveRequestTokens.get(snapshotId) !== requestToken) {
      return;
    }

    localSelections.value = {
      ...localSelections.value,
      [snapshotId]: [...response.data.selectedOptionKeys],
    };

    if (attempt.value) {
      attempt.value = {
        ...attempt.value,
        snapshots: attempt.value.snapshots.map((snapshot) =>
          snapshot.snapshotId === snapshotId
            ? {
                ...snapshot,
                selectedOptionKeys: [...response.data.selectedOptionKeys],
              }
            : snapshot,
        ),
      };
    }

    const nextDirty = { ...dirtySnapshotIds.value };
    delete nextDirty[snapshotId];
    dirtySnapshotIds.value = nextDirty;
    syncStates.value = {
      ...syncStates.value,
      [snapshotId]: "saved",
    };
  } catch (error) {
    if (saveRequestTokens.get(snapshotId) !== requestToken) {
      return;
    }

    syncStates.value = {
      ...syncStates.value,
      [snapshotId]: "error",
    };
    errorMessage.value =
      error instanceof Error ? error.message : "Autosave gagal. Coba sinkronkan lagi.";
  }
}

function retryCurrentSnapshot() {
  const snapshotId = currentSnapshotId.value;

  if (!snapshotId) {
    return;
  }

  void persistSnapshotAnswer(snapshotId);
}

async function handleSubmitAttempt() {
  if (!attempt.value || submitDisabled.value) {
    return;
  }

  if (unansweredCount.value > 0) {
    const confirmed = window.confirm(
      `${unansweredCount.value} soal masih kosong dan akan dihitung salah. Submit sekarang?`,
    );

    if (!confirmed) {
      return;
    }
  }

  isSubmitting.value = true;
  errorMessage.value = "";

  try {
    const response = await apiFetch<AttemptResultData>(`/attempts/${attempt.value.attempt.id}/submit`, {
      method: "POST",
    });

    result.value = response.data;
    attempt.value = {
      ...attempt.value,
      attempt: {
        ...attempt.value.attempt,
        status: "submitted",
      },
    };
    dirtySnapshotIds.value = {};
    syncStates.value = Object.fromEntries(
      attempt.value.snapshots.map((snapshot) => [snapshot.snapshotId, "saved" satisfies SyncState]),
    );
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Submit attempt gagal.";
  } finally {
    isSubmitting.value = false;
  }
}

function snapshotSelectionStatus(snapshotId: number) {
  const state = syncStates.value[snapshotId] ?? "idle";

  if (state === "error") {
    return "error";
  }

  if (state === "saving") {
    return "saving";
  }

  const selection = localSelections.value[snapshotId] ?? [];
  return selection.length > 0 ? "answered" : "empty";
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!hasUnsyncedChanges.value) {
    return;
  }

  event.preventDefault();
  event.returnValue = "";
}
</script>

<template>
  <main class="workspace-shell">
    <section class="hero-card workspace-card">
      <p class="eyebrow">Practice / Attempt {{ route.params.attemptId }}</p>
      <h1>{{ attempt?.attempt.packageSlug || "Attempt" }}</h1>
      <p class="body-copy">
        Attempt viewer ini bekerja dari runtime snapshot backend. Jawaban disimpan otomatis per
        perubahan, dengan status sinkronisasi yang terlihat.
      </p>

      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
      <p v-if="isLoading" class="body-copy small-copy">Memuat attempt...</p>

      <template v-if="attempt && currentSnapshot">
        <section class="panel-card">
          <div class="section-head">
            <h2>Progress</h2>
            <div class="question-badges">
              <span class="pill">Answered: {{ summaryCards.answered }}</span>
              <span class="pill">Unanswered: {{ summaryCards.unanswered }}</span>
              <span class="pill">Sync: {{ currentSyncState }}</span>
              <span v-if="summaryCards.correct !== null" class="pill">Correct: {{ summaryCards.correct }}</span>
              <span v-if="summaryCards.incorrect !== null" class="pill">Incorrect: {{ summaryCards.incorrect }}</span>
              <span v-if="summaryCards.percentage !== null" class="pill">Score: {{ summaryCards.percentage }}%</span>
            </div>
          </div>

          <div class="number-grid">
            <button
              v-for="(snapshot, index) in attempt.snapshots"
              :key="snapshot.snapshotId"
              class="number-button"
              :class="{
                active: index === currentIndex,
                answered: snapshotSelectionStatus(snapshot.snapshotId) === 'answered',
                saving: snapshotSelectionStatus(snapshot.snapshotId) === 'saving',
                error: snapshotSelectionStatus(snapshot.snapshotId) === 'error',
                reviewCorrect:
                  result?.review[index]?.isAnswered && result.review[index]?.isCorrect,
                reviewIncorrect:
                  result?.review[index]?.isAnswered && !result.review[index]?.isCorrect,
                reviewUnanswered:
                  result?.review[index] && !result.review[index]?.isAnswered,
              }"
              @click="jumpTo(index)"
            >
              {{ snapshot.questionOrder }}
            </button>
          </div>
        </section>

        <section class="panel-card">
          <div class="section-head">
            <h2>Question {{ currentSnapshot.questionOrder }} / {{ attempt.snapshots.length }}</h2>
            <div class="question-badges">
              <span class="pill">{{ currentSnapshot.difficulty }}</span>
              <span class="pill">{{ currentSnapshot.type }}</span>
              <span v-if="currentQuestionState" class="pill">{{ currentQuestionState }}</span>
            </div>
          </div>

          <p class="body-copy small-copy">
            {{ currentSnapshot.subjectLabel || "-" }} / {{ currentSnapshot.topicLabel || "-" }}
          </p>
          <h3>{{ currentSnapshot.questionText }}</h3>

          <ul class="record-list">
            <li v-for="option in currentSnapshot.options" :key="option.option_key">
              <label class="option-choice">
                <input
                  v-if="currentSnapshot.type === 'single_choice'"
                  type="radio"
                  :name="`snapshot-${currentSnapshot.snapshotId}`"
                  :checked="currentSelection.includes(option.option_key)"
                  :disabled="attempt.attempt.status === 'submitted'"
                  @change="handleSingleChoiceChange(option.option_key)"
                />
                <input
                  v-else
                  type="checkbox"
                  :checked="currentSelection.includes(option.option_key)"
                  :disabled="attempt.attempt.status === 'submitted'"
                  @change="
                    handleMultipleResponseToggle(
                      option.option_key,
                      ($event.target as HTMLInputElement).checked,
                    )
                  "
                />
                <div>
                  <strong>{{ option.option_key }}</strong>
                  <p>{{ option.option_text }}</p>
                  <p v-if="result && currentReviewItem" class="body-copy small-copy">
                    Correct: {{ option.is_correct ? "yes" : "no" }} |
                    Selected: {{
                      currentReviewItem.options.find((reviewOption) => reviewOption.option_key === option.option_key)
                        ?.selected_by_user
                        ? "yes"
                        : "no"
                    }}
                  </p>
                </div>
              </label>
            </li>
          </ul>

          <div v-if="result && currentReviewItem" class="panel-card">
            <div class="section-head">
              <h2>Review</h2>
              <span class="pill">{{ currentQuestionState }}</span>
            </div>
            <p class="body-copy small-copy">
              Selected: <code>{{ currentReviewItem.selectedOptionKeys.join(", ") || "-" }}</code>
            </p>
            <p class="body-copy small-copy">
              Correct: <code>{{ currentReviewItem.correctOptionKeys.join(", ") || "-" }}</code>
            </p>
            <p class="body-copy">{{ currentReviewItem.explanationText }}</p>
          </div>

          <div class="sync-row">
            <p class="body-copy small-copy">
              Status sinkronisasi: <code>{{ currentSyncState }}</code>
            </p>
            <button
              v-if="currentSyncState === 'error'"
              class="secondary-button"
              type="button"
              @click="retryCurrentSnapshot"
            >
              Retry save
            </button>
            <button
              class="primary-button"
              type="button"
              :disabled="submitDisabled"
              @click="handleSubmitAttempt"
            >
              {{ isSubmitting ? "Submitting..." : attempt.attempt.status === "submitted" ? "Submitted" : "Submit attempt" }}
            </button>
          </div>
        </section>

        <div class="pagination-row">
          <button class="secondary-button" :disabled="currentIndex <= 0" @click="goPrevious">Previous</button>
          <RouterLink class="workspace-link" to="/practice">Back to packages</RouterLink>
          <button
            class="secondary-button"
            :disabled="currentIndex >= attempt.snapshots.length - 1"
            @click="goNext"
          >
            Next
          </button>
        </div>
      </template>

      <div v-else-if="!isLoading" class="panel-card">
        <p class="body-copy">Attempt belum bisa ditampilkan.</p>
        <button class="secondary-button" type="button" @click="router.push('/practice')">
          Back to packages
        </button>
      </div>
    </section>
  </main>
</template>
