import { randomUUID } from "node:crypto";
import { readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import process from "node:process";
import { type H3Event, createError } from "h3";

export const defaultDosSaveSlot = "default";
export const maxDosSaveBytes = 35 * 1024 * 1024; // 35 MB

const dosSaveIdentifierPattern = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

export interface DosSaveMetadata {
  filePath: string;
  size: number;
  updatedAt: Date;
}

export const validateGameSlug = (value: string | undefined): string => {
  if (!value || value.includes("\0") || !dosSaveIdentifierPattern.test(value)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Identifiant de jeu invalide",
    });
  }

  return value;
};

export const resolveDosSavePath = (
  event: H3Event,
  gameSlug: string,
  slotId = defaultDosSaveSlot,
) => {
  const config = useRuntimeConfig(event);
  const rootDirectory = resolve(
    process.env.DOS_SAVES_DIR ?? config.dosSavesDir ?? "local/dos-saves",
  );
  const cleanSlug = validateGameSlug(gameSlug);
  const cleanSlot = validateGameSlug(slotId);
  const filePath = resolve(rootDirectory, cleanSlug, `${cleanSlot}.save`);

  if (filePath !== rootDirectory && !filePath.startsWith(`${rootDirectory}${sep}`)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Chemin de sauvegarde invalide",
    });
  }

  return {
    rootDirectory,
    gameDirectory: dirname(filePath),
    filePath,
    gameSlug: cleanSlug,
    slotId: cleanSlot,
  };
};

export const getDosSaveMetadata = async (
  event: H3Event,
  gameSlug: string,
): Promise<DosSaveMetadata | null> => {
  const savePath = resolveDosSavePath(event, gameSlug);
  let fileStat = await stat(savePath.filePath).catch(() => null);

  if (fileStat?.isFile()) {
    return {
      filePath: savePath.filePath,
      size: fileStat.size,
      updatedAt: fileStat.mtime,
    };
  }

  // Fallback: vérifier si une autre sauvegarde .save existe dans le dossier (ex: user-admin.save)
  try {
    const files = await readdir(savePath.gameDirectory);
    const candidate = files.find((file) => file.endsWith(".save"));
    if (candidate) {
      const candidatePath = resolve(savePath.gameDirectory, candidate);
      fileStat = await stat(candidatePath).catch(() => null);
      if (fileStat?.isFile()) {
        return {
          filePath: candidatePath,
          size: fileStat.size,
          updatedAt: fileStat.mtime,
        };
      }
    }
  } catch {
    // Le dossier n'existe pas encore
  }

  return null;
};

export const readDosSave = async (event: H3Event, gameSlug: string): Promise<Buffer | null> => {
  const metadata = await getDosSaveMetadata(event, gameSlug);

  if (!metadata) {
    return null;
  }

  return readFile(metadata.filePath);
};

export const writeDosSave = async (
  event: H3Event,
  gameSlug: string,
  payload: Uint8Array,
): Promise<DosSaveMetadata> => {
  if (payload.byteLength === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Fichier de sauvegarde vide",
    });
  }

  if (payload.byteLength > maxDosSaveBytes) {
    throw createError({
      statusCode: 413,
      statusMessage: "Fichier de sauvegarde trop volumineux",
    });
  }

  const savePath = resolveDosSavePath(event, gameSlug);
  const temporaryFilePath = resolve(
    savePath.gameDirectory,
    `.${savePath.slotId}.${randomUUID()}.tmp`,
  );

  const { mkdir } = await import("node:fs/promises");
  await mkdir(savePath.gameDirectory, { recursive: true });

  try {
    await writeFile(temporaryFilePath, payload);
    await rename(temporaryFilePath, savePath.filePath);
  } catch (error) {
    await rm(temporaryFilePath, { force: true }).catch(() => undefined);
    throw error;
  }

  const metadata = await getDosSaveMetadata(event, gameSlug);

  if (!metadata) {
    throw createError({
      statusCode: 500,
      statusMessage: "Sauvegarde enregistrée mais introuvable",
    });
  }

  return metadata;
};

export const deleteDosSave = async (event: H3Event, gameSlug: string) => {
  const savePath = resolveDosSavePath(event, gameSlug);
  await rm(savePath.filePath, { force: true });
};
