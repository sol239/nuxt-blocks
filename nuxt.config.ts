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
    codeLanguages: [
      'plaintext', 'javascript', 'typescript', 'html', 'css', 'scss', 'less',
      'json', 'jsonc', 'yaml', 'xml', 'markdown', 'sql', 'graphql',
      'python', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby',
      'swift', 'kotlin', 'dart', 'scala', 'lua', 'perl', 'r', 'julia',
      'shell', 'bash', 'powershell', 'dockerfile', 'protobuf', 'ini',
    ],
  },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
})
