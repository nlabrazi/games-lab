<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps<{
  bundleUrl: string;
  title: string;
}>();

const saveFileInput = ref<HTMLInputElement | null>(null);
const {
  errorMessage,
  exportSaveFile,
  importSaveFile,
  isProcessingSaveFile,
  isReady,
  playerElement,
  startPlayer,
  statusMessage,
  stopPlayer,
} = useJsDosPlayer({
  getBundleUrl: () => props.bundleUrl,
});

const handleExportSave = async () => {
  await exportSaveFile();
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
  isProcessingSaveFile,
  isReady,
  openSaveImportDialog,
});

onMounted(() => {
  void startPlayer();
});

onBeforeUnmount(() => {
  stopPlayer();
});
</script>

<template>
  <section class="dos-player-shell relative h-full min-h-[calc(100vh-57px)] overflow-hidden bg-black">
    <input
      ref="saveFileInput"
      class="hidden"
      type="file"
      accept=".jdsave,.jsdos,application/octet-stream"
      @change="handleSaveImport" />

    <div
      ref="playerElement"
      class="dos-player h-full min-h-[calc(100vh-57px)] w-full"
      data-theme="dark"
      :aria-label="title" />

    <div
      class="absolute bottom-4 left-4 z-10 max-w-md border border-neon-cyan/35 bg-black/70 px-3 py-2 text-[10px] text-neon-cyan backdrop-blur-sm">
      Sauvegarde locale via js-dos. Exporte un fichier de backup pour ce bundle, puis importe-le dans ce
      meme jeu.
    </div>

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
