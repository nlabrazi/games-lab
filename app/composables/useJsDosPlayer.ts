import { computed, ref } from "vue";

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
  layers?: {
    save?: () => Promise<void>;
  };
  save?: () => Promise<boolean>;
  stop?: () => Promise<void>;
}

declare global {
  interface Window {
    Dos?: (element: HTMLDivElement, options: Partial<DosOptions>) => DosInstance;
  }
}

interface UseJsDosPlayerOptions {
  getBundleUrl: () => string;
}

type BeforeStartCallback = () => Promise<void> | void;

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

export const useJsDosPlayer = ({ getBundleUrl }: UseJsDosPlayerOptions) => {
  const config = useRuntimeConfig();
  const playerElement = ref<HTMLDivElement | null>(null);
  const statusMessage = ref("Chargement du lecteur DOS...");
  const errorMessage = ref("");
  const isReady = ref(false);
  const scriptUrl = computed(() => String(config.public.jsDosScriptUrl));
  const styleUrl = computed(() => String(config.public.jsDosStyleUrl));
  const pathPrefix = computed(() => String(config.public.jsDosPathPrefix || ""));

  let dosInstance: DosInstance | null = null;
  let jsDosAssetsPromise: Promise<void> | null = null;

  const loadJsDosAssets = () => {
    if (!jsDosAssetsPromise) {
      jsDosAssetsPromise = Promise.resolve()
        .then(() => loadStyle(styleUrl.value))
        .then(() => loadScript(scriptUrl.value));
    }

    return jsDosAssetsPromise;
  };

  const startPlayer = async (beforeStart?: BeforeStartCallback) => {
    if (!playerElement.value) {
      return;
    }

    const bundleUrl = getBundleUrl();

    if (!bundleUrl) {
      errorMessage.value = "Aucun bundle MS-DOS n'est configure pour ce jeu.";
      return;
    }

    try {
      await beforeStart?.();
      await loadJsDosAssets();

      if (!window.Dos) {
        throw new Error("js-dos n'a pas expose l'API Dos.");
      }

      statusMessage.value = "Initialisation du jeu...";
      dosInstance = window.Dos(playerElement.value, {
        url: bundleUrl,
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
      errorMessage.value =
        error instanceof Error ? error.message : "Erreur au chargement de js-dos.";
    }
  };

  const triggerJsDosSave = async () => {
    if (dosInstance?.layers?.save) {
      await dosInstance.layers.save();
      return;
    }

    const saved = await dosInstance?.save?.();

    if (saved === false) {
      throw new Error("js-dos n'a pas confirme la sauvegarde locale.");
    }
  };

  const stopPlayer = () => {
    void dosInstance?.save?.();
    void dosInstance?.stop?.();
  };

  const isPlayerReady = () => Boolean(dosInstance && isReady.value);

  const releaseKeyboardFocus = () => {
    const activeElement = document.activeElement;

    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  };

  return {
    errorMessage,
    isPlayerReady,
    isReady,
    playerElement,
    releaseKeyboardFocus,
    startPlayer,
    statusMessage,
    stopPlayer,
    triggerJsDosSave,
  };
};
