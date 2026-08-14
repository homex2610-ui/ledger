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
let checkCount = 0;
for (const name of ["equal", "ok", "notEqual", "deepEqual", "strictEqual", "notStrictEqual", "fail"]) {
  const original = assert[name];
  assert[name] = (...args) => {
    checkCount += 1;
    return original.apply(assert, args);
  };
}
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
const guildJoinCalls = [];

// ---- Mock OAuth providers: Google JWKS + Discord token/API endpoints ----
const GOOGLE_CLIENT_ID = "qa-google-client";
const DISCORD_CLIENT_ID = "qa-discord-client";
const DISCORD_CLIENT_SECRET = "qa-discord-secret";
const KID = "qa-test-key-1";
const DISCORD_RUN_SUFFIX = String(Date.now());
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
          ? { id: "discord-user-clash", username: "qa_clash", global_name: "Qa Clash", email: "dc.qa@test.dev", verified: true, avatar: "qa_clash_hash" }
          : token === "qa-access-other"
            ? { id: "discord-user-other", username: "qa_other", global_name: null, email: null, verified: false, avatar: null }
            : { id: `discord-user-${DISCORD_RUN_SUFFIX}`, username: "qa_discord", global_name: "Qa Discord", email: `discord.${DISCORD_RUN_SUFFIX}.qa@test.dev`, verified: true, avatar: "qa_discord_hash" };
        if (!token) {
          res.writeHead(401, { "content-type": "application/json" });
          res.end(JSON.stringify({ message: "Unauthorized" }));
          return;
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(identity));
        return;
      }
      if (req.method === "PUT" && url.pathname.startsWith("/api/guilds/qa-guild-1/members/")) {
        guildJoinCalls.push(url.pathname);
        res.writeHead(204);
        res.end();
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
      AUTH_RATE_LIMIT_MAX: "1000",
      GOOGLE_CLIENT_ID,
      GOOGLE_CERTS_URL: `http://127.0.0.1:${mockOauthPort}/certs`,
      DISCORD_CLIENT_ID,
      DISCORD_CLIENT_SECRET,
      DISCORD_GUILD_ID: "qa-guild-1",
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
  console.log(`\n${results.length - failed.length}/${results.length} checks passed (${checkCount} assertions executed)`);
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
  const seedTopic = topics.data[0];
  const order = ["not_started", "learning", "practiced", "revised", "mastered"];
  let status = seedTopic.status;
  for (const target of order.slice(order.indexOf(status) + 1)) {
    await alice.request("PATCH", `/topics/${seedTopic.id}/progress`, { status: target }, { expect: 200 });
    status = target;
  }

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
    ["PATCH", `/tests/${aliceTest}`, { score: 200 }],
    ["DELETE", `/tests/${aliceTest}`],
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

test("test log supports edit, validation and delete", async () => {
  const patched = await alice.request("PATCH", `/tests/${aliceTest}`, { score: 150, attempted: 60 }, { expect: 200 });
  assert.equal(patched.data.accuracy, 50, "accuracy recomputed from the edited score");

  const invalid = await alice.request("PATCH", `/tests/${aliceTest}`, { attempted: 99, totalQuestions: 90 });
  assert.equal(invalid.status, 400, "attempted > total is rejected");

  const list = (await alice.request("GET", "/tests")).data;
  assert.equal(list.find((t) => t.id === aliceTest).score, 150, "edited score is visible in the list");

  const adv = await alice.request("POST", "/tests", { name: "Advanced Mock 01", exam: "jee_adv", subject: "Mathematics", score: 120, maxScore: 240, attempted: 60, totalQuestions: 75, timeMinutes: 180, negativeMarksLost: 6 }, { expect: 201 });
  assert.equal(adv.data.exam, "jee_adv", "jee_adv attempt is accepted");
  const advList = (await alice.request("GET", "/tests")).data;
  assert.ok(advList.some((t) => t.id === adv.data.id && t.exam === "jee_adv"), "jee_adv attempt round-trips in the list");
  await alice.request("DELETE", `/tests/${adv.data.id}`, {}, { expect: 204 });

  const deleted = await alice.request("DELETE", `/tests/${aliceTest}`);
  assert.equal(deleted.status, 204, "delete succeeds");
  const after = (await alice.request("GET", "/tests")).data;
  assert.ok(!after.some((t) => t.id === aliceTest), "attempt is gone after delete");
  results.push({ ok: true, label: "test log edit/validation/delete" });
});

test("test log enforces track-aware subject scores", async () => {
  const created = await alice.request("POST", "/tests", { name: "JEE Full Mock", exam: "jee_adv", subjectScores: { physics: 72, chemistry: 81, mathematics: 65 }, score: 999, maxScore: 240, attempted: 60, totalQuestions: 75, timeMinutes: 180, negativeMarksLost: 5 }, { expect: 201 });
  assert.equal(created.data.score, 218, "score is the sum of subject scores");
  assert.equal(created.data.accuracy, 91, "accuracy derives from the summed score");
  assert.deepEqual(created.data.subjectScores, { physics: 72, chemistry: 81, mathematics: 65 }, "subjectScores round-trip on create");
  const list = (await alice.request("GET", "/tests")).data;
  assert.deepEqual(list.find((t) => t.id === created.data.id).subjectScores, { physics: 72, chemistry: 81, mathematics: 65 }, "subjectScores round-trip in the list");

  const neetExam = await alice.request("POST", "/tests", { name: "Bad Exam", exam: "neet", subjectScores: { physics: 50, chemistry: 50, biology: 50 }, score: 150, maxScore: 300, attempted: 60, totalQuestions: 75, timeMinutes: 180, negativeMarksLost: 0 });
  assert.equal(neetExam.status, 400, "neet exam is rejected for a jee student");
  const biology = await alice.request("POST", "/tests", { name: "Bad Subject", exam: "jee_main", subjectScores: { physics: 50, chemistry: 50, biology: 50 }, score: 150, maxScore: 300, attempted: 60, totalQuestions: 75, timeMinutes: 180, negativeMarksLost: 0 });
  assert.equal(biology.status, 400, "biology is rejected for a jee attempt");
  const missing = await alice.request("POST", "/tests", { name: "Missing", exam: "jee_main", subjectScores: { physics: 100, chemistry: 100 }, score: 200, maxScore: 300, attempted: 60, totalQuestions: 75, timeMinutes: 180, negativeMarksLost: 0 });
  assert.equal(missing.status, 400, "missing subject is rejected");
  const negative = await alice.request("POST", "/tests", { name: "Negative", exam: "jee_main", subjectScores: { physics: -1, chemistry: 0, mathematics: 0 }, score: 0, maxScore: 300, attempted: 60, totalQuestions: 75, timeMinutes: 180, negativeMarksLost: 0 });
  assert.equal(negative.status, 400, "negative subject score is rejected");
  const overMax = await alice.request("POST", "/tests", { name: "Over", exam: "jee_main", subjectScores: { physics: 301, chemistry: 0, mathematics: 0 }, score: 0, maxScore: 300, attempted: 60, totalQuestions: 75, timeMinutes: 180, negativeMarksLost: 0 });
  assert.equal(overMax.status, 400, "subject score above max is rejected");
  const sumOver = await alice.request("POST", "/tests", { name: "Sum Over", exam: "jee_main", subjectScores: { physics: 200, chemistry: 200, mathematics: 0 }, score: 0, maxScore: 300, attempted: 60, totalQuestions: 75, timeMinutes: 180, negativeMarksLost: 0 });
  assert.equal(sumOver.status, 400, "sum above max is rejected");

  const profile = await bob.request("PATCH", "/profile", { examTrack: "neet" }, { expect: 200 });
  assert.equal(profile.data.examTrack, "neet", "bob switches to the neet track");
  const neet = await bob.request("POST", "/tests", { name: "NEET Full Mock", exam: "neet", subjectScores: { physics: 142, chemistry: 158, biology: 286 }, score: 0, maxScore: 720, attempted: 160, totalQuestions: 180, timeMinutes: 200, negativeMarksLost: 8 }, { expect: 201 });
  assert.equal(neet.data.score, 586, "neet score is the sum of PCB");
  const jeeForNeet = await bob.request("POST", "/tests", { name: "Bad", exam: "jee_main", subjectScores: { physics: 50, chemistry: 50, mathematics: 50 }, score: 150, maxScore: 300, attempted: 60, totalQuestions: 75, timeMinutes: 180, negativeMarksLost: 0 });
  assert.equal(jeeForNeet.status, 400, "jee exam is rejected for a neet student");
  const mathsForNeet = await bob.request("POST", "/tests", { name: "Bad", exam: "neet", subjectScores: { physics: 50, chemistry: 50, mathematics: 50 }, score: 150, maxScore: 300, attempted: 60, totalQuestions: 75, timeMinutes: 180, negativeMarksLost: 0 });
  assert.equal(mathsForNeet.status, 400, "mathematics is rejected for a neet attempt");

  const patched = await alice.request("PATCH", `/tests/${created.data.id}`, { subjectScores: { physics: 80, chemistry: 80, mathematics: 60 }, maxScore: 240 }, { expect: 200 });
  assert.equal(patched.data.score, 220, "edit recomputes score from subject scores");
  assert.deepEqual(patched.data.subjectScores, { physics: 80, chemistry: 80, mathematics: 60 }, "edit persists subject scores");
  const cleared = await alice.request("PATCH", `/tests/${created.data.id}`, { subjectScores: null, score: 190 }, { expect: 200 });
  assert.equal(cleared.data.subjectScores, null, "subject scores can be cleared on edit");
  assert.equal(cleared.data.score, 190, "legacy score used after clearing");

  await alice.request("DELETE", `/tests/${created.data.id}`, {}, { expect: 204 });
  await bob.request("DELETE", `/tests/${neet.data.id}`, {}, { expect: 204 });
  await bob.request("PATCH", "/profile", { examTrack: "jee_main" }, { expect: 200 });
  results.push({ ok: true, label: "track-aware subject scores + validation" });
});

test("neet track switching propagates everywhere and is reversible", async (t) => {
  t.after(async () => {
    await bob.request("PATCH", "/profile", { examTrack: "jee_main" });
    const leftovers = (await bob.request("GET", "/tests")).data;
    for (const attempt of leftovers) {
      await bob.request("DELETE", `/tests/${attempt.id}`);
    }
    const leftoverCards = (await bob.request("GET", "/cards")).data;
    for (const card of leftoverCards) {
      await bob.request("DELETE", `/cards/${card.id}`);
    }
    const leftoverTasks = (await bob.request("GET", "/tasks")).data;
    for (const task of leftoverTasks) {
      await bob.request("DELETE", `/tasks/${task.id}`);
    }
  });
  const jeeTopics = (await alice.request("GET", "/topics")).data;
  assert.ok(jeeTopics.length > 40, "jee track sees the full syllabus catalog");
  const jeeTopicId = jeeTopics[0].id;

  const switched = await bob.request("PATCH", "/profile", { examTrack: "neet" }, { expect: 200 });
  assert.equal(switched.data.examTrack, "neet", "profile reports the neet track after switching");
  const persisted = await bob.request("GET", "/profile");
  assert.equal(persisted.data.examTrack, "neet", "neet track survives a profile refetch");
  const dashboardNeet = await bob.request("GET", "/dashboard");
  assert.equal(dashboardNeet.data.examLabel, "NEET", "dashboard label follows the neet track");

  const neetTopics = (await bob.request("GET", "/topics")).data;
  assert.ok(neetTopics.length > 0, "neet track sees its own catalog");
  const neetSubjects = [...new Set(neetTopics.map((topic) => topic.subject))].sort();
  assert.deepStrictEqual(neetSubjects, ["Biology", "Chemistry", "Physics"], "neet catalog is physics/chemistry/biology only");
  const neetSummary = await bob.request("GET", "/syllabus/summary");
  assert.equal(neetSummary.data.totalTopics, neetTopics.length, "coverage summary matches the neet catalog");

  const progressOnJeeTopic = await bob.request("PATCH", `/topics/${jeeTopicId}/progress`, { status: "learning" });
  assert.equal(progressOnJeeTopic.status, 400, "neet user cannot mutate a jee topic's progress");
  assert.ok(!(await bob.request("GET", "/topics")).data.some((topic) => topic.id === jeeTopicId), "no jee topic appears in the neet syllabus");

  const neetTest = await bob.request("POST", "/tests", { name: "NEET Switch Mock", exam: "neet", subjectScores: { physics: 100, chemistry: 110, biology: 220 }, score: 0, maxScore: 720, attempted: 150, totalQuestions: 180, timeMinutes: 200, negativeMarksLost: 4 }, { expect: 201 });
  assert.equal(neetTest.data.score, 430, "neet full-syllabus test with PCB is accepted");
  const mathsForNeet = await bob.request("POST", "/tests", { name: "Bad Maths", exam: "neet", subjectScores: { physics: 100, chemistry: 100, mathematics: 100 }, score: 300, maxScore: 720, attempted: 150, totalQuestions: 180, timeMinutes: 200, negativeMarksLost: 0 });
  assert.equal(mathsForNeet.status, 400, "mathematics is rejected for a neet test");
  const jeeForNeetAgain = await bob.request("POST", "/tests", { name: "Bad JEE", exam: "jee_main", subjectScores: { physics: 50, chemistry: 50, mathematics: 50 }, score: 150, maxScore: 300, attempted: 60, totalQuestions: 75, timeMinutes: 180, negativeMarksLost: 0 });
  assert.equal(jeeForNeetAgain.status, 400, "jee exam is rejected for a neet student");

  const mathsSession = await bob.request("POST", "/study-sessions", { subject: "Mathematics", minutes: 30, source: "manual" });
  assert.equal(mathsSession.status, 400, "mathematics study session is rejected on neet");

  const neetflow = new Client(`neetflow.${DISCORD_RUN_SUFFIX}.qa@test.dev`);
  await neetflow.signup("NeetFlowQA");
  await neetflow.request("PATCH", "/profile", { examTrack: "neet" }, { expect: 200 });
  const biologySession = await neetflow.request("POST", "/study-sessions", { subject: "Biology", minutes: 30, source: "manual" }, { expect: 201 });
  assert.equal(biologySession.data.subject, "Biology", "biology study session is accepted on neet");
  const mixedSession = await neetflow.request("POST", "/study-sessions", { subject: "Mixed revision", minutes: 15, source: "manual" }, { expect: 201 });
  assert.equal(mixedSession.data.subject, "Mixed revision", "mixed revision is still allowed on neet");
  const sessionsList = (await neetflow.request("GET", "/study-sessions")).data;
  assert.equal(sessionsList.length, 2, "accepted neet sessions round-trip in the list");

  const biologyCard = await bob.request("POST", "/cards", { subject: "Biology", front: "Q", back: "A" }, { expect: 201 });
  const generalCard = await bob.request("POST", "/cards", { subject: "General", front: "Q", back: "A" }, { expect: 201 });
  const mathsCard = await bob.request("POST", "/cards", { subject: "Mathematics", front: "Q", back: "A" });
  assert.equal(mathsCard.status, 400, "mathematics card is rejected on neet");

  const biologyTask = await bob.request("POST", "/tasks", { title: "Bio task", subject: "Biology" }, { expect: 201 });
  const mixedTask = await bob.request("POST", "/tasks", { title: "Mixed task", subject: "Mixed revision" }, { expect: 201 });
  const mathsTask = await bob.request("POST", "/tasks", { title: "Maths task", subject: "Mathematics" });
  assert.equal(mathsTask.status, 400, "mathematics task is rejected on neet");

  const reverted = await bob.request("PATCH", "/profile", { examTrack: "jee_main" }, { expect: 200 });
  assert.equal(reverted.data.examTrack, "jee_main", "neet -> jee switch is accepted");
  const dashboardJee = await bob.request("GET", "/dashboard");
  assert.equal(dashboardJee.data.examLabel, "JEE Main", "dashboard label returns to jee after switching back");
  const jeeTopicsAgain = (await bob.request("GET", "/topics")).data;
  assert.equal(jeeTopicsAgain.length, jeeTopics.length, "jee syllabus catalog is restored unchanged");
  const biologySessionJee = await bob.request("POST", "/study-sessions", { subject: "Biology", minutes: 20, source: "manual" });
  assert.equal(biologySessionJee.status, 400, "biology study session is rejected once back on jee");

  await bob.request("DELETE", `/tests/${neetTest.data.id}`, {}, { expect: 204 });
  await bob.request("DELETE", `/cards/${biologyCard.data.id}`, {}, { expect: 204 });
  await bob.request("DELETE", `/cards/${generalCard.data.id}`, {}, { expect: 204 });
  await bob.request("DELETE", `/tasks/${biologyTask.data.id}`, {}, { expect: 204 });
  await bob.request("DELETE", `/tasks/${mixedTask.data.id}`, {}, { expect: 204 });
  results.push({ ok: true, label: "neet track switching propagation + reversal" });
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

test("topics are never locked and any topic accepts progression", async () => {
  const bobTopics = (await bob.request("GET", "/topics")).data;
  assert.ok(bobTopics.every((topic) => topic.locked === false), "no topic is locked on a fresh user");
  const topic = bobTopics.find((entry) => entry.name === "Newton's Laws of Motion");
  assert.ok(topic, "a prerequisite topic exists in the catalog");
  const advanced = await bob.request("PATCH", `/topics/${topic.id}/progress`, { status: "learning" }, { expect: 200 });
  assert.equal(advanced.data.status, "learning", "a topic with untouched prerequisites still accepts progress");
  const reset = await bob.request("PATCH", `/topics/${topic.id}/progress`, { status: "not_started" }, { expect: 200 });
  assert.equal(reset.data.status, "not_started", "deliberate reset back to not_started is preserved");
  const missing = await bob.request("PATCH", "/topics/00000000-0000-0000-0000-000000000000/progress", { status: "learning" });
  assert.equal(missing.status, 404, "bogus topic id is 404, not 500");
  results.push({ ok: true, label: "topics never locked; progression allowed anywhere" });
});

test("prerequisites never lock topics; progression is always allowed", async () => {
  const bobs = (await bob.request("GET", "/topics")).data;
  const find = (subject, name) => bobs.find((topic) => topic.subject === subject && topic.name === name);
  const physicsThermo = find("Physics", "Thermodynamics");
  const chemThermo = find("Chemistry", "Thermodynamics");
  const physicsThermal = find("Physics", "Thermal Properties of Matter");
  assert.ok(physicsThermo && chemThermo && physicsThermal, "catalog has the relevant topics");

  await bob.request("PATCH", `/topics/${physicsThermal.id}/progress`, { status: "not_started" }, { expect: 200 });
  await bob.request("PATCH", `/topics/${chemThermo.id}/progress`, { status: "not_started" }, { expect: 200 });
  await bob.request("PATCH", `/topics/${physicsThermo.id}/progress`, { status: "not_started" }, { expect: 200 });
  const untouched = (await bob.request("GET", "/topics")).data.find((topic) => topic.id === physicsThermo.id);
  assert.equal(untouched.locked, false, "physics Thermodynamics is not locked with a fresh prereq");

  const direct = await bob.request("PATCH", `/topics/${physicsThermo.id}/progress`, { status: "learning" }, { expect: 200 });
  assert.equal(direct.data.status, "learning", "a topic advances without any prereq progress");

  await bob.request("PATCH", `/topics/${chemThermo.id}/progress`, { status: "learning" }, { expect: 200 });
  await bob.request("PATCH", `/topics/${chemThermo.id}/progress`, { status: "practiced" }, { expect: 200 });
  const afterChem = (await bob.request("GET", "/topics")).data.find((topic) => topic.id === physicsThermo.id);
  assert.equal(afterChem.locked, false, "physics Thermodynamics stays unlocked regardless of chemistry progress");

  await bob.request("PATCH", `/topics/${physicsThermo.id}/progress`, { status: "not_started" }, { expect: 200 });
  await bob.request("PATCH", `/topics/${chemThermo.id}/progress`, { status: "not_started" }, { expect: 200 });
  results.push({ ok: true, label: "prerequisites never lock; progression is always allowed" });
});

test("topic status machine enforces forward progression and earned mastery", async () => {
  const bobs = (await bob.request("GET", "/topics")).data;
  const topic = bobs.find((entry) => entry.name === "Kinematics");
  assert.ok(topic, "unlocked Kinematics exists for bob");
  assert.equal(topic.locked, false, "Kinematics must not be locked for the machine test");

  const jumpMastered = await bob.request("PATCH", `/topics/${topic.id}/progress`, { status: "mastered" });
  assert.equal(jumpMastered.status, 400, "mastered cannot be set from not_started");
  assert.equal(jumpMastered.data.code, "invalid_status_transition", "invalid transitions carry the code");
  const jumpPracticed = await bob.request("PATCH", `/topics/${topic.id}/progress`, { status: "practiced" });
  assert.equal(jumpPracticed.status, 400, "practiced cannot skip learning");
  await bob.request("PATCH", `/topics/${topic.id}/progress`, { status: "learning" }, { expect: 200 });
  const idempotent = await bob.request("PATCH", `/topics/${topic.id}/progress`, { status: "learning" });
  assert.equal(idempotent.status, 200, "same-status patch is an idempotent no-op");
  const masteredTooEarly = await bob.request("PATCH", `/topics/${topic.id}/progress`, { status: "mastered" });
  assert.equal(masteredTooEarly.status, 400, "mastered still blocked from learning");
  await bob.request("PATCH", `/topics/${topic.id}/progress`, { status: "practiced" }, { expect: 200 });
  const masteredFromPracticed = await bob.request("PATCH", `/topics/${topic.id}/progress`, { status: "mastered" });
  assert.equal(masteredFromPracticed.status, 400, "mastered must pass through revised");
  await bob.request("PATCH", `/topics/${topic.id}/progress`, { status: "revised" }, { expect: 200 });
  await bob.request("PATCH", `/topics/${topic.id}/progress`, { status: "mastered" }, { expect: 200 });
  const earned = (await bob.request("GET", "/topics")).data.find((entry) => entry.id === topic.id);
  assert.equal(earned.status, "mastered", "mastered is only reachable through the chain");
  const unMaster = await bob.request("PATCH", `/topics/${topic.id}/progress`, { status: "revised" });
  assert.equal(unMaster.status, 200, "mastered can step back to revised as a correction");
  await bob.request("PATCH", `/topics/${topic.id}/progress`, { status: "not_started" }, { expect: 200 });
  const reset = (await bob.request("GET", "/topics")).data.find((entry) => entry.id === topic.id);
  assert.equal(reset.status, "not_started", "deliberate reset back to not_started is preserved");
  const bogus = await bob.request("PATCH", `/topics/${topic.id}/progress`, { status: "archived" });
  assert.equal(bogus.status, 400, "unknown status values are rejected by validation");
  results.push({ ok: true, label: "topic status machine: forward-only progression, earned mastery" });
});

test("status machine is enforced identically for jee and neet", async () => {
  const track = new Client(`machine.${DISCORD_RUN_SUFFIX}.qa@test.dev`);
  await track.signup("MachineQA");

  const jeeTopics = (await track.request("GET", "/topics")).data;
  assert.equal(jeeTopics.length, 49, "fresh account starts on the JEE catalog");
  assert.ok(jeeTopics.every((topic) => !topic.locked), "no JEE topic is locked for a fresh user");
  const jeeFree = jeeTopics.find((topic) => topic.name === "Kinematics");
  assert.ok(jeeFree, "a progression target exists on the JEE catalog");
  const jeeJumpMastered = await track.request("PATCH", `/topics/${jeeFree.id}/progress`, { status: "mastered" });
  assert.equal(jeeJumpMastered.status, 400, "JEE: not_started -> mastered must be rejected");
  const jeeJumpRevised = await track.request("PATCH", `/topics/${jeeFree.id}/progress`, { status: "revised" });
  assert.equal(jeeJumpRevised.status, 400, "JEE: not_started -> revised must be rejected");
  const jeeJumpPracticed = await track.request("PATCH", `/topics/${jeeFree.id}/progress`, { status: "practiced" });
  assert.equal(jeeJumpPracticed.status, 400, "JEE: not_started -> practiced must be rejected");
  await track.request("PATCH", `/topics/${jeeFree.id}/progress`, { status: "learning" }, { expect: 200 });
  const jeeMasteredFromLearning = await track.request("PATCH", `/topics/${jeeFree.id}/progress`, { status: "mastered" });
  assert.equal(jeeMasteredFromLearning.status, 400, "JEE: learning -> mastered must be rejected");
  await track.request("PATCH", `/topics/${jeeFree.id}/progress`, { status: "practiced" }, { expect: 200 });

  await track.request("PATCH", "/profile", { examTrack: "neet" }, { expect: 200 });
  const neetTopics = (await track.request("GET", "/topics")).data;
  assert.equal(neetTopics.length, 249, "switching to NEET loads the NEET catalog");
  assert.ok(neetTopics.every((topic) => !topic.locked), "no NEET topic is locked for a fresh user");
  const neetFree = neetTopics[0];
  assert.ok(neetFree, "a progression target exists on the NEET catalog");
  const neetJumpMastered = await track.request("PATCH", `/topics/${neetFree.id}/progress`, { status: "mastered" });
  assert.equal(neetJumpMastered.status, 400, "NEET: not_started -> mastered must be rejected (same as JEE)");
  assert.equal(neetJumpMastered.data.code, "invalid_status_transition", "NEET invalid jumps carry the same error code");
  const neetJumpRevised = await track.request("PATCH", `/topics/${neetFree.id}/progress`, { status: "revised" });
  assert.equal(neetJumpRevised.status, 400, "NEET: not_started -> revised must be rejected (same as JEE)");
  const neetJumpPracticed = await track.request("PATCH", `/topics/${neetFree.id}/progress`, { status: "practiced" });
  assert.equal(neetJumpPracticed.status, 400, "NEET: not_started -> practiced must be rejected (same as JEE)");
  await track.request("PATCH", `/topics/${neetFree.id}/progress`, { status: "learning" }, { expect: 200 });
  const neetMasteredFromLearning = await track.request("PATCH", `/topics/${neetFree.id}/progress`, { status: "mastered" });
  assert.equal(neetMasteredFromLearning.status, 400, "NEET: learning -> mastered must be rejected (same as JEE)");
  await track.request("PATCH", `/topics/${neetFree.id}/progress`, { status: "practiced" }, { expect: 200 });

  await track.request("PATCH", "/profile", { examTrack: "jee_main" }, { expect: 200 });
  const jeeAgain = (await track.request("GET", "/topics")).data;
  assert.equal(jeeAgain.length, 49, "switching back restores JEE topics");
  const stillEnforced = await track.request("PATCH", `/topics/${jeeFree.id}/progress`, { status: "mastered" });
  assert.equal(stillEnforced.status, 400, "switching tracks does not bypass validation (JEE still enforced)");
  const idempotent = await track.request("PATCH", `/topics/${jeeFree.id}/progress`, { status: "practiced" });
  assert.equal(idempotent.status, 200, "same-status patch stays an idempotent no-op");

  await track.request("PATCH", `/topics/${jeeFree.id}/progress`, { status: "not_started" }, { expect: 200 });
  await track.request("DELETE", "/me", undefined, { expect: 204 });
  results.push({ ok: true, label: "status machine: identical enforcement across jee and neet" });
});

test("neet catalog matches the official 2026 syllabus structure", async () => {
  const neet = new Client(`neetcatalog.${DISCORD_RUN_SUFFIX}.qa@test.dev`);
  await neet.signup("NeetCatalogQA");
  await neet.request("PATCH", "/profile", { examTrack: "neet" }, { expect: 200 });
  const topics = (await neet.request("GET", "/topics")).data;
  assert.equal(topics.length, 249, "neet catalog has 249 official topics");
  const bySubject = { Physics: 0, Chemistry: 0, Biology: 0 };
  const unitsBySubject = { Physics: new Set(), Chemistry: new Set(), Biology: new Set() };
  for (const topic of topics) {
    bySubject[topic.subject] += 1;
    unitsBySubject[topic.subject].add(topic.chapter);
  }
  assert.deepStrictEqual(bySubject, { Physics: 104, Chemistry: 82, Biology: 63 }, "subject topic counts");
  assert.equal(unitsBySubject.Physics.size, 20, "physics has all 20 official units");
  assert.equal(unitsBySubject.Chemistry.size, 20, "chemistry has all 20 official units");
  assert.equal(unitsBySubject.Biology.size, 10, "biology has all 10 official units");
  assert.ok(topics.some((topic) => topic.chapter === "Rotational Motion"), "2026 physics unit 5 title");
  assert.ok(topics.some((topic) => topic.chapter === "Experimental Skills"), "2026 physics unit 20 present");
  assert.ok(topics.some((topic) => topic.chapter === "Co-Ordination Compounds"), "official co-ordination spelling");
  assert.ok(topics.some((topic) => topic.chapter === "Some Basic Concepts in Chemistry"), "chemistry unit 1 present");
  assert.ok(topics.some((topic) => topic.chapter === "Diversity in Living World"), "biology unit 1 present");
  assert.ok(!topics.some((topic) => topic.chapter.includes("States of Matter")), "2026-dropped states of matter absent");
  assert.ok(!topics.some((topic) => topic.chapter.includes("Surface Chemistry")), "2026-dropped surface chemistry absent");
  assert.ok(!topics.some((topic) => topic.chapter.includes("Polymers")), "2026-dropped polymers absent");
  assert.ok(!topics.some((topic) => topic.chapter.includes("Chemistry in Everyday Life")), "2026-dropped everyday-life chemistry absent");
  assert.ok(!topics.some((topic) => topic.subject === "Mathematics"), "no mathematics in the neet catalog");
  const prereqTopics = topics.filter((topic) => topic.prerequisites && topic.prerequisites.length > 0);
  assert.ok(prereqTopics.length > 0, "neet catalog keeps genuine prerequisites");
  const namesBySubject = new Map();
  for (const topic of topics) {
    const names = namesBySubject.get(topic.subject) ?? new Set();
    names.add(topic.name);
    namesBySubject.set(topic.subject, names);
  }
  const dangling = prereqTopics.flatMap((topic) => (topic.prerequisites ?? []).filter((name) => !namesBySubject.get(topic.subject).has(name)));
  assert.equal(dangling.length, 0, "every neet prerequisite resolves inside the neet catalog");
  results.push({ ok: true, label: "neet catalog structure matches the official 2026 syllabus" });
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
  assert.equal(url.searchParams.get("scope"), "identify email guilds.join", "identity + guild join scopes");
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
  const discordProfile = (await first.request("GET", "/auth/me")).data.profile;
  assert.match(discordProfile.handle, /^qa_discord(_\d+)?$/, "new discord account takes the discord username as handle");
  assert.equal(discordProfile.avatarUrl, `https://cdn.discordapp.com/avatars/discord-user-${DISCORD_RUN_SUFFIX}/qa_discord_hash.png?size=128`, "new discord account carries the discord avatar");
  assert.ok(guildJoinCalls.includes(`/api/guilds/qa-guild-1/members/discord-user-${DISCORD_RUN_SUFFIX}`), "discord login auto-joins the configured server");
  results.push({ ok: true, label: "discord identity reuse + auto guild join" });
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

test("circles report self/capacity and duplicate joins are idempotent", async () => {
  const run = Date.now();
  const owner = new Client(`cap-owner-${run}.qa@test.dev`);
  await owner.signup("CapOwnerQA");
  const peer = new Client(`cap-peer-${run}.qa@test.dev`);
  await peer.signup("CapPeerQA");
  const code = (await owner.request("GET", "/profile")).data.profileCode;

  const first = await peer.request("POST", "/circles/connect", { code }, { expect: 201 });
  assert.equal(first.data.isOwner, false, "connect response marks the peer as a member");
  const second = await peer.request("POST", "/circles/connect", { code }, { expect: 201 });
  assert.equal(second.data.userId, first.data.userId, "duplicate connect is idempotent");

  const ownerCircle = (await owner.request("GET", "/circles")).data;
  assert.equal(ownerCircle.capacity, 25, "capacity is exposed as 25");
  assert.equal(ownerCircle.memberCount, 2, "memberCount includes the owner");
  assert.equal(ownerCircle.connections.length, 1, "no duplicate rows after a repeated join");
  assert.equal(ownerCircle.self.isOwner, true, "self is flagged as the owner");
  assert.equal(ownerCircle.self.handle, "CapOwnerQA", "self row is the requesting user");
  assert.equal(ownerCircle.connections[0].isOwner, false, "connections are never owners");
  assert.equal(ownerCircle.connections[0].handle, "CapPeerQA", "the peer appears in the roster");

  const ownCode = (await peer.request("GET", "/profile")).data.profileCode;
  const selfConnect = await peer.request("POST", "/circles/connect", { code: ownCode });
  assert.equal(selfConnect.status, 400, "connecting to your own code is refused");

  const peerId = (await peer.request("GET", "/circles")).data.self.userId;
  await owner.request("DELETE", `/circles/${peerId}`, undefined, { expect: 204 });
  results.push({ ok: true, label: "circle self/capacity shape + idempotent joins" });
});

test("the 25th member joins; the 26th is rejected and keeps their own circle", async (t) => {
  const run = Date.now();
  const owner = new Client(`full-owner-${run}.qa@test.dev`);
  await owner.signup("FullOwnerQA");
  const code = (await owner.request("GET", "/profile")).data.profileCode;
  const joiners = [];
  for (let i = 0; i < 26; i += 1) {
    const joiner = new Client(`full-join-${run}-${i}.qa@test.dev`);
    await joiner.signup(`FullJoinQA${i}`);
    joiners.push(joiner);
  }

  const accepted = [];
  for (let i = 0; i < 26; i += 1) {
    const res = await joiners[i].request("POST", "/circles/connect", { code });
    if (res.status === 201) {
      accepted.push(i);
    } else {
      assert.equal(res.status, 409, `joiner ${i} is refused once the circle is full`);
      assert.match(res.data.error, /circle is full/i, "the 409 explains the 25-member limit");
    }
  }
  assert.equal(accepted.length, 24, "exactly 24 peers join beside the owner (25 total)");

  const ownerCircle = (await owner.request("GET", "/circles")).data;
  assert.equal(ownerCircle.memberCount, 25, "owner circle shows 25/25");
  assert.equal(ownerCircle.connections.length, 24, "roster lists exactly 24 peers");
  assert.ok(ownerCircle.connections.every((member) => member.isOwner === false), "no peer is flagged owner");

  const rejectedIndex = 25;
  const rejectedCircle = (await joiners[rejectedIndex].request("GET", "/circles")).data;
  assert.equal(rejectedCircle.memberCount, 1, "rejected joiner keeps their own independent 1/25 circle");
  assert.equal(rejectedCircle.connections.length, 0, "rejected joiner's roster is untouched");
  assert.equal(rejectedCircle.self.isOwner, true, "rejected joiner is the owner of their own circle");

  const handles = ownerCircle.connections.map((member) => member.handle);
  assert.ok(handles.includes("FullJoinQA0") && handles.includes("FullJoinQA23"), "first and last accepted peers are visible");
  assert.ok(!handles.includes("FullJoinQA25"), "rejected peer never leaks into the owner roster");

  const acceptedFirst = await Promise.all(accepted.map((i) => joiners[i].request("GET", "/circles")));
  const firstCircle = acceptedFirst[0].data;
  assert.equal(firstCircle.memberCount, 2, "an accepted peer's circle shows owner + peer");
  assert.ok(firstCircle.connections.every((member) => member.handle === "FullOwnerQA"), "a peer's roster only contains its own circle");

  t.after(async () => {
    for (const i of accepted) {
      await owner.request("DELETE", `/circles/${joiners[i].userId}`);
    }
  });
  results.push({ ok: true, label: "25-member capacity boundary + rejected peer keeps own circle" });
});

test("concurrent joins can never exceed 24 connections for one user", async (t) => {
  const run = Date.now();
  const hub = new Client(`hub-${run}.qa@test.dev`);
  await hub.signup("HubQA");
  const code = (await hub.request("GET", "/profile")).data.profileCode;
  const joiners = [];
  for (let i = 0; i < 30; i += 1) {
    const joiner = new Client(`burst-${run}-${i}.qa@test.dev`);
    await joiner.signup(`BurstQA${i}`);
    joiners.push(joiner);
  }

  const outcomes = await Promise.all(joiners.map((joiner) => joiner.request("POST", "/circles/connect", { code })));
  const accepted = outcomes.filter((res) => res.status === 201).length;
  const refused = outcomes.filter((res) => res.status === 409).length;
  assert.equal(accepted, 24, "exactly 24 of 30 simultaneous joins land");
  assert.equal(refused, 6, "the remaining 6 are refused atomically");
  assert.ok(outcomes.every((res) => res.status === 201 || res.status === 409), "no join is lost to a server error");

  const hubCircle = (await hub.request("GET", "/circles")).data;
  assert.equal(hubCircle.memberCount, 25, "hub circle never exceeds 25 members under concurrency");
  assert.equal(hubCircle.connections.length, 24, "hub roster stays at 24 even after a simultaneous burst");

  t.after(async () => {
    for (const res of outcomes) {
      if (res.status === 201) {
        await hub.request("DELETE", `/circles/${res.data.userId}`);
      }
    }
  });
  results.push({ ok: true, label: "concurrent connect burst respects the 25-member cap" });
});