<script setup lang="ts">
import gameHtml from "~/assets/games/pixel-invaders/index.html?raw";
</script>

<template>
  <GameShell title="Pixel Invaders">
    <iframe
      :srcdoc="gameHtml"
      class="h-full w-full border-0 block"
      title="Pixel Invaders"
      allow="fullscreen"
    />
  </GameShell>
</template>
