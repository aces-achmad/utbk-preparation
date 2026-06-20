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
  <main class="workspace-shell">
    <section class="hero-card workspace-card">
      <p class="eyebrow">UTBK Preparation</p>
      <h1>Authenticated shell is ready.</h1>
      <p class="body-copy">
        Session auth aktif. Modul authoring dan practice berikutnya bisa tumbuh di atas shell ini.
      </p>

      <nav class="workspace-nav">
        <RouterLink class="workspace-link" to="/imports">Open import preview</RouterLink>
      </nav>

      <button class="primary-button inline-action" @click="handleLogout">Logout</button>
    </section>
  </main>
</template>
