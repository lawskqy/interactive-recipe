import { defineConfig, devices } from "@playwright/test";
const production = process.env.TEST_PRODUCTION === "1";
const baseURL = production ? "http://127.0.0.1:4180" : "http://127.0.0.1:5173";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  timeout: 30000,
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: production ? "node ../backend/server.js" : "npm run dev -- --host 127.0.0.1",
    env: production ? { PORT: "4180", GEMINI_API_KEY: "", GOOGLE_API_KEY: "" } : {},
    url: baseURL,
    reuseExistingServer: !process.env.CI && !production,
  },
});
