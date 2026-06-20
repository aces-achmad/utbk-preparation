<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

import { useAuthStore } from "../../stores/auth";

const authStore = useAuthStore();
const router = useRouter();
const username = ref("admin");
const password = ref("");
const errorMessage = ref("");
const isSubmitting = ref(false);

async function handleSubmit() {
  errorMessage.value = "";
  isSubmitting.value = true;

  try {
    await authStore.login(username.value, password.value);
    await router.push("/");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Login failed.";
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <main class="app-shell">
    <section class="hero-card auth-card">
      <p class="eyebrow">Internal Access</p>
      <h1>Sign in</h1>
      <p class="body-copy">Use the single Admin account to continue.</p>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <label class="field">
          <span>Username</span>
          <input v-model="username" autocomplete="username" />
        </label>

        <label class="field">
          <span>Password</span>
          <input v-model="password" type="password" autocomplete="current-password" />
        </label>

        <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

        <button class="primary-button" :disabled="isSubmitting">
          {{ isSubmitting ? "Signing in..." : "Sign in" }}
        </button>
      </form>
    </section>
  </main>
</template>

