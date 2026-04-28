<!--
  Vue détaillée d'un jeu sélectionné. Bouton retour et lien pour jouer.
-->
<template>
  <div class="bg-dark-card border-2 border-neon-cyan rounded-xl p-8 shadow-neon-cyan/30 shadow-2xl max-w-2xl mx-auto">
    <button class="btn-pixel text-sm mb-6" @click="$emit('back')">⬅ Retour</button>
    <h3 class="font-pixel text-2xl text-neon-magenta mb-6">{{ selectedGame.title }}</h3>
    <p class="text-xl leading-relaxed mb-8">{{ selectedGame.longDesc }}</p>
    <a :href="selectedGame.link" target="_blank" rel="noopener" class="btn-pixel inline-block">
      🎮 Jouer
    </a>
    <p class="mt-4 text-sm text-gray-400">(lien à mettre à jour avec l'URL de ton jeu)</p>
  </div>
</template>

<script setup lang="ts">
import type { Game } from "@/data/games";

defineProps<{
  selectedGame: Game;
}>();

defineEmits<{
  back: [];
}>();
</script>
