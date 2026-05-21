export interface DosGame {
  slug: string;
  title: string;
  bundleFile: string;
  description: string;
  genre: string;
  releaseYear: number;
  status: "available" | "placeholder";
  thumbnail: {
    label: string;
    accentColor: string;
  };
}

export const dosGames: DosGame[] = [
  {
    slug: "lands-of-lore",
    title: "Lands of Lore: The Throne of Chaos",
    bundleFile: "lands-of-lore.jsdos",
    description:
      "Dungeon crawler RPG de Westwood, accessible et parfait pour ouvrir la collection.",
    genre: "RPG",
    releaseYear: 1993,
    status: "available",
    thumbnail: {
      label: "LoL",
      accentColor: "#38f7e8",
    },
  },
  {
    slug: "doom",
    title: "Doom",
    bundleFile: "doom.jsdos",
    description: "FPS fondateur, rapide, nerveux, excellent candidat pour tester clavier/souris.",
    genre: "FPS",
    releaseYear: 1993,
    status: "placeholder",
    thumbnail: {
      label: "DOOM",
      accentColor: "#e5484d",
    },
  },
  {
    slug: "duke-nukem-3d",
    title: "Duke Nukem 3D",
    bundleFile: "duke-nukem-3d.jsdos",
    description: "FPS culte Build Engine, plus vertical et interactif que les premiers Doom-like.",
    genre: "FPS",
    releaseYear: 1996,
    status: "placeholder",
    thumbnail: {
      label: "DN3D",
      accentColor: "#f5d90a",
    },
  },
  {
    slug: "warcraft-ii",
    title: "Warcraft II: Tides of Darkness",
    bundleFile: "warcraft-ii.jsdos",
    description:
      "RTS lisible et emblématique, bon choix pour varier avec de la stratégie temps réel.",
    genre: "RTS",
    releaseYear: 1995,
    status: "placeholder",
    thumbnail: {
      label: "WC2",
      accentColor: "#3b82f6",
    },
  },
  {
    slug: "x-com-ufo-defense",
    title: "X-COM: UFO Defense",
    bundleFile: "x-com-ufo-defense.jsdos",
    description:
      "Stratégie tactique et gestion globale, très bon jeu long avec intérêt pour les saves.",
    genre: "Tactique",
    releaseYear: 1994,
    status: "placeholder",
    thumbnail: {
      label: "XCOM",
      accentColor: "#22c55e",
    },
  },
  {
    slug: "civilization",
    title: "Sid Meier's Civilization",
    bundleFile: "civilization.jsdos",
    description: "4X historique, parfait pour représenter les jeux DOS à sessions longues.",
    genre: "4X",
    releaseYear: 1991,
    status: "placeholder",
    thumbnail: {
      label: "CIV",
      accentColor: "#f97316",
    },
  },
  {
    slug: "prince-of-persia",
    title: "Prince of Persia",
    bundleFile: "prince-of-persia.jsdos",
    description: "Plateforme cinématique précise, court, iconique, très adapté au navigateur.",
    genre: "Plateforme",
    releaseYear: 1989,
    status: "placeholder",
    thumbnail: {
      label: "POP",
      accentColor: "#f8fafc",
    },
  },
  {
    slug: "commander-keen-4",
    title: "Commander Keen 4: Secret of the Oracle",
    bundleFile: "commander-keen-4.jsdos",
    description: "Plateforme PC colorée, bonne vitrine pour les contrôles clavier simples.",
    genre: "Plateforme",
    releaseYear: 1991,
    status: "placeholder",
    thumbnail: {
      label: "KEEN",
      accentColor: "#a3e635",
    },
  },
  {
    slug: "simcity-2000",
    title: "SimCity 2000",
    bundleFile: "simcity-2000.jsdos",
    description: "Gestion urbaine dense, complément naturel aux jeux d'action et RPG.",
    genre: "Gestion",
    releaseYear: 1993,
    status: "placeholder",
    thumbnail: {
      label: "SC2K",
      accentColor: "#14b8a6",
    },
  },
  {
    slug: "rayman",
    title: "Rayman",
    bundleFile: "rayman.jsdos",
    description:
      "Plateforme 2D Ubisoft très soignée, visuellement forte pour une future vignette DOS.",
    genre: "Plateforme",
    releaseYear: 1995,
    status: "placeholder",
    thumbnail: {
      label: "RAY",
      accentColor: "#c084fc",
    },
  },
];

export const getDosGame = (slug?: string | null) =>
  dosGames.find((game) => game.slug === slug) ?? dosGames[0];

export const findDosGame = (slug?: string | null) =>
  typeof slug === "string" ? dosGames.find((game) => game.slug === slug) : undefined;
