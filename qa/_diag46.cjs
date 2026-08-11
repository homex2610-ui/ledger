const fs = require("fs");
const app = fs.readFileSync("src/App.jsx", "utf8");

console.log("=== initSyll context (DEFAULT_SYLLABUS init) ===");
const i = app.indexOf("DEFAULT_SYLLABUS[sub]");
console.log(app.slice(i - 700, i + 200).replace(/\n\s*/g, "\n  "));
console.log("=== subjects for each exam: check EXAM_SUBJECTS[exam] content expectation — look at what subjects render in onboarding ===");
const o = app.indexOf("function Onboarding");
const seg = app.slice(o, o + 60000);
const ms = seg.match(/subjects[^;]{0,300}/g);
if (ms) for (const x of ms.slice(0, 8)) console.log("  " + x.replace(/\s+/g, " ").slice(0, 320));
console.log("=== Default profile / default exam subjects in e2e spec ===");
const fs2 = require("fs");
for (const f of ["ledger.spec.js", "ledger-e2e.spec.js"]) {
  const p = "qa/" + f;
  if (fs2.existsSync(p)) {
    const t = fs2.readFileSync(p, "utf8");
    const ms2 = t.match(/Physics[^\n]{0,150}/g);
    console.log("  [" + f + "] " + (ms2 ? ms2.join("\n  ") : "(no Physics refs)"));
  }
}
