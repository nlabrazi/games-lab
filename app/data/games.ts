/*
  Tableau de données pour les jeux.
  Chaque jeu possède un identifiant, un titre, une description courte,
  une description longue, un lien, une icône (emoji pour placeholder) et une couleur.
  Tu peux remplacer les liens par les URLs de tes vrais jeux.
*/
export interface Game {
  id: number;
  title: string;
  shortDesc: string;
  longDesc: string;
  link: string;
  icon: string;
  color: string;
}

export const games: Game[] = [
  {
    id: 1,
    title: "Pixel Invaders",
    shortDesc: "Space shooter rétro en JavaScript pur",
    longDesc:
      "Un hommage aux jeux d'arcade des années 80. Utilise les flèches pour te déplacer et la barre espace pour tirer. Développé en vanilla JS avec Canvas.",
    icon: "👾",
    link: "/games/pixel-invaders",
    color: "#e94560",
  },
  {
    id: 2,
    title: "Dungeon Quest",
    shortDesc: "Rogue-like en React",
    longDesc:
      "Explore des donjons générés aléatoirement, collecte des trésors et affronte des monstres. Interface réactive construite avec React et hooks.",
    icon: "⚔️",
    link: "#",
    color: "#f39c12",
  },
  {
    id: 3,
    title: "Puzzle Blocks",
    shortDesc: "Tetris-like en pur JS",
    longDesc:
      "Un puzzle game minimaliste avec système de score et niveaux progressifs. Gestion complète des collisions et animations fluides.",
    icon: "🧩",
    link: "#",
    color: "#2ecc71",
  },
  {
    id: 4,
    title: "Racing Neon",
    shortDesc: "Course vue du dessus en JS",
    longDesc:
      "Pilote une voiture sur un circuit néon en évitant les obstacles. Contrôles simples, difficulté croissante. Codé avec l'API Canvas.",
    icon: "🏎️",
    link: "#",
    color: "#9b59b6",
  },
];
