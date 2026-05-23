import { describe, expect, it } from "vitest";
import { dosGames, findDosGame, getDosGame } from "../../app/data/dosGames";

describe("dosGames catalog", () => {
  it("keeps slugs unique and bundles compatible with the DOS endpoint", () => {
    const slugs = dosGames.map((game) => game.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(dosGames.every((game) => game.bundleFile.endsWith(".jsdos"))).toBe(true);
  });

  it("always exposes at least one playable game", () => {
    expect(dosGames.some((game) => game.status === "available")).toBe(true);
  });

  it("finds a game by slug and falls back to the first catalog entry", () => {
    expect(getDosGame("doom")?.title).toBe("Doom");
    expect(getDosGame("unknown-game")).toBe(dosGames[0]);
    expect(getDosGame(null)).toBe(dosGames[0]);
  });

  it("can look up a game without fallback for route validation", () => {
    expect(findDosGame("lands-of-lore")?.status).toBe("available");
    expect(findDosGame("unknown-game")).toBeUndefined();
    expect(findDosGame(null)).toBeUndefined();
  });
});
