import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;

/**
 * E2E tests run against a seeded dev database (`pnpm db:seed`).
 * Locally they start `pnpm dev`; in CI (E2E_USE_BUILD=1) they run the production build.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  // Dev mode compiles routes on first visit; give navigations room.
  timeout: 60_000,
  expect: { timeout: process.env.E2E_USE_BUILD ? 5_000 : 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: process.env.E2E_USE_BUILD ? `pnpm start -p ${PORT}` : `pnpm dev -p ${PORT}`,
    // Readiness only. /api/health is asserted by a test, so a Redis outage fails one
    // test instead of hanging the whole run.
    url: `${baseURL}/en`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Every test signs in from 127.0.0.1, which would trip the per-IP auth rate limit.
    // Rate limiting itself is covered by tests/unit/auth-config.test.ts and manual QA.
    env: { AUTH_RATE_LIMIT: "off", ENABLE_DEV_OUTBOX: "true" },
  },
});
