const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const th = fs.readFileSync("src/lib/theme.js", "utf8");

console.log("=== THEME_PRESETS keys ===");
console.log([...th.matchAll(/^[ \t]{2}"(\w+)": \{/gm)].map(m => m[1]).join(", "));
console.log("=== 'verdigris' preset? ===");
console.log(th.includes('"verdigris"'));
console.log("=== settings.theme usage in App ===");
for (const m of src.matchAll(/.{0,70}settings\.theme.{0,70}/g)) console.log("  " + m[0].replace(/\s+/g, " "));
console.log("=== <Timer usage ===");
for (const m of src.matchAll(/<Timer[\s\S]{0,60}/g)) console.log("  " + m[0].replace(/\s+/g, " ").slice(0, 90));
console.log("=== Maths vs Mathematics ===");
console.log("Maths:", (src.match(/"Maths"/g) || []).length, "| Mathematics:", (src.match(/"Mathematics"/g) || []).length);
console.log("=== density options ===");
for (const m of src.matchAll(/density[\s\S]{0,200}/g)) {
  const t = m[0].replace(/\s+/g, " ");
  if (/option|label|v:|compact|comfortable/.test(t)) console.log("  " + t.slice(0, 220));
}
console.log("=== 'Not started' present? ===");
console.log(src.includes('"Not started"'));
console.log("=== rev: interval hints ===");
for (const m of src.matchAll(/D\+\d|interval \d+/g)) console.log("  " + m[0]);
console.log("=== applyTheme usage ===");
for (const m of src.matchAll(/.{0,60}applyTheme.{0,80}/g)) console.log("  " + m[0].replace(/\s+/g, " "));
console.log("=== countdownAccent in THEME_PRESETS ===");
const vi = th.indexOf('"verdigris"');
console.log(vi >= 0 ? th.slice(vi - 40, vi + 700).replace(/\s+/g, " ").slice(0, 720) : "(no verdigris)");
