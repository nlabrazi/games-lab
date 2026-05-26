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

interface CommandInterface {
  persist?: () => Promise<Uint8Array>;
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

const jsDosSaveDatabaseName = "js-dos-cache (emulators-ui-saves)";
const jsDosSaveStoreName = "files";

const normalizeAssetUrl = (url: string) => new URL(url, window.location.href).href;

const getSaveFileName = (bundleUrl: string) => {
  const bundleFileName =
    new URL(bundleUrl, window.location.href).pathname.split("/").pop() || "save";
  const baseName = bundleFileName.replace(/\.jsdos$/i, "");

  return `${baseName || "save"}.jdsave`;
};

const openJsDosSaveDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(jsDosSaveDatabaseName, 1);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(jsDosSaveStoreName)) {
        database.createObjectStore(jsDosSaveStoreName);
      }
    };

    request.onerror = () => {
      reject(new Error("Impossible d'ouvrir le stockage local js-dos."));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });

const storeJsDosSaveBundle = async (bundleUrl: string, saveBundle: ArrayBuffer) => {
  const database = await openJsDosSaveDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(jsDosSaveStoreName, "readwrite");

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error("Impossible d'importer la sauvegarde js-dos."));

    transaction.objectStore(jsDosSaveStoreName).put(saveBundle, bundleUrl);
  });

  database.close();
};

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
  const isProcessingSaveFile = ref(false);
  const scriptUrl = computed(() => String(config.public.jsDosScriptUrl));
  const styleUrl = computed(() => String(config.public.jsDosStyleUrl));
  const pathPrefix = computed(() => String(config.public.jsDosPathPrefix || ""));

  let dosInstance: DosInstance | null = null;
  let commandInterface: CommandInterface | null = null;
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
      errorMessage.value = "";
      isReady.value = false;
      commandInterface = null;
      statusMessage.value = "Chargement du lecteur DOS...";

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
        onEvent: (event, arg) => {
          if (event === "ci-ready" && arg && typeof arg === "object") {
            commandInterface = arg as CommandInterface;
          }

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

  const stopPlayer = async () => {
    await dosInstance?.save?.();
    await dosInstance?.stop?.();
    dosInstance = null;
    commandInterface = null;
    isReady.value = false;
  };

  const exportSaveFile = async () => {
    const bundleUrl = getBundleUrl();

    if (!bundleUrl) {
      throw new Error("Bundle js-dos introuvable.");
    }

    if (!commandInterface?.persist) {
      throw new Error("L'export de sauvegarde n'est pas encore pret.");
    }

    isProcessingSaveFile.value = true;

    try {
      await triggerJsDosSave();

      const saveBundle = await commandInterface.persist();
      const fileUrl = window.URL.createObjectURL(
        new Blob([saveBundle], { type: "application/octet-stream" }),
      );
      const link = document.createElement("a");

      link.href = fileUrl;
      link.download = getSaveFileName(bundleUrl);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(fileUrl);
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : "Impossible d'exporter la sauvegarde locale.";
    } finally {
      isProcessingSaveFile.value = false;
    }
  };

  const importSaveFile = async (file: File) => {
    const bundleUrl = getBundleUrl();

    if (!bundleUrl) {
      throw new Error("Bundle js-dos introuvable.");
    }

    isProcessingSaveFile.value = true;
    statusMessage.value = "Import de la sauvegarde...";
    errorMessage.value = "";

    try {
      const saveBundle = await file.arrayBuffer();

      await storeJsDosSaveBundle(bundleUrl, saveBundle);
      await stopPlayer();
      await startPlayer();
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : "Impossible d'importer la sauvegarde locale.";
    } finally {
      isProcessingSaveFile.value = false;
    }
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
    exportSaveFile,
    importSaveFile,
    isProcessingSaveFile,
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
