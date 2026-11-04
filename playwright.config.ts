import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  // CI renders WebGL in software; camera damping settles per frame, so waits run longer.
  timeout: process.env.CI ? 90_000 : 30_000,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:4173/Solar-System-Orbital-Journey/',
    // Tracing every test under CI software rendering doubles the run; failures keep screenshots instead.
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        headless: process.env.PLAYWRIGHT_FIREFOX_HEADED !== '1',
      },
    },
    // Desktop Safari defaults to 2x; matching the other engines' 1x cuts software-WebGL render cost in CI.
    { name: 'webkit', use: { ...devices['Desktop Safari'], deviceScaleFactor: 1 } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/Solar-System-Orbital-Journey/',
    reuseExistingServer: !process.env.CI,
  },
});
