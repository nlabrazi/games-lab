<script setup lang="ts">
const route = useRoute();
const queryGame = route.query.game;
const targetSlug = typeof queryGame === "string" ? queryGame : "lands-of-lore";

await navigateTo(`/games/ms-dos/${targetSlug}`, { replace: true });
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-black px-4 text-center">
    <p class="font-pixel text-xs leading-6 text-neon-cyan">Chargement du lanceur MS-DOS...</p>
  </main>
</template>
