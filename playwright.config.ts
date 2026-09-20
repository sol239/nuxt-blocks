import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: { baseURL: "http://127.0.0.1:4175" },
  webServer: {
    command: "node .output/server/index.mjs",
    env: { PORT: "4175", HOST: "127.0.0.1" },
    url: "http://127.0.0.1:4175",
    reuseExistingServer: false,
  },
});
