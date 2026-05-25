<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { DosAuthUsername } from "~/composables/useDosAuth";

const props = defineProps<{
  bundleUrl: string;
  gameSlug: string;
  title: string;
}>();

const isLoginDialogOpen = ref(false);
const loginUsername = ref<DosAuthUsername>("admin");
const loginPassword = ref("");
const shouldSaveAfterLogin = ref(false);
const vpsSyncAction = ref<"restore" | "save" | "logout" | null>(null);
const {
  clearLoginError,
  clearSession,
  isLoggingIn,
  isLoggingOut,
  login,
  loginError,
  logout,
  refreshSession,
  user: authUser,
} = useDosAuth();
const {
  errorMessage,
  isPlayerReady,
  isReady,
  playerElement,
  releaseKeyboardFocus,
  startPlayer,
  statusMessage,
  stopPlayer,
  triggerJsDosSave,
} = useJsDosPlayer({
  getBundleUrl: () => props.bundleUrl,
});

const {
  clearFeedback: clearVpsSyncFeedback,
  error: saveError,
  isLoading: isLoadingFromVps,
  isSaving: isSavingToVps,
  loadVpsSave,
  message: saveMessage,
  saveVpsSave,
} = useVpsSync({
  clearSession,
  getBundleUrl: () => props.bundleUrl,
  getGameSlug: () => props.gameSlug,
  isPlayerReady,
  triggerJsDosSave,
  user: authUser,
});

let feedbackTimer: ReturnType<typeof setTimeout> | null = null;

const getErrorMessage = (error: unknown, fallbackMessage: string) =>
  error instanceof Error ? error.message : fallbackMessage;

const clearFeedbackTimer = () => {
  if (!feedbackTimer) {
    return;
  }

  clearTimeout(feedbackTimer);
  feedbackTimer = null;
};

const clearVpsFeedback = () => {
  clearFeedbackTimer();
  clearVpsSyncFeedback();
  vpsSyncAction.value = null;
};

const scheduleFeedbackClear = () => {
  clearFeedbackTimer();

  feedbackTimer = setTimeout(() => {
    clearVpsFeedback();
  }, 4500);
};

const vpsSyncFeedback = computed(() => {
  if (saveError.value) {
    return {
      text: saveError.value,
      tone: "error",
    } as const;
  }

  if (isSavingToVps.value) {
    return {
      text: "Sauvegarde en cours...",
      tone: "pending",
    } as const;
  }

  if (isLoadingFromVps.value) {
    return {
      text: "Chargement sauvegarde...",
      tone: "pending",
    } as const;
  }

  if (!saveMessage.value) {
    return null;
  }

  if (vpsSyncAction.value === "restore") {
    return {
      text: "Sauvegarde chargee",
      tone: "success",
    } as const;
  }

  if (vpsSyncAction.value === "save") {
    return {
      text: "Progression sauvegardee",
      tone: "success",
    } as const;
  }

  return {
    text: saveMessage.value,
    tone: "success",
  } as const;
});

const openLoginDialog = () => {
  releaseKeyboardFocus();
  isLoginDialogOpen.value = true;
};

const saveToVps = async () => {
  await refreshSession();

  if (!authUser.value) {
    shouldSaveAfterLogin.value = true;
    openLoginDialog();
    return;
  }

  clearFeedbackTimer();
  vpsSyncAction.value = "save";
  await saveVpsSave();
};

const submitLogin = async () => {
  const loggedInUser = await login(loginUsername.value, loginPassword.value);

  if (!loggedInUser) {
    return;
  }

  loginPassword.value = "";
  isLoginDialogOpen.value = false;

  if (shouldSaveAfterLogin.value) {
    shouldSaveAfterLogin.value = false;
    clearFeedbackTimer();
    vpsSyncAction.value = "save";
    await saveVpsSave();
  }
};

const logoutFromVps = async () => {
  clearVpsFeedback();

  try {
    await logout();
    closeLoginDialog();
    vpsSyncAction.value = "logout";
    saveMessage.value = "Session VPS fermee";
  } catch (error) {
    saveError.value = getErrorMessage(error, "Deconnexion impossible.");
  }
};

const closeLoginDialog = () => {
  shouldSaveAfterLogin.value = false;
  isLoginDialogOpen.value = false;
  clearLoginError();
  loginPassword.value = "";
};

const restoreVpsSave = async () => {
  await refreshSession();

  if (!authUser.value) {
    return;
  }

  clearFeedbackTimer();
  vpsSyncAction.value = "restore";
  await loadVpsSave();

  if (!saveMessage.value && !saveError.value) {
    vpsSyncAction.value = null;
  }
};

defineExpose({
  saveToVps,
});

onMounted(() => {
  void startPlayer(restoreVpsSave);
});

onBeforeUnmount(() => {
  clearFeedbackTimer();
  stopPlayer();
});

watch(saveMessage, (message) => {
  if (message) {
    scheduleFeedbackClear();
  }
});
</script>

<template>
  <section class="dos-player-shell relative h-full min-h-[calc(100vh-57px)] overflow-hidden bg-black">
    <div
      ref="playerElement"
      class="dos-player h-full min-h-[calc(100vh-57px)] w-full"
      data-theme="dark"
      :aria-label="title" />

    <div
      v-if="statusMessage || errorMessage"
      class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/80 px-4 text-center">
      <div class="max-w-lg border border-neon-cyan/50 bg-dark-card/95 p-5 shadow-lg shadow-neon-cyan/20">
        <p class="font-pixel text-[10px] leading-6 text-neon-cyan sm:text-xs">
          {{ errorMessage || statusMessage }}
        </p>
        <p v-if="errorMessage" class="mt-4 text-base leading-relaxed text-gray-300">
          Bundle attendu : {{ bundleUrl }}
        </p>
      </div>
    </div>

    <div
      v-if="vpsSyncFeedback"
      class="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex justify-center sm:inset-x-auto sm:left-4 sm:justify-start"
      :role="vpsSyncFeedback.tone === 'error' ? 'alert' : 'status'"
      aria-live="polite">
      <div
        class="max-w-[calc(100vw-1.5rem)] border bg-black/70 px-3 py-2 shadow-lg backdrop-blur-[1px] sm:max-w-sm"
        :class="{
          'border-red-400/60 shadow-red-500/15': vpsSyncFeedback.tone === 'error',
          'border-neon-cyan/35 shadow-neon-cyan/15': vpsSyncFeedback.tone === 'pending',
          'border-green-400/45 shadow-green-400/15': vpsSyncFeedback.tone === 'success',
        }">
        <p
          class="font-pixel text-[8px] leading-5 sm:text-[9px]"
          :class="{
            'text-red-200': vpsSyncFeedback.tone === 'error',
            'text-neon-cyan': vpsSyncFeedback.tone === 'pending',
            'text-green-300': vpsSyncFeedback.tone === 'success',
          }">
          {{ vpsSyncFeedback.text }}
        </p>
      </div>
    </div>

    <div
      v-if="authUser"
      class="absolute right-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] items-center gap-2 border border-neon-cyan/25 bg-black/55 px-2 py-1 shadow-md shadow-neon-cyan/10 backdrop-blur-[1px] sm:right-4 sm:top-4">
      <span class="truncate font-pixel text-[8px] leading-5 text-neon-cyan sm:text-[9px]">
        Compte {{ authUser.username }}
      </span>
      <button
        type="button"
        class="shrink-0 border-l border-neon-cyan/25 pl-2 text-[10px] leading-none text-gray-300 hover:text-white disabled:opacity-60 sm:text-xs"
        :disabled="isLoggingOut"
        @click="logoutFromVps">
        {{ isLoggingOut ? "..." : "Deconnexion" }}
      </button>
    </div>

    <DosAuthModal
      v-model:password="loginPassword"
      v-model:username="loginUsername"
      :error="loginError"
      :loading="isLoggingIn"
      :open="isLoginDialogOpen"
      @close="closeLoginDialog"
      @submit="submitLogin" />

    <span v-if="isReady" class="sr-only">Lecteur MS-DOS pret</span>
  </section>
</template>

<style scoped>
.dos-player-shell,
.dos-player {
  background: #000;
}

.dos-player-shell :deep(.jsdos-rso) {
  --b1: 0 0% 0%;
  --b2: 220 22% 8%;
  --b3: 220 22% 10%;
  --bc: 180 100% 86%;
  --p: 178 72% 46%;
  --pf: 178 72% 36%;
  --pc: 0 0% 100%;
  --a: 178 72% 46%;
  --af: 178 72% 36%;
  --ac: 0 0% 100%;
  --n: 220 22% 10%;
  --nc: 180 100% 86%;
  width: 100%;
  min-height: calc(100vh - 57px);
  height: 100%;
  background: #000 !important;
  color-scheme: dark;
}

.dos-player-shell :deep(.jsdos-rso .window),
.dos-player-shell :deep(.jsdos-rso .frame-root),
.dos-player-shell :deep(.jsdos-rso .emulator-root) {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: calc(100vh - 57px);
  background: #000 !important;
}

.dos-player-shell :deep(.jsdos-rso .window .background-image),
.dos-player-shell :deep(.jsdos-rso .window .background-image::after) {
  background: #000 !important;
  opacity: 0 !important;
}

.dos-player-shell :deep(.jsdos-rso .frame),
.dos-player-shell :deep(.jsdos-rso .pre-run-window),
.dos-player-shell :deep(.jsdos-rso .settings-frame),
.dos-player-shell :deep(.jsdos-rso .prerun-frame) {
  background: #000 !important;
  color: #dff;
}

.dos-player-shell :deep(.jsdos-rso textarea) {
  background: #050814 !important;
  color: #dff;
  resize: none;
}

.dos-player-shell :deep(.jsdos-rso .emulator-canvas),
.dos-player-shell :deep(.jsdos-rso canvas) {
  max-width: none;
}

.dos-player-shell :deep(.jsdos-rso .emulator-click-to-start-overlay) {
  background: rgb(0 0 0 / 0.65);
}
</style>
