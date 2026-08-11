const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const st = src.indexOf("function SettingsTab");
const seg = src.slice(st, st + 120000);

console.log("=== SettingsTab top-level consts (before return) ===");
const top = seg.slice(0, seg.indexOf("return ("));
const m = top.match(/const (\w+) = \{[\s\S]{0,700}?\};/g);
if (m) for (const x of m) console.log("  " + x.replace(/\s+/g, " ").slice(0, 700));
console.log("=== reminders UI block ===");
for (const mm of seg.matchAll(/reminders[\s\S]{0,600}?<\/Row>/g)) {
  const t = mm[0].replace(/\s+/g, " ");
  if (/remind|check|time|study|review|targets/.test(t) && t.length < 650) console.log("  " + t.slice(0, 600));
}
console.log("=== landing page / defaultView block ===");
for (const mm of seg.matchAll(/landingPage|defaultView[\s\S]{0,600}?<\/Row>/g)) {
  const t = mm[0].replace(/\s+/g, " ");
  console.log("  " + t.slice(0, 600));
}
