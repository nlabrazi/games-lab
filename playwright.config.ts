import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "pixel-7",
      use: {
        ...devices["Pixel 7"],
        baseURL: BASE_URL,
      },
    },
    {
      name: "iphone-14",
      use: {
        ...devices["iPhone 14"],
        defaultBrowserType: "chromium",
        baseURL: BASE_URL,
      },
    },
    {
      name: "mobile-landscape",
      use: {
        viewport: { width: 844, height: 390 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
        baseURL: BASE_URL,
      },
    },
    {
      name: "desktop-chrome",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: BASE_URL,
      },
    },
  ],
  webServer: {
    command: `npx nuxt dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
