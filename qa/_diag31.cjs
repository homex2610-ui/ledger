const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");

console.log("=== computeXP / computeBadges + LEVELS/BADGES usage ===");
const xp = src.indexOf("function computeXP");
console.log(src.slice(xp, xp + 900));
console.log("=== LEVELS/BADGES refs in surviving file ===");
for (const m of src.matchAll(/.{0,60}(LEVELS|BADGES).{0,60}/g)) console.log("  " + m[0].replace(/\s+/g, " ").slice(0, 130));
console.log("=== PRIORITY_ORDER/LABEL/COLORS full context ===");
const pr = src.indexOf("PRIO_OPTS");
console.log(src.slice(pr - 400, pr + 200));
console.log("=== TaskPanel priority colors usage ===");
const tp = src.indexOf("function TaskPanel");
console.log(src.slice(tp, tp + 1200));
