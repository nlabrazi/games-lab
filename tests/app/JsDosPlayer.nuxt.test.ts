import { mountSuspended } from "@nuxt/test-utils/runtime";
import { indexedDB as fakeIndexedDb } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import JsDosPlayer from "../../app/components/JsDosPlayer.vue";

const bundleUrl = "/api/dos-games/lands-of-lore.jsdos";
const jsDosScriptUrl = "https://v8.js-dos.com/latest/js-dos.js";
const jsDosStyleUrl = "https://v8.js-dos.com/latest/js-dos.css";
const saveDatabaseName = "js-dos-cache (emulators-ui-saves)";
const saveStoreName = "files";

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

const mountPlayer = async () => {
  installLoadedJsDosScript();

  const persistMock = vi.fn(async () => new Uint8Array([1, 2, 3]));
  const saveMock = vi.fn(async () => true);
  const stopMock = vi.fn(async () => undefined);
  const dosMock = vi.fn(
    (_element: HTMLDivElement, options: { onEvent?: (event: string, arg?: unknown) => void }) => {
      options.onEvent?.("ci-ready", { persist: persistMock });

      return {
        save: saveMock,
        stop: stopMock,
      };
    },
  );

  Object.defineProperty(window, "indexedDB", {
    configurable: true,
    value: fakeIndexedDb,
  });

  Object.defineProperty(window, "Dos", {
    configurable: true,
    value: dosMock,
  });

  const wrapper = await mountSuspended(JsDosPlayer, {
    props: {
      bundleUrl,
      title: "Lands of Lore: The Throne of Chaos",
    },
  });

  await waitFor(() => expect(dosMock).toHaveBeenCalled());
  await nextTick();

  return {
    dosMock,
    persistMock,
    saveMock,
    stopMock,
    wrapper,
  };
};

const readImportedSave = async (key: string) => {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(saveDatabaseName, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });

  const storedValue = await new Promise<ArrayBuffer>((resolve, reject) => {
    const transaction = database.transaction(saveStoreName, "readonly");
    const request = transaction.objectStore(saveStoreName).get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as ArrayBuffer);
  });

  database.close();
  return new Uint8Array(storedValue);
};

afterEach(() => {
  cleanupJsDosAssets();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, "Dos");
  Reflect.deleteProperty(window, "indexedDB");
});

describe("JsDosPlayer", () => {
  it("starts js-dos with the provided bundle", async () => {
    const { dosMock, wrapper } = await mountPlayer();

    expect(dosMock).toHaveBeenCalledTimes(1);
    expect(wrapper.attributes("aria-label")).toBeUndefined();
    expect(wrapper.text()).not.toContain("Connexion");
  });

  it("stops the js-dos instance on unmount", async () => {
    const { stopMock, wrapper } = await mountPlayer();

    wrapper.unmount();

    await waitFor(() => expect(stopMock).toHaveBeenCalledTimes(1));
  });

  it("exports the js-dos save bundle through ci.persist", async () => {
    const createObjectUrlMock = vi.fn(() => "blob:test-save");
    const revokeObjectUrlMock = vi.fn();
    const anchorClickMock = vi.fn();

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrlMock,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrlMock,
    });

    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(anchorClickMock);

    const { persistMock, saveMock, wrapper } = await mountPlayer();

    await (wrapper.vm as InstanceType<typeof JsDosPlayer>).exportSaveFile();

    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(persistMock).toHaveBeenCalledTimes(1);
    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    expect(anchorClickMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlMock).toHaveBeenCalledWith("blob:test-save");
  });

  it("imports a local save bundle into indexeddb and restarts js-dos", async () => {
    const { dosMock, stopMock, wrapper } = await mountPlayer();
    const importedBytes = new Uint8Array([9, 8, 7, 6]);
    const input = wrapper.get('input[type="file"]');
    const file = new File([importedBytes], "lands-of-lore.jdsave", {
      type: "application/octet-stream",
    });

    Object.defineProperty(input.element, "files", {
      configurable: true,
      value: [file],
    });

    await (wrapper.vm as InstanceType<typeof JsDosPlayer>).openSaveImportDialog();
    await input.trigger("change");

    await waitFor(() => expect(stopMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(dosMock).toHaveBeenCalledTimes(2));

    const storedSave = await readImportedSave(bundleUrl);
    expect(Array.from(storedSave)).toEqual(Array.from(importedBytes));
  });
});
