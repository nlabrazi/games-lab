<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { DosAuthUsername } from "~/composables/useDosAuth";

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

const props = defineProps<{
  bundleUrl: string;
  gameSlug: string;
  title: string;
}>();

const config = useRuntimeConfig();
const playerElement = ref<HTMLDivElement | null>(null);
const statusMessage = ref("Chargement du lecteur DOS...");
const errorMessage = ref("");
const isReady = ref(false);
const isLoginDialogOpen = ref(false);
const loginUsername = ref<DosAuthUsername>("admin");
const loginPassword = ref("");
const isSavingToVps = ref(false);
const saveMessage = ref("");
const saveError = ref("");
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

let dosInstance: DosInstance | null = null;
let jsDosAssetsPromise: Promise<void> | null = null;

// js-dos stores anonymous browser-local saves under its own "guest" cache profile.
// This is unrelated to the app-level admin/guest VPS accounts.
const jsDosSaveDatabaseNames = [
  "js-dos-cache (guest)",
  "js-dos-cache (emulators-ui-saves)",
] as const;
const jsDosSaveStoreName = "files";

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

const getErrorMessage = (error: unknown, fallbackMessage: string) =>
  error instanceof Error ? error.message : fallbackMessage;

const openJsDosSaveDatabase = (databaseName: string) =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB n'est pas disponible dans ce navigateur."));
      return;
    }

    const request = window.indexedDB.open(databaseName, 1);

    request.onerror = () => reject(request.error ?? new Error("Impossible d'ouvrir IndexedDB."));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(jsDosSaveStoreName)) {
        database.createObjectStore(jsDosSaveStoreName);
      }
    };
  });

const getJsDosSaveKeyCandidates = (key: string) =>
  Array.from(new Set([key, normalizeAssetUrl(key)]));

interface BlobLike {
  arrayBuffer: () => Promise<ArrayBuffer>;
}

const isBlobLike = (value: unknown): value is BlobLike =>
  typeof value === "object" &&
  value !== null &&
  "arrayBuffer" in value &&
  typeof value.arrayBuffer === "function";

const getJsDosSavePayload = async (value: unknown) => {
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (ArrayBuffer.isView(value) && value.buffer instanceof ArrayBuffer) {
    return new Uint8Array(
      value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength),
    );
  }

  if (isBlobLike(value)) {
    return new Uint8Array(await value.arrayBuffer());
  }

  return null;
};

const readJsDosStoreValue = (database: IDBDatabase, key: string) =>
  new Promise<unknown>((resolve, reject) => {
    const transaction = database.transaction(jsDosSaveStoreName, "readonly");
    const request = transaction.objectStore(jsDosSaveStoreName).get(key);

    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Impossible de lire la sauvegarde locale."));
    request.onerror = () =>
      reject(request.error ?? new Error("Impossible de lire la sauvegarde locale."));
    request.onsuccess = () => resolve(request.result);
  });

const readJsDosSaveBundle = async (key: string) => {
  for (const databaseName of jsDosSaveDatabaseNames) {
    const database = await openJsDosSaveDatabase(databaseName);

    try {
      for (const keyCandidate of getJsDosSaveKeyCandidates(key)) {
        const payload = await getJsDosSavePayload(
          await readJsDosStoreValue(database, keyCandidate),
        );

        if (payload) {
          return payload;
        }
      }
    } finally {
      database.close();
    }
  }

  throw new Error("Sauvegarde locale js-dos introuvable.");
};

const writeJsDosSaveBundleToDatabase = async (
  database: IDBDatabase,
  key: string,
  payload: ArrayBuffer,
) =>
  new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(jsDosSaveStoreName, "readwrite");

    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Impossible d'ecrire la sauvegarde locale."));
    transaction.objectStore(jsDosSaveStoreName).put(payload, key);
  });

const writeJsDosSaveBundle = async (key: string, payload: ArrayBuffer) => {
  for (const databaseName of jsDosSaveDatabaseNames) {
    const database = await openJsDosSaveDatabase(databaseName);

    try {
      for (const keyCandidate of getJsDosSaveKeyCandidates(key)) {
        await writeJsDosSaveBundleToDatabase(database, keyCandidate, payload);
      }
    } finally {
      database.close();
    }
  }
};

const restoreVpsSave = async () => {
  if (!authUser.value) {
    return;
  }

  try {
    const response = await fetch(`/api/dos-user-saves/${props.gameSlug}`, {
      credentials: "same-origin",
    });

    if (response.status === 404) {
      return;
    }

    if (response.status === 401) {
      clearSession();
      return;
    }

    if (!response.ok) {
      throw new Error("Impossible de restaurer la sauvegarde VPS.");
    }

    const payload = await response.arrayBuffer();

    if (payload.byteLength === 0) {
      return;
    }

    await writeJsDosSaveBundle(props.bundleUrl, payload);
    saveMessage.value = `Sauvegarde VPS restauree (${authUser.value.username})`;
  } catch (error) {
    saveError.value = getErrorMessage(error, "Impossible de restaurer la sauvegarde VPS.");
  }
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
    await refreshSession();
    await restoreVpsSave();
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

const releaseJsDosKeyboardFocus = () => {
  const activeElement = document.activeElement;

  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }
};

const openLoginDialog = () => {
  releaseJsDosKeyboardFocus();
  isLoginDialogOpen.value = true;
};

const uploadVpsSave = async () => {
  if (!dosInstance || !isReady.value) {
    saveError.value = "Le lecteur DOS n'est pas encore pret.";
    return;
  }

  saveError.value = "";
  saveMessage.value = "";
  isSavingToVps.value = true;

  try {
    await triggerJsDosSave();

    const payload = await readJsDosSaveBundle(props.bundleUrl);

    await $fetch(`/api/dos-user-saves/${props.gameSlug}`, {
      body: new Blob([payload], { type: "application/octet-stream" }),
      credentials: "same-origin",
      headers: {
        "content-type": "application/octet-stream",
      },
      method: "PUT",
    });

    saveMessage.value = `Sauvegarde VPS terminee (${authUser.value?.username ?? "compte"})`;
  } catch (error) {
    saveError.value = getErrorMessage(error, "Impossible de sauvegarder sur le VPS.");
  } finally {
    isSavingToVps.value = false;
  }
};

const saveToVps = async () => {
  await refreshSession();

  if (!authUser.value) {
    shouldSaveAfterLogin.value = true;
    openLoginDialog();
    return;
  }

  await uploadVpsSave();
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
    await uploadVpsSave();
  }
};

const logoutFromVps = async () => {
  saveError.value = "";
  saveMessage.value = "";

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
