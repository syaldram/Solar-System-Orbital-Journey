import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  // CI renders WebGL in software, about 5x slower per Heliosphere frame than a dev machine.
  // Actionability checks and settledBoundingBox wait on frames, so heavy scenes already pass at 50-86s.
  timeout: process.env.CI ? 180_000 : 30_000,
  // Stop a few minutes before the 60-minute browser-smoke job limit so the HTML report is still written.
  globalTimeout: process.env.CI ? 55 * 60_000 : undefined,
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
    // Desktop Safari defaults to 2x; matching the other engines' 1x cuts CI software-WebGL run time.
    { name: 'webkit', use: { ...devices['Desktop Safari'], deviceScaleFactor: 1 } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/Solar-System-Orbital-Journey/',
    reuseExistingServer: !process.env.CI,
  },
});
