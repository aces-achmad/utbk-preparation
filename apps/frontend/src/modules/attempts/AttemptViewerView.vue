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
const errorMessage = ref("");
const syncStates = ref<Record<number, SyncState>>({});
const localSelections = ref<Record<number, string[]>>({});
const dirtySnapshotIds = ref<Record<number, true>>({});
const debounceTimers = new Map<number, ReturnType<typeof setTimeout>>();
const saveRequestTokens = new Map<number, number>();

const currentSnapshot = computed(() => attempt.value?.snapshots[currentIndex.value] ?? null);
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
  const snapshot = currentSnapshot.value;

  if (!snapshot) {
    return [];
  }

  return localSelections.value[snapshot.snapshotId] ?? [];
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
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Gagal memuat attempt.";
  } finally {
    isLoading.value = false;
  }
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
  const snapshot = currentSnapshot.value;

  if (!snapshot) {
    return;
  }

  applySelectionChange(snapshot.snapshotId, [optionKey]);
}

function handleMultipleResponseToggle(optionKey: string, checked: boolean) {
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
              <span class="pill">Answered: {{ answeredCount }}</span>
              <span class="pill">Unanswered: {{ unansweredCount }}</span>
              <span class="pill">Sync: {{ currentSyncState }}</span>
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
                  @change="handleSingleChoiceChange(option.option_key)"
                />
                <input
                  v-else
                  type="checkbox"
                  :checked="currentSelection.includes(option.option_key)"
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
                </div>
              </label>
            </li>
          </ul>

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
