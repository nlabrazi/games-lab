<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import DosTouchControls from "./DosTouchControls.vue";

const props = withDefaults(
  defineProps<{
    bundleUrl: string;
    title: string;
    gameSlug?: string;
    forceTouchControls?: boolean;
  }>(),
  {
    forceTouchControls: undefined,
  },
);

const emit = defineEmits<(e: "update:touchControlsVisible", value: boolean) => void>();

const saveFileInput = ref<HTMLInputElement | null>(null);
const isTouchDevice = ref(false);
const touchControlsVisible = ref(true);
const isRightClickArmed = ref(false);

const {
  errorMessage,
  exportSaveFile,
  getCommandInterface,
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

const shouldShowTouchControls = computed(() => {
  if (props.forceTouchControls !== undefined) {
    return props.forceTouchControls;
  }
  return isTouchDevice.value;
});

// Sécurisation des clics tactiles sur le canvas DOS
const MIN_CLICK_HOLD_MS = 75;
let pointerDownTime = 0;
let isSyntheticEvent = false;

const isCanvasTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "CANVAS" || target.classList.contains("emulator-canvas");
};

const handleCapturePointerDown = (event: PointerEvent) => {
  if (isSyntheticEvent || !isCanvasTarget(event.target)) return;

  pointerDownTime = performance.now();

  if (isRightClickArmed.value) {
    const ci = getCommandInterface();
    if (ci?.sendMouseButton && ci?.sendMouseMotion) {
      event.stopPropagation();
      event.preventDefault();

      const canvas = event.target as HTMLElement;
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

      ci.sendMouseMotion(x, y);
      ci.sendMouseButton(1, true);

      setTimeout(() => {
        ci.sendMouseButton?.(1, false);
        isRightClickArmed.value = false;
      }, MIN_CLICK_HOLD_MS);
    }
  }
};

const handleCapturePointerUp = (event: PointerEvent) => {
  if (isSyntheticEvent || !isCanvasTarget(event.target)) return;

  if (isRightClickArmed.value) {
    event.stopPropagation();
    event.preventDefault();
    return;
  }

  const elapsed = performance.now() - pointerDownTime;
  if (elapsed < MIN_CLICK_HOLD_MS) {
    // Le tap a été trop bref pour le polling INT 33h de DOS :
    // On temporise pour s'assurer que le bouton reste appuyé au moins MIN_CLICK_HOLD_MS
    event.stopImmediatePropagation();
    event.preventDefault();

    const canvas = event.target as HTMLElement;
    const eventProps = {
      bubbles: true,
      cancelable: true,
      clientX: event.clientX,
      clientY: event.clientY,
      screenX: event.screenX,
      screenY: event.screenY,
      button: event.button,
      buttons: event.buttons,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
    };

    setTimeout(() => {
      isSyntheticEvent = true;
      try {
        const syntheticUp = new PointerEvent("pointerup", eventProps);
        canvas.dispatchEvent(syntheticUp);
      } finally {
        isSyntheticEvent = false;
      }
    }, MIN_CLICK_HOLD_MS - elapsed);
  }
};

const attachCanvasStabilizers = () => {
  const el = playerElement.value;
  if (!el) return;
  el.addEventListener("pointerdown", handleCapturePointerDown, { capture: true });
  el.addEventListener("pointerup", handleCapturePointerUp, { capture: true });
};

const detachCanvasStabilizers = () => {
  const el = playerElement.value;
  if (!el) return;
  el.removeEventListener("pointerdown", handleCapturePointerDown, { capture: true });
  el.removeEventListener("pointerup", handleCapturePointerUp, { capture: true });
};

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

const toggleTouchControls = () => {
  touchControlsVisible.value = !touchControlsVisible.value;
  emit("update:touchControlsVisible", touchControlsVisible.value);
};

defineExpose({
  exportSaveFile: handleExportSave,
  importSaveFile,
  isProcessingSaveFile,
  isReady,
  isRightClickArmed,
  isSaving,
  isTouchDevice,
  openSaveImportDialog,
  saveGameState: handleManualSave,
  saveSuccessMessage,
  toggleTouchControls,
  touchControlsVisible,
});

onMounted(() => {
  if (typeof window !== "undefined") {
    isTouchDevice.value =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia?.("(pointer: coarse)").matches ||
      false;
  }
  attachCanvasStabilizers();
  void startPlayer();
});

onBeforeUnmount(() => {
  detachCanvasStabilizers();
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

    <!-- Overlay de contrôles tactiles optimisé (D-Pad Dungeon Crawler & Actions) -->
    <DosTouchControls
      v-if="isReady && shouldShowTouchControls"
      v-model="touchControlsVisible"
      v-model:right-click-active="isRightClickArmed" />

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
  touch-action: none;
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
  touch-action: none !important;
  user-select: none !important;
  -webkit-user-select: none !important;
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
  touch-action: none !important;
  user-select: none !important;
  -webkit-user-select: none !important;
  -webkit-touch-callout: none !important;
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
