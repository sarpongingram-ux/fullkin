import { defineConfig } from "@playwright/test"

// Live end-to-end audit van de PRODUCTIE-app. Geen mocks. Mobiel is primair.
const OUT = "audit/live-2026-09-24"

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1, // sequentieel: mobiel muteert demo-data (Kojo→David), desktop leest daarna
  outputDir: `${OUT}/playwright-output`,
  reporter: [["list"], ["json", { outputFile: `${OUT}/results.json` }]],
  use: {
    baseURL: "https://fullkin.vercel.app",
    trace: "on",
    screenshot: "on",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile",
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    {
      name: "desktop",
      use: { viewport: { width: 1440, height: 900 } },
    },
  ],
})
