<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";

import { apiFetch } from "../../services/api";

type PackageItem = {
  questionExternalId: string;
  canonicalOrder: number;
  questionStatus: "draft" | "published" | null;
  questionIsArchived: boolean;
  questionText: string | null;
};

type PackageRecord = {
  slug: string;
  name: string;
  description: string | null;
  status: "draft" | "published";
  isArchived: boolean;
  isInvalid: boolean;
  invalidReason: string | null;
  itemCount: number;
  availableForPractice: boolean;
  items: PackageItem[];
};

type QuestionRecord = {
  externalId: string;
  questionText: string;
  topicLabel: string | null;
  difficulty: "easy" | "medium" | "hard";
  status: "draft" | "published";
  isArchived: boolean;
};

const packages = ref<PackageRecord[]>([]);
const availablePackages = ref<PackageRecord[]>([]);
const publishedQuestions = ref<QuestionRecord[]>([]);
const isBusy = ref(false);
const errorMessage = ref("");
const editingSlug = ref<string | null>(null);

const packageForm = reactive({
  slug: "",
  name: "",
  description: "",
  selectedQuestionIds: [] as string[],
});

const selectedItemsPreview = computed(() =>
  packageForm.selectedQuestionIds
    .map((externalId) => publishedQuestions.value.find((question) => question.externalId === externalId))
    .filter((question): question is QuestionRecord => Boolean(question)),
);

onMounted(async () => {
  await withBusy(async () => {
    await Promise.all([loadPackages(), loadAvailablePackages(), loadPublishedQuestions()]);
  });
});

async function loadPackages() {
  const response = await apiFetch<PackageRecord[]>("/packages");
  packages.value = response.data;
}

async function loadAvailablePackages() {
  const response = await apiFetch<PackageRecord[]>("/packages/available-for-practice");
  availablePackages.value = response.data;
}

async function loadPublishedQuestions() {
  const response = await apiFetch<{ items: QuestionRecord[]; total: number }>(
    "/questions?page=1&pageSize=100&status=published&archived=false",
  );
  publishedQuestions.value = response.data.items;
}

async function handleSaveMetadata() {
  await withBusy(async () => {
    if (editingSlug.value) {
      await apiFetch(`/packages/${editingSlug.value}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: packageForm.name,
          description: packageForm.description,
        }),
      });
    } else {
      await apiFetch("/packages", {
        method: "POST",
        body: JSON.stringify({
          slug: packageForm.slug,
          name: packageForm.name,
          description: packageForm.description,
        }),
      });
      editingSlug.value = packageForm.slug;
    }

    await Promise.all([loadPackages(), loadAvailablePackages()]);
  });
}

async function handleSaveComposition() {
  if (!editingSlug.value) {
    errorMessage.value = "Simpan metadata package dulu sebelum mengatur komposisi.";
    return;
  }

  await withBusy(async () => {
    await apiFetch(`/packages/${editingSlug.value}/composition`, {
      method: "PUT",
      body: JSON.stringify({
        questionExternalIds: packageForm.selectedQuestionIds,
      }),
    });

    await Promise.all([loadPackages(), loadAvailablePackages()]);
  });
}

async function handlePublish(slug: string) {
  await withBusy(async () => {
    await apiFetch(`/packages/${slug}/publish`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    await Promise.all([loadPackages(), loadAvailablePackages()]);
  });
}

async function handleArchive(slug: string) {
  await withBusy(async () => {
    await apiFetch(`/packages/${slug}/archive`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    await Promise.all([loadPackages(), loadAvailablePackages()]);
  });
}

async function handleDuplicate(sourceSlug: string) {
  const nextSlug = `${sourceSlug}-copy`;

  await withBusy(async () => {
    await apiFetch(`/packages/${sourceSlug}/duplicate`, {
      method: "POST",
      body: JSON.stringify({
        newSlug: nextSlug,
      }),
    });

    await Promise.all([loadPackages(), loadAvailablePackages()]);
  });
}

function startEditPackage(pkg: PackageRecord) {
  editingSlug.value = pkg.slug;
  packageForm.slug = pkg.slug;
  packageForm.name = pkg.name;
  packageForm.description = pkg.description ?? "";
  packageForm.selectedQuestionIds = pkg.items.map((item) => item.questionExternalId);
}

function moveSelectedQuestion(index: number, direction: -1 | 1) {
  const targetIndex = index + direction;

  if (targetIndex < 0 || targetIndex >= packageForm.selectedQuestionIds.length) {
    return;
  }

  const reordered = [...packageForm.selectedQuestionIds];
  const [moved] = reordered.splice(index, 1);
  reordered.splice(targetIndex, 0, moved);
  packageForm.selectedQuestionIds = reordered;
}

function resetForm() {
  editingSlug.value = null;
  packageForm.slug = "";
  packageForm.name = "";
  packageForm.description = "";
  packageForm.selectedQuestionIds = [];
}

async function withBusy(task: () => Promise<void>) {
  isBusy.value = true;
  errorMessage.value = "";

  try {
    await task();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Operasi package gagal.";
  } finally {
    isBusy.value = false;
  }
}
</script>

<template>
  <main class="workspace-shell">
    <section class="hero-card workspace-card">
      <p class="eyebrow">Authoring / Packages</p>
      <h1>Question Package Workbench</h1>
      <p class="body-copy">
        Kurasi manual <code>QuestionPackage</code> dari soal <code>published</code>, simpan
        canonical order, dan lihat package mana yang benar-benar available untuk practice.
      </p>

      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

      <section class="panel-card">
        <div class="section-head">
          <h2>{{ editingSlug ? "Edit Package" : "Create Package" }}</h2>
          <button class="secondary-button" type="button" @click="resetForm">Reset</button>
        </div>

        <form class="auth-form" @submit.prevent="handleSaveMetadata">
          <div class="workbench-grid">
            <label class="field">
              <span>Slug</span>
              <input v-model="packageForm.slug" :disabled="Boolean(editingSlug)" />
            </label>
            <label class="field">
              <span>Name</span>
              <input v-model="packageForm.name" />
            </label>
          </div>

          <label class="field">
            <span>Description</span>
            <textarea v-model="packageForm.description" rows="3" />
          </label>

          <button class="primary-button" :disabled="isBusy">
            {{ editingSlug ? "Update Package Metadata" : "Create Package" }}
          </button>
        </form>
      </section>

      <section class="panel-card">
        <div class="section-head">
          <h2>Canonical Composition</h2>
          <button class="primary-button" :disabled="isBusy || !editingSlug" @click="handleSaveComposition">
            Save Composition
          </button>
        </div>

        <div class="workbench-grid">
          <label class="field">
            <span>Published questions</span>
            <select v-model="packageForm.selectedQuestionIds" multiple size="12">
              <option
                v-for="question in publishedQuestions"
                :key="question.externalId"
                :value="question.externalId"
              >
                {{ question.questionText }} / {{ question.externalId }}
              </option>
            </select>
          </label>

          <div class="panel-card inset-panel">
            <h3>Selected canonical order</h3>
            <ul class="record-list">
              <li
                v-for="(question, index) in selectedItemsPreview"
                :key="question.externalId"
              >
                <div>
                  <strong>{{ index + 1 }}. {{ question.questionText }}</strong>
                  <p><code>{{ question.externalId }}</code></p>
                </div>
                <div class="list-actions">
                  <button class="secondary-button" @click="moveSelectedQuestion(index, -1)">Up</button>
                  <button class="secondary-button" @click="moveSelectedQuestion(index, 1)">Down</button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section class="panel-card">
        <h2>All Packages</h2>
        <div class="question-list">
          <article v-for="pkg in packages" :key="pkg.slug" class="question-card">
            <div class="question-card-head">
              <strong>{{ pkg.name }}</strong>
              <div class="question-badges">
                <span class="pill">{{ pkg.status }}</span>
                <span class="pill" :class="{ 'pill-danger': pkg.isInvalid }">
                  {{ pkg.isInvalid ? "invalid" : "valid" }}
                </span>
                <span class="pill" :class="{ 'pill-muted': pkg.isArchived }">
                  {{ pkg.isArchived ? "archived" : "active" }}
                </span>
              </div>
            </div>

            <p class="body-copy small-copy"><code>{{ pkg.slug }}</code></p>
            <p class="body-copy small-copy">{{ pkg.description || "Tanpa deskripsi." }}</p>
            <p class="body-copy small-copy">Items: {{ pkg.itemCount }}</p>
            <p v-if="pkg.invalidReason" class="warning-text">{{ pkg.invalidReason }}</p>

            <div class="list-actions">
              <button class="secondary-button" @click="startEditPackage(pkg)">Edit</button>
              <button class="secondary-button" @click="handlePublish(pkg.slug)">Publish</button>
              <button class="secondary-button" @click="handleDuplicate(pkg.slug)">Duplicate</button>
              <button class="secondary-button" @click="handleArchive(pkg.slug)">Archive</button>
            </div>
          </article>
        </div>
      </section>

      <section class="panel-card">
        <h2>Available for Practice</h2>
        <ul class="record-list">
          <li v-for="pkg in availablePackages" :key="pkg.slug">
            <div>
              <strong>{{ pkg.name }}</strong>
              <p><code>{{ pkg.slug }}</code></p>
            </div>
            <span class="pill">ready</span>
          </li>
          <li v-if="availablePackages.length === 0">
            <div>
              <strong>Tidak ada package yang tersedia.</strong>
              <p>Hanya package <code>published</code>, aktif, dan tidak invalid yang muncul di sini.</p>
            </div>
          </li>
        </ul>
      </section>
    </section>
  </main>
</template>
