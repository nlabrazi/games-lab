<script setup lang="ts">
import { computed, ref } from "vue";
import type JsDosPlayer from "~/components/JsDosPlayer.vue";
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

const playerRef = ref<InstanceType<typeof JsDosPlayer> | null>(null);

const handleExportSave = async () => {
  await playerRef.value?.exportSaveFile();
};

const handleImportSave = () => {
  playerRef.value?.openSaveImportDialog();
};

useHead(() => ({
  title: `${game.value.title} - MS-DOS`,
}));
</script>

<template>
  <GameShell :title="game.title">
    <template #actions>
      <button
        class="btn-pixel px-2 py-1 text-[9px] sm:px-3 sm:py-1.5 sm:text-[10px]"
        type="button"
        :disabled="!playerRef?.isReady || playerRef?.isProcessingSaveFile"
        @click="handleExportSave">
        Export
      </button>

      <button
        class="btn-pixel px-2 py-1 text-[9px] sm:px-3 sm:py-1.5 sm:text-[10px]"
        type="button"
        :disabled="!playerRef?.isReady || playerRef?.isProcessingSaveFile"
        @click="handleImportSave">
        Import
      </button>
    </template>

    <ClientOnly>
      <JsDosPlayer ref="playerRef" :bundle-url="bundleUrl" :title="game.title" />

      <template #fallback>
        <section class="flex h-full w-full items-center justify-center bg-black px-4 text-center">
          <p class="font-pixel text-xs leading-6 text-neon-cyan">Chargement du lecteur DOS...</p>
        </section>
      </template>
    </ClientOnly>
  </GameShell>
</template>
