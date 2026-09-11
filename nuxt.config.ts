const defaultDosGamesDir = import.meta.dev ? "local/dos-games" : "public/dos-games";

/*
  Configuration Nuxt 4 : activation de Tailwind, import global des CSS,
  meta tags rétro et police Google.
*/
export default defineNuxtConfig({
  compatibilityDate: "2026-04-22",
  devtools: { enabled: true },
  modules: ["@nuxtjs/tailwindcss"],
  runtimeConfig: {
    dosGamesDir: defaultDosGamesDir,
    public: {
      dosGamesBaseUrl: "/api/dos-games",
      jsDosScriptUrl: "https://v8.js-dos.com/latest/js-dos.js",
      jsDosStyleUrl: "https://v8.js-dos.com/latest/js-dos.css",
      jsDosPathPrefix: "https://v8.js-dos.com/latest/emulators/",
    },
  },
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
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover",
        },
        { name: "theme-color", content: "#0a0f1f" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
        { name: "apple-mobile-web-app-title", content: "Games Lab" },
        { name: "mobile-web-app-capable", content: "yes" },
        {
          key: "description",
          name: "description",
          content: "Jeux rétro jouables dans le navigateur",
        },
      ],
      link: [
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
        { rel: "apple-touch-icon", href: "/favicon.ico" },
        { rel: "manifest", href: "/manifest.webmanifest" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap",
        },
      ],
      script: [
        {
          src: "https://umami.nabster.dev/script.js",
          defer: true,
          "data-website-id": "1477bf65-b3e0-48dd-9e06-ac9bdc3a8f04",
        },
      ],
    },
  },
});
