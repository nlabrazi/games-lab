<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
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

const getErrorMessage = (error: unknown, fallbackMessage: string) =>
  error instanceof Error ? error.message : fallbackMessage;

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
    await saveVpsSave();
  }
};

const logoutFromVps = async () => {
  clearVpsSyncFeedback();

  try {
    await logout();
    closeLoginDialog();
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

defineExpose({
  saveToVps,
});

onMounted(() => {
  void startPlayer(async () => {
    await refreshSession();
    await loadVpsSave();
  });
});

onBeforeUnmount(() => {
  stopPlayer();
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
      v-if="saveMessage || saveError || isSavingToVps"
      class="pointer-events-none absolute bottom-4 left-4 z-10 max-w-sm border border-neon-cyan/40 bg-dark-card/95 px-4 py-3 shadow-lg shadow-neon-cyan/20">
      <p class="font-pixel text-[9px] leading-5 text-neon-cyan">
        {{ isSavingToVps ? "Sauvegarde VPS..." : saveError || saveMessage }}
      </p>
    </div>

    <div
      v-if="authUser"
      class="absolute right-4 top-4 z-10 flex items-center gap-2 border border-neon-cyan/40 bg-dark-card/90 px-3 py-2 shadow-lg shadow-neon-cyan/20">
      <span class="font-pixel text-[9px] leading-5 text-neon-cyan">VPS {{ authUser.username }}</span>
      <button
        type="button"
        class="text-xs leading-none text-gray-300 hover:text-white disabled:opacity-60"
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
