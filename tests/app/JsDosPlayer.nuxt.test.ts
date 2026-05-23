import { mountSuspended } from "@nuxt/test-utils/runtime";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import JsDosPlayer from "../../app/components/JsDosPlayer.vue";

const bundleUrl = "/api/dos-games/lands-of-lore.jsdos";
const gameSlug = "lands-of-lore";
const jsDosSaveDatabaseName = "js-dos-cache (emulators-ui-saves)";
const jsDosSaveStoreName = "files";
const jsDosScriptUrl = "https://v8.js-dos.com/latest/js-dos.js";
const jsDosStyleUrl = "https://v8.js-dos.com/latest/js-dos.css";

interface AuthUser {
  username: "admin" | "guest";
}

interface MountOptions {
  sessionUser?: AuthUser | null;
  fetchResponse?: Response;
  indexedDBAvailable?: boolean;
  onLocalSave?: () => Promise<void> | void;
}

const waitFor = async (assertion: () => void | Promise<void>, timeout = 1000) => {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeout) {
    try {
      await assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve));
    }
  }

  throw lastError;
};

const installIndexedDB = () => {
  const indexedDB = new IDBFactory();

  Object.defineProperty(window, "indexedDB", {
    configurable: true,
    value: indexedDB,
  });
  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    value: indexedDB,
  });
};

const uninstallIndexedDB = () => {
  Object.defineProperty(window, "indexedDB", {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    value: undefined,
  });
};

const openTestSaveDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(jsDosSaveDatabaseName, 1);

    request.onerror = () => reject(request.error ?? new Error("IndexedDB test open failed."));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(jsDosSaveStoreName)) {
        database.createObjectStore(jsDosSaveStoreName);
      }
    };
  });

const readStoredBundle = async (key: string) => {
  const database = await openTestSaveDatabase();

  try {
    return await new Promise<ArrayBuffer | Uint8Array | undefined>((resolve, reject) => {
      const transaction = database.transaction(jsDosSaveStoreName, "readonly");
      const request = transaction.objectStore(jsDosSaveStoreName).get(key);

      request.onerror = () => reject(request.error ?? new Error("IndexedDB test read failed."));
      request.onsuccess = () => resolve(request.result);
    });
  } finally {
    database.close();
  }
};

const writeStoredBundle = async (key: string, payload: Uint8Array) => {
  const database = await openTestSaveDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(jsDosSaveStoreName, "readwrite");

      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("IndexedDB test write failed."));
      transaction.objectStore(jsDosSaveStoreName).put(payload, key);
    });
  } finally {
    database.close();
  }
};

const toUint8Array = (payload: ArrayBuffer | Uint8Array | undefined) => {
  if (payload instanceof Uint8Array) {
    return payload;
  }

  if (payload instanceof ArrayBuffer) {
    return new Uint8Array(payload);
  }

  return undefined;
};

const installLoadedJsDosScript = () => {
  const script = document.createElement("script");
  script.src = jsDosScriptUrl;
  script.dataset.testJsDosAsset = "true";
  document.head.appendChild(script);
};

const cleanupJsDosAssets = () => {
  const elements = document.querySelectorAll(
    `script[src="${jsDosScriptUrl}"], link[href="${jsDosStyleUrl}"], [data-test-js-dos-asset="true"]`,
  );

  for (const element of elements) {
    element.remove();
  }
};

const mountPlayer = async ({
  sessionUser = null,
  fetchResponse = new Response(null, { status: 404 }),
  indexedDBAvailable = true,
  onLocalSave,
}: MountOptions = {}) => {
  if (indexedDBAvailable) {
    installIndexedDB();
  } else {
    uninstallIndexedDB();
  }

  installLoadedJsDosScript();

  let currentUser = sessionUser;
  const layersSave = vi.fn(async () => {
    await onLocalSave?.();
  });
  const dosInstance = {
    layers: {
      save: layersSave,
    },
    save: vi.fn(async () => true),
    stop: vi.fn(async () => undefined),
  };
  const dosMock = vi.fn(
    (_element: HTMLDivElement, options: { onEvent?: (event: string) => void }) => {
      options.onEvent?.("ci-ready");
      return dosInstance;
    },
  );
  const $fetchMock = vi.fn(async (url: string, options?: { method?: string }) => {
    if (url === "/api/auth/session") {
      return {
        authenticated: Boolean(currentUser),
        user: currentUser,
      };
    }

    if (url === "/api/auth/login") {
      currentUser = {
        username: "admin",
      };

      return {
        authenticated: true,
        user: currentUser,
      };
    }

    if (url === "/api/auth/logout") {
      currentUser = null;

      return {
        authenticated: false,
        user: null,
      };
    }

    if (url === `/api/dos-user-saves/${gameSlug}` && options?.method === "PUT") {
      return {
        saved: true,
      };
    }

    throw new Error(`Unexpected $fetch call: ${url}`);
  });
  const fetchMock = vi.fn(async () => fetchResponse);

  vi.stubGlobal("$fetch", $fetchMock);
  vi.stubGlobal("fetch", fetchMock);
  Object.defineProperty(window, "Dos", {
    configurable: true,
    value: dosMock,
  });

  const wrapper = await mountSuspended(JsDosPlayer, {
    props: {
      bundleUrl,
      gameSlug,
      title: "Lands of Lore: The Throne of Chaos",
    },
  });

  await waitFor(() => expect(dosMock).toHaveBeenCalled());
  await nextTick();

  return {
    $fetchMock,
    dosInstance,
    dosMock,
    fetchMock,
    layersSave,
    wrapper,
  };
};

afterEach(() => {
  cleanupJsDosAssets();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, "Dos");
  uninstallIndexedDB();
});

describe("JsDosPlayer", () => {
  it("does not restore a VPS save without an authenticated session", async () => {
    const { fetchMock } = await mountPlayer({
      sessionUser: null,
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches the user VPS save when a session is present", async () => {
    const { fetchMock } = await mountPlayer({
      sessionUser: {
        username: "admin",
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(`/api/dos-user-saves/${gameSlug}`, {
      credentials: "same-origin",
    });
  });

  it("shows the active VPS session and logs out", async () => {
    const { $fetchMock, wrapper } = await mountPlayer({
      sessionUser: {
        username: "guest",
      },
    });

    expect(wrapper.text()).toContain("VPS guest");

    await wrapper.get("button").trigger("click");

    await waitFor(() => {
      expect($fetchMock).toHaveBeenCalledWith("/api/auth/logout", {
        credentials: "same-origin",
        method: "POST",
      });
      expect(wrapper.text()).not.toContain("VPS guest");
      expect(wrapper.text()).toContain("Session VPS fermee");
    });
  });

  it("restores the VPS save into IndexedDB using the bundle URL key", async () => {
    const vpsPayload = new Uint8Array([9, 8, 7, 6]);

    await mountPlayer({
      fetchResponse: new Response(vpsPayload),
      sessionUser: {
        username: "guest",
      },
    });

    await waitFor(async () => {
      const storedPayload = toUint8Array(await readStoredBundle(bundleUrl));

      expect(storedPayload).toEqual(vpsPayload);
    });
  });

  it("opens the login dialog before saving without a session", async () => {
    const { wrapper } = await mountPlayer({
      sessionUser: null,
    });

    await (wrapper.vm as unknown as { saveToVps: () => Promise<void> }).saveToVps();
    await nextTick();

    expect(wrapper.text()).toContain("Connexion");
    expect(wrapper.find('input[type="password"]').exists()).toBe(true);
  });

  it("focuses the login password field and stops keyboard events from reaching the game", async () => {
    const { wrapper } = await mountPlayer({
      sessionUser: null,
    });
    const focusSpy = vi.spyOn(HTMLInputElement.prototype, "focus");
    const shellKeydown = vi.fn();

    wrapper.get(".dos-player-shell").element.addEventListener("keydown", shellKeydown);

    try {
      await (wrapper.vm as unknown as { saveToVps: () => Promise<void> }).saveToVps();
      await nextTick();

      const passwordInput = wrapper.get('input[type="password"]').element;

      expect(focusSpy).toHaveBeenCalled();

      passwordInput.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          key: "a",
        }),
      );

      expect(shellKeydown).not.toHaveBeenCalled();
    } finally {
      wrapper.get(".dos-player-shell").element.removeEventListener("keydown", shellKeydown);
      focusSpy.mockRestore();
    }
  });

  it("logs in, triggers js-dos local save, reads IndexedDB, then uploads the save", async () => {
    const localPayload = new Uint8Array([5, 4, 3, 2, 1]);
    const { $fetchMock, layersSave, wrapper } = await mountPlayer({
      onLocalSave: () => writeStoredBundle(bundleUrl, localPayload),
      sessionUser: null,
    });

    await (wrapper.vm as unknown as { saveToVps: () => Promise<void> }).saveToVps();
    await wrapper.find('input[type="password"]').setValue("admin-password");
    await wrapper.find("form").trigger("submit");

    await waitFor(() => expect(layersSave).toHaveBeenCalledTimes(1));

    let putCall: [string, { body: Blob; credentials: string; headers: object; method: string }];

    await waitFor(() => {
      const matchingCall = $fetchMock.mock.calls.find(
        ([url, options]) => url === `/api/dos-user-saves/${gameSlug}` && options?.method === "PUT",
      );

      expect(matchingCall).toBeTruthy();
      putCall = matchingCall as typeof putCall;
    });

    const [, putOptions] = putCall;
    const uploadedPayload = new Uint8Array(await putOptions.body.arrayBuffer());

    expect(putOptions).toMatchObject({
      credentials: "same-origin",
      headers: {
        "content-type": "application/octet-stream",
      },
      method: "PUT",
    });
    expect(uploadedPayload).toEqual(localPayload);
    expect(wrapper.text()).toContain("Sauvegarde VPS terminee (admin)");
  });

  it("shows a user-facing error when IndexedDB cannot be read", async () => {
    const { wrapper } = await mountPlayer({
      indexedDBAvailable: false,
      sessionUser: {
        username: "admin",
      },
    });

    await (wrapper.vm as unknown as { saveToVps: () => Promise<void> }).saveToVps();

    await waitFor(() => {
      expect(wrapper.text()).toContain("IndexedDB n'est pas disponible dans ce navigateur.");
    });
  });
});
