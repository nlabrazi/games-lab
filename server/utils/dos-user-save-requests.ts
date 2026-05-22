import { type H3Event, createError, getRouterParam } from "h3";
import { findDosGame } from "../../app/data/dosGames";
import { requireDosAuthUser } from "./dos-auth";
import type { DosSaveDescriptor } from "./dos-save-storage";

export const resolveUserDosSaveDescriptor = (event: H3Event): Required<DosSaveDescriptor> => {
  const user = requireDosAuthUser(event);
  const gameSlug = getRouterParam(event, "gameSlug") ?? "";
  const game = findDosGame(gameSlug);

  if (!game || game.status !== "available") {
    throw createError({
      statusCode: 404,
      statusMessage: "Jeu MS-DOS introuvable",
    });
  }

  return {
    gameSlug: game.slug,
    slotId: `user-${user.username}`,
  };
};
