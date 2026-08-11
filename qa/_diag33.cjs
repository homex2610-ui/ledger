const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");

console.log("=== settings.progress / settings.order at App level ===");
for (const k of ["progress", "order"]) {
  for (const m of src.matchAll(new RegExp(".{0,90}settings\\." + k + "\\b.{0,60}", "g"))) {
    const t = m[0].replace(/\s+/g, " ");
    if (/progress|order/.test(t)) console.log("  " + t.slice(0, 160));
  }
}
console.log("=== where are components rendered with settings sub-objects ===");
for (const m of src.matchAll(/settings=\{settings\.(\w+)\}/g)) console.log("  settings." + m[1]);
console.log("=== toggles in Settings tab writing settings.dashboard ===");
const st = src.indexOf("function SettingsTab");
const seg = src.slice(st, st + 90000);
for (const m of seg.matchAll(/setSettings\(s => \(\{ \.\.\.s, (dashboard:[\s\S]{0,120}?})\}\)/g)) console.log("  " + m[1].replace(/\s+/g, " ").slice(0, 150));
const toggles = new Set();
for (const m of seg.matchAll(/checked=\{settings\.dashboard\.(\w+)/g)) toggles.add(m[1]);
console.log("dashboard toggles:", [...toggles].join(", "));
console.log("=== landing page select options ===");
for (const m of seg.matchAll(/landingPage[\s\S]{0,300}/g)) {
  const t = m[0].replace(/\s+/g, " ");
  if (/option|label|Select|v:/.test(t)) console.log("  " + t.slice(0, 300));
}
console.log("=== density options ===");
for (const m of seg.matchAll(/DENSITY|density[\s\S]{0,200}/g)) {
  const t = m[0].replace(/\s+/g, " ");
  if (/option|label|v:|compact|comfortable/.test(t)) console.log("  " + t.slice(0, 220));
}
