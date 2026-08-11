const fs = require("fs");
const app = fs.readFileSync("src/App.jsx", "utf8");

console.log("=== EXAM_SUBJECTS usages ===");
for (const m of app.matchAll(/EXAM_SUBJECTS[\s\S]{0,200}/g)) console.log("  " + m[0].replace(/\s+/g, " ").slice(0, 220));
console.log("=== DEFAULT_SYLLABUS usage ===");
for (const m of app.matchAll(/DEFAULT_SYLLABUS[\s\S]{0,260}/g)) console.log("  " + m[0].replace(/\s+/g, " ").slice(0, 300));
console.log("=== subjects strings used in app ===");
const subs = new Set();
for (const m of app.matchAll(/["'](Physics|Chemistry|Maths|Biology|Math|English|Custom)["']/g)) subs.add(m[1]);
console.log([...subs].join(", "));
console.log("=== Onboarding exam options block ===");
const o = app.indexOf("function Onboarding");
const seg = app.slice(o, o + 120000);
const mm = seg.match(/EXAM_SUBJECTS[\s\S]{0,700}/);
console.log(mm ? mm[0].replace(/\s+/g, " ").slice(0, 700) : "(none)");
console.log("=== 'Both' / 'JEE + NEET' handling ===");
for (const m of app.matchAll(/.{0,60}JEE[\s\S]{0,120}/g)) {
  const t = m[0].replace(/\s+/g, " ");
  if (/NEET|Both|Main/.test(t)) console.log("  " + t.slice(0, 180));
}
