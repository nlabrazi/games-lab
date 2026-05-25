import { type Ref, computed, ref } from "vue";
import type { DosAuthUser } from "~/composables/useDosAuth";
import { readJsDosLocalSaveBundle, writeJsDosLocalSaveBundle } from "~/utils/jsDosLocalPersistence";

export type VpsSyncStatus = "idle" | "loading" | "saving" | "success" | "error";

interface DosUserSaveResponse {
  updatedAt?: string;
}

interface UseVpsSyncOptions {
  clearSession: () => void;
  getBundleUrl: () => string;
  getGameSlug: () => string;
  isPlayerReady: () => boolean;
  triggerJsDosSave: () => Promise<void>;
  user: Ref<DosAuthUser | null>;
}

const getErrorMessage = (error: unknown, fallbackMessage: string) =>
  error instanceof Error ? error.message : fallbackMessage;

const getValidSyncDate = (dateValue: string | null | undefined) => {
  if (!dateValue) {
    return new Date();
  }

  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

export const useVpsSync = ({
  clearSession,
  getBundleUrl,
  getGameSlug,
  isPlayerReady,
  triggerJsDosSave,
  user,
}: UseVpsSyncOptions) => {
  const syncStatus = ref<VpsSyncStatus>("idle");
  const lastSyncTime = ref<Date | null>(null);
  const message = ref("");
  const error = ref("");
  const isSaving = computed(() => syncStatus.value === "saving");
  const isLoading = computed(() => syncStatus.value === "loading");

  const clearFeedback = () => {
    error.value = "";
    message.value = "";
  };

  const loadVpsSave = async () => {
    if (!user.value) {
      return;
    }

    syncStatus.value = "loading";

    try {
      const response = await fetch(`/api/dos-user-saves/${getGameSlug()}`, {
        credentials: "same-origin",
      });

      if (response.status === 404) {
        syncStatus.value = "idle";
        return;
      }

      if (response.status === 401) {
        clearSession();
        syncStatus.value = "idle";
        return;
      }

      if (!response.ok) {
        throw new Error("Impossible de restaurer la sauvegarde VPS.");
      }

      const payload = await response.arrayBuffer();

      if (payload.byteLength === 0) {
        syncStatus.value = "idle";
        return;
      }

      await writeJsDosLocalSaveBundle(getBundleUrl(), payload);
      lastSyncTime.value = getValidSyncDate(response.headers.get("x-dos-save-updated-at"));
      message.value = `Sauvegarde VPS restauree (${user.value.username})`;
      syncStatus.value = "success";
    } catch (syncError) {
      error.value = getErrorMessage(syncError, "Impossible de restaurer la sauvegarde VPS.");
      syncStatus.value = "error";
    }
  };

  const saveVpsSave = async () => {
    if (!isPlayerReady()) {
      error.value = "Le lecteur DOS n'est pas encore pret.";
      syncStatus.value = "error";
      return;
    }

    clearFeedback();
    syncStatus.value = "saving";

    try {
      await triggerJsDosSave();

      const payload = await readJsDosLocalSaveBundle(getBundleUrl());
      const response = await $fetch<DosUserSaveResponse>(`/api/dos-user-saves/${getGameSlug()}`, {
        body: new Blob([payload], { type: "application/octet-stream" }),
        credentials: "same-origin",
        headers: {
          "content-type": "application/octet-stream",
        },
        method: "PUT",
      });

      lastSyncTime.value = getValidSyncDate(response.updatedAt);
      message.value = `Sauvegarde VPS terminee (${user.value?.username ?? "compte"})`;
      syncStatus.value = "success";
    } catch (syncError) {
      error.value = getErrorMessage(syncError, "Impossible de sauvegarder sur le VPS.");
      syncStatus.value = "error";
    }
  };

  return {
    clearFeedback,
    error,
    isLoading,
    isSaving,
    lastSyncTime,
    loadVpsSave,
    message,
    saveVpsSave,
    syncStatus,
  };
};
