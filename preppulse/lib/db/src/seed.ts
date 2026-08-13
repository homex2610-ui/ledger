import { db } from "./index";
import { topicsTable } from "./schema";

type Weightage = "low" | "medium" | "high";

interface CatalogTopic {
  subject: string;
  chapter: string;
  name: string;
  weightage: Weightage;
  prerequisites?: string[];
}

// JEE Main-oriented syllabus catalog. Chapter grouping + prerequisites power
// the Syllabus/Coverage tracker (locked/todo/in-progress/done states).
const catalog: CatalogTopic[] = [
  // Physics
  { subject: "Physics", chapter: "Mechanics", name: "Kinematics", weightage: "high" },
  { subject: "Physics", chapter: "Mechanics", name: "Newton's Laws of Motion", weightage: "high", prerequisites: ["Kinematics"] },
  { subject: "Physics", chapter: "Mechanics", name: "Work, Power & Energy", weightage: "medium", prerequisites: ["Newton's Laws of Motion"] },
  { subject: "Physics", chapter: "Mechanics", name: "Rotational Motion", weightage: "high", prerequisites: ["Newton's Laws of Motion"] },
  { subject: "Physics", chapter: "Mechanics", name: "Gravitation", weightage: "medium", prerequisites: ["Rotational Motion"] },
  { subject: "Physics", chapter: "Thermal Physics", name: "Thermal Properties of Matter", weightage: "low" },
  { subject: "Physics", chapter: "Thermal Physics", name: "Thermodynamics", weightage: "medium", prerequisites: ["Thermal Properties of Matter"] },
  { subject: "Physics", chapter: "Oscillations & Waves", name: "Simple Harmonic Motion", weightage: "medium" },
  { subject: "Physics", chapter: "Oscillations & Waves", name: "Waves", weightage: "medium", prerequisites: ["Simple Harmonic Motion"] },
  { subject: "Physics", chapter: "Electrostatics", name: "Electrostatics", weightage: "high" },
  { subject: "Physics", chapter: "Current Electricity", name: "Current Electricity", weightage: "medium", prerequisites: ["Electrostatics"] },
  { subject: "Physics", chapter: "Magnetism", name: "Magnetism & Magnetic Effects", weightage: "medium", prerequisites: ["Current Electricity"] },
  { subject: "Physics", chapter: "Magnetism", name: "Electromagnetic Induction", weightage: "medium", prerequisites: ["Magnetism & Magnetic Effects"] },
  { subject: "Physics", chapter: "Optics", name: "Ray Optics", weightage: "high", prerequisites: ["Waves"] },
  { subject: "Physics", chapter: "Optics", name: "Wave Optics", weightage: "medium", prerequisites: ["Ray Optics"] },
  { subject: "Physics", chapter: "Modern Physics", name: "Dual Nature of Radiation", weightage: "medium" },
  { subject: "Physics", chapter: "Modern Physics", name: "Atoms & Nuclei", weightage: "low", prerequisites: ["Dual Nature of Radiation"] },

  // Chemistry — Physical
  { subject: "Chemistry", chapter: "Physical Chemistry", name: "Mole Concept", weightage: "medium" },
  { subject: "Chemistry", chapter: "Physical Chemistry", name: "Atomic Structure", weightage: "medium", prerequisites: ["Mole Concept"] },
  { subject: "Chemistry", chapter: "Physical Chemistry", name: "Chemical Bonding", weightage: "medium", prerequisites: ["Atomic Structure"] },
  { subject: "Chemistry", chapter: "Physical Chemistry", name: "Thermodynamics", weightage: "high", prerequisites: ["Mole Concept"] },
  { subject: "Chemistry", chapter: "Physical Chemistry", name: "Equilibrium", weightage: "high", prerequisites: ["Thermodynamics"] },
  { subject: "Chemistry", chapter: "Physical Chemistry", name: "Chemical Kinetics", weightage: "high", prerequisites: ["Equilibrium"] },
  { subject: "Chemistry", chapter: "Physical Chemistry", name: "Electrochemistry", weightage: "medium", prerequisites: ["Chemical Kinetics"] },

  // Chemistry — Organic
  { subject: "Chemistry", chapter: "Organic Chemistry", name: "General Organic Chemistry", weightage: "high" },
  { subject: "Chemistry", chapter: "Organic Chemistry", name: "Hydrocarbons", weightage: "medium", prerequisites: ["General Organic Chemistry"] },
  { subject: "Chemistry", chapter: "Organic Chemistry", name: "Aldehydes, Ketones & Acids", weightage: "medium", prerequisites: ["Hydrocarbons"] },
  { subject: "Chemistry", chapter: "Organic Chemistry", name: "Amines", weightage: "low", prerequisites: ["Aldehydes, Ketones & Acids"] },
  { subject: "Chemistry", chapter: "Organic Chemistry", name: "Biomolecules", weightage: "low", prerequisites: ["Aldehydes, Ketones & Acids"] },

  // Chemistry — Inorganic
  { subject: "Chemistry", chapter: "Inorganic Chemistry", name: "Periodic Table & Periodicity", weightage: "medium" },
  { subject: "Chemistry", chapter: "Inorganic Chemistry", name: "s-Block Elements", weightage: "low", prerequisites: ["Periodic Table & Periodicity"] },
  { subject: "Chemistry", chapter: "Inorganic Chemistry", name: "p-Block Elements", weightage: "low", prerequisites: ["Periodic Table & Periodicity"] },
  { subject: "Chemistry", chapter: "Inorganic Chemistry", name: "Coordination Compounds", weightage: "medium", prerequisites: ["Chemical Bonding"] },

  // Mathematics — Algebra
  { subject: "Mathematics", chapter: "Algebra", name: "Functions", weightage: "medium" },
  { subject: "Mathematics", chapter: "Algebra", name: "Quadratic Equations", weightage: "medium", prerequisites: ["Functions"] },
  { subject: "Mathematics", chapter: "Algebra", name: "Complex Numbers", weightage: "high", prerequisites: ["Quadratic Equations"] },
  { subject: "Mathematics", chapter: "Algebra", name: "Sequences & Series", weightage: "medium" },
  { subject: "Mathematics", chapter: "Algebra", name: "Permutations & Combinations", weightage: "medium" },
  { subject: "Mathematics", chapter: "Algebra", name: "Binomial Theorem", weightage: "low", prerequisites: ["Permutations & Combinations"] },

  // Mathematics — Calculus
  { subject: "Mathematics", chapter: "Calculus", name: "Limits & Continuity", weightage: "high" },
  { subject: "Mathematics", chapter: "Calculus", name: "Differentiation", weightage: "high", prerequisites: ["Limits & Continuity"] },
  { subject: "Mathematics", chapter: "Calculus", name: "Applications of Derivatives", weightage: "medium", prerequisites: ["Differentiation"] },
  { subject: "Mathematics", chapter: "Calculus", name: "Indefinite Integrals", weightage: "medium", prerequisites: ["Differentiation"] },
  { subject: "Mathematics", chapter: "Calculus", name: "Definite Integrals", weightage: "high", prerequisites: ["Indefinite Integrals"] },
  { subject: "Mathematics", chapter: "Calculus", name: "Differential Equations", weightage: "medium", prerequisites: ["Definite Integrals"] },

  // Mathematics — Geometry
  { subject: "Mathematics", chapter: "Geometry", name: "Vectors & 3D Geometry", weightage: "high" },
  { subject: "Mathematics", chapter: "Geometry", name: "Straight Lines", weightage: "low", prerequisites: ["Vectors & 3D Geometry"] },
  { subject: "Mathematics", chapter: "Geometry", name: "Circles", weightage: "low", prerequisites: ["Straight Lines"] },
  { subject: "Mathematics", chapter: "Geometry", name: "Conic Sections", weightage: "high", prerequisites: ["Circles"] },
];

const chaptersBySubject = new Map<string, string[]>();
for (const topic of catalog) {
  const chapters = chaptersBySubject.get(topic.subject) ?? [];
  if (!chapters.includes(topic.chapter)) chapters.push(topic.chapter);
  chaptersBySubject.set(topic.subject, chapters);
}

for (const topic of catalog) {
  topic.prerequisites ??= [];
}

async function main() {
  const existing = await db.select({ subject: topicsTable.subject, chapter: topicsTable.chapter, name: topicsTable.name, sortOrder: topicsTable.sortOrder }).from(topicsTable);
  const existingKeys = new Set(existing.map((row) => `${row.subject}|${row.chapter}|${row.name}`));
  let nextSortOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder), 0);

  const rows = catalog
    .filter((topic) => !existingKeys.has(`${topic.subject}|${topic.chapter}|${topic.name}`))
    .map((topic) => ({ ...topic, sortOrder: ++nextSortOrder }));

  if (rows.length) {
    await db.insert(topicsTable).values(rows);
  }
  console.log(`Seeded ${rows.length} topics (${catalog.length} in catalog)`);
  for (const [subject, chapters] of chaptersBySubject) {
    console.log(`  ${subject}: ${chapters.join(", ")}`);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
