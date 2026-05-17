export interface DosGame {
  slug: string;
  title: string;
  bundleFile: string;
}

export const dosGames: DosGame[] = [
  {
    slug: "lands-of-lore",
    title: "Lands of Lore",
    bundleFile: "lands-of-lore.jsdos",
  },
];

export const getDosGame = (slug?: string | null) =>
  dosGames.find((game) => game.slug === slug) ?? dosGames[0];
