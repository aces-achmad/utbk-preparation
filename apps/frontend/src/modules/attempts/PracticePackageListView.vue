<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { apiFetch } from "../../services/api";

type AvailablePackage = {
  slug: string;
  name: string;
  description: string | null;
  status: "draft" | "published";
  isArchived: boolean;
  isInvalid: boolean;
  invalidReason: string | null;
  itemCount: number;
  availableForPractice: boolean;
};

type StartOrResumeAttemptResponse = {
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
  }>;
};

const router = useRouter();
const packages = ref<AvailablePackage[]>([]);
const errorMessage = ref("");
const isBusy = ref(false);

onMounted(async () => {
  await loadPackages();
});

async function loadPackages() {
  isBusy.value = true;
  errorMessage.value = "";

  try {
    const response = await apiFetch<AvailablePackage[]>("/packages/available-for-practice");
    packages.value = response.data;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Gagal memuat package practice.";
  } finally {
    isBusy.value = false;
  }
}

async function handleStartOrResume(packageSlug: string) {
  isBusy.value = true;
  errorMessage.value = "";

  try {
    const response = await apiFetch<StartOrResumeAttemptResponse>("/attempts/start-or-resume", {
      method: "POST",
      body: JSON.stringify({ packageSlug }),
    });

    await router.push({
      name: "attempt-viewer",
      params: {
        attemptId: String(response.data.attempt.id),
      },
      state: {
        attemptPayload: response.data,
      },
    });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Gagal memulai practice.";
  } finally {
    isBusy.value = false;
  }
}
</script>

<template>
  <main class="workspace-shell">
    <section class="hero-card workspace-card">
      <p class="eyebrow">Practice</p>
      <h1>Available Packages</h1>
      <p class="body-copy">
        Backend sudah menyaring package yang benar-benar aman untuk practice. Hanya package
        <code>published</code>, aktif, dan tidak invalid yang muncul di sini.
      </p>

      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

      <section class="panel-card">
        <div class="section-head">
          <h2>Practice list</h2>
          <button class="secondary-button" :disabled="isBusy" @click="loadPackages">Refresh</button>
        </div>

        <ul class="record-list">
          <li v-for="pkg in packages" :key="pkg.slug">
            <div>
              <strong>{{ pkg.name }}</strong>
              <p><code>{{ pkg.slug }}</code></p>
              <p>{{ pkg.description || "Tanpa deskripsi." }}</p>
              <p>Total soal: {{ pkg.itemCount }}</p>
            </div>
            <div class="list-actions">
              <button class="primary-button" :disabled="isBusy" @click="handleStartOrResume(pkg.slug)">
                Start / Resume
              </button>
            </div>
          </li>
          <li v-if="!isBusy && packages.length === 0">
            <div>
              <strong>Tidak ada package practice.</strong>
              <p>Siapkan package yang published, aktif, dan valid dulu di authoring.</p>
            </div>
          </li>
        </ul>
      </section>
    </section>
  </main>
</template>
