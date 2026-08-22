import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  /*
   * The keyboard walkthrough issues well over a hundred key presses, each with
   * an evaluate round-trip. Ten seconds keeps a slow machine from reading as a
   * failure without hiding a genuinely stuck page.
   */
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next start --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    /*
     * Never reuse a server, even locally.
     *
     * `next build` rewrites `.next` with freshly hashed chunk names, so a
     * server started before a rebuild serves HTML pointing at files that no
     * longer exist. The page then arrives with no CSS and no hydration, and
     * only the JavaScript-dependent tests fail — which reads like flakiness
     * rather than the stale process it actually is. A few seconds of startup
     * is worth never debugging that again.
     */
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
