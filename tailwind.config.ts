/*
  Thème Tailwind personnalisé : palette néon rétro, polices pixel,
  extensions pour les ombres et les animations.
*/
import type { Config } from "tailwindcss";

export default (<Config>{
  theme: {
    extend: {
      colors: {
        neon: {
          cyan: "#00fff5",
          magenta: "#ff00ff",
          green: "#0f0",
          yellow: "#ff0",
          red: "#e94560",
        },
        dark: {
          DEFAULT: "#1a1a2e",
          card: "#16213e",
          accent: "#0f3460",
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', "cursive"],
        retro: ["VT323", "monospace"],
      },
    },
  },
  plugins: [],
});
