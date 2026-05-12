import { defineConfig } from '@playwright/test';

/**
 * Web E2E against local Expo (`pnpm web`, default port 8081).
 */
export default defineConfig({
  testDir: 'e2e',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:8081',
    trace: 'on-first-retry',
  },
});
