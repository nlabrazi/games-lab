<script setup lang="ts">
import { computed, ref } from "vue";
import { findDosGame } from "~/data/dosGames";

const route = useRoute();
const config = useRuntimeConfig();

const gameSlug = computed(() => {
  const routeSlug = route.params.slug;
  return typeof routeSlug === "string" ? routeSlug : "";
});

const game = computed(() => findDosGame(gameSlug.value));

if (!game.value || game.value.status !== "available") {
  throw createError({
    statusCode: 404,
    statusMessage: "Jeu MS-DOS introuvable",
  });
}

const joinUrl = (baseUrl: string, fileName: string) => {
  if (/^https?:\/\//.test(baseUrl)) {
    return new URL(fileName, `${baseUrl.replace(/\/+$/, "")}/`).toString();
  }

  return `${baseUrl.replace(/\/+$/, "")}/${fileName.replace(/^\/+/, "")}`;
};

const bundleUrl = computed(() =>
  joinUrl(String(config.public.dosGamesBaseUrl), game.value.bundleFile),
);

const forceTouchControls = ref<boolean | undefined>(undefined);

const toggleTouchControls = () => {
  forceTouchControls.value =
    forceTouchControls.value === undefined ? true : !forceTouchControls.value;
};

useHead(() => ({
  title: `${game.value.title} - MS-DOS`,
}));
</script>

<template>
  <GameShell :title="game.title">
    <template #actions>
      <button
        type="button"
        class="btn-pixel flex items-center gap-1 px-2 py-1 text-[10px] sm:text-xs transition-colors shrink-0"
        :class="forceTouchControls ? 'border-neon-cyan bg-neon-cyan/20 text-neon-cyan shadow-sm shadow-neon-cyan/40' : 'text-gray-300'"
        :title="forceTouchControls ? 'Masquer la manette tactile' : 'Afficher la manette tactile'"
        :aria-label="forceTouchControls ? 'Masquer la manette tactile' : 'Afficher la manette tactile'"
        @click="toggleTouchControls"
      >
        <span>🎮</span>
        <span class="hidden md:inline">{{ forceTouchControls ? 'Manette active' : 'Manette' }}</span>
      </button>
    </template>

    <ClientOnly>
      <JsDosPlayer
        :bundle-url="bundleUrl"
        :title="game.title"
        :game-slug="gameSlug"
        :force-touch-controls="forceTouchControls" />

      <template #fallback>
        <section class="flex h-full w-full items-center justify-center bg-black px-4 text-center">
          <p class="font-pixel text-xs leading-6 text-neon-cyan">Chargement du lecteur DOS...</p>
        </section>
      </template>
    </ClientOnly>
  </GameShell>
</template>
