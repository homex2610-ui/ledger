import test from "node:test";
import assert from "node:assert/strict";
import { buildStoryData } from "../src/lib/stories.js";

const now = new Date(2026, 2, 18, 12);
const sessions = [
  { date: "2026-03-18", minutes: 40, subject: "Physics" },
  { date: "2026-03-17", minutes: 20, subject: "Maths" },
  { date: "2026-03-12", minutes: 60, subject: "Physics" },
];
const dpp = [{ date: "2026-03-18", solved: 15 }, { date: "2026-03-12", solved: 8 }];
const mocks = [{ date: "2026-03-18", total: 80, max: 100, name: "Physics mock" }, { date: "2026-03-10", total: 60, max: 100 }];

test("today omits unavailable metrics and uses real data", () => {
  const data = buildStoryData({ mode: "today", sessions, dpp, mocks, profile: { subjects: ["Physics", "Maths"] }, now });
  assert.equal(data.studyMinutes, 40);
  assert.equal(data.questions, 15);
  assert.equal(data.accuracy, 80);
  assert.equal(data.biggestWin, "80% on Physics mock");
  assert.equal(data.tests, undefined);
});

test("week has exactly seven calendar values and comparisons", () => {
  const data = buildStoryData({ mode: "week", sessions, dpp, mocks, profile: { subjects: ["Physics", "Maths"] }, now });
  assert.equal(data.dailyActivity.length, 7);
  assert.equal(data.studyMinutes, 120);
  assert.equal(data.questions, 23);
  assert.equal(data.tests, 1);
});

test("month tracks active days and omits empty achievements", () => {
  const data = buildStoryData({ mode: "month", sessions: [], dpp: [], mocks: [], profile: { subjects: [] }, now });
  assert.equal(data.dailyActivity.length, 31);
  assert.equal(data.activeDays, 0);
  assert.equal(data.studyMinutes, undefined);
  assert.equal(data.highlight, undefined);
});
