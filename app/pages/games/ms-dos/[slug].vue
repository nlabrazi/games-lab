<script setup lang="ts">
import { computed, ref } from "vue";
import { findDosGame } from "~/data/dosGames";

interface JsDosPlayerHandle {
  isPlayerReady: () => boolean;
  releaseKeyboardFocus: () => void;
  triggerJsDosSave: () => Promise<void>;
}

const route = useRoute();
const config = useRuntimeConfig();
const player = ref<JsDosPlayerHandle | null>(null);

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

const {
  authUser,
  isAuthenticated,
  isLoggingOut,
  isRestoringSave,
  isSavingToVps,
  lastSyncTime,
  openLoginDialog,
  logoutFromVps,
  saveToVps,
} = useDosSaveWorkflow({
  getBundleUrl: () => bundleUrl.value,
  getGameSlug: () => game.value.slug,
  isPlayerReady: () => player.value?.isPlayerReady() ?? false,
  releaseKeyboardFocus: () => {
    player.value?.releaseKeyboardFocus();
  },
  triggerJsDosSave: async () => {
    if (!player.value) {
      throw new Error("Le lecteur DOS n'est pas encore disponible.");
    }

    await player.value.triggerJsDosSave();
  },
});

const lastSavedAtLabel = computed(() => {
  if (!lastSyncTime.value) {
    return "";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(lastSyncTime.value);
});

const handleLogin = () => {
  openLoginDialog();
};

const handleSave = () => {
  void saveToVps();
};

const handleLogout = () => {
  void logoutFromVps();
};

useHead(() => ({
  title: `${game.value.title} - MS-DOS`,
}));
</script>

<template>
  <main class="min-h-screen bg-black">
    <DosSaveToolbar
      :is-authenticated="isAuthenticated"
      :is-logging-out="isLoggingOut"
      :is-restoring="isRestoringSave"
      :is-saving="isSavingToVps"
      :last-saved-at-label="lastSavedAtLabel"
      :title="game.title"
      :username="authUser?.username ?? ''"
      @login="handleLogin"
      @logout="handleLogout"
      @save="handleSave" />

    <ClientOnly>
      <JsDosPlayer ref="player" :bundle-url="bundleUrl" :game-slug="game.slug" :title="game.title" />

      <template #fallback>
        <section class="flex h-[calc(100vh-57px)] items-center justify-center bg-black px-4 text-center">
          <p class="font-pixel text-xs leading-6 text-neon-cyan">Chargement du lecteur DOS...</p>
        </section>
      </template>
    </ClientOnly>
  </main>
</template>
