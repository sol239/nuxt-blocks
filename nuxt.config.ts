import { codeLanguages } from "./app/core/blocks/codeLanguages";
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@nuxt/icon',
    '@nuxt/eslint',
    '@pinia/nuxt',
    './src/module',
  ],
  blocks: {
    code: true,
    math: true,
    drawing: true,
    codeLanguages,
  },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
})
