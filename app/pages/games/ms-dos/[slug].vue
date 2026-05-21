<script setup lang="ts">
import { computed } from "vue";
import JsDosPlayer from "~/components/JsDosPlayer.vue";
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

useHead(() => ({
  title: `${game.value.title} - MS-DOS`,
}));
</script>

<template>
  <main class="min-h-screen bg-black">
    <div class="flex items-center justify-between gap-3 border-b border-neon-cyan/30 bg-dark-card px-4 py-3">
      <NuxtLink to="/" class="btn-pixel shrink-0 text-xs">Accueil</NuxtLink>
      <h1 class="truncate text-right font-pixel text-[10px] text-neon-cyan sm:text-sm">
        MS-DOS / {{ game.title }}
      </h1>
    </div>

    <ClientOnly>
      <JsDosPlayer :bundle-url="bundleUrl" :title="game.title" />

      <template #fallback>
        <section class="flex h-[calc(100vh-57px)] items-center justify-center bg-black px-4 text-center">
          <p class="font-pixel text-xs leading-6 text-neon-cyan">Chargement du lecteur DOS...</p>
        </section>
      </template>
    </ClientOnly>
  </main>
</template>
