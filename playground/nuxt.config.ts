import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: [
    "@nuxt/icon",
    "@pinia/nuxt",
    "../src/module",
  ],
  blocks: {
    code: true,
    math: true,
    drawing: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});

