import { mountSuspended } from "@nuxt/test-utils/runtime";
import { indexedDB as fakeIndexedDb } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import JsDosPlayer from "../../app/components/JsDosPlayer.vue";
import { clearSaveHashCache, uploadServerSave } from "../../app/composables/useJsDosPlayer";

const bundleUrl = "/api/dos-games/lands-of-lore.jsdos";
const jsDosScriptUrl = "https://v8.js-dos.com/latest/js-dos.js";
const jsDosStyleUrl = "https://v8.js-dos.com/latest/js-dos.css";
const saveDatabaseName = "js-dos-cache (emulators-ui-saves)";
const saveStoreName = "files";

interface MockFsChanges {
  pull: (key: string) => Promise<Uint8Array | null>;
  push: (key: string, bundle: Uint8Array) => Promise<void>;
  urlToKey: (url: string) => string;
  delete?: (key: string) => Promise<void>;
}

interface MockDosOptions {
  kiosk?: boolean;
  onEvent?: (event: string, arg?: unknown) => void;
  fsChanges?: MockFsChanges;
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

interface MountPlayerOptions {
  persistResult?: Uint8Array | null;
}

const mountPlayer = async (options: MountPlayerOptions = {}) => {
  installLoadedJsDosScript();

  const persistMock = vi.fn(async () => options.persistResult ?? new Uint8Array([1, 2, 3]));
  let capturedDosOptions: MockDosOptions | null = null;
  const saveMock = vi.fn(async () => {
    if (capturedDosOptions?.fsChanges?.push) {
      const data = await persistMock();
      if (data) {
        await capturedDosOptions.fsChanges.push(bundleUrl, data);
      }
    }
    return true;
  });
  const stopMock = vi.fn(async () => undefined);
  const dosMock = vi.fn((_element: HTMLDivElement, dosOpts: MockDosOptions) => {
    capturedDosOptions = dosOpts;
    dosOpts.onEvent?.("ci-ready", { persist: persistMock });

    return {
      save: saveMock,
      stop: stopMock,
    };
  });

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
    capturedDosOptions: () => capturedDosOptions,
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
  it("starts js-dos with the provided bundle and configures fsChanges", async () => {
    const { capturedDosOptions, dosMock, wrapper } = await mountPlayer();

    expect(dosMock).toHaveBeenCalledTimes(1);
    expect(wrapper.attributes("aria-label")).toBeUndefined();
    expect(wrapper.text()).not.toContain("Connexion");

    const opts = capturedDosOptions();
    expect(opts?.kiosk).toBe(false);
    expect(opts?.fsChanges).toBeDefined();
    expect(typeof opts?.fsChanges?.pull).toBe("function");
    expect(typeof opts?.fsChanges?.push).toBe("function");
    expect(typeof opts?.fsChanges?.urlToKey).toBe("function");
  });

  it("persists save data through fsChanges.push and reads it with fsChanges.pull", async () => {
    const { capturedDosOptions } = await mountPlayer();
    const opts = capturedDosOptions();

    const sampleSave = new Uint8Array([10, 20, 30, 40]);
    await opts?.fsChanges?.push(bundleUrl, sampleSave);

    const retrievedSave = await opts?.fsChanges?.pull(bundleUrl);
    expect(retrievedSave).not.toBeNull();
    if (retrievedSave) {
      expect(Array.from(retrievedSave)).toEqual(Array.from(sampleSave));
    }
  });

  it("stops the js-dos instance on unmount", async () => {
    const { stopMock, wrapper } = await mountPlayer();

    wrapper.unmount();

    await waitFor(() => expect(stopMock).toHaveBeenCalledTimes(1));
  });

  it("triggers manual save through saveGameState and shows feedback", async () => {
    const { saveMock, wrapper } = await mountPlayer();

    const success = await (wrapper.vm as InstanceType<typeof JsDosPlayer>).saveGameState();

    expect(success).toBe(true);
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect((wrapper.vm as InstanceType<typeof JsDosPlayer>).saveSuccessMessage).toContain(
      "synchronisée",
    );
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

  it("deduplicates cloud uploads when save content is unchanged", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    clearSaveHashCache();

    const saveBytes = new Uint8Array([1, 2, 3, 4, 5]);

    const firstSuccess = await uploadServerSave("lands-of-lore", saveBytes);
    expect(firstSuccess).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Un second appel avec le même contenu ne doit pas déclencher de fetch réseau
    const secondSuccess = await uploadServerSave("lands-of-lore", saveBytes);
    expect(secondSuccess).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Mais si le contenu change (nouvelle sauvegarde en jeu), on upload
    const modifiedBytes = new Uint8Array([1, 2, 3, 4, 99]);
    const thirdSuccess = await uploadServerSave("lands-of-lore", modifiedBytes);
    expect(thirdSuccess).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
