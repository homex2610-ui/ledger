// Exam → subject mapping, the default syllabus catalog, and year-rolling
// target-date presets. Pure data + pure functions (no React, no theme), so
// the QA harness can unit-test the JEE/NEET model deterministically.
//
// The syllabus catalog is the single source for default chapter lists; the
// Coverage tab's curated DEPENDENCIES live in App.jsx next to the coverage
// UI that consumes them.

import { uid, todayStr, addDays } from "./utils.js";

export const DEFAULT_SYLLABUS = {
  Physics: ["Units & Measurements", "Kinematics", "Laws of Motion", "Work, Energy & Power", "System of Particles & Rotational Motion", "Gravitation", "Mechanical Properties of Solids", "Mechanical Properties of Fluids", "Thermal Properties of Matter", "Thermodynamics", "Kinetic Theory of Gases", "Oscillations", "Waves", "Electrostatics", "Current Electricity", "Moving Charges & Magnetism", "Magnetism & Matter", "EM Induction", "Alternating Current", "EM Waves", "Ray Optics", "Wave Optics", "Dual Nature of Radiation & Matter", "Atoms", "Nuclei", "Semiconductor Electronics"],
  Chemistry: ["Some Basic Concepts of Chemistry", "Structure of Atom", "Classification of Elements & Periodicity", "Chemical Bonding & Molecular Structure", "States of Matter", "Thermodynamics", "Equilibrium", "Redox Reactions", "s-Block Elements", "p-Block Elements (Gp 13-14)", "Organic Chemistry — Basic Principles", "Hydrocarbons", "Solid State", "Solutions", "Electrochemistry", "Chemical Kinetics", "Surface Chemistry", "p-Block Elements (Gp 15-18)", "d & f-Block Elements", "Coordination Compounds", "Haloalkanes & Haloarenes", "Alcohols, Phenols & Ethers", "Aldehydes, Ketones & Carboxylic Acids", "Amines", "Biomolecules", "Polymers", "Chemistry in Everyday Life"],
  Maths: ["Sets, Relations & Functions", "Complex Numbers", "Quadratic Equations", "Sequences & Series", "Permutations & Combinations", "Binomial Theorem", "Matrices", "Determinants", "Trigonometric Functions & Equations", "Straight Lines", "Conic Sections", "Limits, Continuity & Differentiability", "Differentiation", "Application of Derivatives", "Indefinite Integrals", "Definite Integrals & Applications", "Differential Equations", "Vectors", "3D Geometry", "Probability", "Statistics"],
  Biology: ["Diversity in Living World", "Structural Organisation in Animals & Plants", "Cell Structure & Function", "Plant Physiology", "Human Physiology", "Reproduction", "Genetics & Evolution", "Biology & Human Welfare", "Biotechnology & Its Applications", "Ecology & Environment"],
};

export const EXAM_SUBJECTS = {
  "JEE Main": ["Physics", "Chemistry", "Maths"],
  "JEE Advanced": ["Physics", "Chemistry", "Maths"],
  "NEET": ["Physics", "Chemistry", "Biology"],
  "Both": ["Physics", "Chemistry", "Maths", "Biology"],
  "Custom": [],
};

export const EXAM_LABELS = { "JEE Main": "JEE Main", "JEE Advanced": "JEE Advanced", NEET: "NEET", Both: "JEE + NEET", Custom: "Custom" };

// Calendar math used by the presets below — all local-date safe.
function firstSundayOfMay(year) {
  const d = new Date(year, 4, 1);
  const offset = (7 - d.getDay()) % 7;
  return todayStr(new Date(year, 4, 1 + offset));
}
function thirdSundayOfMay(year) {
  const d = new Date(year, 4, 1);
  const offset = (7 - d.getDay()) % 7;
  return todayStr(new Date(year, 4, 1 + offset + 14));
}

// Year-rolling target-date presets for onboarding, derived from documented
// windows rather than hardcoded years:
//   JEE Main      S1 late Jan (Jan 21–30), S2 early Apr (Apr 1–10)
//   JEE Advanced  3rd Sunday of May
//   NEET          1st Sunday of May
// For each rule, the next calendar years are generated and only future dates
// are returned (sorted), so the list never goes stale and never needs a
// manual edit. Deterministic: the same reference date always yields the same
// presets. `from` defaults to today; pass a Date for tests.
export function examPresetsFor(exam, from = new Date()) {
  const rules = {
    "JEE Main": [
      { label: (y) => `Jan ${y} · Session 1`, date: (y) => `${y}-01-30`, basis: "late Jan window (past: Jan 21–30)" },
      { label: (y) => `Apr ${y} · Session 2`, date: (y) => `${y}-04-05`, basis: "early Apr window (past: Apr 1–10)" },
    ],
    "JEE Advanced": [
      { label: (y) => `May ${y}`, date: (y) => thirdSundayOfMay(y), basis: "3rd Sunday of May (past: May 17)" },
    ],
    NEET: [
      { label: (y) => `May ${y}`, date: (y) => firstSundayOfMay(y), basis: "1st Sunday of May (past: May 3)" },
    ],
    Both: [
      { label: (y) => `JEE Main · Jan ${y}`, date: (y) => `${y}-01-30`, basis: "late Jan window (past: Jan 21–30)" },
      { label: (y) => `JEE Main · Apr ${y}`, date: (y) => `${y}-04-05`, basis: "early Apr window (past: Apr 1–10)" },
      { label: (y) => `NEET · May ${y}`, date: (y) => firstSundayOfMay(y), basis: "1st Sunday of May (past: May 3)" },
      { label: (y) => `JEE Adv · May ${y}`, date: (y) => thirdSundayOfMay(y), basis: "3rd Sunday of May (past: May 17)" },
    ],
    Custom: [],
  };
  const y0 = from.getFullYear();
  const today = todayStr(from);
  const out = [];
  for (const r of rules[exam] || []) {
    for (const y of [y0, y0 + 1]) {
      const date = r.date(y);
      if (date > today) out.push({ date, label: r.label(y), basis: r.basis });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}

// Seed a fresh syllabus from the default catalog for the user's subjects,
// bulk-marking already-covered chapters as done. Mirrors the manual
// done-transition contract (doneDate today, revisionStage 0, nextReview
// firstReviewDays out) so the "Already studied?" step lands in the same
// review pipeline as chapters done by hand. One patch through the normal
// syllabus persistence path — no separate storage system.
export function buildInitialSyllabus(subjects, covered = {}, { today = todayStr(), firstReviewDays = 1 } = {}) {
  const syl = {};
  for (const sub of subjects) {
    const doneNames = covered[sub] || [];
    syl[sub] = (DEFAULT_SYLLABUS[sub] || []).map((name) => {
      const done = doneNames.includes(name);
      return {
        id: uid(),
        name,
        status: done ? "done" : "todo",
        confidence: 0,
        pyq: 0,
        module: 0,
        theory: false,
        examples: false,
        doneDate: done ? today : null,
        revisionStage: done ? 0 : -1,
        nextRevision: done ? addDays(today, firstReviewDays) : null,
        notes: "",
      };
    });
  }
  return syl;
}


