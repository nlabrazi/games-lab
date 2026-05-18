import { stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import process from "node:process";
import { type H3Event, createError, getRouterParam, setHeader } from "h3";

const allowedExtensions = new Set([".jsdos"]);

export const resolveDosGameBundle = async (event: H3Event) => {
  const config = useRuntimeConfig(event);
  const requestedPath = getRouterParam(event, "path") ?? "";

  if (!requestedPath || requestedPath.includes("\0")) {
    throw createError({ statusCode: 400, statusMessage: "Chemin de bundle invalide" });
  }

  if (!allowedExtensions.has(extname(requestedPath).toLowerCase())) {
    throw createError({ statusCode: 403, statusMessage: "Extension de bundle non autorisee" });
  }

  const rootDirectory = resolve(process.env.DOS_GAMES_DIR ?? config.dosGamesDir);
  const filePath = resolve(rootDirectory, requestedPath);

  if (filePath !== rootDirectory && !filePath.startsWith(`${rootDirectory}${sep}`)) {
    throw createError({ statusCode: 400, statusMessage: "Chemin de bundle invalide" });
  }

  const fileStat = await stat(filePath).catch(() => null);

  if (!fileStat?.isFile()) {
    throw createError({ statusCode: 404, statusMessage: "Bundle MS-DOS introuvable" });
  }

  return { filePath, size: fileStat.size };
};

export const setDosGameBundleHeaders = (event: H3Event, size: number) => {
  setHeader(event, "content-type", "application/octet-stream");
  setHeader(event, "content-length", String(size));
  setHeader(event, "cache-control", "public, max-age=3600");
};
