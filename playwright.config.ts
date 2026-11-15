import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "*.spec.ts",
  use: {
    browserName: "webkit",
    baseURL: "http://127.0.0.1:1420",
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: "corepack pnpm dev",
    url: "http://127.0.0.1:1420",
    reuseExistingServer: true,
  },
  workers: 1,
});
