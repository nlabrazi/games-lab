import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFullscreen } from "../../app/composables/useFullscreen";

describe("useFullscreen", () => {
  let originalFullscreenEnabled: PropertyDescriptor | undefined;
  let originalFullscreenElement: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalFullscreenEnabled = Object.getOwnPropertyDescriptor(document, "fullscreenEnabled");
    originalFullscreenElement = Object.getOwnPropertyDescriptor(document, "fullscreenElement");
  });

  afterEach(() => {
    if (originalFullscreenEnabled) {
      Object.defineProperty(document, "fullscreenEnabled", originalFullscreenEnabled);
    }
    if (originalFullscreenElement) {
      Object.defineProperty(document, "fullscreenElement", originalFullscreenElement);
    }
    vi.restoreAllMocks();
  });

  it("reports support and initial non-fullscreen state", () => {
    Object.defineProperty(document, "fullscreenEnabled", {
      value: true,
      configurable: true,
    });
    Object.defineProperty(document, "fullscreenElement", {
      value: null,
      configurable: true,
    });

    const { isFullscreen, isSupported } = useFullscreen();

    expect(isFullscreen.value).toBe(false);
  });

  it("calls requestFullscreen when entering fullscreen", async () => {
    const requestFullscreenSpy = vi.fn().mockResolvedValue(undefined);
    document.documentElement.requestFullscreen = requestFullscreenSpy;

    const { enterFullscreen } = useFullscreen();
    await enterFullscreen();

    expect(requestFullscreenSpy).toHaveBeenCalledTimes(1);
  });

  it("calls exitFullscreen when exiting fullscreen", async () => {
    const exitFullscreenSpy = vi.fn().mockResolvedValue(undefined);
    document.exitFullscreen = exitFullscreenSpy;

    const { exitFullscreen } = useFullscreen();
    await exitFullscreen();

    expect(exitFullscreenSpy).toHaveBeenCalledTimes(1);
  });

  it("toggles fullscreen state correctly", async () => {
    const requestFullscreenSpy = vi.fn().mockResolvedValue(undefined);
    const exitFullscreenSpy = vi.fn().mockResolvedValue(undefined);

    document.documentElement.requestFullscreen = requestFullscreenSpy;
    document.exitFullscreen = exitFullscreenSpy;

    const { isFullscreen, toggleFullscreen } = useFullscreen();

    // Initialement false -> appelle enterFullscreen
    isFullscreen.value = false;
    await toggleFullscreen();
    expect(requestFullscreenSpy).toHaveBeenCalled();

    // Lorsque true -> appelle exitFullscreen
    isFullscreen.value = true;
    await toggleFullscreen();
    expect(exitFullscreenSpy).toHaveBeenCalled();
  });
});
