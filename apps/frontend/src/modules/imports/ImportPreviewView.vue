<script setup lang="ts">
import { ref } from "vue";

import { apiFetch } from "../../services/api";

type ImportPreviewResponse = {
  importSessionId: number;
  status: "preview_ready" | "preview_invalid";
  summary: {
    questionCount: number;
    insertCount: number;
    updateCount: number;
    invalidRecordCount: number;
    sensitiveUpdateCount: number;
  };
  errors: Array<{
    path: string;
    message: string;
    code: string;
    recordType: "payload" | "subject" | "topic" | "question";
    recordIdentifier: string | null;
  }>;
  requiresReconfirmation: boolean;
};

const selectedFile = ref<File | null>(null);
const isSubmitting = ref(false);
const errorMessage = ref("");
const previewResult = ref<ImportPreviewResponse | null>(null);

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  selectedFile.value = input.files?.[0] ?? null;
}

async function handleSubmit() {
  if (!selectedFile.value) {
    errorMessage.value = "Pilih file JSON terlebih dahulu.";
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = "";

  try {
    const formData = new FormData();
    formData.append("file", selectedFile.value);

    const response = await apiFetch<ImportPreviewResponse>("/imports/preview", {
      method: "POST",
      body: formData,
    });

    previewResult.value = response.data;
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "Import preview gagal diproses.";
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <main class="workspace-shell">
    <section class="hero-card workspace-card">
      <p class="eyebrow">Authoring / Imports</p>
      <h1>Preview Import JSON</h1>
      <p class="body-copy">
        Upload satu file JSON kanonik untuk membuat <code>ImportSession</code>, melihat hasil
        validasi, dan mengecek dampak insert/update sebelum commit nanti ditambahkan.
      </p>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <label class="field">
          <span>File JSON</span>
          <input accept="application/json,.json" type="file" @change="handleFileChange" />
        </label>

        <button class="primary-button" :disabled="isSubmitting">
          {{ isSubmitting ? "Memproses..." : "Buat Preview" }}
        </button>
      </form>

      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

      <section v-if="previewResult" class="preview-panel">
        <div class="preview-grid">
          <article class="preview-stat">
            <span class="preview-label">Session</span>
            <strong>#{{ previewResult.importSessionId }}</strong>
          </article>
          <article class="preview-stat">
            <span class="preview-label">Status</span>
            <strong>{{ previewResult.status }}</strong>
          </article>
          <article class="preview-stat">
            <span class="preview-label">Question</span>
            <strong>{{ previewResult.summary.questionCount }}</strong>
          </article>
          <article class="preview-stat">
            <span class="preview-label">Insert</span>
            <strong>{{ previewResult.summary.insertCount }}</strong>
          </article>
          <article class="preview-stat">
            <span class="preview-label">Update</span>
            <strong>{{ previewResult.summary.updateCount }}</strong>
          </article>
          <article class="preview-stat">
            <span class="preview-label">Invalid</span>
            <strong>{{ previewResult.summary.invalidRecordCount }}</strong>
          </article>
          <article class="preview-stat">
            <span class="preview-label">Sensitive Update</span>
            <strong>{{ previewResult.summary.sensitiveUpdateCount }}</strong>
          </article>
        </div>

        <p v-if="previewResult.requiresReconfirmation" class="warning-text">
          Preview ini menyentuh <code>published question</code>. Commit final nanti harus meminta
          reconfirmation eksplisit.
        </p>

        <div v-if="previewResult.errors.length > 0" class="preview-errors">
          <h2>Validation Errors</h2>
          <ul>
            <li v-for="issue in previewResult.errors" :key="`${issue.path}:${issue.message}`">
              <code>{{ issue.path }}</code>
              <span>{{ issue.message }}</span>
              <span v-if="issue.recordIdentifier">({{ issue.recordIdentifier }})</span>
            </li>
          </ul>
        </div>
      </section>
    </section>
  </main>
</template>
