import { type H3Event, createError, getRouterParam } from "h3";
import { findDosGame } from "../../app/data/dosGames";
import { type DosSaveDescriptor, defaultDosSaveSlot } from "./dos-save-storage";

export const resolveDosSaveDescriptor = (event: H3Event): Required<DosSaveDescriptor> => {
  const gameSlug = getRouterParam(event, "gameSlug") ?? "";
  const slotId = getRouterParam(event, "slotId") ?? defaultDosSaveSlot;
  const game = findDosGame(gameSlug);

  if (!game || game.status !== "available") {
    throw createError({
      statusCode: 404,
      statusMessage: "Jeu MS-DOS introuvable",
    });
  }

  return {
    gameSlug: game.slug,
    slotId,
  };
};
