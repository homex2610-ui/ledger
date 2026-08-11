// Persistence verification for the demo → real-account transition (Bug 2).
//
// Not part of `npm run qa` — this hits the LIVE Supabase project and signs
// up a throwaway user, so it runs standalone:
//
//   node qa/kv-check.mjs create
//   node qa/kv-check.mjs verify <email> [--name <n>] [--demo-name <n>] [--expect-absent]
//   node qa/kv-check.mjs cleanup <email>
//
// Protocol (after the app-side demo → sign-in live repro):
//   1. `create` signs up a fresh throwaway account (password) and saves its
//      session to a temp file. Print the email — that is the account you
//      sign into the app with.
//   2. In the app: demo mode → complete onboarding (use a DISTINCTIVE demo
//      name) → sign in as the throwaway email. The app should land on
//      Onboarding (fresh account), never a dashboard showing the demo
//      profile.
//   3. `verify <email> --demo-name <demoName>` — confirms the account's
//      kv_store profile row (and its shared leaderboard row) contain none of
//      the demo user's data. Add `--name <n>` after completing onboarding in
//      the app with name <n> to confirm the write landed correctly, or
//      `--expect-absent` to pin the pre-onboarding state.
//   4. `cleanup <email>` deletes the account's kv_store rows.
//
// With email confirmation enabled, `create` cannot mint a session, so the
// behavioral half is skipped and the script prints the SQL to run in the
// Supabase dashboard instead — best-effort by design, like qa/rls-check.mjs.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";

const envPath = resolve(".env.local");
if (!existsSync(envPath)) {
  console.log("SKIP: no .env.local");
  process.exit(0);
}
const env = {};
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.log("SKIP: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing");
  process.exit(0);
}

const results = [];
const report = (name, pass, detail = "") =>
  results.push(`${pass ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
const sf = (v) => (v === undefined ? "" : String(v));

const sessionDir = join(tmpdir(), "ledger-kv-check");
const sessionFileFor = (email) => join(sessionDir, `${email.replace(/[^a-z0-9@.-]/gi, "_")}.json`);

const [cmd, ...rest] = process.argv.slice(2);
const emailArg = rest.find((a) => !a.startsWith("--"));
const flag = (name) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 && rest[i + 1] !== undefined ? rest[i + 1] : null;
};
const DEMO_NAME = flag("demo-name") || "QA Tester";

const loadSession = (email) => {
  const p = sessionFileFor(email);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
};

if (cmd === "create") {
  const stamp = Date.now().toString(36);
  const email = emailArg || `kv-${stamp}@example.com`;
  const password = `ledger-kv-${stamp}-A1!`;
  const client = createClient(url, anonKey);
  const { data, error } = await client.auth.signUp({ email, password });
  if (error || !data.session) {
    console.log(`RESULT: SESSION UNAVAILABLE — signUp cannot mint sessions with the anon key here (email confirmation likely enabled). Attempted account: ${email}`);
    console.log("Use the Supabase SQL editor instead, after the app-side flow:");
    console.log(`  select key, value, shared, updated_at from kv_store where owner_id = (select id from auth.users where email = '${email}');`);
    console.log("The account must contain no demo-profile data (no demo name/code) in its profile or lb:<id> rows.");
    console.log("If the account already existed (you signed in via magic link in the app), signUp's 'already registered' error is expected — the check above still works.");
    process.exit(0);
  }
  mkdirSync(sessionDir, { recursive: true });
  writeFileSync(sessionFileFor(email), JSON.stringify({ email, password, session: data.session }));
  console.log(`created throwaway account: ${email}`);
  console.log("Now, in the app: demo mode → complete onboarding (use a DISTINCTIVE demo name) → sign in as this email.");
  console.log("Then run:  node qa/kv-check.mjs verify <this email> --demo-name <demo name>");
  console.log(`session saved to ${sessionFileFor(email)} (temp, not in the repo)`);
  process.exit(0);
}

if (cmd === "verify") {
  const saved = loadSession(emailArg);
  if (!saved) {
    console.log(`RESULT: FAIL — no saved session for ${emailArg}; run 'node qa/kv-check.mjs create' first.`);
    process.exit(1);
  }
  const client = createClient(url, anonKey);
  client.auth.setSession(saved.session);
  const { data: user, error: userErr } = await client.auth.getUser();
  if (userErr || !user?.user) {
    console.log(`RESULT: FAIL — session for ${emailArg} no longer valid (token expired?): ${sf(userErr?.message)}`);
    process.exit(1);
  }
  const uid = user.user.id;
  const { data: profile, error: profErr } = await client.from("kv_store").select("value").eq("key", "profile").eq("shared", false).maybeSingle();
  const { data: lb, error: lbErr } = await client.from("kv_store").select("value,key").eq("shared", true).like("key", `lb:${uid}`).maybeSingle();

  const name = flag("name");
  const expectAbsent = flag("expect-absent") !== null;

  if (profErr) report("profile row read", false, sf(profErr.message));
  else if (expectAbsent) report("no profile row before onboarding", !profile, profile ? `found ${JSON.stringify(profile.value).slice(0, 80)}` : "");
  else if (!profile) report("profile row exists", false, "kv_store has no profile row for this account");
  else if (profile.value?.name === DEMO_NAME) report("profile is NOT the demo profile", false, `name is "${profile.value.name}" — demo data landed in the fresh account`);
  else if (name && profile.value?.name !== name) report(`profile name is "${name}"`, false, `got "${profile.value?.name}"`);
  else report(`profile is clean${name ? ` with name "${name}"` : ""}`, true, `name="${profile.value?.name}" code="${profile.value?.code}"`);

  if (lbErr) report("leaderboard row read", false, sf(lbErr.message));
  else if (!lb) report("no leaderboard row before publishing", true, "lb:<id> absent");
  else if (lb.value?.name === DEMO_NAME) report("leaderboard row is NOT demo data", false, `name is "${lb.value.name}" — demo identity published under the fresh account`);
  else if (name && lb.value?.name !== name) report("leaderboard row matches the fresh profile", false, `got name="${lb.value?.name}"`);
  else report("leaderboard row clean", true, `name="${lb.value?.name}" code="${lb.value?.code}" minutes=${lb.value?.minutes}`);

  console.log(results.join("\n"));
  console.log(`RESULT: ${results.every((r) => r.startsWith("PASS")) ? "ALL PASS" : "FAILURES PRESENT"} — account ${emailArg} (${uid})`);
  process.exit(results.every((r) => r.startsWith("PASS")) ? 0 : 1);
}

if (cmd === "cleanup") {
  const saved = loadSession(emailArg);
  if (!saved) {
    console.log(`RESULT: SKIP — no saved session for ${emailArg}`);
    process.exit(0);
  }
  const client = createClient(url, anonKey);
  client.auth.setSession(saved.session);
  const { data: user } = await client.auth.getUser();
  if (user?.user) {
    const { error } = await client.from("kv_store").delete().eq("owner_id", user.user.id);
    report("kv_store rows deleted", !error, sf(error?.message));
  }
  rmSync(sessionFileFor(emailArg), { force: true });
  console.log(results.join("\n"));
  console.log("The auth user remains in auth.users — delete it in the Supabase dashboard if you want it gone.");
  process.exit(0);
}

console.log("Usage:");
console.log("  node qa/kv-check.mjs create");
console.log("  node qa/kv-check.mjs verify <email> [--name <n>] [--demo-name <n>] [--expect-absent]");
console.log("  node qa/kv-check.mjs cleanup <email>");
process.exit(1);
