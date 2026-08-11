const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const th = fs.readFileSync("src/lib/theme.js", "utf8");

console.log("=== XP_PER_LEVEL / LEVEL_TITLES refs ===");
for (const n of ["XP_PER_LEVEL", "LEVEL_TITLES"]) {
  for (const m of src.matchAll(new RegExp(".{0,70}\\b" + n + "\\b.{0,70}", "g"))) console.log("  [" + n + "] " + m[0].replace(/\s+/g, " ").slice(0, 150));
}
console.log("=== cycleStatus fn ===");
const cs = src.indexOf("cycleStatus");
console.log(src.slice(cs - 100, cs + 400));
console.log("=== dateFormat options in settings ===");
const st = src.indexOf("function SettingsTab");
const seg = src.slice(st, st + 60000);
const fm = seg.match(/dateFormat[\s\S]{0,400}/g);
console.log(fm ? fm[0].replace(/\s+/g, " ").slice(0, 420) : "(none)");
console.log("=== COLORS full keys ===");
const ck = th.match(/COLORS = \{[\s\S]{0,900}/);
console.log(ck ? ck[0].replace(/\s+/g, " ").slice(0, 900) : "(none)");
