<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

interface DosOptions {
  url: string;
  pathPrefix?: string;
  theme?: "dark" | "retro";
  autoStart?: boolean;
  autoSave?: boolean;
  imageRendering?: "pixelated" | "smooth";
  renderAspect?: "Fit" | "4/3";
  scaleControls?: number;
  noCloud?: boolean;
  noNetworking?: boolean;
  onEvent?: (event: "emu-ready" | "ci-ready" | "bnd-play" | string, arg?: unknown) => void;
}

interface DosInstance {
  save?: () => Promise<boolean>;
  stop?: () => Promise<void>;
}

declare global {
  interface Window {
    Dos?: (element: HTMLDivElement, options: Partial<DosOptions>) => DosInstance;
  }
}

const props = defineProps<{
  bundleUrl: string;
  title: string;
}>();

const config = useRuntimeConfig();
const playerElement = ref<HTMLDivElement | null>(null);
const statusMessage = ref("Chargement du lecteur DOS...");
const errorMessage = ref("");
const isReady = ref(false);

let dosInstance: DosInstance | null = null;
let jsDosAssetsPromise: Promise<void> | null = null;

const scriptUrl = computed(() => String(config.public.jsDosScriptUrl));
const styleUrl = computed(() => String(config.public.jsDosStyleUrl));
const pathPrefix = computed(() => String(config.public.jsDosPathPrefix || ""));

const normalizeAssetUrl = (url: string) => new URL(url, window.location.href).href;

const loadStyle = (href: string) => {
  const absoluteHref = normalizeAssetUrl(href);
  const hasStyle = Array.from(document.styleSheets).some((sheet) => sheet.href === absoluteHref);

  if (hasStyle) {
    return;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
};

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    const absoluteSrc = normalizeAssetUrl(src);
    const existingScript = Array.from(document.scripts).find(
      (script) => script.src === absoluteSrc,
    );

    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Impossible de charger ${src}`));
    document.head.appendChild(script);
  });

const loadJsDosAssets = () => {
  if (!jsDosAssetsPromise) {
    jsDosAssetsPromise = Promise.resolve()
      .then(() => loadStyle(styleUrl.value))
      .then(() => loadScript(scriptUrl.value));
  }

  return jsDosAssetsPromise;
};

const startPlayer = async () => {
  if (!playerElement.value) {
    return;
  }

  if (!props.bundleUrl) {
    errorMessage.value = "Aucun bundle MS-DOS n'est configure pour ce jeu.";
    return;
  }

  try {
    await loadJsDosAssets();

    if (!window.Dos) {
      throw new Error("js-dos n'a pas expose l'API Dos.");
    }

    statusMessage.value = "Initialisation du jeu...";
    dosInstance = window.Dos(playerElement.value, {
      url: props.bundleUrl,
      pathPrefix: pathPrefix.value || undefined,
      theme: "dark",
      autoStart: false,
      autoSave: true,
      imageRendering: "pixelated",
      renderAspect: "Fit",
      scaleControls: 1.15,
      noCloud: true,
      noNetworking: true,
      onEvent: (event) => {
        if (event === "bnd-play" || event === "emu-ready" || event === "ci-ready") {
          isReady.value = true;
          statusMessage.value = "";
        }
      },
    });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Erreur au chargement de js-dos.";
  }
};

onMounted(() => {
  void startPlayer();
});

onBeforeUnmount(() => {
  void dosInstance?.save?.();
  void dosInstance?.stop?.();
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
