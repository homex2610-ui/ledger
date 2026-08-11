// Boots a second Vite dev server on :5174 with VITE_DISCORD_INVITE_URL set,
// so the e2e suite can exercise the "Discord configured" CTA state. The QA
// value is a test-only placeholder — production is configured separately
// via the real Vercel environment variable, and the placeholder must never
// reach a production bundle (the AGENTS.md build grep pins that).
import { spawn } from "node:child_process";

process.env.VITE_DISCORD_INVITE_URL = process.env.VITE_DISCORD_INVITE_URL || "https://discord.gg/ledger-qa";

const child = spawn("npm", ["run", "dev", "--", "--port", "5174", "--strictPort"], {
  stdio: "inherit",
  shell: true,
});
child.on("exit", (code) => process.exit(code ?? 0));
