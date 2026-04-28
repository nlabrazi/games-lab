<!--
  Grille responsive des cartes jeux. Émet l'événement "select" avec l'objet du jeu.
-->
<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
    <GameCard v-for="game in games" :key="game.id" :game="game" @select="$emit('select', game)" />
  </div>
</template>

<script setup lang="ts">
import type { Game } from "@/data/games";
import { games } from "@/data/games";

defineEmits<{
  select: [game: Game];
}>();
</script>
