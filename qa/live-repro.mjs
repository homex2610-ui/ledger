// Live Phase 1 reproduction harness for Bug 2 (demo -> real-account race).
//
//   node qa/live-repro.mjs [--repeats N] [--name NAME] [--url URL] [--auth email|discord]
//
// Drives the EXACT cross-tab transition a real user hits, against the LIVE
// deployment (default: production). Tab A stays in demo mode with a
// distinctive profile name — its Workspace holds the stale demo profile in
// React state when the session arrives. A second flow obtains a REAL session
// for the same browser context; when it lands, the storage-event broadcast
// re-keys tab A's useStorage and re-fires every save effect with the stale
// demo values. That is the race under test.
//
// Auth modes:
//   email   (default) — tab C sends the OTP via the app's own AuthScreen for
//                       a disposable mailbox (mail.tm); tab B opens the link.
//                       NOTE: the Supabase project rate-limits OTP sends per
//                       IP (429) — if a run reports otp-send-failed, the IP
//                       window must reset before retrying.
//   discord — tab D clicks "Continue with Discord". THE BROWSER OPENS HEADED:
//             complete the Discord authorization in the window (log into
//             Discord if asked — type credentials only on Discord's own page;
//             the script never sees or stores them). Bypasses the email rate
//             limit entirely; every repeat reuses the same Discord account.
//
// Afterwards it reads tab A's settled state, its timeline, and — using the
// real session token from tab A's localStorage — the account's kv_store
// profile and lb:<id> rows directly (the persistence half of the check,
// impossible in the RLS-blocked e2e environment).
//
// Verdicts per repeat:
//   symptom (a) dashboard-persisted  — tab A kept the demo dashboard
//   symptom (b) flash                — demo dashboard stayed visible during
//                                      the reload, then onboarding appeared
//   silent contamination             — onboarding appeared BUT the account's
//                                      kv_store received the demo profile /
//                                      leaderboard row anyway
//   clean                            — neither UI nor persistence leaked
//
// Every auth user created is appended to the throwaway-accounts cleanup log.

import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, appendFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : dflt;
};
const REPEATS = parseInt(flag("repeats", "3"), 10);
const DEMO_NAME = flag("name", "DEMO-LIVE-1");
const PROJECT_URL = flag("url", "https://ledger-pi-topaz.vercel.app");
const AUTH_MODE = flag("auth", "email");
const LOG_PATH = "C:\\Users\\updes\\AppData\\Local\\Temp\\opencode\\ledger-throwaways.md";
const SESSION_DUMP = "C:\\Users\\updes\\AppData\\Local\\Temp\\opencode\\ledger-last-session.json";
const PURGE_SESSION = flag("purge-session", null);

const envPath = resolve(".env.local");
const env = existsSync(envPath)
  ? Object.fromEntries(
      readFileSync(envPath, "utf8")
        .split(/\r?\n/)
        .map((l) => l.match(/^\s*([A-Z0-9_]+)=(.*)$/))
        .filter(Boolean)
        .map((m) => [m[1], m[2].trim()])
    )
  : {};
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.log("SKIP: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing in .env.local");
  process.exit(0);
}

const createdEmails = [];
const log = (...a) => console.log(...a);
const line = () => console.log("-".repeat(72));

// ---- disposable mailbox (mail.tm), email mode only ----
async function mailtmCreate() {
  const domains = await (await fetch("https://api.mail.tm/domains")).json();
  const domain = domains["hydra:member"][0].domain;
  const address = `ledger-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}@${domain}`;
  const password = `Lgr${Math.random().toString(36).slice(2)}!1a`;
  const acct = await (
    await fetch("https://api.mail.tm/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, password }),
    })
  ).json();
  const tok = await (
    await fetch("https://api.mail.tm/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, password }),
    })
  ).json();
  return { id: acct.id, address, token: tok.token };
}

async function mailtmWaitForLink(token, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const msgs = await (
      await fetch("https://api.mail.tm/messages", { headers: { Authorization: `Bearer ${token}` } })
    ).json();
    for (const m of msgs["hydra:member"] || []) {
      const full = await (
        await fetch(`https://api.mail.tm/messages/${m.id}`, { headers: { Authorization: `Bearer ${token}` } })
      ).json();
      const hay = `${full.html || ""} ${full.text || ""}`.replaceAll("&amp;", "&");
      const hit = hay.match(/https?:\/\/[^"'\s<>]+supabase\.co\/auth\/v1\/verify[^"'\s<>)]*/);
      if (hit) return hit[0];
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
  return null;
}

async function mailtmDelete(acct) {
  try {
    await fetch(`https://api.mail.tm/accounts/${acct.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${acct.token}` },
    });
  } catch {}
}

// ---- one reproduction cycle ----
async function runOnce(browser, index) {
  let acct = null;
  if (AUTH_MODE === "email") {
    acct = await mailtmCreate();
    createdEmails.push(acct.address);
  }
  // Optional: start from a clean slate — delete the account's kv_store rows
  // using a session captured by a previous repeat (see --purge-session).
  if (PURGE_SESSION && existsSync(PURGE_SESSION)) {
    try {
      const saved = JSON.parse(readFileSync(PURGE_SESSION, "utf8"));
      const c = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const sr = await c.auth.setSession(saved.session);
      const uid = sr.data.session?.user?.id;
      if (!uid) {
        log(`REPEAT ${index}: purge skipped — no session from dump (expired?)`);
      } else {
        const { error } = await c.from("kv_store").delete().eq("owner_id", uid);
        log(`REPEAT ${index}: purged kv_store rows for ${uid} (${error ? "error: " + error.message : "ok"})`);
      }
    } catch (e) {
      log(`REPEAT ${index}: purge failed — ${String(e).slice(0, 140)}`);
    }
  }
  const context = await browser.newContext();
  const consoleLines = [];
  const requests = [];
  const hookConsole = (page, label) =>
    page.on("console", (msg) => {
      const t = msg.text();
      if (/\[storage\]|error|Error/.test(t)) consoleLines.push(`[${label}] ${t.slice(0, 220)}`);
    });
  const hookRequests = (page, label) =>
    page.on("request", (req) => {
      const u = req.url();
      if (!u.includes("/rest/v1/kv_store")) return;
      if (req.method() === "POST" || req.method() === "PATCH" || req.method() === "DELETE") {
        let body = "";
        try {
          const rb = req.postData();
          if (rb) body = rb.replace(/\s+/g, " ").slice(0, 260);
        } catch {}
        requests.push(`[${label}] ${req.method()} ${body}`);
      }
    });
  let tabA;
  try {
    // --- tab A: demo mode, distinctive name, stays mounted ---
    tabA = await context.newPage();
    hookConsole(tabA, "tabA");
    hookRequests(tabA, "tabA");
    await tabA.goto(PROJECT_URL, { waitUntil: "domcontentloaded" });
    await tabA.getByRole("button", { name: "Continue as Guest / Demo Mode" }).click();
    await tabA.getByText("Who are you?").waitFor({ state: "visible", timeout: 20_000 });
    await tabA.getByPlaceholder("e.g. Aditya").fill(DEMO_NAME);
    await tabA.getByRole("button", { name: "Continue" }).click();
    await tabA.getByText("What are you targeting?").waitFor({ state: "visible", timeout: 10_000 });
    await tabA.getByRole("button", { name: "Continue" }).click();
    await tabA.getByText("Lock the date").waitFor({ state: "visible", timeout: 10_000 });
    await tabA.getByRole("button", { name: "Continue" }).click();
    await tabA.getByText("Already studied?").waitFor({ state: "visible", timeout: 10_000 });
    await tabA.getByRole("button", { name: "Continue" }).click();
    await tabA.getByText("Set your daily commitment").waitFor({ state: "visible", timeout: 10_000 });
    await tabA.getByRole("button", { name: "Start your first focus session" }).click();
    await tabA.locator('nav[aria-label="Primary"]').waitFor({ state: "visible", timeout: 20_000 });
    // Timeline poller: runs the whole wait (the session can arrive 30s+ out).
    await tabA.evaluate(() => {
      window.__tl = [];
      const t0 = performance.now();
      const check = () => {
        const nav = !!document.querySelector('nav[aria-label="Primary"]');
        const onb = [...document.querySelectorAll("div")].some((d) => d.textContent.trim() === "Who are you?");
        const sess = Object.keys(localStorage).some((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
        const skel = !!document.querySelector(".lg-skeleton");
        window.__tl.push([Math.round(performance.now() - t0), nav, onb, sess, skel]);
        if (performance.now() - t0 < 300_000) setTimeout(check, 15);
      };
      check();
    });

    // --- obtain a real session for this context ---
    if (AUTH_MODE === "discord") {
      const tabD = await context.newPage();
      hookConsole(tabD, "tabD");
      hookRequests(tabD, "tabD");
      await tabD.goto(PROJECT_URL, { waitUntil: "domcontentloaded" });
      await tabD.getByRole("button", { name: "Continue with Discord" }).waitFor({ state: "visible", timeout: 20_000 });
      await tabD.getByRole("button", { name: "Continue with Discord" }).click();
      log(`REPEAT ${index}: Discord authorization opened in the browser window.`);
      log("  COMPLETE IT THERE — log into Discord / click Authorize if asked. Credentials are typed");
      log("  only on Discord's own page; the script never sees them. Waiting up to 4 min for the session...");
      const deadline = Date.now() + 240_000;
      let sessOk = false;
      while (Date.now() < deadline) {
        sessOk = await tabA.evaluate(() =>
          Object.keys(localStorage).some((k) => k.startsWith("sb-") && k.endsWith("-auth-token"))
        );
        if (sessOk) break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (!sessOk) {
        log(`REPEAT ${index}: FAIL — no session within 4 min (Discord auth not completed in the window?)`);
        await tabA.close(); await tabD.close(); await context.close();
        return { index, email: "discord", verdict: "no-transition (discord auth not completed in time)" };
      }
      await tabD.close();
      log(`REPEAT ${index}: session arrived in tab A via Discord`);
      await tabA.waitForTimeout(2500); // let the transition settle
    } else {
      // --- tab C: send the OTP through the app's own AuthScreen ---
      const tabC = await context.newPage();
      await tabC.goto(PROJECT_URL, { waitUntil: "domcontentloaded" });
      await tabC.getByRole("button", { name: "Send sign-in link" }).waitFor({ state: "visible", timeout: 20_000 });
      await tabC.getByPlaceholder("you@example.com").fill(acct.address);
      await tabC.getByRole("button", { name: "Send sign-in link" }).click();
      await tabC.waitForTimeout(2500); // let signInWithOtp resolve (success or error)
      const cFormText = await tabC.evaluate(() => document.body.innerText);
      if (!/Check .* for a sign-in link/.test(cFormText)) {
        const errLine = cFormText.split("\n").find((l) => /rate|error|invalid|fail/i.test(l)) || cFormText.slice(0, 160);
        log(`REPEAT ${index}: OTP send failed on tab C — "${errLine.trim().slice(0, 140)}"`);
        appendFileSync(LOG_PATH, `| ${new Date().toISOString()} | ${acct.address} | live-repro (otp send failed: ${errLine.trim().slice(0, 80)}) | cleanup\n`);
        await tabA.close(); await tabC.close(); await context.close();
        return { index, email: acct.address, verdict: `otp-send-failed: ${errLine.trim().slice(0, 80)}` };
      }
      const tSend = Date.now();
      const link = await mailtmWaitForLink(acct.token);
      if (!link) {
        log(`REPEAT ${index}: FAIL — no magic link received for ${acct.address} within 90s`);
        appendFileSync(LOG_PATH, `| ${new Date().toISOString()} | ${acct.address} | live-repro (no link received) | cleanup\n`);
        await tabA.close(); await tabC.close(); await context.close();
        return { index, email: acct.address, verdict: "no-link" };
      }
      log(`REPEAT ${index}: link received after ${((Date.now() - tSend) / 1000).toFixed(1)}s`);

      // --- tab B: open the magic link (the exchange broadcasts to tab A) ---
      const tabB = await context.newPage();
      await tabB.goto(link, { waitUntil: "domcontentloaded" });
      await tabB.waitForTimeout(4500); // let the exchange + app boot settle
      await tabB.close();
    }

    // --- tab A: read the timeline + settled state + real session ---
    await tabA.waitForTimeout(3000);
    const tl = await tabA.evaluate(() => window.__tl || []);
    const final = await tabA.evaluate(
      (demoName) => ({
        nav: !!document.querySelector('nav[aria-label="Primary"]'),
        onboarding: [...document.querySelectorAll("div")].some((d) => d.textContent.trim() === "Who are you?"),
        hasDemoName: document.body.innerText.includes(demoName),
      }),
      DEMO_NAME
    );
    const sess = await tabA.evaluate(() => {
      const k = Object.keys(localStorage).find((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
      return k ? JSON.parse(localStorage.getItem(k)) : null;
    });

    // --- persistence probe: the account's own kv_store rows ---
    let probe = { profile: null, lb: null, error: null };
    if (sess?.access_token) {
      const c = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const sr = await c.auth.setSession({ access_token: sess.access_token, refresh_token: sess.refresh_token });
      const uid = sr.data.session?.user?.id || sess.user?.id;
      const [p, l] = await Promise.all([
        c.from("kv_store").select("value, updated_at").eq("key", "profile").eq("shared", false).maybeSingle(),
        c.from("kv_store").select("value, updated_at").eq("key", `lb:${uid}`).eq("shared", true).maybeSingle(),
      ]);
      probe = { profile: p.data?.value ?? null, lb: l.data?.value ?? null, error: p.error || l.error, uid, updatedAt: { profile: p.data?.updated_at ?? null, lb: l.data?.updated_at ?? null } };
    } else {
      probe.error = "no session in tab A localStorage — exchange or broadcast did not complete";
    }

    // --- verdict ---
    // Tuples are [t, nav, onb, sess, skel]. The demo dashboard stays up for
    // the ~300-500ms it takes the storage event to reach React; that latency
    // is NOT a flash. A flash means nav reappearing AFTER the boot reset
    // (skeleton/onboarding) committed.
    const tSession = tl.filter(([, , , s]) => s);
    const transitionHappened = tSession.length > 0;
    const sessStartIdx = tl.findIndex(([, , , s]) => s);
    const resetIdx = tl.findIndex(([t, , , , k], i) => i > sessStartIdx && (k || tl[i][2]));
    const navAfterReset = resetIdx > 0 && tl.slice(resetIdx).some(([, nav]) => nav);
    const contaminated =
      (probe.profile !== null && probe.profile?.name === DEMO_NAME) ||
      (probe.lb !== null && probe.lb?.name === DEMO_NAME);
    let verdict;
    if (!transitionHappened) verdict = "no-transition (session never landed in tab A)";
    else if (!final.onboarding && final.nav) verdict = "SYMPTOM (a): demo dashboard persisted — onboarding skipped";
    else if (navAfterReset) verdict = "SYMPTOM (b): demo dashboard flash after the boot reset, then onboarding";
    else verdict = contaminated ? "SILENT CONTAMINATION: onboarding shown but demo data reached the fresh account" : "clean";

    // windowed timeline print: 20 ticks before the session to ~6s after
    const sessIdx = tl.findIndex(([, , , s]) => s);
    const tlPrint = sessIdx >= 0 ? tl.slice(Math.max(0, sessIdx - 20), sessIdx + 400) : tl.slice(0, 40);

    const who = acct ? acct.address : "discord account";
    log(`REPEAT ${index}: ${who}${probe.uid ? ` (uid ${probe.uid})` : ""}`);
    log(`  transition: ${transitionHappened ? "session arrived in tab A" : "NO session in tab A"} | final: ${final.nav ? "dashboard" : ""}${final.onboarding ? "onboarding" : ""}${final.hasDemoName ? ` (${DEMO_NAME} visible)` : ""}`);
    log(`  timeline (nav/onb/sess/skel): ${tlPrint.map(([t, n, o, s, k]) => `${t}ms:${n ? "N" : "."}${o ? "O" : "."}${s ? "S" : "."}${k ? "K" : "."}`).join(" ").slice(0, 600)}`);
    log(`  kv probe: profile=${probe.profile ? JSON.stringify(probe.profile).slice(0, 90) : "absent"}${probe.error ? ` | error: ${String(probe.error).slice(0, 90)}` : ""}`);
    log(`  lb row:   ${probe.lb ? JSON.stringify(probe.lb).slice(0, 90) : "absent"}`);
    log(`  row times: profile@${probe.updatedAt?.profile || "n/a"} lb@${probe.updatedAt?.lb || "n/a"}`);
    log(`  kv_store requests:`);
    log(requests.length ? requests.map((l) => `    ${l}`).join("\n") : "    (none)");
    log(`  console [storage]/error lines:`);
    log(consoleLines.length ? consoleLines.map((l) => `    ${l}`).join("\n") : "    (none)");
    if (sess) writeFileSync(SESSION_DUMP, JSON.stringify({ session: { access_token: sess.access_token, refresh_token: sess.refresh_token } }));
    log(`  VERDICT: ${verdict}`);
    appendFileSync(
      LOG_PATH,
      `| ${new Date().toISOString()} | ${who} | live-repro phase 1 (CONFIRMED user) | verdict: ${verdict} — delete kv_store rows then auth user\n`
    );

    await tabA.close(); await context.close();
    return { index, email: who, verdict };
  } catch (e) {
    log(`REPEAT ${index}: ERROR — ${String(e).slice(0, 400)}`);
    appendFileSync(LOG_PATH, `| ${new Date().toISOString()} | ${acct?.address || "discord account"} | live-repro (error) | cleanup\n`);
    await context.close().catch(() => {});
    return { index, email: acct?.address || "discord", verdict: `error: ${String(e).slice(0, 140)}` };
  }
}

// ---- main ----
log(`live-repro: ${REPEATS} repeats against ${PROJECT_URL}, demo name "${DEMO_NAME}", auth=${AUTH_MODE}${AUTH_MODE === "discord" ? " (headed — you complete the Discord authorization in the browser window)" : ""}`);
line();
const browser = await chromium.launch({ headless: AUTH_MODE !== "discord" });
const results = [];
for (let i = 1; i <= REPEATS; i++) {
  const r = await runOnce(browser, i);
  results.push(r);
  line();
  if (i < REPEATS) {
    log(`waiting 20s before repeat ${i + 1}...`);
    await new Promise((res) => setTimeout(res, 20_000));
  }
}
await browser.close();

const cleanVerdicts = ["SYMPTOM (a): demo dashboard persisted — onboarding skipped", "SYMPTOM (b): demo dashboard flash after the boot reset, then onboarding", "SILENT CONTAMINATION: onboarding shown but demo data reached the fresh account", "clean"];
log(`SUMMARY (${results.length} repeats)`);
log(`  symptom (a): ${results.filter((r) => r.verdict.includes("SYMPTOM (a)")).length} | symptom (b): ${results.filter((r) => r.verdict.includes("SYMPTOM (b)")).length} | silent contamination: ${results.filter((r) => r.verdict.includes("SILENT")).length} | clean: ${results.filter((r) => r.verdict === "clean").length} | failures: ${results.filter((r) => !cleanVerdicts.some((v) => r.verdict.includes(v))).length}`);
for (const r of results) log(`  [${r.index}] ${r.email} — ${r.verdict}`);
if (createdEmails.length) {
  log("  emails logged for cleanup (see " + LOG_PATH + "):");
  for (const e of createdEmails) log(`    - ${e}`);
  log("");
  log("Batch delete in the Supabase SQL editor:");
  log("  delete from kv_store where owner_id in (select id from auth.users where email in ('" + createdEmails.join("','") + "'));");
  log("  delete from auth.users where email in ('" + createdEmails.join("','") + "');");
}
