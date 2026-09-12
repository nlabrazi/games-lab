import { computed, ref } from "vue";

interface DosFsChanges {
  urlToKey?: (bundleUrl: string) => string;
  pull?: (key: string) => Promise<Uint8Array | null>;
  push?: (key: string, bundle: Uint8Array) => Promise<void>;
  delete?: (key: string) => Promise<void>;
  local?: boolean;
}

interface DosOptions {
  url: string;
  pathPrefix?: string;
  theme?: "dark" | "retro";
  autoStart?: boolean;
  autoSave?: boolean;
  kiosk?: boolean;
  imageRendering?: "pixelated" | "smooth";
  renderAspect?: "Fit" | "4/3";
  scaleControls?: number;
  noCloud?: boolean;
  noNetworking?: boolean;
  fsChanges?: DosFsChanges;
  onEvent?: (event: "emu-ready" | "ci-ready" | "bnd-play" | string, arg?: unknown) => void;
}

interface CommandInterface {
  persist?: (onlyChanges?: boolean) => Promise<Uint8Array>;
  sendKeyEvent?: (keyCode: number, pressed: boolean) => void;
  simulateKeyPress?: (...keyCodes: number[]) => void;
  sendMouseMotion?: (x: number, y: number) => void;
  sendMouseRelativeMotion?: (x: number, y: number) => void;
  sendMouseButton?: (button: number, pressed: boolean) => void;
  sendMouseSync?: () => void;
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
  gameSlug?: () => string;
  kiosk?: boolean;
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

const extractGameSlug = (bundleUrl: string): string => {
  try {
    const pathname = new URL(bundleUrl, "http://localhost").pathname;
    const fileName = pathname.split("/").pop() || "";
    return fileName.replace(/\.jsdos$/i, "");
  } catch {
    return "";
  }
};

const openJsDosSaveDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB n'est pas disponible dans cet environnement."));
      return;
    }

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

const toUint8Array = (value: unknown): Uint8Array | null => {
  if (!value) {
    return null;
  }
  if (value instanceof Uint8Array) {
    return value;
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return null;
};

export const fetchServerSave = async (slug: string): Promise<Uint8Array | null> => {
  if (!slug || typeof window === "undefined" || typeof fetch === "undefined") {
    return null;
  }

  try {
    const response = await fetch(`/api/dos-saves/${slug}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();

    if (arrayBuffer && arrayBuffer.byteLength > 0) {
      return new Uint8Array(arrayBuffer);
    }

    return null;
  } catch {
    return null;
  }
};

const lastUploadedHashes = new Map<string, string>();

export const clearSaveHashCache = () => {
  lastUploadedHashes.clear();
};

export const computeSaveHash = async (bundle: Uint8Array): Promise<string> => {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const hashBuffer = await crypto.subtle.digest("SHA-256", bundle);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      // Fallback
    }
  }
  return `${bundle.byteLength}-${bundle[0] ?? 0}-${bundle[bundle.byteLength - 1] ?? 0}`;
};

export const registerLoadedSaveHash = (slug: string, hash: string) => {
  if (slug) {
    lastUploadedHashes.set(slug, hash);
  }
};

export const uploadServerSave = async (
  slug: string,
  saveBundle: Uint8Array,
  onUploaded?: () => void,
): Promise<boolean> => {
  if (
    !slug ||
    typeof window === "undefined" ||
    typeof fetch === "undefined" ||
    saveBundle.byteLength === 0
  ) {
    return false;
  }

  const hash = await computeSaveHash(saveBundle);
  if (lastUploadedHashes.get(slug) === hash) {
    // Rien n'a changé depuis le dernier upload : aucun transfert réseau inutile
    return true;
  }

  try {
    const blob = new Blob([saveBundle], { type: "application/octet-stream" });
    const response = await fetch(`/api/dos-saves/${slug}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: blob,
    });

    if (response.ok) {
      lastUploadedHashes.set(slug, hash);
      onUploaded?.();
    }

    return response.ok;
  } catch {
    return false;
  }
};

export const readJsDosSaveBundle = async (key: string): Promise<Uint8Array | null> => {
  if (typeof window === "undefined" || !window.indexedDB) {
    return null;
  }

  try {
    const database = await openJsDosSaveDatabase();

    const fetchKey = (targetKey: string) =>
      new Promise<ArrayBuffer | Uint8Array | undefined>((resolve, reject) => {
        const transaction = database.transaction(jsDosSaveStoreName, "readonly");
        const request = transaction.objectStore(jsDosSaveStoreName).get(targetKey);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });

    let rawValue = await fetchKey(key);

    if (!rawValue) {
      const alternateKey = key.endsWith(".changes")
        ? key.replace(/\.changes$/, "")
        : `${key}.changes`;
      rawValue = await fetchKey(alternateKey);
    }

    database.close();
    return toUint8Array(rawValue);
  } catch {
    return null;
  }
};

export const storeJsDosSaveBundle = async (
  bundleUrl: string,
  saveBundle: ArrayBuffer | Uint8Array,
) => {
  const database = await openJsDosSaveDatabase();
  const bufferToStore =
    saveBundle instanceof Uint8Array
      ? saveBundle.buffer.slice(
        saveBundle.byteOffset,
        saveBundle.byteOffset + saveBundle.byteLength,
      )
      : saveBundle;

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(jsDosSaveStoreName, "readwrite");

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error("Impossible d'enregistrer la sauvegarde js-dos."));

    transaction.objectStore(jsDosSaveStoreName).put(bufferToStore, bundleUrl);
  });

  database.close();
};

export const deleteJsDosSaveBundle = async (bundleUrl: string) => {
  try {
    const database = await openJsDosSaveDatabase();

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(jsDosSaveStoreName, "readwrite");

      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(new Error("Impossible de supprimer la sauvegarde js-dos."));

      transaction.objectStore(jsDosSaveStoreName).delete(bundleUrl);
    });

    database.close();
  } catch {
    // Ignore error if delete fails
  }
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

export const useJsDosPlayer = ({ getBundleUrl, gameSlug, kiosk }: UseJsDosPlayerOptions) => {
  const config = useRuntimeConfig();
  const playerElement = ref<HTMLDivElement | null>(null);
  const statusMessage = ref("Chargement du lecteur DOS...");
  const errorMessage = ref("");
  const saveSuccessMessage = ref("");
  const isReady = ref(false);
  const isSaving = ref(false);
  const isProcessingSaveFile = ref(false);
  const scriptUrl = computed(() => String(config.public.jsDosScriptUrl));
  const styleUrl = computed(() => String(config.public.jsDosStyleUrl));
  const pathPrefix = computed(() => String(config.public.jsDosPathPrefix || ""));

  let dosInstance: DosInstance | null = null;
  let commandInterface: CommandInterface | null = null;
  let jsDosAssetsPromise: Promise<void> | null = null;
  let autoSaveInterval: ReturnType<typeof setInterval> | null = null;
  let saveFeedbackTimeout: ReturnType<typeof setTimeout> | null = null;

  const resolvedGameSlug = computed(() => {
    if (gameSlug) {
      const explicit = gameSlug();
      if (explicit) return explicit;
    }
    return extractGameSlug(getBundleUrl());
  });

  const showSaveSuccess = (message: string) => {
    saveSuccessMessage.value = message;
    if (saveFeedbackTimeout) {
      clearTimeout(saveFeedbackTimeout);
    }
    saveFeedbackTimeout = setTimeout(() => {
      saveSuccessMessage.value = "";
      saveFeedbackTimeout = null;
    }, 3000);
  };

  const startAutoSaveTimer = () => {
    stopAutoSaveTimer();
    // Synchronisation en arrière-plan toutes les 30 secondes pour détecter les sauvegardes disquette en jeu.
    // Grâce au hachage (SHA-256), si rien n'a changé en jeu, 0 octet n'est envoyé sur le réseau.
    autoSaveInterval = setInterval(() => {
      if (dosInstance && isReady.value && !isSaving.value && !isProcessingSaveFile.value) {
        void saveGameState(true);
      }
    }, 30000);
  };

  const stopAutoSaveTimer = () => {
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
      autoSaveInterval = null;
    }
  };

  const handleVisibilityChange = () => {
    if (
      document.visibilityState === "hidden" &&
      dosInstance &&
      isReady.value &&
      !isSaving.value &&
      !isProcessingSaveFile.value
    ) {
      void saveGameState(true);
    }
  };

  const handleBeforeUnload = () => {
    if (dosInstance && isReady.value && !isSaving.value) {
      void saveGameState(true);
    }
  };

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
      saveSuccessMessage.value = "";
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
        kiosk: kiosk ?? false,
        imageRendering: "pixelated",
        renderAspect: "Fit",
        scaleControls: 1.15,
        noCloud: true,
        noNetworking: true,
        fsChanges: {
          urlToKey: (url: string) => url,
          pull: async (key: string) => {
            const slug = resolvedGameSlug.value;

            // 1. Priorité au serveur (permet la synchronisation multi-appareils PC <-> Téléphone)
            const serverSave = await fetchServerSave(slug);
            if (serverSave && serverSave.byteLength > 0) {
              const hash = await computeSaveHash(serverSave);
              registerLoadedSaveHash(slug, hash);
              void storeJsDosSaveBundle(key, serverSave);
              return serverSave;
            }

            // 2. Fallback local IndexedDB si pas de sauvegarde serveur ou hors-ligne
            const localSave = await readJsDosSaveBundle(key);
            if (localSave && slug) {
              const hash = await computeSaveHash(localSave);
              registerLoadedSaveHash(slug, hash);
            }
            return localSave;
          },
          push: async (key: string, bundle: Uint8Array) => {
            // 1. Écriture locale immédiate
            await storeJsDosSaveBundle(key, bundle);
          },
          delete: async (key: string) => {
            await deleteJsDosSaveBundle(key);
          },
        },
        onEvent: (event, arg) => {
          if (event === "ci-ready" && arg && typeof arg === "object") {
            commandInterface = arg as CommandInterface;
          }

          if (event === "bnd-play" || event === "emu-ready" || event === "ci-ready") {
            isReady.value = true;
            statusMessage.value = "";
            startAutoSaveTimer();
          }
        },
      });

      if (typeof window !== "undefined") {
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("beforeunload", handleBeforeUnload);
      }
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : "Erreur au chargement de js-dos.";
    }
  };

  const saveGameState = async (silent = false) => {
    if (!dosInstance || !isReady.value) {
      return false;
    }

    isSaving.value = true;
    if (!silent) {
      errorMessage.value = "";
    }

    try {
      if (dosInstance.save) {
        await dosInstance.save();
      } else if (dosInstance.layers?.save) {
        await dosInstance.layers.save();
      } else if (commandInterface?.persist) {
        const changes = await commandInterface.persist(true);
        if (changes && changes.byteLength > 0) {
          const bundleUrl = getBundleUrl();
          if (bundleUrl) {
            await storeJsDosSaveBundle(bundleUrl, changes);
            const slug = resolvedGameSlug.value;
            if (slug) {
              void uploadServerSave(slug, changes);
            }
          }
        }
      }

      if (!silent) {
        showSaveSuccess("Partie synchronisée !");
      }
      return true;
    } catch (error) {
      if (!silent) {
        errorMessage.value =
          error instanceof Error ? error.message : "Erreur lors de la sauvegarde.";
      }
      return false;
    } finally {
      isSaving.value = false;
    }
  };

  const triggerJsDosSave = async () => {
    await saveGameState();
  };

  const stopPlayer = async (saveBeforeStop = true) => {
    stopAutoSaveTimer();

    if (typeof window !== "undefined") {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    }

    if (saveFeedbackTimeout) {
      clearTimeout(saveFeedbackTimeout);
      saveFeedbackTimeout = null;
    }

    if (saveBeforeStop) {
      try {
        if (dosInstance?.save) {
          await dosInstance.save();
        }
      } catch {
        // Ignore save error on stop
      }
    }

    try {
      await dosInstance?.stop?.();
    } catch {
      // Ignore stop error
    }

    dosInstance = null;
    commandInterface = null;
    isReady.value = false;
  };

  const exportSaveFile = async () => {
    const bundleUrl = getBundleUrl();

    if (!bundleUrl) {
      throw new Error("Bundle js-dos introuvable.");
    }

    isProcessingSaveFile.value = true;
    errorMessage.value = "";

    try {
      if (dosInstance?.save) {
        await dosInstance.save();
      } else if (dosInstance?.layers?.save) {
        await dosInstance.layers.save();
      }

      let saveBundle = await readJsDosSaveBundle(bundleUrl);

      if (!saveBundle && commandInterface?.persist) {
        saveBundle = await commandInterface.persist(true);
        if (saveBundle && saveBundle.byteLength > 0) {
          await storeJsDosSaveBundle(bundleUrl, saveBundle);
        }
      }

      if (!saveBundle || saveBundle.byteLength === 0) {
        throw new Error(
          "Aucune sauvegarde détectée à exporter. Effectuez d'abord une sauvegarde dans le jeu (via l'icône de disquette).",
        );
      }

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
      showSaveSuccess("Sauvegarde exportée avec succès !");
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

    if (!file || file.size === 0) {
      errorMessage.value = "Le fichier sélectionné est vide ou invalide.";
      return;
    }

    isProcessingSaveFile.value = true;
    statusMessage.value = "Import de la sauvegarde...";
    errorMessage.value = "";

    try {
      const saveBundle = await file.arrayBuffer();

      await stopPlayer(false);
      await storeJsDosSaveBundle(bundleUrl, saveBundle);
      const slug = resolvedGameSlug.value;
      if (slug) {
        void uploadServerSave(slug, new Uint8Array(saveBundle));
      }
      await startPlayer();
      showSaveSuccess("Sauvegarde importée avec succès !");
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
    getCommandInterface: () => commandInterface,
    importSaveFile,
    isPlayerReady,
    isProcessingSaveFile,
    isReady,
    isSaving,
    playerElement,
    releaseKeyboardFocus,
    saveGameState,
    saveSuccessMessage,
    startPlayer,
    statusMessage,
    stopPlayer,
    triggerJsDosSave,
  };
};
