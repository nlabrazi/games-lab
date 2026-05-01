/*
  Configuration Nuxt 4 : activation de Tailwind, import global des CSS,
  meta tags rétro et police Google.
*/
export default defineNuxtConfig({
  compatibilityDate: "2026-04-22",
  devtools: { enabled: true },
  modules: ["@nuxtjs/tailwindcss"],
  css: [
    "~/assets/css/base.css",
    "~/assets/css/crt.css",
    "~/assets/css/glitch.css",
    "~/assets/css/buttons.css",
    "~/assets/css/starfield.css",
  ],
  app: {
    head: {
      title: "Games Lab – Portfolio Jeux Rétro",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          key: "description",
          name: "description",
          content: "Jeux rétro jouables dans le navigateur",
        },
      ],
      link: [
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap",
        },
      ],
    },
  },
});
