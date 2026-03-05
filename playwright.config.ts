import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/smoke',
  timeout: 90_000,
  use: {
    headless: true,
    baseURL: 'http://127.0.0.1:3000',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
