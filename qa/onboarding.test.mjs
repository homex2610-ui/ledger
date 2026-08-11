// Onboarding exam-model regression suite.
//
// Pins the JEE/NEET subject mapping, the year-rolling target-date presets
// (deterministic: same reference date → same presets, never a hardcoded
// exam year), and the bulk-progress syllabus seed — all in src/lib/exams.js.
//
// All fixtures are fixed dates — nothing depends on the machine clock.
import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SYLLABUS, EXAM_SUBJECTS, EXAM_LABELS, examPresetsFor, buildInitialSyllabus } from "../src/lib/exams.js";

// ── Exam → subject selection ────────────────────────────────────────────
test("JEE Main and JEE Advanced map to Physics/Chemistry/Maths", () => {
  assert.deepEqual(EXAM_SUBJECTS["JEE Main"], ["Physics", "Chemistry", "Maths"]);
  assert.deepEqual(EXAM_SUBJECTS["JEE Advanced"], ["Physics", "Chemistry", "Maths"]);
});

test("NEET maps to Physics/Chemistry/Biology (PCB, no Maths)", () => {
  assert.deepEqual(EXAM_SUBJECTS["NEET"], ["Physics", "Chemistry", "Biology"]);
});

test("Both maps to all four subjects; Custom is empty", () => {
  assert.deepEqual(EXAM_SUBJECTS["Both"], ["Physics", "Chemistry", "Maths", "Biology"]);
  assert.deepEqual(EXAM_SUBJECTS["Custom"], []);
});

test("every exam option has a display label and a subject list", () => {
  for (const key of Object.keys(EXAM_SUBJECTS)) {
    assert.ok(EXAM_LABELS[key], `missing label for ${key}`);
    assert.ok(Array.isArray(EXAM_SUBJECTS[key]), `missing subject list for ${key}`);
  }
  assert.equal(EXAM_LABELS["Both"], "JEE + NEET");
});

test("syllabus catalog is complete for every default subject", () => {
  for (const sub of new Set(Object.values(EXAM_SUBJECTS).flat())) {
    assert.ok((DEFAULT_SYLLABUS[sub] || []).length > 0, `no default chapters for ${sub}`);
  }
});

// ── Year-rolling presets ────────────────────────────────────────────────
test("presets are deterministic: the same reference date yields identical output", () => {
  const from = new Date(2026, 7, 12); // Aug 12 2026
  assert.deepEqual(examPresetsFor("NEET", from), examPresetsFor("NEET", new Date(2026, 7, 12, 23, 59)));
});

test("JEE Main from mid-2026 projects the 2027 sessions (never past dates)", () => {
  const from = new Date(2026, 7, 12);
  const presets = examPresetsFor("JEE Main", from);
  assert.deepEqual(presets.map(p => p.date), ["2027-01-30", "2027-04-05"]);
  assert.equal(presets[0].label, "Jan 2027 · Session 1");
  assert.equal(presets[1].label, "Apr 2027 · Session 2");
});

test("NEET projects the 1st Sunday of May; JEE Advanced the 3rd", () => {
  const from = new Date(2026, 7, 12);
  assert.equal(examPresetsFor("NEET", from)[0].date, "2027-05-02"); // 1st Sun May 2027
  assert.equal(examPresetsFor("JEE Advanced", from)[0].date, "2027-05-16"); // 3rd Sun May 2027
});

test("Both projects the full JEE + NEET calendar for the next cycle", () => {
  const from = new Date(2026, 7, 12);
  const presets = examPresetsFor("Both", from);
  assert.deepEqual(presets.map(p => p.date), ["2027-01-30", "2027-04-05", "2027-05-02", "2027-05-16"]);
});

test("presets roll forward year after year (Feb 2027 no longer shows Jan 2027)", () => {
  const from = new Date(2027, 1, 20); // Feb 20 2027
  const jee = examPresetsFor("JEE Main", from);
  assert.deepEqual(jee.map(p => p.date), ["2027-04-05", "2028-01-30", "2028-04-05"]);
  const neet = examPresetsFor("NEET", from);
  assert.equal(neet[0].date, "2027-05-02");
});

test("presets never contain dates on or before the reference date", () => {
  for (const exam of Object.keys(EXAM_SUBJECTS)) {
    const from = new Date(2028, 0, 15); // Jan 15 2028
    for (const p of examPresetsFor(exam, from)) {
      assert.ok(p.date > "2028-01-15", `${exam} leaked a past date ${p.date}`);
    }
  }
});

test("Custom has no presets", () => {
  assert.deepEqual(examPresetsFor("Custom", new Date(2026, 7, 12)), []);
});

// ── Bulk existing-progress seeding ──────────────────────────────────────
test("buildInitialSyllabus seeds the default catalog as todo", () => {
  const syl = buildInitialSyllabus(["Physics", "Maths"], {}, { today: "2026-08-12" });
  assert.equal(syl.Physics.length, DEFAULT_SYLLABUS.Physics.length);
  assert.equal(syl.Maths.length, DEFAULT_SYLLABUS.Maths.length);
  assert.equal(syl.Physics[0].name, "Units & Measurements");
  assert.equal(syl.Physics[0].status, "todo");
  assert.equal(syl.Physics[0].doneDate, null);
  assert.equal(syl.Physics[0].revisionStage, -1);
  assert.equal(syl.Physics[0].nextRevision, null);
});

test("covered chapters seed as done with the same review scheduling as a manual done", () => {
  const syl = buildInitialSyllabus(["Physics"], { Physics: ["Kinematics", "Laws of Motion"] }, { today: "2026-08-12", firstReviewDays: 1 });
  const kin = syl.Physics.find(c => c.name === "Kinematics");
  assert.equal(kin.status, "done");
  assert.equal(kin.doneDate, "2026-08-12");
  assert.equal(kin.revisionStage, 0);
  assert.equal(kin.nextRevision, "2026-08-13"); // today + firstReviewDays (REVISION_INTERVALS[0] = 1)
  const units = syl.Physics.find(c => c.name === "Units & Measurements");
  assert.equal(units.status, "todo");
  assert.equal(units.doneDate, null);
});

test("unknown subjects seed as empty arrays (custom subjects get no chapters)", () => {
  const syl = buildInitialSyllabus(["NotACatalogSubject"], {}, { today: "2026-08-12" });
  assert.deepEqual(syl["NotACatalogSubject"], []);
});

test("covered lists are name-keyed per subject and never cross subjects", () => {
  const syl = buildInitialSyllabus(["Physics", "Maths"], { Physics: ["Kinematics"] }, { today: "2026-08-12" });
  assert.equal(syl.Physics.find(c => c.name === "Kinematics").status, "done");
  assert.equal(syl.Maths.find(c => c.name === "Sets, Relations & Functions").status, "todo");
});
