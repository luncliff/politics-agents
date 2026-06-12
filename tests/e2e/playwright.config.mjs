import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
  },
  webServer: {
    command: 'npx http-server src -p 8080 -c-1',
    port: 8080,
    reuseExistingServer: true,
  },
});
