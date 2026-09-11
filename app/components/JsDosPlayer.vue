<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps<{
  bundleUrl: string;
  title: string;
  gameSlug?: string;
}>();

const saveFileInput = ref<HTMLInputElement | null>(null);
const {
  errorMessage,
  exportSaveFile,
  importSaveFile,
  isProcessingSaveFile,
  isReady,
  isSaving,
  playerElement,
  saveGameState,
  saveSuccessMessage,
  startPlayer,
  statusMessage,
  stopPlayer,
} = useJsDosPlayer({
  getBundleUrl: () => props.bundleUrl,
  gameSlug: () => props.gameSlug || "",
});

const handleExportSave = async () => {
  await exportSaveFile();
};

const handleManualSave = async () => {
  await saveGameState();
};

const openSaveImportDialog = () => {
  saveFileInput.value?.click();
};

const handleSaveImport = async (event: Event) => {
  const input = event.target;

  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  const [file] = Array.from(input.files || []);
  input.value = "";

  if (!file) {
    return;
  }

  await importSaveFile(file);
};

defineExpose({
  exportSaveFile: handleExportSave,
  importSaveFile,
  isProcessingSaveFile,
  isReady,
  isSaving,
  openSaveImportDialog,
  saveGameState: handleManualSave,
  saveSuccessMessage,
});

onMounted(() => {
  void startPlayer();
});

onBeforeUnmount(() => {
  stopPlayer();
});
</script>

<template>
  <section class="dos-player-shell relative h-full w-full overflow-hidden bg-black">
    <input
      ref="saveFileInput"
      class="hidden"
      type="file"
      accept=".jdsave,.jsdos,application/octet-stream"
      @change="handleSaveImport" />

    <div
      ref="playerElement"
      class="dos-player h-full w-full"
      data-theme="dark"
      :aria-label="title" />

    <!-- Discret indicateur de synchronisation cloud en cas de succès -->
    <Transition name="fade">
      <div
        v-if="saveSuccessMessage"
        class="pointer-events-none absolute top-3 right-3 z-30 flex items-center gap-1.5 rounded-full border border-neon-cyan/40 bg-black/80 px-3 py-1 text-[9px] text-neon-cyan shadow-md backdrop-blur-sm">
        <span class="inline-block h-1.5 w-1.5 rounded-full bg-neon-cyan animate-pulse" />
        <span>{{ saveSuccessMessage }}</span>
      </div>
    </Transition>

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
  height: 100%;
  min-height: 100%;
  background: #000 !important;
  color-scheme: dark;
}

.dos-player-shell :deep(.jsdos-rso .window),
.dos-player-shell :deep(.jsdos-rso .frame-root),
.dos-player-shell :deep(.jsdos-rso .emulator-root) {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 100%;
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
