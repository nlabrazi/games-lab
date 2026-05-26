<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";

const props = defineProps<{
  bundleUrl: string;
  gameSlug: string;
  title: string;
}>();

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
  closeLoginDialog,
  isLoggingIn,
  isLoginDialogOpen,
  loginError,
  loginPassword,
  loginUsername,
  restoreVpsSave,
  saveToVps,
  submitLogin,
  syncFeedback,
} = useDosSaveWorkflow({
  getBundleUrl: () => props.bundleUrl,
  getGameSlug: () => props.gameSlug,
  isPlayerReady,
  releaseKeyboardFocus,
  triggerJsDosSave,
});

defineExpose({
  isPlayerReady,
  releaseKeyboardFocus,
  saveToVps,
  triggerJsDosSave,
});

onMounted(() => {
  void startPlayer(restoreVpsSave);
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
      v-if="syncFeedback"
      class="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex justify-center sm:inset-x-auto sm:left-4 sm:justify-start"
      :role="syncFeedback.tone === 'error' ? 'alert' : 'status'"
      aria-live="polite">
      <div
        class="max-w-[calc(100vw-1.5rem)] border bg-black/70 px-3 py-2 shadow-lg backdrop-blur-[1px] sm:max-w-sm"
        :class="{
          'border-red-400/60 shadow-red-500/15': syncFeedback.tone === 'error',
          'border-neon-cyan/35 shadow-neon-cyan/15': syncFeedback.tone === 'pending',
          'border-green-400/45 shadow-green-400/15': syncFeedback.tone === 'success',
        }">
        <p
          class="font-pixel text-[8px] leading-5 sm:text-[9px]"
          :class="{
            'text-red-200': syncFeedback.tone === 'error',
            'text-neon-cyan': syncFeedback.tone === 'pending',
            'text-green-300': syncFeedback.tone === 'success',
          }">
          {{ syncFeedback.text }}
        </p>
      </div>
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
