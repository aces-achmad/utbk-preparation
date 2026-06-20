<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { RouterView } from "vue-router";

import { useAuthStore } from "../../stores/auth";

const authStore = useAuthStore();
const { status } = storeToRefs(authStore);
const isReady = computed(() => status.value !== "loading");
</script>

<template>
  <div v-if="isReady">
    <RouterView />
  </div>
  <main v-else class="app-shell">
    <section class="hero-card">
      <p class="eyebrow">UTBK Preparation</p>
      <h1>Checking session...</h1>
    </section>
  </main>
</template>

