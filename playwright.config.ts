import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : 'html',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    port: 5174,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 },
      },
    },
    {
      name: 'Chromebook Touch',
      use: {
        browserName: 'chromium',
        viewport: { width: 1366, height: 768 },
        hasTouch: true,
      },
    },
    {
      name: 'Mobile iPad',
      use: {
        ...devices['iPad Pro 11'],
        deviceScaleFactor: 1, // Keep screenshots under 2000px for multi-image review
      },
    },
  ],
});
