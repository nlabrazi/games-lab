import { afterEach, describe, expect, it } from "vitest";
import { useGames } from "../../app/composables/useGames";
import { games } from "../../app/data/games";

describe("useGames", () => {
  afterEach(() => {
    useGames().clearSelection();
  });

  it("shares the selected game state across composable calls", () => {
    const firstInstance = useGames();
    const secondInstance = useGames();
    const game = games[0];

    firstInstance.selectGame(game);

    expect(firstInstance.selectedGame.value).toEqual(game);
    expect(secondInstance.selectedGame.value).toEqual(game);
  });

  it("clears the selection when receiving a nullable value", () => {
    const { selectedGame, selectGame } = useGames();

    selectGame(games[0]);
    selectGame(undefined);

    expect(selectedGame.value).toBeNull();
  });
});
