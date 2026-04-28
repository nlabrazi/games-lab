<!--
  Carte cliquable pour un jeu. Affiche une icône/placeholder, le titre et une description courte.
  Au clic, émet l'événement "select".
-->
<template>
  <button
    class="group bg-dark-card border-2 border-neon-magenta/40 rounded-xl p-6 text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-neon-magenta/30 hover:shadow-2xl hover:border-neon-magenta focus:outline-none"
    @click="$emit('select')">
    <div class="w-full h-40 rounded-lg mb-5 flex items-center justify-center text-5xl border border-neon-magenta/60"
      :style="{ backgroundColor: game.color + '33' }">
      {{ game.icon }}
    </div>
    <h3 class="font-pixel text-xs sm:text-sm text-white mb-3 tracking-wider">{{ game.title }}</h3>
    <p class="text-base sm:text-lg text-gray-300">{{ game.shortDesc }}</p>
  </button>
</template>

<script setup lang="ts">
import type { Game } from "@/data/games";

defineProps<{
  game: Game;
}>();

defineEmits<{
  select: [];
}>();
</script>
