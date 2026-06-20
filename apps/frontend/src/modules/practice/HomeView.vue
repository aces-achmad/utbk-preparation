<script setup lang="ts">
import { useRouter } from "vue-router";

import { useAuthStore } from "../../stores/auth";

const authStore = useAuthStore();
const router = useRouter();

async function handleLogout() {
  await authStore.logout();
  await router.push("/login");
}
</script>

<template>
  <main class="app-shell">
    <section class="hero-card">
      <p class="eyebrow">UTBK Preparation</p>
      <h1>Authenticated shell is ready.</h1>
      <p class="body-copy">
        The application shell is now protected by backend session validation. Feature modules can be added under this route tree.
      </p>
      <button class="primary-button inline-action" @click="handleLogout">Logout</button>
    </section>
  </main>
</template>

