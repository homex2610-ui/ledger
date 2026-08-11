// Deterministic local reproduction of the demo → real-account race (Bug 2).
//
//   node qa/local-repro.mjs [--url http://localhost:5174] [--name NAME]
//
// Uses the app's dev-only __ledgerAuth hook to drive the exact transition
// the cross-tab flow produces, WITHOUT a browser-level OAuth round trip:
//   1. demo mode → onboarding (distinctive name) → dashboard
//   2. inject a REAL session (from the live-repro session dump) into
//      localStorage so the page's supabase client is authenticated
//   3. __ledgerAuth.signInAs(realUser) — the same setSession terminal the
//      storage-event broadcast uses
//   4. observe: console [storage] warnings, kv_store POST/PATCH payloads,
//      final UI state, and the account's kv_store rows via the Node client.
//
// Verdict mirrors live-repro: symptom (a)/(b)/silent contamination/clean.

import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : dflt;
};
const URL = flag("url", "http://localhost:5174");
const DEMO_NAME = flag("name", "DEMO-REPRO-1");
const SESSION_DUMP = "C:\\Users\\updes\\AppData\\Local\\Temp\\opencode\\ledger-last-session.json";

const envPath = resolve(".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()])
);
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

const saved = JSON.parse(readFileSync(SESSION_DUMP, "utf8"));
const c = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const { data: su } = await c.auth.setSession(saved.session);
const session = su.session;
if (!session) {
  console.log("FAIL: dumped session is not valid anymore");
  process.exit(1);
}
const uid = session.user.id;

// Clean slate for the account under test.
await c.from("kv_store").delete().eq("owner_id", uid);
console.log(`account ${uid} purged — starting clean`);

const browser = await chromium.launch();
const context = await browser.newContext();
const consoleLines = [];
const requests = [];
const page = await context.newPage();
page.on("console", (msg) => {
  const t = msg.text();
  if (/\[storage\]|error|Error/.test(t)) consoleLines.push(t.slice(0, 200));
});
page.on("request", (req) => {
  if (!req.url().includes("/rest/v1/kv_store")) return;
  if (["POST", "PATCH", "DELETE"].includes(req.method())) {
    let body = "";
    try { body = (req.postData() || "").replace(/\s+/g, " ").slice(0, 200); } catch {}
    requests.push(`${req.method()} ${body}`);
  }
});

// 1. demo mode + onboarding
await page.goto(URL, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: "Continue as Guest / Demo Mode" }).click();
await page.getByText("Who are you?").waitFor({ state: "visible", timeout: 20_000 });
await page.getByPlaceholder("e.g. Aditya").fill(DEMO_NAME);
await page.getByRole("button", { name: "Continue" }).click();
await page.getByText("What are you targeting?").waitFor({ state: "visible", timeout: 10_000 });
await page.getByRole("button", { name: "Continue" }).click();
await page.getByText("Lock the date").waitFor({ state: "visible", timeout: 10_000 });
await page.getByRole("button", { name: "Start tracking" }).click();
await page.locator('nav[aria-label="Primary"]').waitFor({ state: "visible", timeout: 20_000 });
console.log(`demo dashboard up (${DEMO_NAME})`);

// timeline poller
await page.evaluate(() => {
  window.__tl = [];
  const t0 = performance.now();
  const check = () => {
    const nav = !!document.querySelector('nav[aria-label="Primary"]');
    const onb = [...document.querySelectorAll("div")].some((d) => d.textContent.trim() === "Who are you?");
    const skel = !!document.querySelector(".lg-skeleton");
    window.__tl.push([Math.round(performance.now() - t0), nav, onb, skel]);
    if (performance.now() - t0 < 120_000) setTimeout(check, 15);
  };
  check();
});

// 2. inject the real session into the page's localStorage
await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
  key: `sb-${SUPABASE_URL.replace("https://", "").replace(".supabase.co", "")}-auth-token`,
  value: JSON.stringify(saved.session),
});
console.log("real session injected into localStorage");
await page.waitForTimeout(1200); // let the page's supabase client sync

// 3. drive the transition through the app's own session terminal
await page.evaluate((s) => {
  window.__ledgerAuth.signInAs(s.user);
  window.__transitionAt = performance.now();
}, session);
console.log(`transition fired: demo -> real user ${uid}`);
await page.waitForTimeout(4000);

// 4. read everything back
const tl = await page.evaluate(() => window.__tl || []);
const final = await page.evaluate(
  (demoName) => ({
    nav: !!document.querySelector('nav[aria-label="Primary"]'),
    onboarding: [...document.querySelectorAll("div")].some((d) => d.textContent.trim() === "Who are you?"),
    hasDemoName: document.body.innerText.includes(demoName),
  }),
  DEMO_NAME
);
const [p, l] = await Promise.all([
  c.from("kv_store").select("value, updated_at").eq("key", "profile").eq("shared", false).maybeSingle(),
  c.from("kv_store").select("value, updated_at").eq("key", `lb:${uid}`).eq("shared", true).maybeSingle(),
]);
const contaminated =
  (p.data?.value?.name === DEMO_NAME) || (l.data?.value?.name === DEMO_NAME);

let verdict;
if (!final.onboarding && final.nav) verdict = "SYMPTOM (a): demo dashboard persisted";
else if (final.onboarding) verdict = contaminated ? "SILENT CONTAMINATION: onboarding but demo data in account" : "clean (onboarding, no contamination)";
else verdict = "?";
const sessIdx = tl.findIndex(([, , s]) => s);
console.log(`timeline (nav/onb/skel): ${tl.map(([t, n, o, k]) => `${t}ms:${n ? "N" : "."}${o ? "O" : "."}${k ? "K" : "."}`).join(" ").slice(0, 500)}`);
console.log(`final: ${final.nav ? "dashboard" : ""}${final.onboarding ? "onboarding" : ""}${final.hasDemoName ? ` (${DEMO_NAME} visible)` : ""}`);
console.log(`kv_store requests:`);
console.log(requests.length ? requests.map((r) => `  ${r}`).join("\n") : "  (none)");
console.log(`console [storage]/error:`);
console.log(consoleLines.length ? consoleLines.map((x) => `  ${x}`).join("\n") : "  (none)");
console.log(`kv probe: profile=${p.data ? JSON.stringify(p.data.value).slice(0, 80) : "absent"} | lb=${l.data ? JSON.stringify(l.data.value).slice(0, 80) : "absent"}`);
console.log(`VERDICT: ${verdict}`);

await browser.close();
