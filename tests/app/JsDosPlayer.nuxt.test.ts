import { mountSuspended } from "@nuxt/test-utils/runtime";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import JsDosPlayer from "../../app/components/JsDosPlayer.vue";

const bundleUrl = "/api/dos-games/lands-of-lore.jsdos";
const jsDosScriptUrl = "https://v8.js-dos.com/latest/js-dos.js";
const jsDosStyleUrl = "https://v8.js-dos.com/latest/js-dos.css";

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

  const stopMock = vi.fn(async () => undefined);
  const dosMock = vi.fn(
    (_element: HTMLDivElement, options: { onEvent?: (event: string) => void }) => {
      options.onEvent?.("ci-ready");

      return {
        save: vi.fn(async () => true),
        stop: stopMock,
      };
    },
  );

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
    stopMock,
    wrapper,
  };
};

afterEach(() => {
  cleanupJsDosAssets();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, "Dos");
});

describe("JsDosPlayer", () => {
  it("starts js-dos with the provided bundle", async () => {
    const { dosMock, wrapper } = await mountPlayer();

    expect(dosMock).toHaveBeenCalledTimes(1);
    expect(wrapper.attributes("aria-label")).toBeUndefined();
    expect(wrapper.text()).not.toContain("Connexion");
    expect(wrapper.text()).not.toContain("Sauvegarde");
  });

  it("stops the js-dos instance on unmount", async () => {
    const { stopMock, wrapper } = await mountPlayer();

    wrapper.unmount();

    await waitFor(() => expect(stopMock).toHaveBeenCalledTimes(1));
  });
});
