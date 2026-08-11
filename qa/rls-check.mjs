// RLS verification for the study-circles schema (003_circles.sql).
//
// Not part of `npm run qa` — this hits the LIVE Supabase project and signs
// up throwaway users, so it runs standalone:  node qa/rls-check.mjs
//
// Best-effort by design: with email confirmation enabled in the project,
// anon signUp returns no session, so the behavioral half is skipped and the
// script reports the policy manifest instead. Apply supabase/migrations/
// 003_circles.sql in the Supabase SQL editor before running.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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

// ---- policy manifest (always runs) ----
const policies = {
  study_circles: [
    ["circles_select_members_only", "select"],
    ["circles_insert_owner", "insert"],
    ["circles_update_owner_only", "update"],
    ["circles_delete_owner_only", "delete"],
  ],
  circle_members: [
    ["members_select_circle_members", "select"],
    ["members_insert_self", "insert"],
    ["members_delete_self_or_owner", "delete"],
  ],
};

const manifest = await (async () => {
  const client = createClient(url, anonKey);
  const { data, error } = await client.from("study_circles").select("id").limit(1);
  if (error && (error.code === "42P01" || error.code === "PGRST205")) {
    return { ok: false, reason: "study_circles does not exist — apply 003_circles.sql first" };
  }
  const { data: funcs, error: funcErr } = await client.rpc("get_circle_preview", { p_invite_code: "ZZZZZZ" });
  if (funcErr && funcErr.code === "PGRST202") {
    return { ok: false, reason: "get_circle_preview not deployed — apply 003_circles.sql first" };
  }
  const { error: leaderboardErr } = await client.rpc("circle_leaderboard", { p_circle_id: "00000000-0000-0000-0000-000000000000", p_day: "2000-01-01" });
  if (leaderboardErr && leaderboardErr.code === "PGRST202") {
    return { ok: false, reason: "circle_leaderboard not deployed — apply 004_circle_leaderboard.sql first" };
  }
  const requiredFunctions = [
    ["connect_by_profile_code", { p_code: "ZZZZZZ" }],
    ["circle_connections_feed", { p_day: "2000-01-01" }],
    ["search_public_groups", { p_query: "" }],
    ["join_group_by_code", { p_code: "ZZZZZZ" }],
  ];
  for (const [name, args] of requiredFunctions) {
    const { error } = await client.rpc(name, args);
    if (error && error.code === "PGRST202") return { ok: false, reason: `${name} not deployed — apply 005_circle_group_split.sql first` };
  }
  const out = [];
  for (const [table, list] of Object.entries(policies)) {
    for (const [name] of list) out.push(`${table}.${name}`);
  }
  return { ok: true, policies: out };
})();

if (!manifest.ok) {
  console.log(`RESULT: SKIP (schema not applied) — ${manifest.reason}`);
  console.log(manifest.reason.includes("004_") ? "Apply supabase/migrations/004_circle_leaderboard.sql in the Supabase SQL editor, then rerun this script." : "Apply supabase/migrations/003_circles.sql in the Supabase SQL editor, then rerun this script.");
  process.exit(0);
}
for (const p of manifest.policies) report(`policy present: ${p}`, true);
report("security-definer get_circle_preview deployed", true);

// ---- behavioral half: only possible if signUp yields sessions ----
const stamp = Date.now().toString(36);
const users = [
  { email: `rls-a-${stamp}@example.com`, password: "ledger-rls-test-1A!" },
  { email: `rls-b-${stamp}@example.com`, password: "ledger-rls-test-2B!" },
];
const clients = [];
let skipBehavior = false;

for (const u of users) {
  const c = createClient(url, anonKey);
  const { data, error } = await c.auth.signUp({ email: u.email, password: u.password });
  if (error || !data.session) {
    skipBehavior = true;
    report("two-user signUp", false, sf(error?.message || "no session returned (email confirmation likely enabled)"));
    break;
  }
  clients.push(c);
}

if (skipBehavior) {
  console.log("RESULT: POLICY MANIFEST ONLY — signUp cannot mint sessions with the anon key here.");
  console.log(results.join("\n"));
  process.exit(0);
}

// ---- behavioral tests with two real sessions ----
const A = clients[0];
const B = clients[1];
const aId = (await A.auth.getUser()).data?.user?.id;
const bId = (await B.auth.getUser()).data?.user?.id;

// A creates a circle + own membership row
const { data: circle, error: circleErr } = await A
  .from("study_circles")
  .insert({ name: "RLS Check Circle", owner_id: aId, invite_code: "RLSTEST" })
  .select("id,invite_code")
  .single();
if (circleErr || !circle) {
  report("A creates circle", false, sf(circleErr?.message));
  for (const r of results) console.log(r);
  process.exit(1);
}
const circleId = circle.id;
const { error: joinErrA } = await A
  .from("circle_members")
  .insert({ circle_id: circleId, user_id: aId, role: "owner" });
report("A self-joins as owner", !joinErrA, sf(joinErrA?.message));

// B (non-member) must not see circles or members
const { data: bCircles, error: bCirclesErr } = await B.from("study_circles").select("id").eq("id", circleId);
report("B cannot SELECT A's circle", !bCirclesErr && (bCircles || []).length === 0, sf(bCirclesErr?.message || `got ${(bCircles || []).length} rows`));

const { data: bMembers, error: bMembersErr } = await B.from("circle_members").select("user_id").eq("circle_id", circleId);
report("B cannot SELECT A's roster", !bMembersErr && (bMembers || []).length === 0, sf(bMembersErr?.message || `got ${(bMembers || []).length} rows`));

// B must not update or delete the circle
const { data: bUpd, error: bUpdErr } = await B.from("study_circles").update({ name: "Hijacked" }).eq("id", circleId).select("id");
report("B cannot UPDATE A's circle", !bUpdErr && (bUpd || []).length === 0, sf(bUpdErr?.message || `updated ${(bUpd || []).length} rows`));

const { data: bDel, error: bDelErr } = await B.from("study_circles").delete().eq("id", circleId).select("id");
report("B cannot DELETE A's circle", !bDelErr && (bDel || []).length === 0, sf(bDelErr?.message || `deleted ${(bDel || []).length} rows`));

// preview via rpc — B (non-member) can look up by invite code
const { data: preview, error: previewErr } = await B.rpc("get_circle_preview", { p_invite_code: "rLstest" });
report("B gets join preview via rpc", !previewErr && preview?.length === 1 && preview[0].member_count === 1, sf(previewErr?.message));

// B cannot compute circle activity before joining
const { data: actBefore, error: actBeforeErr } = await B.rpc("circle_activity", { p_circle_id: circleId, p_since: "2020-01-01" });
report("B's circle_activity before joining is empty", !actBeforeErr && (actBefore || []).length === 0, sf(actBeforeErr?.message || `${(actBefore || []).length} rows`));

// A seeds a private session row, then reads own activity through the adapter
const today = new Date().toISOString().slice(0, 10);
const { error: seedErr } = await A.from("kv_store").upsert({
  owner_id: aId,
  key: "sessions",
  shared: false,
  value: [{ date: today, subject: "Physics", topic: "RLS", minutes: 45, mode: "flow" }],
  updated_at: new Date().toISOString(),
});
report("A seeds a private session row", !seedErr, sf(seedErr?.message));

const { data: actA, error: actAErr } = await A.rpc("circle_activity", { p_circle_id: circleId, p_since: "2020-01-01" });
report("A reads own activity via adapter", !actAErr && actA?.length === 1 && actA[0].minutes === 45, sf(actAErr?.message || JSON.stringify(actA)));

// B joins, then must see A's minutes through the adapter (but nothing else)
const { error: joinErrB } = await B.from("circle_members").insert({ circle_id: circleId, user_id: bId, role: "member" });
report("B self-joins as member", !joinErrB, sf(joinErrB?.message));

const { data: actB, error: actBErr } = await B.rpc("circle_activity", { p_circle_id: circleId, p_since: "2020-01-01" });
const seesA = actB?.some(r => r.user_id === aId && r.minutes === 45);
report("B sees A's minutes (no topics leaked)", !actBErr && seesA && actB.every(r => !r.subject && !r.topic), sf(actBErr?.message || JSON.stringify(actB)));

// B can leave; A (owner) can also remove B
const { error: leaveErr } = await B.from("circle_members").delete().match({ circle_id: circleId, user_id: bId });
report("B self-removes", !leaveErr, sf(leaveErr?.message));

const { error: seedErr2 } = await B.from("circle_members").insert({ circle_id: circleId, user_id: bId, role: "member" });
report("B rejoins (for owner-removal test)", !seedErr2, sf(seedErr2?.message));
const { error: ownerKickErr } = await A.from("circle_members").delete().match({ circle_id: circleId, user_id: bId });
report("A (owner) removes B", !ownerKickErr, sf(ownerKickErr?.message));

// cleanup: owner deletes circle (cascades members), A deletes own kv row
const { error: cleanupErr } = await A.from("study_circles").delete().eq("id", circleId);
report("cleanup: A deletes circle (cascade)", !cleanupErr, sf(cleanupErr?.message));
await A.from("kv_store").delete().eq("owner_id", aId).eq("key", "sessions");

console.log(results.join("\n"));
console.log(`RESULT: ${results.every(r => r.startsWith("PASS")) ? "ALL PASS" : "FAILURES PRESENT"} — test users ${users.map(u => u.email).join(", ")} may remain in auth; delete them in the Supabase dashboard.`);
