<script setup lang="ts">
import { computed } from "vue";
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
    <header class="border-b border-neon-cyan/30 bg-dark-card px-4 py-3">
      <div class="flex flex-wrap items-center gap-3">
        <NuxtLink to="/" class="btn-pixel text-xs">Accueil</NuxtLink>

        <h1 class="min-w-0 flex-1 font-pixel text-[10px] leading-5 text-neon-cyan sm:text-sm">
          <span class="block truncate">{{ game.title }}</span>
        </h1>
      </div>
    </header>

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
