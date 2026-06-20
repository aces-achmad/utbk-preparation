<script setup lang="ts">
import { appEnv } from "../lib/env";
</script>

<template>
  <main class="app-shell">
    <section class="hero-card">
      <p class="eyebrow">UTBK Preparation</p>
      <h1>Scaffold runtime is ready.</h1>
      <p class="body-copy">
        Frontend is running with a single-origin API assumption at
        <code>{{ appEnv.VITE_API_BASE_PATH }}</code>.
      </p>
    </section>
  </main>
</template>
