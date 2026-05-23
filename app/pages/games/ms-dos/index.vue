<script setup lang="ts">
import { type DosGame, dosGames } from "~/data/dosGames";

const route = useRoute();
const queryGame = route.query.game;

if (typeof queryGame === "string") {
  await navigateTo(`/games/ms-dos/${queryGame}`, { replace: true });
}

const getGameRoute = (game: DosGame) => `/games/ms-dos/${game.slug}`;

useHead({
  title: "Catalogue MS-DOS",
});
</script>

<template>
  <main class="min-h-screen bg-black">
    <div class="flex items-center justify-between gap-3 border-b border-neon-cyan/30 bg-dark-card px-4 py-3">
      <NuxtLink to="/" class="btn-pixel shrink-0 text-xs">Accueil</NuxtLink>
      <h1 class="truncate text-right font-pixel text-[10px] text-neon-cyan sm:text-sm">
        Catalogue MS-DOS
      </h1>
    </div>

    <section class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <article
          v-for="game in dosGames"
          :key="game.slug"
          class="group flex min-h-[360px] flex-col overflow-hidden rounded-lg border bg-dark-card transition-colors"
          :class="
            game.status === 'available'
              ? 'border-neon-cyan/45 hover:border-neon-cyan'
              : 'border-gray-700/70 opacity-75'
          ">
          <div
            class="relative flex aspect-[4/3] items-center justify-center border-b border-white/10 bg-black"
            :style="{ '--dos-accent': game.thumbnail.accentColor }">
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,var(--dos-accent),transparent_38%)] opacity-25" />
            <div class="absolute inset-x-0 bottom-0 h-1 bg-[var(--dos-accent)] opacity-80" />
            <span
              class="relative max-w-[85%] text-center font-pixel text-lg leading-tight text-white sm:text-xl"
              :style="{ textShadow: `0 0 18px ${game.thumbnail.accentColor}` }">
              {{ game.thumbnail.label }}
            </span>
          </div>

          <div class="flex flex-1 flex-col gap-4 p-4">
            <div class="flex flex-wrap items-center gap-2">
              <span class="border border-neon-cyan/40 px-2 py-1 text-sm leading-none text-neon-cyan">
                {{ game.genre }}
              </span>
              <span class="border border-gray-600 px-2 py-1 text-sm leading-none text-gray-300">
                {{ game.releaseYear }}
              </span>
              <span
                class="ml-auto border px-2 py-1 text-sm leading-none"
                :class="
                  game.status === 'available'
                    ? 'border-green-400/60 text-green-300'
                    : 'border-gray-600 text-gray-400'
                ">
                {{ game.status === "available" ? "Disponible" : "Placeholder" }}
              </span>
            </div>

            <h2 class="font-pixel text-[11px] leading-6 text-white">
              {{ game.title }}
            </h2>
            <p class="flex-1 text-base leading-6 text-gray-300">
              {{ game.description }}
            </p>

            <NuxtLink v-if="game.status === 'available'" :to="getGameRoute(game)" class="btn-pixel text-center text-xs">
              Lancer
            </NuxtLink>
            <button
              v-else
              class="btn-pixel cursor-not-allowed text-xs opacity-50"
              disabled
              type="button">
              Indisponible
            </button>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>
