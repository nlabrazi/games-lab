// js-dos stores anonymous browser-local saves under its own "guest" cache profile.
// This is unrelated to the app-level admin/guest VPS accounts.
const jsDosSaveDatabaseNames = [
  "js-dos-cache (guest)",
  "js-dos-cache (emulators-ui-saves)",
] as const;
const jsDosSaveStoreName = "files";

interface BlobLike {
  arrayBuffer: () => Promise<ArrayBuffer>;
}

const normalizeAssetUrl = (url: string) => new URL(url, window.location.href).href;

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

export const readJsDosLocalSaveBundle = async (key: string) => {
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

export const writeJsDosLocalSaveBundle = async (key: string, payload: ArrayBuffer) => {
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
