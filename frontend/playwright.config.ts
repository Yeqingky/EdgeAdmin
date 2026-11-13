import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://192.168.5.30:7788',
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
  },
})
