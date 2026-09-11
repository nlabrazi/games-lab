import { createError, defineEventHandler, getRouterParam, readRawBody } from "h3";
import { writeDosSave } from "../../utils/dos-save-storage";

export default defineEventHandler(async (event) => {
  const gameSlug = getRouterParam(event, "gameSlug");

  if (!gameSlug) {
    throw createError({ statusCode: 400, statusMessage: "Paramètre gameSlug manquant" });
  }

  const rawBody = await readRawBody(event, false);

  if (!rawBody || rawBody.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "Données de sauvegarde vides" });
  }

  const metadata = await writeDosSave(event, gameSlug, rawBody);

  return {
    success: true,
    size: metadata.size,
    updatedAt: metadata.updatedAt.toISOString(),
  };
});
