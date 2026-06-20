<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";

import { apiFetch } from "../../services/api";

type SubjectRecord = {
  slug: string;
  label: string;
  displayOrder: number;
  isArchived: boolean;
};

type TopicRecord = {
  slug: string;
  subjectSlug: string;
  label: string;
  displayOrder: number;
  isArchived: boolean;
};

type QuestionOption = {
  option_key: string;
  option_text: string;
  is_correct: boolean;
};

type QuestionRecord = {
  externalId: string;
  topicSlug: string;
  subjectSlug: string | null;
  subjectLabel: string | null;
  topicLabel: string | null;
  type: "single_choice" | "multiple_response";
  source: string;
  difficulty: "easy" | "medium" | "hard";
  status: "draft" | "published";
  questionText: string;
  explanationText: string;
  options: QuestionOption[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

type QuestionListResponse = {
  items: QuestionRecord[];
  total: number;
};

const isBusy = ref(false);
const errorMessage = ref("");

const subjects = ref<SubjectRecord[]>([]);
const topics = ref<TopicRecord[]>([]);
const questions = ref<QuestionRecord[]>([]);
const totalQuestions = ref(0);
const selectedQuestionIds = ref<string[]>([]);
const editingQuestionId = ref<string | null>(null);
const editingSubjectSlug = ref<string | null>(null);
const editingTopicSlug = ref<string | null>(null);

const filters = reactive({
  page: 1,
  pageSize: 10,
  status: "",
  subjectSlug: "",
  topicSlug: "",
  difficulty: "",
  archived: "false",
  search: "",
});

const subjectForm = reactive({
  slug: "",
  label: "",
  displayOrder: 1,
});

const topicForm = reactive({
  slug: "",
  subjectSlug: "",
  label: "",
  displayOrder: 1,
});

const questionForm = reactive({
  topicSlug: "",
  type: "single_choice" as "single_choice" | "multiple_response",
  source: "manual:web",
  difficulty: "medium" as "easy" | "medium" | "hard",
  status: "draft" as "draft" | "published",
  questionText: "",
  explanationText: "",
  options: [
    { option_key: "A", option_text: "", is_correct: false },
    { option_key: "B", option_text: "", is_correct: false },
  ] as QuestionOption[],
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(totalQuestions.value / filters.pageSize)),
);

const activeTopics = computed(() =>
  topics.value.filter(
    (topic) =>
      !topic.isArchived && (!questionForm.topicSlug || topic.subjectSlug === selectedSubjectSlug.value),
  ),
);

const selectedSubjectSlug = computed(() => {
  const topic = topics.value.find((item) => item.slug === questionForm.topicSlug);
  return topic?.subjectSlug ?? "";
});

onMounted(async () => {
  await Promise.all([loadSubjects(), loadTopics(), loadQuestions()]);
});

async function loadSubjects() {
  const response = await apiFetch<SubjectRecord[]>("/subjects");
  subjects.value = response.data;
}

async function loadTopics() {
  const response = await apiFetch<TopicRecord[]>("/topics");
  topics.value = response.data;
}

async function loadQuestions() {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
    archived: filters.archived,
  });

  if (filters.status) params.set("status", filters.status);
  if (filters.subjectSlug) params.set("subjectSlug", filters.subjectSlug);
  if (filters.topicSlug) params.set("topicSlug", filters.topicSlug);
  if (filters.difficulty) params.set("difficulty", filters.difficulty);
  if (filters.search) params.set("search", filters.search);

  const response = await apiFetch<QuestionListResponse>(`/questions?${params.toString()}`);
  questions.value = response.data.items;
  totalQuestions.value = response.data.total;
}

async function handleRefreshQuestions() {
  selectedQuestionIds.value = [];
  await withBusy(loadQuestions);
}

async function handleSaveSubject() {
  await withBusy(async () => {
    if (editingSubjectSlug.value) {
      await apiFetch(`/subjects/${editingSubjectSlug.value}`, {
        method: "PATCH",
        body: JSON.stringify({
          label: subjectForm.label,
          displayOrder: subjectForm.displayOrder,
        }),
      });
    } else {
      await apiFetch("/subjects", {
        method: "POST",
        body: JSON.stringify(subjectForm),
      });
    }

    resetSubjectForm();
    await loadSubjects();
  });
}

async function handleSaveTopic() {
  await withBusy(async () => {
    if (editingTopicSlug.value) {
      await apiFetch(`/topics/${editingTopicSlug.value}`, {
        method: "PATCH",
        body: JSON.stringify({
          label: topicForm.label,
          displayOrder: topicForm.displayOrder,
        }),
      });
    } else {
      await apiFetch("/topics", {
        method: "POST",
        body: JSON.stringify(topicForm),
      });
    }

    resetTopicForm();
    await loadTopics();
  });
}

async function handleSaveQuestion() {
  await withBusy(async () => {
    const payload = {
      ...questionForm,
      options: questionForm.options,
    };

    if (editingQuestionId.value) {
      await apiFetch(`/questions/${editingQuestionId.value}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } else {
      await apiFetch("/questions", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    resetQuestionForm();
    await loadQuestions();
  });
}

async function handleArchiveSubject(subject: SubjectRecord) {
  await withBusy(async () => {
    await apiFetch(`/subjects/${subject.slug}/archive`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    await loadSubjects();
  });
}

async function handleArchiveTopic(topic: TopicRecord) {
  await withBusy(async () => {
    await apiFetch(`/topics/${topic.slug}/archive`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    await loadTopics();
  });
}

async function handleQuestionAction(externalId: string, action: "archive" | "publish" | "duplicate") {
  await withBusy(async () => {
    await apiFetch(`/questions/${externalId}/${action}`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    await loadQuestions();
  });
}

async function handleBulkAction(action: "publish" | "archive" | "draft") {
  if (selectedQuestionIds.value.length === 0) {
    errorMessage.value = "Pilih minimal satu question untuk bulk action.";
    return;
  }

  await withBusy(async () => {
    await apiFetch("/questions/bulk", {
      method: "POST",
      body: JSON.stringify({
        action,
        externalIds: selectedQuestionIds.value,
      }),
    });
    selectedQuestionIds.value = [];
    await loadQuestions();
  });
}

function startEditQuestion(question: QuestionRecord) {
  editingQuestionId.value = question.externalId;
  questionForm.topicSlug = question.topicSlug;
  questionForm.type = question.type;
  questionForm.source = question.source;
  questionForm.difficulty = question.difficulty;
  questionForm.status = question.status;
  questionForm.questionText = question.questionText;
  questionForm.explanationText = question.explanationText;
  questionForm.options = question.options.map((option) => ({ ...option }));
}

function startEditSubject(subject: SubjectRecord) {
  editingSubjectSlug.value = subject.slug;
  subjectForm.slug = subject.slug;
  subjectForm.label = subject.label;
  subjectForm.displayOrder = subject.displayOrder;
}

function startEditTopic(topic: TopicRecord) {
  editingTopicSlug.value = topic.slug;
  topicForm.slug = topic.slug;
  topicForm.subjectSlug = topic.subjectSlug;
  topicForm.label = topic.label;
  topicForm.displayOrder = topic.displayOrder;
}

function resetSubjectForm() {
  editingSubjectSlug.value = null;
  subjectForm.slug = "";
  subjectForm.label = "";
  subjectForm.displayOrder = 1;
}

function resetTopicForm() {
  editingTopicSlug.value = null;
  topicForm.slug = "";
  topicForm.subjectSlug = "";
  topicForm.label = "";
  topicForm.displayOrder = 1;
}

function resetQuestionForm() {
  editingQuestionId.value = null;
  questionForm.topicSlug = "";
  questionForm.type = "single_choice";
  questionForm.source = "manual:web";
  questionForm.difficulty = "medium";
  questionForm.status = "draft";
  questionForm.questionText = "";
  questionForm.explanationText = "";
  questionForm.options = [
    { option_key: "A", option_text: "", is_correct: false },
    { option_key: "B", option_text: "", is_correct: false },
  ];
}

function addOption() {
  const nextKey = String.fromCharCode(65 + questionForm.options.length);
  questionForm.options.push({
    option_key: nextKey,
    option_text: "",
    is_correct: false,
  });
}

function removeOption(index: number) {
  if (questionForm.options.length <= 2) {
    return;
  }

  questionForm.options.splice(index, 1);
}

async function withBusy(task: () => Promise<void>) {
  isBusy.value = true;
  errorMessage.value = "";

  try {
    await task();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Operasi gagal diproses.";
  } finally {
    isBusy.value = false;
  }
}
</script>

<template>
  <main class="workspace-shell">
    <section class="hero-card workspace-card">
      <p class="eyebrow">Authoring / Question Bank</p>
      <h1>Question Bank Workbench</h1>
      <p class="body-copy">
        Kelola <code>Subject</code>, <code>Topic</code>, dan <code>Question</code> manual maupun
        hasil import dari satu area kerja internal.
      </p>

      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

      <div class="workbench-grid">
        <section class="panel-card">
          <h2>Subject</h2>
          <form class="auth-form compact-form" @submit.prevent="handleSaveSubject">
            <label class="field">
              <span>Slug</span>
              <input v-model="subjectForm.slug" :disabled="Boolean(editingSubjectSlug)" />
            </label>
            <label class="field">
              <span>Label</span>
              <input v-model="subjectForm.label" />
            </label>
            <label class="field">
              <span>Display order</span>
              <input v-model.number="subjectForm.displayOrder" min="1" type="number" />
            </label>
            <div class="form-actions">
              <button class="primary-button" :disabled="isBusy">
                {{ editingSubjectSlug ? "Update Subject" : "Create Subject" }}
              </button>
              <button class="secondary-button" type="button" @click="resetSubjectForm">Reset</button>
            </div>
          </form>

          <ul class="record-list">
            <li v-for="subject in subjects" :key="subject.slug">
              <div>
                <strong>{{ subject.label }}</strong>
                <p><code>{{ subject.slug }}</code></p>
              </div>
              <div class="list-actions">
                <button class="secondary-button" @click="startEditSubject(subject)">Edit</button>
                <button class="secondary-button" @click="handleArchiveSubject(subject)">Archive</button>
              </div>
            </li>
          </ul>
        </section>

        <section class="panel-card">
          <h2>Topic</h2>
          <form class="auth-form compact-form" @submit.prevent="handleSaveTopic">
            <label class="field">
              <span>Slug</span>
              <input v-model="topicForm.slug" :disabled="Boolean(editingTopicSlug)" />
            </label>
            <label class="field">
              <span>Subject</span>
              <select v-model="topicForm.subjectSlug" :disabled="Boolean(editingTopicSlug)">
                <option value="">Pilih subject</option>
                <option v-for="subject in subjects.filter((item) => !item.isArchived)" :key="subject.slug" :value="subject.slug">
                  {{ subject.label }}
                </option>
              </select>
            </label>
            <label class="field">
              <span>Label</span>
              <input v-model="topicForm.label" />
            </label>
            <label class="field">
              <span>Display order</span>
              <input v-model.number="topicForm.displayOrder" min="1" type="number" />
            </label>
            <div class="form-actions">
              <button class="primary-button" :disabled="isBusy">
                {{ editingTopicSlug ? "Update Topic" : "Create Topic" }}
              </button>
              <button class="secondary-button" type="button" @click="resetTopicForm">Reset</button>
            </div>
          </form>

          <ul class="record-list">
            <li v-for="topic in topics" :key="topic.slug">
              <div>
                <strong>{{ topic.label }}</strong>
                <p><code>{{ topic.slug }}</code> / {{ topic.subjectSlug }}</p>
              </div>
              <div class="list-actions">
                <button class="secondary-button" @click="startEditTopic(topic)">Edit</button>
                <button class="secondary-button" @click="handleArchiveTopic(topic)">Archive</button>
              </div>
            </li>
          </ul>
        </section>
      </div>

      <section class="panel-card question-form-panel">
        <div class="section-head">
          <h2>{{ editingQuestionId ? "Edit Question" : "Create Question" }}</h2>
          <button class="secondary-button" type="button" @click="resetQuestionForm">Reset</button>
        </div>

        <form class="auth-form" @submit.prevent="handleSaveQuestion">
          <div class="workbench-grid">
            <label class="field">
              <span>Topic</span>
              <select v-model="questionForm.topicSlug">
                <option value="">Pilih topic</option>
                <option v-for="topic in topics.filter((item) => !item.isArchived)" :key="topic.slug" :value="topic.slug">
                  {{ topic.label }} / {{ topic.subjectSlug }}
                </option>
              </select>
            </label>
            <label class="field">
              <span>Type</span>
              <select v-model="questionForm.type">
                <option value="single_choice">single_choice</option>
                <option value="multiple_response">multiple_response</option>
              </select>
            </label>
            <label class="field">
              <span>Difficulty</span>
              <select v-model="questionForm.difficulty">
                <option value="easy">easy</option>
                <option value="medium">medium</option>
                <option value="hard">hard</option>
              </select>
            </label>
            <label class="field">
              <span>Status</span>
              <select v-model="questionForm.status">
                <option value="draft">draft</option>
                <option value="published">published</option>
              </select>
            </label>
          </div>

          <label class="field">
            <span>Source</span>
            <input v-model="questionForm.source" />
          </label>
          <label class="field">
            <span>Question text</span>
            <textarea v-model="questionForm.questionText" rows="4" />
          </label>
          <label class="field">
            <span>Explanation text</span>
            <textarea v-model="questionForm.explanationText" rows="4" />
          </label>

          <div class="options-editor">
            <div class="section-head">
              <h3>Options</h3>
              <button class="secondary-button" type="button" @click="addOption">Add option</button>
            </div>
            <div v-for="(option, index) in questionForm.options" :key="`${option.option_key}-${index}`" class="option-row">
              <input v-model="option.option_key" class="option-key" />
              <input v-model="option.option_text" class="option-text" />
              <label class="checkbox-field">
                <input v-model="option.is_correct" type="checkbox" />
                <span>Correct</span>
              </label>
              <button class="secondary-button" type="button" @click="removeOption(index)">Remove</button>
            </div>
          </div>

          <button class="primary-button" :disabled="isBusy">
            {{ editingQuestionId ? "Update Question" : "Create Question" }}
          </button>
        </form>
      </section>

      <section class="panel-card">
        <div class="section-head">
          <h2>Questions</h2>
          <button class="secondary-button" :disabled="isBusy" @click="handleRefreshQuestions">Refresh</button>
        </div>

        <div class="filter-grid">
          <label class="field">
            <span>Status</span>
            <select v-model="filters.status">
              <option value="">All</option>
              <option value="draft">draft</option>
              <option value="published">published</option>
            </select>
          </label>
          <label class="field">
            <span>Subject</span>
            <select v-model="filters.subjectSlug">
              <option value="">All</option>
              <option v-for="subject in subjects" :key="subject.slug" :value="subject.slug">
                {{ subject.label }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>Topic</span>
            <select v-model="filters.topicSlug">
              <option value="">All</option>
              <option v-for="topic in topics" :key="topic.slug" :value="topic.slug">
                {{ topic.label }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>Difficulty</span>
            <select v-model="filters.difficulty">
              <option value="">All</option>
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </label>
          <label class="field">
            <span>Archived</span>
            <select v-model="filters.archived">
              <option value="false">active only</option>
              <option value="true">archived only</option>
            </select>
          </label>
          <label class="field">
            <span>Search</span>
            <input v-model="filters.search" placeholder="external_id / text" />
          </label>
        </div>

        <div class="form-actions">
          <button class="primary-button" :disabled="isBusy" @click="handleRefreshQuestions">Apply filters</button>
          <button class="secondary-button" @click="handleBulkAction('publish')">Bulk publish</button>
          <button class="secondary-button" @click="handleBulkAction('archive')">Bulk archive</button>
          <button class="secondary-button" @click="handleBulkAction('draft')">Bulk draft</button>
        </div>

        <div class="question-list">
          <article v-for="question in questions" :key="question.externalId" class="question-card">
            <div class="question-card-head">
              <label class="checkbox-field">
                <input v-model="selectedQuestionIds" :value="question.externalId" type="checkbox" />
                <span>Select</span>
              </label>
              <div class="question-badges">
                <span class="pill">{{ question.status }}</span>
                <span class="pill">{{ question.difficulty }}</span>
                <span class="pill">{{ question.type }}</span>
              </div>
            </div>

            <h3>{{ question.questionText }}</h3>
            <p class="body-copy small-copy">
              <code>{{ question.externalId }}</code> / {{ question.subjectLabel ?? "-" }} /
              {{ question.topicLabel ?? question.topicSlug }}
            </p>
            <p class="body-copy small-copy">Source: {{ question.source }}</p>

            <div class="list-actions">
              <button class="secondary-button" @click="startEditQuestion(question)">Edit</button>
              <button class="secondary-button" @click="handleQuestionAction(question.externalId, 'duplicate')">
                Duplicate
              </button>
              <button class="secondary-button" @click="handleQuestionAction(question.externalId, 'publish')">
                Publish
              </button>
              <button class="secondary-button" @click="handleQuestionAction(question.externalId, 'archive')">
                Archive
              </button>
            </div>
          </article>
        </div>

        <div class="pagination-row">
          <button class="secondary-button" :disabled="filters.page <= 1" @click="filters.page -= 1; handleRefreshQuestions()">
            Prev
          </button>
          <span>Page {{ filters.page }} / {{ totalPages }}</span>
          <button class="secondary-button" :disabled="filters.page >= totalPages" @click="filters.page += 1; handleRefreshQuestions()">
            Next
          </button>
        </div>
      </section>
    </section>
  </main>
</template>
