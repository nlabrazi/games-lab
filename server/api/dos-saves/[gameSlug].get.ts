import { createError, defineEventHandler, getRouterParam, setHeader } from "h3";
import { getDosSaveMetadata, readDosSave } from "../../utils/dos-save-storage";

export default defineEventHandler(async (event) => {
  const gameSlug = getRouterParam(event, "gameSlug");

  if (!gameSlug) {
    throw createError({ statusCode: 400, statusMessage: "Paramètre gameSlug manquant" });
  }

  const metadata = await getDosSaveMetadata(event, gameSlug);

  if (!metadata) {
    throw createError({ statusCode: 404, statusMessage: "Aucune sauvegarde pour ce jeu" });
  }

  const saveBuffer = await readDosSave(event, gameSlug);

  if (!saveBuffer) {
    throw createError({ statusCode: 404, statusMessage: "Fichier de sauvegarde introuvable" });
  }

  setHeader(event, "content-type", "application/octet-stream");
  setHeader(event, "content-length", String(saveBuffer.length));
  setHeader(event, "cache-control", "no-cache");
  setHeader(event, "last-modified", metadata.updatedAt.toUTCString());

  return saveBuffer;
});
