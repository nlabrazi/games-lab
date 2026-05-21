import { describe, expect, it } from "vitest";
import { games } from "../../app/data/games";

describe("games catalog", () => {
  it("keeps ids unique", () => {
    const ids = games.map((game) => game.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps all playable links inside the Nuxt games section", () => {
    expect(games.every((game) => game.link.startsWith("/games/"))).toBe(true);
  });

  it("has enough content to render a useful card and detail view", () => {
    expect(
      games.every(
        (game) =>
          game.title.trim() &&
          game.shortDesc.trim() &&
          game.longDesc.trim() &&
          game.icon.trim() &&
          game.color.trim(),
      ),
    ).toBe(true);
  });
});
