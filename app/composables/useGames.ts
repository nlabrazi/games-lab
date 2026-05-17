/*
  Composable réactif pour les jeux et la sélection d'un jeu.
  Permet de partager l'état entre les composants sans prop drilling.
*/
import { games } from "@/data/games";
import type { Game } from "@/data/games";

export const useGames = () => {
  const selectedGame = useState<Game | null>("selectedGame", () => null);

  const selectGame = (game: Game | null | undefined) => {
    if (!game) {
      selectedGame.value = null;
      return;
    }

    selectedGame.value = game;
  };

  const clearSelection = () => {
    selectedGame.value = null;
  };

  return {
    games,
    selectedGame,
    selectGame,
    clearSelection,
  };
};
