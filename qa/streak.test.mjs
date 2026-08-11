// Streak consolidation regression suite.
//
// Pins the canonical computeStreak/longestStreak in src/lib/utils.js and
// the contract all five consumers (App, Sidebar, Header, Community,
// Stories) must hold: one canonical local-calendar definition, no
// minutes-based or UTC-sliced duplicates anywhere.
//
// All fixtures are fixed dates — nothing depends on the machine clock.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

import { computeStreak, longestStreak } from "../src/lib/utils.js";
import { buildStoryData } from "../src/lib/stories.js";

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const sourceOf = rel => readFileSync(join(srcRoot, rel), "utf8");

test("computeStreak counts consecutive days ending at the reference date", () => {
  const sessions = [
    { date: "2026-08-09", minutes: 40 },
    { date: "2026-08-10", minutes: 20 },
    { date: "2026-08-11", minutes: 60 },
  ];
  assert.equal(computeStreak(sessions, "2026-08-11"), 3);
  // A Date end (local calendar) must be equivalent to the string form.
  assert.equal(computeStreak(sessions, new Date(2026, 7, 11, 12)), 3);
});

test("computeStreak breaks on a gap and counts only from the end", () => {
  assert.equal(computeStreak([{ date: "2026-08-09" }, { date: "2026-08-11" }], "2026-08-11"), 1);
  assert.equal(computeStreak([{ date: "2026-08-07" }, { date: "2026-08-08" }, { date: "2026-08-10" }, { date: "2026-08-11" }], "2026-08-11"), 2);
});

test("computeStreak returns 0 with no current streak", () => {
  assert.equal(computeStreak([{ date: "2026-08-01" }, { date: "2026-08-02" }, { date: "2026-08-03" }], "2026-08-11"), 0);
  assert.equal(computeStreak([], "2026-08-11"), 0);
});

test("computeStreak counts a day even when its session has zero minutes", () => {
  const sessions = [
    { date: "2026-08-10", minutes: 45 },
    { date: "2026-08-11", minutes: 0 },
  ];
  assert.equal(computeStreak(sessions, "2026-08-11"), 2);
});

test("longestStreak finds the longest uninterrupted run", () => {
  const sessions = [
    { date: "2026-08-01" }, { date: "2026-08-02" }, { date: "2026-08-03" },
    { date: "2026-08-05" }, { date: "2026-08-06" }, { date: "2026-08-07" }, { date: "2026-08-08" },
  ];
  assert.equal(longestStreak(sessions), 4);
  assert.equal(longestStreak([{ date: "2026-08-01" }]), 1);
  assert.equal(longestStreak([]), 0);
});

test("streak math is local-calendar, never a UTC slice", () => {
  // Local 23:59 on 2026-08-12 still belongs to 2026-08-12 (a UTC slice on
  // negative-UTC machines would read 2026-08-13 and fail the first assert).
  assert.equal(computeStreak([{ date: "2026-08-12" }], new Date(2026, 7, 12, 23, 59)), 1);
  assert.equal(computeStreak([{ date: "2026-08-13" }], new Date(2026, 7, 12, 23, 59)), 0);
  // Local 00:30 on 2026-08-12 also belongs to 2026-08-12 (a UTC slice on
  // positive-UTC machines would read 2026-08-11 and fail).
  assert.equal(computeStreak([{ date: "2026-08-12" }], new Date(2026, 7, 12, 0, 30)), 1);
});

test("stories keeps its zero-current-streak → undefined convention", () => {
  const base = { mode: "today", sessions: [{ date: "2026-08-01", minutes: 30 }], dpp: [], mocks: [], profile: { subjects: ["Physics"] }, now: new Date(2026, 7, 11, 12) };
  assert.equal(buildStoryData(base).streak, undefined);
  assert.equal(buildStoryData({ ...base, sessions: [{ date: "2026-08-11", minutes: 25 }] }).streak, 1);
  const month = buildStoryData({ mode: "month", sessions: [{ date: "2026-08-01", minutes: 30 }, { date: "2026-08-02", minutes: 30 }, { date: "2026-08-03", minutes: 30 }], dpp: [], mocks: [], profile: { subjects: [] }, now: new Date(2026, 7, 11, 12) });
  assert.equal(month.streak, undefined);
  assert.deepEqual(month.highlight, { label: "Longest streak", value: "3 days" });
});

test("no consumer keeps a local or UTC-based streak implementation", () => {
  const app = sourceOf("App.jsx");
  assert.doesNotMatch(app, /\bfunction computeStreak\b/);
  assert.doesNotMatch(app, /\bfunction longestStreak\b/);
  assert.match(app, /import\s*\{[^}]*computeStreak[^}]*\}/);
  assert.match(app, /import\s*\{[^}]*longestStreak[^}]*\}/);

  for (const rel of ["components/layout/Sidebar.jsx", "components/layout/Header.jsx"]) {
    const src = sourceOf(rel);
    assert.doesNotMatch(src, /\bfunction streakOf\b/);
    assert.match(src, /import\s*\{[^}]*computeStreak[^}]*\}/);
    assert.match(src, /computeStreak\(sessions\)/);
  }

  const community = sourceOf("components/community/Community.jsx");
  assert.doesNotMatch(community, /\bfunction streakOf\b/);
  assert.doesNotMatch(community, /toISOString\(\)\.slice\(0,\s*10\)/);
  assert.match(community, /computeStreak\(sessions\)/);

  const stories = sourceOf("lib/stories.js");
  assert.doesNotMatch(stories, /\bfunction currentStreak\b/);
  assert.doesNotMatch(stories, /\bfunction longestStreak\b/);
  assert.match(stories, /import\s*\{[^}]*computeStreak[^}]*\}/);
  assert.match(stories, /import\s*\{[^}]*longestStreak[^}]*\}/);
});
