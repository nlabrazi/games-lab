import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { createError, getRouterParam, sendStream, setHeader } from "h3";

const allowedExtensions = new Set([".jsdos"]);

export default defineEventHandler(async (event) => {
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

  setHeader(event, "content-type", "application/octet-stream");
  setHeader(event, "cache-control", "public, max-age=3600");

  return sendStream(event, createReadStream(filePath));
});
