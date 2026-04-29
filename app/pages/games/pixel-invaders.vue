<script setup lang="ts">
import gameHtml from "~/assets/games/pixel-invaders/index.html?raw";
</script>

<template>
  <main class="min-h-screen bg-dark">
    <div class="flex items-center justify-between border-b border-neon-cyan/30 bg-dark-card px-4 py-3">
      <NuxtLink to="/" class="btn-pixel text-xs">Accueil</NuxtLink>
      <h1 class="font-pixel text-xs text-neon-cyan sm:text-sm">Pixel Invaders</h1>
    </div>

    <iframe :srcdoc="gameHtml" class="h-[calc(100vh-57px)] w-full border-0" title="Pixel Invaders" />
  </main>
</template>
