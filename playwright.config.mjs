// Playwright QA harness for Ledger.
//
// Runs the app's own Vite dev server (or attaches to an already-running one
// on :5173) and drives it headlessly. Demo Mode is used throughout — it
// fabricates a local session, so no Supabase writes ever happen during tests.
// The two sources of truth verified here are (a) the rendered output the
// user actually sees and (b) the window.__ledger* hooks that App.jsx exposes
// in dev builds only.
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./qa",
  testMatch: /.*\.spec\.(js|mjs)$/,
  timeout: 60_000,
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
