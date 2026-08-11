const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const l = src.split("\n");

console.log("=== definitions of suspect local components in surviving file ===");
for (const name of ["Input", "Panel", "Row", "Toggle", "Bubble", "Icon", "TimerIcon", "MiniStat", "PageHead", "SelectBox", "Btn", "Input", "DAILY_GOAL_MIN", "dppStreak", "countdownAccent", "Chip", "Badge"]) {
  const re = new RegExp("(export )?(function|const) " + name + "\\b");
  const m = src.match(re);
  console.log((m ? m[0] : "MISSING") + "  <- " + name);
}
console.log("=== head-tail check: what's between StatusBubble return and Card? ===");
console.log(l.slice(0, 18).map((x, i) => i + ": " + x).join("\n"));
console.log("=== does anything use STATUS_LABEL beyond bubble? statuses seen ===");
console.log([...new Set(src.match(/status[:=]["'](\w+)["']/g))].slice(0, 12).join(", "));
console.log("=== ProgressRing status handling (canonical statuses/colors) ===");
const pr = fs.readFileSync("src/components/ui/ProgressRing.jsx", "utf8");
console.log(pr.match(/[^\n]*[Ss]tatus[^\n]*/g).slice(0, 10).join("\n"));
console.log("=== ringSegments.js ===");
console.log(fs.readFileSync("src/lib/ringSegments.js", "utf8"));
