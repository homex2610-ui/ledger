const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");

console.log("=== flags default object in Dashboard ===");
const m = src.match(/const flags = \{[\s\S]{0,300}\};/);
console.log(m ? m[0] : "(none)");
console.log("=== ERROR_COLORS def location ===");
const ec = src.indexOf("const ERROR_COLORS");
console.log(ec, src.slice(ec, ec + 200));
console.log("=== Syllabus settings reads ===");
const sy = src.indexOf("function Syllabus");
if (sy >= 0) {
  const seg = src.slice(sy, sy + 30000);
  const ks = new Set();
  for (const mm of seg.matchAll(/settings\.(\w+)/g)) ks.add(mm[1]);
  console.log("Syllabus settings keys:", [...ks].sort().join(", "));
  for (const k of ks) {
    const mm = seg.match(new RegExp("settings\\." + k + "[^;]{0,50}"));
    if (mm) console.log("  " + k + ": " + mm[0].replace(/\s+/g, " ").slice(0, 90));
  }
}
console.log("=== RecallDeck settings reads ===");
const rd = src.indexOf("function RecallDeck");
if (rd >= 0) {
  const seg = src.slice(rd, rd + 20000);
  for (const mm of seg.matchAll(/settings\.(\w+)/g)) console.log("  recall." + mm[1]);
}
console.log("=== Mocks settings reads ===");
const mk = src.indexOf("function Mocks");
if (mk >= 0) {
  const seg = src.slice(mk, mk + 15000);
  for (const mm of seg.matchAll(/settings\.(\w+)/g)) console.log("  mocks." + mm[1]);
}
console.log("=== ErrorLog settings reads ===");
const el = src.indexOf("function ErrorLog");
if (el >= 0) {
  const seg = src.slice(el, el + 12000);
  for (const mm of seg.matchAll(/settings\.(\w+)/g)) console.log("  errors." + mm[1]);
}
