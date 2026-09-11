import { computed, onMounted, onUnmounted, ref } from "vue";

export interface UseFullscreenOptions {
  target?: () => HTMLElement | null | undefined;
}

export function useFullscreen(options: UseFullscreenOptions = {}) {
  const isFullscreen = ref(false);
  const isSupported = ref(false);

  const getDoc = () => (typeof document !== "undefined" ? document : null);

  const getTargetElement = (): HTMLElement | null => {
    if (options.target) {
      const custom = options.target();
      if (custom) return custom;
    }
    const doc = getDoc();
    return doc?.documentElement ?? null;
  };

  const updateState = () => {
    const doc = getDoc() as
      | (Document & {
          webkitFullscreenElement?: Element | null;
          mozFullScreenElement?: Element | null;
          msFullscreenElement?: Element | null;
        })
      | null;

    if (!doc) {
      isFullscreen.value = false;
      return;
    }

    const current =
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement;

    isFullscreen.value = Boolean(current);
  };

  const checkSupport = () => {
    const doc = getDoc() as
      | (Document & {
          webkitFullscreenEnabled?: boolean;
          mozFullScreenEnabled?: boolean;
          msFullscreenEnabled?: boolean;
        })
      | null;

    if (!doc) {
      isSupported.value = false;
      return;
    }

    isSupported.value = Boolean(
      doc.fullscreenEnabled ??
        doc.webkitFullscreenEnabled ??
        doc.mozFullScreenEnabled ??
        doc.msFullscreenEnabled ??
        // Certains navigateurs mobiles ont requestFullscreen sur documentElement même si fullscreenEnabled n'est pas explicite
        Boolean(
          doc.documentElement &&
            ("requestFullscreen" in doc.documentElement ||
              "webkitRequestFullscreen" in doc.documentElement),
        ),
    );
  };

  const enterFullscreen = async () => {
    const target = getTargetElement() as
      | (HTMLElement & {
          webkitRequestFullscreen?: () => Promise<void> | void;
          mozRequestFullScreen?: () => Promise<void> | void;
          msRequestFullscreen?: () => Promise<void> | void;
        })
      | null;

    if (!target) return;

    try {
      if (typeof target.requestFullscreen === "function") {
        await target.requestFullscreen();
      } else if (typeof target.webkitRequestFullscreen === "function") {
        await target.webkitRequestFullscreen();
      } else if (typeof target.mozRequestFullScreen === "function") {
        await target.mozRequestFullScreen();
      } else if (typeof target.msRequestFullscreen === "function") {
        await target.msRequestFullscreen();
      }
    } catch (err) {
      console.warn("Impossible d'activer le plein écran :", err);
    } finally {
      updateState();
    }
  };

  const exitFullscreen = async () => {
    const doc = getDoc() as
      | (Document & {
          webkitExitFullscreen?: () => Promise<void> | void;
          mozCancelFullScreen?: () => Promise<void> | void;
          msExitFullscreen?: () => Promise<void> | void;
        })
      | null;

    if (!doc) return;

    try {
      if (typeof doc.exitFullscreen === "function") {
        await doc.exitFullscreen();
      } else if (typeof doc.webkitExitFullscreen === "function") {
        await doc.webkitExitFullscreen();
      } else if (typeof doc.mozCancelFullScreen === "function") {
        await doc.mozCancelFullScreen();
      } else if (typeof doc.msExitFullscreen === "function") {
        await doc.msExitFullscreen();
      }
    } catch (err) {
      console.warn("Impossible de quitter le plein écran :", err);
    } finally {
      updateState();
    }
  };

  const toggleFullscreen = async () => {
    if (isFullscreen.value) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  };

  if (typeof window !== "undefined") {
    onMounted(() => {
      checkSupport();
      updateState();

      const doc = getDoc();
      if (!doc) return;

      doc.addEventListener("fullscreenchange", updateState);
      doc.addEventListener("webkitfullscreenchange", updateState);
      doc.addEventListener("mozfullscreenchange", updateState);
      doc.addEventListener("MSFullscreenChange", updateState);
    });

    onUnmounted(() => {
      const doc = getDoc();
      if (!doc) return;

      doc.removeEventListener("fullscreenchange", updateState);
      doc.removeEventListener("webkitfullscreenchange", updateState);
      doc.removeEventListener("mozfullscreenchange", updateState);
      doc.removeEventListener("MSFullscreenChange", updateState);
    });
  }

  return {
    isFullscreen,
    isSupported,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  };
}
