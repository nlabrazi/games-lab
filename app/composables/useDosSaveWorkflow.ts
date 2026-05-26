import { computed, onScopeDispose, ref, watch } from "vue";
import type { DosAuthUsername } from "~/composables/useDosAuth";

interface UseDosSaveWorkflowOptions {
  getBundleUrl: () => string;
  getGameSlug: () => string;
  isPlayerReady: () => boolean;
  releaseKeyboardFocus: () => void;
  triggerJsDosSave: () => Promise<void>;
}

const getErrorMessage = (error: unknown, fallbackMessage: string) =>
  error instanceof Error ? error.message : fallbackMessage;

export const useDosSaveWorkflow = ({
  getBundleUrl,
  getGameSlug,
  isPlayerReady,
  releaseKeyboardFocus,
  triggerJsDosSave,
}: UseDosSaveWorkflowOptions) => {
  const isLoginDialogOpen = ref(false);
  const loginUsername = ref<DosAuthUsername>("admin");
  const loginPassword = ref("");
  const shouldSaveAfterLogin = ref(false);
  const syncAction = ref<"restore" | "save" | "logout" | null>(null);
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
  const {
    clearFeedback,
    error: saveError,
    isLoading: isLoadingFromVps,
    isSaving: isSavingToVps,
    lastSyncTime,
    loadVpsSave,
    message: saveMessage,
    saveVpsSave,
  } = useVpsSync({
    clearSession,
    getBundleUrl,
    getGameSlug,
    isPlayerReady,
    triggerJsDosSave,
    user: authUser,
  });

  let feedbackTimer: ReturnType<typeof setTimeout> | null = null;

  const clearFeedbackTimer = () => {
    if (!feedbackTimer) {
      return;
    }

    clearTimeout(feedbackTimer);
    feedbackTimer = null;
  };

  const clearSyncFeedback = () => {
    clearFeedbackTimer();
    clearFeedback();
    syncAction.value = null;
  };

  const scheduleFeedbackClear = () => {
    clearFeedbackTimer();

    feedbackTimer = setTimeout(() => {
      clearSyncFeedback();
    }, 4500);
  };

  const syncFeedback = computed(() => {
    if (saveError.value) {
      return {
        text: saveError.value,
        tone: "error",
      } as const;
    }

    if (isSavingToVps.value) {
      return {
        text: "Sauvegarde en cours...",
        tone: "pending",
      } as const;
    }

    if (isLoadingFromVps.value) {
      return {
        text: "Chargement sauvegarde...",
        tone: "pending",
      } as const;
    }

    if (!saveMessage.value) {
      return null;
    }

    if (syncAction.value === "restore") {
      return {
        text: "Sauvegarde chargee",
        tone: "success",
      } as const;
    }

    if (syncAction.value === "save") {
      return {
        text: "Progression sauvegardee",
        tone: "success",
      } as const;
    }

    return {
      text: saveMessage.value,
      tone: "success",
    } as const;
  });

  const openLoginDialog = () => {
    releaseKeyboardFocus();
    isLoginDialogOpen.value = true;
  };

  const closeLoginDialog = () => {
    shouldSaveAfterLogin.value = false;
    isLoginDialogOpen.value = false;
    clearLoginError();
    loginPassword.value = "";
  };

  const saveToVps = async () => {
    await refreshSession();

    if (!authUser.value) {
      shouldSaveAfterLogin.value = true;
      openLoginDialog();
      return;
    }

    clearFeedbackTimer();
    syncAction.value = "save";
    await saveVpsSave();
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
      clearFeedbackTimer();
      syncAction.value = "save";
      await saveVpsSave();
    }
  };

  const logoutFromVps = async () => {
    clearSyncFeedback();

    try {
      await logout();
      closeLoginDialog();
      syncAction.value = "logout";
      saveMessage.value = "Session VPS fermee";
    } catch (error) {
      saveError.value = getErrorMessage(error, "Deconnexion impossible.");
    }
  };

  const restoreVpsSave = async () => {
    await refreshSession();

    if (!authUser.value) {
      return;
    }

    clearFeedbackTimer();
    syncAction.value = "restore";
    await loadVpsSave();

    if (!saveMessage.value && !saveError.value) {
      syncAction.value = null;
    }
  };

  watch(saveMessage, (message) => {
    if (message) {
      scheduleFeedbackClear();
    }
  });

  onScopeDispose(() => {
    clearFeedbackTimer();
  });

  return {
    authUser,
    closeLoginDialog,
    isLoggingIn,
    isLoggingOut,
    isLoginDialogOpen,
    lastSyncTime,
    loginError,
    loginPassword,
    loginUsername,
    logoutFromVps,
    openLoginDialog,
    restoreVpsSave,
    saveToVps,
    submitLogin,
    syncFeedback,
  };
};
