const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");

console.log("=== SettingsTab dashboard toggles ===");
const st = src.indexOf("function SettingsTab");
const seg = src.slice(st, src.indexOf("function Workspace"));
for (const m of seg.matchAll(/.{0,30}(dashboard|clock|countdown|studied|workspaces|week|year grid|subjects|status|Now|now)["':].{0,80}/gi)) {
  const t = m[0].replace(/\s+/g, " ");
  if (/settings|setSettings|dashboard|flag/i.test(t) && t.length < 160) console.log("  " + t);
}
console.log("=== dashboard key names used in setSettings for dashboard ===");
for (const m of src.matchAll(/dashboard:\s*\{[\s\S]{0,400}/g)) { console.log(m[0].slice(0, 420)); break; }
for (const m of src.matchAll(/\.\.\.s\.dashboard,\s*(\w+):\s*(!?[a-z]+)/g)) console.log("  toggle: " + m[1] + " = " + m[2]);
console.log("=== EXAM_SUBJECTS keys ===");
for (const m of src.matchAll(/EXAM_SUBJECTS\s*=\s*\{[\s\S]{0,300}/g)) console.log(m[0].slice(0, 320));
console.log("=== profile subjects / syllabus initialization full ===");
const p = src.indexOf("profile.subjects.forEach");
console.log(src.slice(p - 400, p + 400));
