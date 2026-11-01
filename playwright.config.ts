import { defineConfig } from "@playwright/test";

const basePath = process.env.VITE_BASE_PATH ?? "/aufmassapp/";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:4173${basePath}`,
    browserName: "chromium",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    colorScheme: "light",
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: `http://127.0.0.1:4173${basePath}`,
    reuseExistingServer: !process.env.CI,
  },
});
