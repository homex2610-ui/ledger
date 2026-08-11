const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const st = src.indexOf("function SettingsTab");
const seg = src.slice(st, st + 120000);

console.log("=== where DEFAULT_SETTINGS-like defaults appear in SettingsTab (all setSettings writes w/ sub-obj keys) ===");
const keys = new Set();
for (const m of seg.matchAll(/setSettings\(s => \(\{ \.\.\.s, (\w+):/g)) keys.add(m[1]);
console.log([...keys].sort().join(", "));
console.log("=== sub-object writes: coverage/recall/tests/mistakes/dashboard/reminders/sound ===");
for (const sub of ["coverage", "recall", "tests", "mistakes", "dashboard", "reminders", "sound"]) {
  const m = seg.match(new RegExp("setSettings\\(s => \\(\\.\\.\\.s, " + sub + ": \\{[\s\S]{0,120}?\\}\\)\\)", "g"));
  if (m) for (const x of m) console.log("  [" + sub + "] " + x.replace(/\s+/g, " ").slice(0, 130));
}
console.log("=== seg option lists in SettingsTab (top-level consts before return) ===");
const top = seg.slice(0, seg.indexOf("return ("));
for (const m of top.matchAll(/const (\w+) = \[[\s\S]{0,500}?\];/g)) {
  const t = m[0].replace(/\s+/g, " ");
  if (/option|label|value|seg|o\.label|o\.v/.test(t) && t.length < 600) console.log("  " + t.slice(0, 500));
}
