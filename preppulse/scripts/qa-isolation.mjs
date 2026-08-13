/**
 * Cross-user isolation QA suite.
 *
 * Boots a fresh api-server against the configured DATABASE_URL, then walks
 * every resource through two users (Alice and Bob) and asserts that Bob can
 * never read, patch, or delete Alice's data — and vice versa.
 *
 * Usage (from repo root):
 *   $env:DATABASE_URL="postgres://preppulse:preppulse@localhost:5433/preppulse"; pnpm --filter @workspace/scripts run qa
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createSign, generateKeyPairSync } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(here, "..", "artifacts", "api-server");
const PORT = Number(process.env.QA_PORT ?? 5099);
const BASE = `http://localhost:${PORT}/api`;

let server;
let mockOauthServer;
const results = [];

// ---- Mock OAuth providers: Google JWKS + Discord token/API endpoints ----
const GOOGLE_CLIENT_ID = "qa-google-client";
const DISCORD_CLIENT_ID = "qa-discord-client";
const DISCORD_CLIENT_SECRET = "qa-discord-secret";
const KID = "qa-test-key-1";
const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });

function base64url(buffer) {
  return Buffer.from(buffer).toString("base64url");
}

function signGoogleJwt(payload, { expSeconds = 3600, aud = GOOGLE_CLIENT_ID, iss = "accounts.google.com", algorithm = "RS256" } = {}) {
  const header = { alg: algorithm, typ: "JWT", kid: KID };
  const now = Math.floor(Date.now() / 1000);
  const body = { iss, aud, exp: now + expSeconds, iat: now, ...payload };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(body))}`;
  const signature = createSign("RSA-SHA256").update(signingInput).end().sign(privateKey);
  return `${signingInput}.${base64url(signature)}`;
}

function signGoogleJwtWithWrongKey(payload) {
  const { privateKey: rogueKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const header = { alg: "RS256", typ: "JWT", kid: KID };
  const now = Math.floor(Date.now() / 1000);
  const body = { iss: "accounts.google.com", aud: GOOGLE_CLIENT_ID, exp: now + 3600, iat: now, ...payload };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(body))}`;
  const signature = createSign("RSA-SHA256").update(signingInput).end().sign(rogueKey);
  return `${signingInput}.${base64url(signature)}`;
}

function pemCertsForPublicKey() {
  // Node's google-auth-library verifies via the PEM certificate format.
  return { [KID]: publicKey.export({ format: "pem", type: "spki" }).toString() };
}

function startMockOauth() {
  return new Promise((resolve) => {
    mockOauthServer = createServer((req, res) => {
      const url = new URL(req.url, "http://localhost");
      if (req.method === "GET" && url.pathname === "/certs") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(pemCertsForPublicKey()));
        return;
      }
      if (req.method === "POST" && url.pathname === "/token") {
        let raw = "";
        req.on("data", (chunk) => (raw += chunk));
        req.on("end", () => {
          const form = new URLSearchParams(raw);
          if (form.get("code") === "invalid-code") {
            res.writeHead(400, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: "invalid_grant" }));
            return;
          }
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ access_token: `qa-access-${form.get("code")}`, token_type: "Bearer", expires_in: 604800 }));
        });
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/users/@me") {
        const token = req.headers.authorization?.replace("Bearer ", "");
        const identity = token === "qa-access-clash"
          ? { id: "discord-user-clash", username: "qa_clash", global_name: "Qa Clash", email: "dc.qa@test.dev", verified: true }
          : token === "qa-access-other"
            ? { id: "discord-user-other", username: "qa_other", global_name: null, email: null, verified: false }
            : { id: "discord-user-1", username: "qa_discord", global_name: "Qa Discord", email: "discord.qa@test.dev", verified: true };
        if (!token) {
          res.writeHead(401, { "content-type": "application/json" });
          res.end(JSON.stringify({ message: "Unauthorized" }));
          return;
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(identity));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    mockOauthServer.listen(0, "127.0.0.1", () => resolve(mockOauthServer.address().port));
  });
}

class Client {
  constructor(email) {
    this.email = email;
    this.cookie = "";
  }
  addCookie(name, value) {
    this.cookie = [this.cookie, `${name}=${value}`].filter(Boolean).join("; ");
  }
  async request(method, route, body, { expect } = {}) {
    const headers = {};
    if (this.cookie) headers.cookie = this.cookie;
    if (body !== undefined) headers["content-type"] = "application/json";
    const res = await fetch(`${BASE}${route}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      redirect: "manual",
    });
    const setCookies = res.headers.getSetCookie?.() ?? [];
    if (setCookies.length) {
      const jar = new Map();
      for (const existing of this.cookie.split(";").map((cookie) => cookie.trim())) {
        const name = existing.split("=")[0];
        if (name) jar.set(name, existing);
      }
      for (const cookieHeader of setCookies) {
        const [pair] = cookieHeader.split(";");
        const [name] = pair.split("=");
        if (/expires=thu, 01 jan 1970/i.test(cookieHeader) || cookieHeader.toLowerCase().includes("max-age=0") || cookieHeader.includes("=;")) {
          jar.delete(name.trim());
        } else {
          jar.set(name.trim(), pair.trim());
        }
      }
      this.cookie = [...jar.values()].join("; ");
    }
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (expect !== undefined) {
      const ok = res.status === expect;
      results.push({ ok, label: `${method} ${route} (expect ${expect}, got ${res.status})`, detail: ok ? "" : JSON.stringify(data) });
    }
    return { status: res.status, data, headers: res.headers, location: res.headers.get("location") };
  }
  async signup(handle) {
    const res = await this.request("POST", "/auth/signup", { email: this.email, password: "Password123!", handle });
    if (res.status === 409) {
      return this.request("POST", "/auth/login", { email: this.email, password: "Password123!" });
    }
    return res;
  }
}

let alice, bob;
let aliceCard, aliceTask, aliceFocus, aliceTest, aliceGroup, aliceTopics;

async function waitForServer(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/healthz`);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error("api-server did not become healthy in time");
}

before(async () => {
  const mockOauthPort = await startMockOauth();
  server = spawn(process.execPath, ["--enable-source-maps", "dist/index.mjs"], {
    cwd: serverDir,
    env: {
      ...process.env,
      PORT: String(PORT),
      GOOGLE_CLIENT_ID,
      GOOGLE_CERTS_URL: `http://127.0.0.1:${mockOauthPort}/certs`,
      DISCORD_CLIENT_ID,
      DISCORD_CLIENT_SECRET,
      DISCORD_TOKEN_URL: `http://127.0.0.1:${mockOauthPort}/token`,
      DISCORD_API_URL: `http://127.0.0.1:${mockOauthPort}/api`,
    },
    stdio: "ignore",
  });
  await waitForServer();
});

after(async () => {
  const failed = results.filter((result) => !result.ok);
  for (const result of results) {
    console.log(`${result.ok ? "PASS" : "FAIL"}  ${result.label}${result.detail ? `  -> ${result.detail}` : ""}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) process.exitCode = 1;
  if (server) server.kill();
  if (mockOauthServer) mockOauthServer.close();
});

test("signup creates two isolated accounts", async () => {
  alice = new Client("alice.qa@test.dev");
  bob = new Client("bob.qa@test.dev");
  const a = await alice.signup("AliceQA");
  const b = await bob.signup("BobQA");
  assert.ok([201, 200].includes(a.status), `alice signup/login failed: ${a.status}`);
  assert.ok([201, 200].includes(b.status), `bob signup/login failed: ${b.status}`);
  assert.notEqual(a.data.user.id, b.data.user.id);
});

test("unauthenticated requests are rejected on every resource", async () => {
  const anon = new Client("anon@test.dev");
  const checks = [
    ["GET", "/dashboard"],
    ["GET", "/topics"],
    ["GET", "/tests"],
    ["GET", "/study-sessions"],
    ["GET", "/focus-sessions"],
    ["GET", "/tasks"],
    ["GET", "/cards"],
    ["GET", "/cards/stats"],
    ["GET", "/profile"],
    ["GET", "/leaderboard"],
    ["GET", "/circles"],
    ["GET", "/groups"],
  ];
  for (const [method, route] of checks) {
    const { status } = await anon.request(method, route);
    assert.equal(status, 401, `${method} ${route} should be 401`);
  }
  results.push({ ok: true, label: `${checks.length} unauthenticated checks rejected` });
});

test("bad credentials are rejected", async () => {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "alice.qa@test.dev", password: "wrong-password" }),
  });
  assert.equal(res.status, 401);
  results.push({ ok: true, label: "login with wrong password is 401" });
});

test("alice seeds her data", async () => {
  const topics = await alice.request("GET", "/topics");
  assert.equal(topics.data.length, 49);
  aliceTopics = topics.data;
  await alice.request("PATCH", `/topics/${topics.data[0].id}/progress`, { status: "mastered" }, { expect: 200 });

  const card = await alice.request("POST", "/cards", { front: "Alice Q", back: "Alice A", subject: "Physics" }, { expect: 201 });
  aliceCard = card.data.id;

  const task = await alice.request("POST", "/tasks", { title: "Alice's task", subject: "Chemistry" }, { expect: 201 });
  aliceTask = task.data.id;

  const focus = await alice.request("POST", "/focus-sessions", { subject: "Mathematics", plannedMinutes: 40 }, { expect: 201 });
  aliceFocus = focus.data.id;

  const test = await alice.request("POST", "/tests", { name: "Alice Mock", exam: "jee_main", score: 100, maxScore: 300, attempted: 40, totalQuestions: 90, timeMinutes: 180, negativeMarksLost: 5 }, { expect: 201 });
  aliceTest = test.data.id;

  const group = await alice.request("POST", "/groups", { name: "Alice's Room", isDiscoverable: true }, { expect: 201 });
  aliceGroup = group.data.id;

  const session = await alice.request("POST", "/study-sessions", { subject: "Physics", minutes: 25, source: "manual" }, { expect: 201 });
  assert.ok(session.data.id);
  results.push({ ok: true, label: "alice seeded card/task/focus/test/group/study-session/topic" });
});

test("bob's collections never contain alice's resources", async () => {
  const cards = (await bob.request("GET", "/cards")).data;
  const tasks = (await bob.request("GET", "/tasks")).data;
  const focus = (await bob.request("GET", "/focus-sessions")).data;
  const tests = (await bob.request("GET", "/tests")).data;
  const groups = (await bob.request("GET", "/groups")).data;
  const sessions = (await bob.request("GET", "/study-sessions")).data;
  assert.equal(cards.length, 0);
  assert.equal(tasks.length, 0);
  assert.equal(focus.length, 0);
  assert.equal(tests.length, 0);
  assert.equal(sessions.length, 0);
  assert.ok(!groups.some((group) => group.id === aliceGroup), "alice's group must not appear for bob");
  results.push({ ok: true, label: "bob's collections exclude alice's data" });
});

test("bob cannot mutate alice's data by id", async () => {
  const mutates = [
    ["PATCH", `/cards/${aliceCard}`, { front: "hijacked" }],
    ["DELETE", `/cards/${aliceCard}`],
    ["POST", `/cards/${aliceCard}/review`, { grade: "good" }],
    ["PATCH", `/tasks/${aliceTask}`, { status: "done" }],
    ["DELETE", `/tasks/${aliceTask}`],
    ["PATCH", `/focus-sessions/${aliceFocus}`, { status: "completed" }],
    ["PATCH", `/groups/${aliceGroup}`, { name: "hijacked" }],
    ["DELETE", `/groups/${aliceGroup}`],
    ["POST", `/groups/${aliceGroup}/leave`],
  ];
  for (const [method, route, body] of mutates) {
    const { status } = await bob.request(method, route, body);
    assert.equal(status, 404, `${method} ${route} should be 404 for bob, got ${status}`);
  }
  results.push({ ok: true, label: "bob cannot mutate alice's resources (404s)" });
});

test("bob cannot reach group-only endpoints for alice's group", async () => {
  const leaderboard = await bob.request("GET", `/groups/${aliceGroup}/leaderboard`);
  assert.equal(leaderboard.status, 404);
  const activity = await bob.request("GET", `/groups/${aliceGroup}/activity`);
  assert.equal(activity.status, 404);
  results.push({ ok: true, label: "group leaderboard/activity are member-gated" });
});

test("bogus codes and non-membership are rejected", async () => {
  const connect = await bob.request("POST", "/circles/connect", { code: "XXXXXX" });
  assert.equal(connect.status, 404);
  const join = await bob.request("POST", "/groups/join", { code: "NOTACODE" });
  assert.equal(join.status, 404);
  results.push({ ok: true, label: "bogus circle/group codes are 404" });
});

test("bob joins alice's group via the invite code and stays member-only", async () => {
  const aliceGroups = (await alice.request("GET", "/groups")).data;
  const invite = aliceGroups.find((group) => group.id === aliceGroup).inviteCode;
  const join = await bob.request("POST", "/groups/join", { code: invite }, { expect: 200 });
  assert.equal(join.data.myRole, "member");

  const detail = await bob.request("GET", `/groups/${aliceGroup}`, undefined, { expect: 200 });
  assert.ok(detail.data.members.length >= 2);

  const mutate = await bob.request("PATCH", `/groups/${aliceGroup}`, { name: "hijacked" });
  assert.equal(mutate.status, 404, "member cannot patch the group");
  const del = await bob.request("DELETE", `/groups/${aliceGroup}`);
  assert.equal(del.status, 404, "member cannot delete the group");
  results.push({ ok: true, label: "invite-code join works; owner-only actions stay locked" });
});

test("circles are mutual and removal is one-way", async () => {
  const profile = (await alice.request("GET", "/profile")).data;
  const connect = await bob.request("POST", "/circles/connect", { code: profile.profileCode }, { expect: 201 });
  assert.equal(connect.data.handle, "AliceQA");

  const aliceCircle = (await alice.request("GET", "/circles")).data;
  const bobCircle = (await bob.request("GET", "/circles")).data;
  assert.equal(aliceCircle.connections.length, 1);
  assert.equal(bobCircle.connections.length, 1);

  const lb = (await bob.request("GET", "/leaderboard")).data;
  assert.equal(lb.entries.length, 2, "both members appear in the circle board");

  const remove = await bob.request("DELETE", `/circles/${connect.data.userId}`, undefined, { expect: 204 });
  assert.equal(remove.status, 204);
  const after = (await alice.request("GET", "/circles")).data;
  assert.equal(after.connections.length, 0, "alice's copy of the link disappears too");
  results.push({ ok: true, label: "code-based circles are mutual and removable" });
});

test("session lifecycle: logout kills the session, login restores it", async () => {
  await bob.request("POST", "/auth/logout", undefined, { expect: 204 });
  const afterLogout = await bob.request("GET", "/dashboard");
  assert.equal(afterLogout.status, 401);
  const login = await bob.request("POST", "/auth/login", { email: "bob.qa@test.dev", password: "Password123!" }, { expect: 200 });
  assert.ok(login.data.profile);
  const afterLogin = await bob.request("GET", "/dashboard");
  assert.equal(afterLogin.status, 200);
  results.push({ ok: true, label: "logout invalidates the session; login restores it" });
});

test("zod validation failures return 400 JSON", async () => {
  const res = await alice.request("POST", "/cards", { front: "x" });
  assert.equal(res.status, 400);
  assert.ok(res.data.issues, "expected structured issues payload");
  results.push({ ok: true, label: "invalid bodies get 400 with issues" });
});

test("malformed JSON bodies return 400, not 500", async () => {
  const res = await fetch(`${BASE}/study-sessions`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: alice.cookie },
    body: "{not json",
  });
  assert.equal(res.status, 400);
  results.push({ ok: true, label: "malformed JSON is 400" });
});

test("locked topics reject progression", async () => {
  const bobTopics = (await bob.request("GET", "/topics")).data;
  const lockedTopic = bobTopics.find((topic) => topic.name === "Newton's Laws of Motion");
  assert.ok(lockedTopic, "a prerequisite topic exists in the catalog");
  assert.equal(lockedTopic.locked, true, "topic should be locked for a fresh user");
  const blocked = await bob.request("PATCH", `/topics/${lockedTopic.id}/progress`, { status: "learning" });
  assert.equal(blocked.status, 400, "locked topic must reject status changes");
  const reset = await bob.request("PATCH", `/topics/${lockedTopic.id}/progress`, { status: "not_started" });
  assert.equal(reset.status, 200, `not_started on locked topic is allowed`);
  const missing = await bob.request("PATCH", "/topics/00000000-0000-0000-0000-000000000000/progress", { status: "learning" });
  assert.equal(missing.status, 404, "bogus topic id is 404, not 500");
  results.push({ ok: true, label: "locked/gone topics handled (400/404)" });
});

test("prerequisite resolution is subject-scoped", async () => {
  const bobs = (await bob.request("GET", "/topics")).data;
  const find = (subject, name) => bobs.find((topic) => topic.subject === subject && topic.name === name);
  await bob.request("PATCH", `/topics/${find("Physics", "Thermal Properties of Matter").id}/progress`, { status: "not_started" }, { expect: 200 });
  const reLocked = (await bob.request("GET", "/topics")).data.find((topic) => topic.subject === "Physics" && topic.name === "Thermodynamics");
  assert.equal(reLocked.locked, true, "physics Thermodynamics starts locked (prereq untouched)");
  await bob.request("PATCH", `/topics/${find("Chemistry", "Mole Concept").id}/progress`, { status: "practiced" }, { expect: 200 });
  await bob.request("PATCH", `/topics/${find("Chemistry", "Thermodynamics").id}/progress`, { status: "practiced" }, { expect: 200 });
  const stillLocked = (await bob.request("GET", "/topics")).data.find((topic) => topic.subject === "Physics" && topic.name === "Thermodynamics");
  assert.equal(stillLocked.locked, true, "physics Thermodynamics must not unlock from chemistry Thermodynamics progress");
  const unlocked = await bob.request("PATCH", `/topics/${find("Physics", "Thermal Properties of Matter").id}/progress`, { status: "practiced" });
  assert.equal(unlocked.status, 200, "physics prereq patch succeeds");
  const nowOpen = (await bob.request("GET", "/topics")).data.find((topic) => topic.subject === "Physics" && topic.name === "Thermodynamics");
  assert.equal(nowOpen.locked, false, "physics Thermodynamics unlocks once its own prereq is practiced");
  results.push({ ok: true, label: "prereq resolution is subject-scoped" });
});

test("focus sessions cannot be completed twice", async () => {
  const first = await alice.request("PATCH", `/focus-sessions/${aliceFocus}`, { status: "completed", actualMinutes: 40 }, { expect: 200 });
  assert.equal(first.status, 200);
  const second = await alice.request("PATCH", `/focus-sessions/${aliceFocus}`, { status: "completed", actualMinutes: 40 });
  assert.equal(second.status, 400, "double completion must be rejected");
  results.push({ ok: true, label: "double focus completion rejected" });
});

test("showOnLeaderboard=false hides the user from others' boards", async () => {
  const aliceProfile = (await alice.request("GET", "/profile")).data;
  await bob.request("POST", "/circles/connect", { code: aliceProfile.profileCode }, { expect: 201 });
  await alice.request("PATCH", "/profile", { showOnLeaderboard: false }, { expect: 200 });
  const bobBoard = (await bob.request("GET", "/leaderboard")).data;
  assert.ok(!bobBoard.entries.some((entry) => entry.handle === "AliceQA"), "alice must vanish from bob's circle board");
  const aliceBoard = (await alice.request("GET", "/leaderboard")).data;
  assert.ok(aliceBoard.entries.some((entry) => entry.handle === "AliceQA"), "alice still sees herself on her own board");
  await alice.request("PATCH", "/profile", { showOnLeaderboard: true }, { expect: 200 });
  const restored = (await bob.request("GET", "/leaderboard")).data;
  assert.ok(restored.entries.some((entry) => entry.handle === "AliceQA"), "alice reappears after opting back in");
  results.push({ ok: true, label: "showOnLeaderboard privacy respected" });
});

test("api namespace does not serve the SPA", async () => {
  const res = await fetch(`${BASE}`);
  assert.ok([401, 404].includes(res.status), `bare /api should 401/404, not index.html (got ${res.status})`);
  results.push({ ok: true, label: "bare /api never serves the SPA" });
});

test("study session minutes are bounded", async () => {
  const measurer = new Client("measurer.qa@test.dev");
  await measurer.signup("MeasurerQA");
  const before = (await measurer.request("GET", "/dashboard")).data.weeklyMinutes;
  const huge = await measurer.request("POST", "/study-sessions", { subject: "Physics", minutes: 601, source: "manual" });
  assert.equal(huge.status, 400, "minutes above 600 must be rejected");
  const negative = await measurer.request("POST", "/study-sessions", { subject: "Physics", minutes: -5, source: "manual" });
  assert.equal(negative.status, 400, "minutes below 1 must be rejected");
  const after = (await measurer.request("GET", "/dashboard")).data.weeklyMinutes;
  assert.equal(after, before, "rejected sessions must not be counted");
  await measurer.request("POST", "/study-sessions", { subject: "Physics", minutes: 600, source: "manual" }, { expect: 201 });
  const capped = (await measurer.request("GET", "/dashboard")).data.weeklyMinutes;
  assert.equal(capped, before + 600, "600-minute session is accepted");
  await measurer.request("DELETE", "/me");
  results.push({ ok: true, label: "minutes bounded to 1..600" });
});

test("timezone parameter is accepted on day-boundary endpoints", async () => {
  const withTz = await bob.request("GET", "/dashboard?tz=Asia/Kolkata");
  assert.equal(withTz.status, 200, "dashboard accepts a tz query param");
  assert.equal(typeof withTz.data.streak, "number", "streak still computed");
  const badTz = await bob.request("GET", "/dashboard?tz=Not/AZone");
  assert.equal(badTz.status, 200, "invalid tz degrades gracefully to server default");
  const circlesTz = await bob.request("GET", "/circles?tz=America/New_York");
  assert.equal(circlesTz.status, 200, "circles accepts a tz query param");
  const leaderboardTz = await bob.request("GET", "/leaderboard?tz=Asia/Kolkata");
  assert.equal(leaderboardTz.status, 200, "leaderboard accepts a tz query param");
  results.push({ ok: true, label: "tz param handled on day-boundary endpoints" });
});

test("export returns only the authenticated user's data", async () => {
  const exportRes = await bob.request("GET", "/me/export");
  assert.equal(exportRes.status, 200, "export is available");
  const payload = exportRes.data;
  assert.equal(payload.profile.handle, "BobQA", "export carries the owner's profile");
  assert.ok(Array.isArray(payload.topics), "topics section is an array");
  assert.ok(Array.isArray(payload.cards) && Array.isArray(payload.studySessions), "collections are arrays");
  const serialized = JSON.stringify(payload);
  assert.ok(!serialized.includes("passwordHash") && !serialized.includes("tokenHash"), "no auth secrets in export");
  assert.ok(!serialized.includes("Alice Q"), "export never leaks another user's cards or private content");
  assert.ok(payload.connections.every((connection) => ["AliceQA"].includes(connection.handle)), "connections are limited to real, mutual circle members");
  const unauthenticated = await new Client("nobody.qa@test.dev").request("GET", "/me/export");
  assert.equal(unauthenticated.status, 401, "export requires auth");
  results.push({ ok: true, label: "export is owned-data only" });
});

test("account deletion is atomic and kills authentication", async () => {
  const doomed = new Client("doomed.qa@test.dev");
  await doomed.signup("DoomedQA");
  await doomed.request("POST", "/study-sessions", { subject: "Chemistry", minutes: 30, source: "manual" }, { expect: 201 });
  await doomed.request("POST", "/cards", { front: "Q", back: "A", subject: "Physics" }, { expect: 201 });
  await doomed.request("POST", "/groups", { name: "Doomed room", isDiscoverable: false }, { expect: 201 });
  const before = await doomed.request("GET", "/dashboard");
  assert.equal(before.status, 200, "doomed user is fully authenticated first");

  const deleted = await doomed.request("DELETE", "/me");
  assert.equal(deleted.status, 204, "account deletion succeeds");

  const afterDelete = await doomed.request("GET", "/dashboard");
  assert.equal(afterDelete.status, 401, "session dies with the account (cascaded auth_sessions)");
  const relogin = await doomed.request("POST", "/auth/login", { email: "doomed.qa@test.dev", password: "Password123!" });
  assert.equal(relogin.status, 401, "deleted account can no longer authenticate");
  const orphan = await doomed.request("GET", "/topics");
  assert.equal(orphan.status, 401, "deleted account cannot use the application");
  results.push({ ok: true, label: "deletion cascades and revokes auth" });
});

test("OAuth providers are advertised when configured", async () => {
  const anon = new Client("anon-oauth@test.dev");
  const providers = await anon.request("GET", "/auth/oauth/providers");
  assert.equal(providers.status, 200, "providers endpoint is public");
  assert.equal(providers.data.google.enabled, true, "google is enabled in the QA env");
  assert.equal(providers.data.google.clientId, GOOGLE_CLIENT_ID, "google client id is exposed for the GIS button");
  assert.equal(providers.data.discord.enabled, true, "discord is enabled in the QA env");
  assert.equal(providers.data.google.connected, false, "unauthenticated users have no connections");
  assert.equal(providers.data.discord.connected, false, "unauthenticated users have no connections");
  results.push({ ok: true, label: "oauth providers advertised" });
});

test("Google sign-in rejects garbage, wrong-aud, wrong-key and CSRF mismatches", async () => {
  const g = new Client("g.qa@test.dev");
  g.addCookie("g_csrf_token", "qa-csrf-1");
  const garbage = await g.request("POST", "/auth/google", { credential: "not-a-jwt", csrfToken: "qa-csrf-1" });
  assert.equal(garbage.status, 400, "garbage credential is rejected");
  const csrf = await g.request("POST", "/auth/google", { credential: signGoogleJwt({ sub: "s", email: "g.qa@test.dev", email_verified: true }), csrfToken: "wrong-token" });
  assert.equal(csrf.status, 400, "CSRF cookie/body mismatch is rejected");
  const wrongAud = await g.request("POST", "/auth/google", { credential: signGoogleJwt({ sub: "s", email: "g.qa@test.dev", email_verified: true }, { aud: "some-other-client" }), csrfToken: "qa-csrf-1" });
  assert.equal(wrongAud.status, 400, "token for another audience is rejected");
  const wrongKey = await g.request("POST", "/auth/google", { credential: signGoogleJwtWithWrongKey({ sub: "s", email: "g.qa@test.dev", email_verified: true }), csrfToken: "qa-csrf-1" });
  assert.equal(wrongKey.status, 400, "token signed with the wrong key is rejected");
  const missingCsrf = await new Client("g.qa@test.dev").request("POST", "/auth/google", { credential: signGoogleJwt({ sub: "s", email: "g.qa@test.dev", email_verified: true }), csrfToken: "qa-csrf-1" });
  assert.equal(missingCsrf.status, 400, "missing g_csrf_token cookie is rejected");
  results.push({ ok: true, label: "invalid google credentials rejected" });
});

test("Google sign-in creates a local account and repeats reuse it", async () => {
  const g = new Client("g.qa@test.dev");
  g.addCookie("g_csrf_token", "qa-csrf-1");
  const token = signGoogleJwt({ sub: "google-sub-1", email: "g.qa@test.dev", email_verified: true, name: "Gala Google" });
  const created = await g.request("POST", "/auth/google", { credential: token, csrfToken: "qa-csrf-1" });
  assert.ok([201, 200].includes(created.status), `first google sign-in creates or resumes an account -> ${JSON.stringify(created.data)}`);
  const firstId = created.data.user.id;
  const me = await g.request("GET", "/auth/me");
  assert.equal(me.status, 200, "google session is a normal PrepPulse session");
  assert.equal(me.data.user.id, firstId, "session belongs to the created account");
  const serialized = JSON.stringify(created.data);
  assert.ok(!serialized.includes("passwordHash") && !serialized.includes("tokenHash") && !serialized.includes("access_token") && !serialized.includes("refresh_token"), "no provider secrets in auth responses");

  const second = new Client("g2.qa@test.dev");
  second.addCookie("g_csrf_token", "qa-csrf-1");
  const again = await second.request("POST", "/auth/google", { credential: token, csrfToken: "qa-csrf-1" });
  assert.equal(again.status, 200, "repeat google sign-in logs in");
  assert.equal(again.data.user.id, firstId, "repeat google sign-in reuses the same local identity");
  const authenticated = await g.request("GET", "/dashboard");
  assert.equal(authenticated.status, 200, "oauth-created account uses the existing authenticated API");
  results.push({ ok: true, label: "google identity reuse" });
});

test("Google email conflict demands explicit linking", async () => {
  const passwordUser = new Client("clash-g.qa@test.dev");
  const signupRes = await passwordUser.signup("ClashGQA");
  passwordUser.userId = signupRes.data.user.id;
  const token = signGoogleJwt({ sub: `google-sub-clash-${Date.now()}`, email: "clash-g.qa@test.dev", email_verified: true, name: "Clashy" });
  const clash = new Client("anon-clash@test.dev");
  clash.addCookie("g_csrf_token", "qa-csrf-1");
  const conflict = await clash.request("POST", "/auth/google", { credential: token, csrfToken: "qa-csrf-1" });
  assert.equal(conflict.status, 409, "matching email without a link is a conflict");
  assert.equal(conflict.data.code, "account_linking_required", "conflict carries the linking code");

  const link = await passwordUser.request("POST", "/auth/oauth/link", { provider: "google", credential: token, csrfToken: "qa-csrf-1" });
  assert.equal(link.status, 400, "authenticated link without a CSRF cookie is rejected");
  passwordUser.addCookie("g_csrf_token", "qa-csrf-1");
  const linked = await passwordUser.request("POST", "/auth/oauth/link", { provider: "google", credential: token, csrfToken: "qa-csrf-1" });
  assert.equal(linked.status, 200, "authenticated google link succeeds");
  assert.equal(linked.data.user.id, passwordUser.userId, "link keeps the signed-in account");
  const providers = await passwordUser.request("GET", "/auth/oauth/providers");
  assert.equal(providers.data.google.connected, true, "provider shows as connected after linking");

  const other = new Client("other-g@test.dev");
  other.addCookie("g_csrf_token", "qa-csrf-1");
  const relink = await other.request("POST", "/auth/oauth/link", { provider: "google", credential: token, csrfToken: "qa-csrf-1" });
  assert.equal(relink.status, 401, "linking while unauthenticated is rejected");

  const viaGoogle = new Client("via-g@test.dev");
  viaGoogle.addCookie("g_csrf_token", "qa-csrf-1");
  const googleLogin = await viaGoogle.request("POST", "/auth/google", { credential: token, csrfToken: "qa-csrf-1" });
  assert.equal(googleLogin.status, 200, "linked google identity now logs in");
  assert.equal(googleLogin.data.user.id, passwordUser.userId, "google login reaches the linked password account");
  const cleaned = await passwordUser.request("DELETE", "/auth/oauth/google");
  assert.equal(cleaned.status, 204, "cleanup: unlink ephemeral google identity");
  results.push({ ok: true, label: "google conflict + explicit linking" });
});

test("Discord authorize builds a guarded stateful URL", async () => {
  const d = new Client("d.qa@test.dev");
  const authorize = await d.request("GET", "/auth/discord/authorize");
  assert.equal(authorize.status, 200, "authorize is reachable when configured");
  const url = new URL(authorize.data.url);
  assert.equal(url.origin, "https://discord.com", "points at Discord");
  assert.equal(url.pathname, "/oauth2/authorize", "points at the authorize endpoint");
  assert.equal(url.searchParams.get("client_id"), DISCORD_CLIENT_ID, "carries the client id");
  assert.equal(url.searchParams.get("response_type"), "code", "code flow");
  assert.equal(url.searchParams.get("scope"), "identify email", "identity scopes only");
  assert.ok(url.searchParams.get("redirect_uri").endsWith("/api/auth/discord/callback"), "same-origin callback");
  assert.ok(url.searchParams.get("state").length >= 32, "random state present");
  assert.ok(authorize.headers.get("set-cookie")?.includes("pp_oauth_state="), "state cookie set");

  const noState = await new Client("d.qa@test.dev").request("GET", "/auth/discord/callback?code=abc&state=xyz");
  assert.equal(noState.status, 400, "callback without a matching state cookie is rejected");

  const linkWithoutSession = await new Client("d.qa@test.dev").request("GET", "/auth/discord/authorize?link=1");
  assert.equal(linkWithoutSession.status, 401, "link mode requires a session");
  results.push({ ok: true, label: "discord authorize is guarded" });
});

test("Discord callback creates and reuses a local account", async () => {
  const first = new Client("d.qa@test.dev");
  const authorize = await first.request("GET", "/auth/discord/authorize");
  const state = new URL(authorize.data.url).searchParams.get("state");
  const callback = await first.request("GET", `/auth/discord/callback?code=good-code&state=${state}`);
  assert.equal(callback.status, 302, "callback redirects back to the SPA");
  assert.ok(callback.location.includes("oauth=success"), "success flag on the redirect");
  const firstId = (await first.request("GET", "/auth/me")).data.user.id;
  assert.ok(firstId, "session established from the discord identity");

  const second = new Client("d2.qa@test.dev");
  const authorize2 = await second.request("GET", "/auth/discord/authorize");
  const state2 = new URL(authorize2.data.url).searchParams.get("state");
  await second.request("GET", `/auth/discord/callback?code=good-code&state=${state2}`);
  const secondId = (await second.request("GET", "/auth/me")).data.user.id;
  assert.equal(secondId, firstId, "repeat discord login reuses the same local identity");
  results.push({ ok: true, label: "discord identity reuse" });
});

test("Discord failures redirect with error; email conflicts redirect with conflict", async () => {
  const errorFlow = new Client("d3.qa@test.dev");
  const authorize = await errorFlow.request("GET", "/auth/discord/authorize");
  const state = new URL(authorize.data.url).searchParams.get("state");
  const failed = await errorFlow.request("GET", `/auth/discord/callback?code=invalid-code&state=${state}`);
  assert.equal(failed.status, 302, "bad code still redirects");
  assert.ok(failed.location.includes("oauth=error"), "bad code surfaces oauth=error");

  const passwordUser = new Client("dc.qa@test.dev");
  const signupRes = await passwordUser.signup("DcClashQA");
  passwordUser.userId = signupRes.data.user.id;
  const conflictFlow = new Client("d4.qa@test.dev");
  const authorize2 = await conflictFlow.request("GET", "/auth/discord/authorize");
  const state2 = new URL(authorize2.data.url).searchParams.get("state");
  const conflicted = await conflictFlow.request("GET", `/auth/discord/callback?code=clash&state=${state2}`);
  assert.equal(conflicted.status, 302, "email conflict still redirects");
  assert.ok(conflicted.location.includes("oauth=conflict"), "email conflict surfaces oauth=conflict");
  results.push({ ok: true, label: "discord failures and conflicts" });
});

test("Discord link mode links to the signed-in account", async () => {
  const passwordUser = new Client("dc.qa@test.dev");
  const signupRes = await passwordUser.signup("DcClashQA");
  passwordUser.userId = signupRes.data.user.id;
  const authorize = await passwordUser.request("GET", "/auth/discord/authorize?link=1");  assert.equal(authorize.status, 200, "link mode works with a session");
  assert.ok(authorize.headers.get("set-cookie")?.includes("pp_oauth_link="), "link cookie set");
  const state = new URL(authorize.data.url).searchParams.get("state");
  const linked = await passwordUser.request("GET", `/auth/discord/callback?code=clash&state=${state}`);
  assert.equal(linked.status, 302, "link callback redirects");
  assert.ok(linked.location.includes("oauth=success"), "link success on the redirect");
  const providers = await passwordUser.request("GET", "/auth/oauth/providers");
  assert.equal(providers.data.discord.connected, true, "discord shows connected after linking");

  const login = new Client("d5.qa@test.dev");
  const authorize2 = await login.request("GET", "/auth/discord/authorize");
  const state2 = new URL(authorize2.data.url).searchParams.get("state");
  await login.request("GET", `/auth/discord/callback?code=clash&state=${state2}`);
  const logged = await login.request("GET", "/auth/me");
  assert.equal(logged.data.user.id, passwordUser.userId, "discord login reaches the linked password account");
  results.push({ ok: true, label: "discord explicit linking" });
});

test("OAuth disconnect guards the last sign-in method and works otherwise", async () => {
  const only = new Client("only.qa@test.dev");
  only.addCookie("g_csrf_token", "qa-csrf-1");
  const token = signGoogleJwt({ sub: "google-sub-only", email: "only.qa@test.dev", email_verified: true, name: "Only One" });
  const resume = await only.request("POST", "/auth/google", { credential: token, csrfToken: "qa-csrf-1" });
  assert.ok([201, 200].includes(resume.status), "google identity available for the guard test");
  const blocked = await only.request("DELETE", "/auth/oauth/google");
  assert.equal(blocked.status, 409, "disconnecting the only sign-in method is refused");
  assert.equal(blocked.data.code, "last_auth_method", "refusal carries the last-auth code");

  const passwordUser = new Client("dc.qa@test.dev");
  const signupRes = await passwordUser.signup("DcClashQA");
  passwordUser.userId = signupRes.data.user.id;
  const removed = await passwordUser.request("DELETE", "/auth/oauth/discord");
  assert.equal(removed.status, 204, "disconnect works when another method exists");
  const providers = await passwordUser.request("GET", "/auth/oauth/providers");
  assert.equal(providers.data.discord.connected, false, "provider no longer connected");
  results.push({ ok: true, label: "oauth disconnect guard" });
});

test("OAuth identity dies with the account (cascade)", async () => {
  const runEmail = `doomed-g-${Date.now()}.qa@test.dev`;
  const doomed = new Client(runEmail);
  doomed.addCookie("g_csrf_token", "qa-csrf-1");
  const token = signGoogleJwt({ sub: `google-sub-delete-${Date.now()}`, email: runEmail, email_verified: true, name: "Doomed Google" });
  const created = await doomed.request("POST", "/auth/google", { credential: token, csrfToken: "qa-csrf-1" });
  assert.equal(created.status, 201, `cascade setup google sign-in -> ${JSON.stringify(created.data)}`);
  const firstId = created.data.user.id;
  const deleted = await doomed.request("DELETE", "/me");
  assert.equal(deleted.status, 204, "oauth account deletion succeeds");
  const again = new Client(`${runEmail}-2`);
  again.addCookie("g_csrf_token", "qa-csrf-1");
  const recreated = await again.request("POST", "/auth/google", { credential: token, csrfToken: "qa-csrf-1" });
  assert.equal(recreated.status, 201, "same google identity creates a fresh account after deletion");
  assert.notEqual(recreated.data.user.id, firstId, "oauth_account row was cascade-deleted");
  results.push({ ok: true, label: "oauth identity cascades with deletion" });
});

test("existing password login still works alongside OAuth", async () => {
  const aliceRelogin = new Client("alice.qa@test.dev");
  const res = await aliceRelogin.request("POST", "/auth/login", { email: "alice.qa@test.dev", password: "Password123!" });
  assert.equal(res.status, 200, "password login is unaffected by OAuth");
  results.push({ ok: true, label: "password login still works" });
});