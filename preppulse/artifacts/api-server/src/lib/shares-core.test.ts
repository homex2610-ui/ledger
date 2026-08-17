import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  buildDailyFocusPayload,
  DAILY_FOCUS_MIN_ELIGIBLE_MINUTES,
  evaluateReferralProgress,
  formatMinutesLabel,
  REFERRAL_ACTIVATION_MINUTES,
  resolveShareVariant,
  SHARE_ARTIFACT_TTL_DAYS,
  utcDayKey,
} from "./shares-core.js";

test("formatMinutesLabel handles hours, minutes, and zeros", () => {
  assert.equal(formatMinutesLabel(0), "0m");
  assert.equal(formatMinutesLabel(25), "25m");
  assert.equal(formatMinutesLabel(45), "45m");
  assert.equal(formatMinutesLabel(60), "1h");
  assert.equal(formatMinutesLabel(155), "2h 35m");
  assert.equal(formatMinutesLabel(120), "2h");
  assert.equal(formatMinutesLabel(-5), "0m");
  assert.equal(formatMinutesLabel(120.4), "2h");
});

test("buildDailyFocusPayload sorts subjects, caps at 4, computes percents", () => {
  const createdAt = new Date("2026-08-17T10:00:00.000Z");
  const payload = buildDailyFocusPayload({
    displayName: "Alex",
    minutes: 100,
    streak: 6,
    subjects: [
      { subject: "Physics", minutes: 30 },
      { subject: "Chemistry", minutes: 20 },
      { subject: "Maths", minutes: 50 },
    ],
    createdAt,
  });
  assert.equal(payload.type, "daily_focus");
  assert.equal(payload.minutesLabel, "1h 40m");
  assert.equal(payload.streak, 6);
  assert.deepEqual(
    payload.subjects.map((s) => s.subject),
    ["Maths", "Physics", "Chemistry"],
  );
  assert.deepEqual(
    payload.subjects.map((s) => s.percent),
    [50, 30, 20],
  );
  assert.equal(payload.dayLabel, "Monday, Aug 17");
});

test("buildDailyFocusPayload caps subjects at 4 and drops zero-minute rows", () => {
  const payload = buildDailyFocusPayload({
    displayName: "Alex",
    minutes: 90,
    streak: 0,
    subjects: [
      { subject: "A", minutes: 30 },
      { subject: "B", minutes: 20 },
      { subject: "C", minutes: 20 },
      { subject: "D", minutes: 10 },
      { subject: "E", minutes: 10 },
      { subject: "F", minutes: 0 },
    ],
    createdAt: new Date("2026-08-17T10:00:00.000Z"),
  });
  assert.equal(payload.subjects.length, 4);
  assert.ok(!payload.subjects.some((s) => s.minutes === 0));
});

test("eligibility threshold is 25 focused minutes", () => {
  assert.equal(DAILY_FOCUS_MIN_ELIGIBLE_MINUTES, 25);
});

test("activation threshold is 10 minutes", () => {
  assert.equal(REFERRAL_ACTIVATION_MINUTES, 10);
});

test("artifact TTL is 30 days", () => {
  assert.equal(SHARE_ARTIFACT_TTL_DAYS, 30);
});

test("resolveShareVariant defaults to A and honors B", () => {
  assert.equal(resolveShareVariant(undefined), "A");
  assert.equal(resolveShareVariant(""), "A");
  assert.equal(resolveShareVariant("A"), "A");
  assert.equal(resolveShareVariant("B"), "B");
  assert.equal(resolveShareVariant("anything-else"), "A");
});

test("utcDayKey returns the UTC calendar date", () => {
  assert.equal(utcDayKey(new Date("2026-08-17T23:30:00.000Z")), "2026-08-17");
  assert.equal(utcDayKey(new Date("2026-08-18T00:05:00.000Z")), "2026-08-18");
});

function hours(h: number): Date {
  return new Date(2026, 7, 17, h, 0, 0, 0); // local Aug 17, hour h
}

test("activation: session within 24h of signup with >=10 min activates", () => {
  const attribution = new Date(2026, 7, 17, 8, 0, 0, 0);
  const decision = evaluateReferralProgress({
    sessionCreatedAt: new Date(2026, 7, 17, 9, 30, 0, 0),
    sessionMinutes: 11,
    attributionCreatedAt: attribution,
    activated: false,
    d7Done: false,
  });
  assert.deepEqual(decision, { activate: true, d7: false });
});

test("activation: session below 10 min does not activate", () => {
  const decision = evaluateReferralProgress({
    sessionCreatedAt: hours(9),
    sessionMinutes: 9,
    attributionCreatedAt: hours(8),
    activated: false,
    d7Done: false,
  });
  assert.deepEqual(decision, { activate: false, d7: false });
});

test("activation: session beyond 24h does not activate", () => {
  const decision = evaluateReferralProgress({
    sessionCreatedAt: new Date(2026, 7, 18, 9, 0, 0, 0),
    sessionMinutes: 45,
    attributionCreatedAt: hours(8),
    activated: false,
    d7Done: false,
  });
  assert.deepEqual(decision, { activate: false, d7: false });
});

test("activation: session before signup does not activate", () => {
  const decision = evaluateReferralProgress({
    sessionCreatedAt: hours(7),
    sessionMinutes: 45,
    attributionCreatedAt: hours(8),
    activated: false,
    d7Done: false,
  });
  assert.deepEqual(decision, { activate: false, d7: false });
});

test("d7: qualified session on a different day within 7 days marks D7", () => {
  const decision = evaluateReferralProgress({
    sessionCreatedAt: new Date(2026, 7, 19, 10, 0, 0, 0),
    sessionMinutes: 25,
    attributionCreatedAt: hours(8),
    activated: true,
    d7Done: false,
  });
  assert.deepEqual(decision, { activate: false, d7: true });
});

test("d7: same-day session does not count as D7", () => {
  const decision = evaluateReferralProgress({
    sessionCreatedAt: hours(11),
    sessionMinutes: 25,
    attributionCreatedAt: hours(8),
    activated: true,
    d7Done: false,
  });
  assert.deepEqual(decision, { activate: false, d7: false });
});

test("d7: beyond 7 days does not mark D7", () => {
  const decision = evaluateReferralProgress({
    sessionCreatedAt: new Date(2026, 7, 25, 10, 0, 0, 0),
    sessionMinutes: 25,
    attributionCreatedAt: hours(8),
    activated: true,
    d7Done: false,
  });
  assert.deepEqual(decision, { activate: false, d7: false });
});

test("d7: already complete stays complete", () => {
  const decision = evaluateReferralProgress({
    sessionCreatedAt: new Date(2026, 7, 19, 10, 0, 0, 0),
    sessionMinutes: 25,
    attributionCreatedAt: hours(8),
    activated: true,
    d7Done: true,
  });
  assert.deepEqual(decision, { activate: false, d7: false });
});

test("d7: unactivated users never get d7 on the activation session", () => {
  const decision = evaluateReferralProgress({
    sessionCreatedAt: new Date(2026, 7, 18, 7, 30, 0, 0),
    sessionMinutes: 25,
    attributionCreatedAt: hours(8),
    activated: false,
    d7Done: false,
  });
  assert.deepEqual(decision, { activate: true, d7: false });
});