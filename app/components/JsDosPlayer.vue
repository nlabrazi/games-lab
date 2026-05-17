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
  onEvent?: (event: string, arg?: unknown) => void;
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
        if (event === "ci-ready") {
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
  <section class="relative h-full min-h-[calc(100vh-57px)] bg-black">
    <div ref="playerElement" class="h-full min-h-[calc(100vh-57px)] w-full" :aria-label="title" />

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
