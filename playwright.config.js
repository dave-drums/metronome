import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/browser',
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4191',
    viewport: {width: 1280, height: 1000},
    ...(process.env.PLAYWRIGHT_CHANNEL ? {channel: process.env.PLAYWRIGHT_CHANNEL} : {}),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: { command: 'npm run build:reference && node scripts/test-server.mjs', url: 'http://127.0.0.1:4191/metronome/', reuseExistingServer: false, timeout: 60000 },
  reporter: 'list'
});
