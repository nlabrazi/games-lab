<script setup lang="ts">
import gameHtml from "~/assets/games/puzzle-blocks/index.html?raw";
</script>

<template>
  <GameShell title="Puzzle Blocks">
    <iframe
      :srcdoc="gameHtml"
      class="h-full w-full border-0 block"
      title="Puzzle Blocks"
      allow="fullscreen"
    />
  </GameShell>
</template>
