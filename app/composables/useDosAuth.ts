import { computed } from "vue";

export type DosAuthUsername = "admin" | "guest";

export interface DosAuthUser {
  username: DosAuthUsername;
}

interface DosAuthSessionResponse {
  authenticated: boolean;
  user: DosAuthUser | null;
}

const getErrorMessage = (error: unknown, fallbackMessage: string) =>
  error instanceof Error ? error.message : fallbackMessage;

export const useDosAuth = () => {
  const user = useState<DosAuthUser | null>("dos-auth-user", () => null);
  const isLoadingSession = useState("dos-auth-loading-session", () => false);
  const isLoggingIn = useState("dos-auth-logging-in", () => false);
  const isLoggingOut = useState("dos-auth-logging-out", () => false);
  const loginError = useState("dos-auth-login-error", () => "");

  const isAuthenticated = computed(() => Boolean(user.value));

  const clearSession = () => {
    user.value = null;
  };

  const clearLoginError = () => {
    loginError.value = "";
  };

  const refreshSession = async () => {
    isLoadingSession.value = true;

    try {
      const session = await $fetch<DosAuthSessionResponse>("/api/auth/session", {
        credentials: "same-origin",
      });

      user.value = session.user;
      return session.user;
    } catch {
      clearSession();
      return null;
    } finally {
      isLoadingSession.value = false;
    }
  };

  const login = async (username: DosAuthUsername, password: string) => {
    clearLoginError();
    isLoggingIn.value = true;

    try {
      const session = await $fetch<DosAuthSessionResponse>("/api/auth/login", {
        body: {
          password,
          username,
        },
        credentials: "same-origin",
        method: "POST",
      });

      user.value = session.user;
      return session.user;
    } catch (error) {
      loginError.value = getErrorMessage(error, "Connexion impossible.");
      return null;
    } finally {
      isLoggingIn.value = false;
    }
  };

  const logout = async () => {
    isLoggingOut.value = true;

    try {
      await $fetch<DosAuthSessionResponse>("/api/auth/logout", {
        credentials: "same-origin",
        method: "POST",
      });

      clearSession();
    } finally {
      isLoggingOut.value = false;
    }
  };

  return {
    clearLoginError,
    clearSession,
    isAuthenticated,
    isLoadingSession,
    isLoggingIn,
    isLoggingOut,
    login,
    loginError,
    logout,
    refreshSession,
    user,
  };
};
