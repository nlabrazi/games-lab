import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import process from "node:process";
import { type H3Event, createError } from "h3";

export const defaultDosSaveSlot = "default";
export const maxDosSaveBytes = 25 * 1024 * 1024;

const dosSaveIdentifierPattern = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

export interface DosSaveDescriptor {
  gameSlug: string;
  slotId?: string;
}

export interface DosSaveMetadata {
  filePath: string;
  size: number;
  updatedAt: Date;
}

interface DosSavePath {
  rootDirectory: string;
  gameDirectory: string;
  filePath: string;
  gameSlug: string;
  slotId: string;
}

const validateDosSaveIdentifier = (value: string | undefined, fieldName: string) => {
  if (!value || value.includes("\0") || !dosSaveIdentifierPattern.test(value)) {
    throw createError({
      statusCode: 400,
      statusMessage: `${fieldName} de sauvegarde invalide`,
    });
  }

  return value;
};

export const resolveDosSavePath = (event: H3Event, descriptor: DosSaveDescriptor): DosSavePath => {
  const config = useRuntimeConfig(event);
  const rootDirectory = resolve(process.env.DOS_SAVES_DIR ?? config.dosSavesDir);
  const gameSlug = validateDosSaveIdentifier(descriptor.gameSlug, "Jeu");
  const slotId = validateDosSaveIdentifier(descriptor.slotId ?? defaultDosSaveSlot, "Slot");
  const filePath = resolve(rootDirectory, gameSlug, `${slotId}.save`);

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
    gameSlug,
    slotId,
  };
};

export const getDosSaveMetadata = async (
  event: H3Event,
  descriptor: DosSaveDescriptor,
): Promise<DosSaveMetadata | null> => {
  const savePath = resolveDosSavePath(event, descriptor);
  const fileStat = await stat(savePath.filePath).catch(() => null);

  if (!fileStat?.isFile()) {
    return null;
  }

  return {
    filePath: savePath.filePath,
    size: fileStat.size,
    updatedAt: fileStat.mtime,
  };
};

export const readDosSave = async (
  event: H3Event,
  descriptor: DosSaveDescriptor,
): Promise<Buffer | null> => {
  const metadata = await getDosSaveMetadata(event, descriptor);

  if (!metadata) {
    return null;
  }

  return readFile(metadata.filePath);
};

export const writeDosSave = async (
  event: H3Event,
  descriptor: DosSaveDescriptor,
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

  const savePath = resolveDosSavePath(event, descriptor);
  const temporaryFilePath = resolve(
    savePath.gameDirectory,
    `.${savePath.slotId}.${randomUUID()}.tmp`,
  );

  await mkdir(savePath.gameDirectory, { recursive: true });

  try {
    await writeFile(temporaryFilePath, payload);
    await rename(temporaryFilePath, savePath.filePath);
  } catch (error) {
    await rm(temporaryFilePath, { force: true }).catch(() => undefined);
    throw error;
  }

  const metadata = await getDosSaveMetadata(event, descriptor);

  if (!metadata) {
    throw createError({
      statusCode: 500,
      statusMessage: "Sauvegarde ecrite mais introuvable",
    });
  }

  return metadata;
};

export const deleteDosSave = async (event: H3Event, descriptor: DosSaveDescriptor) => {
  const savePath = resolveDosSavePath(event, descriptor);
  await rm(savePath.filePath, { force: true });
};
