const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");

const checks = ["DEFAULT_SETTINGS", "DEFAULT_SYLLABUS", "EXAM_SUBJECTS", "PRIORITY_ORDER", "PRIORITY_LABEL", "PRIORITY_COLORS", "REVISION_INTERVALS", "LEVELS", "BADGES", "LONG_BREAK_MIN", "DASHBOARD", "YEAR", "GRID", "CLOCK", "STYLES", "ACTIVE", "GOALS", "FLAGS", "SM", "TimerIcon", "fmtDateStr", "StatusBubble", "Bubble"];
for (const n of checks) {
  const re = new RegExp("\\b" + n + "\\b", "g");
  const uses = src.match(re);
  const hits = [];
  if (uses) {
    const re2 = new RegExp(".{0,70}\\b" + n + "\\b.{0,90}", "g");
    let m;
    while ((m = re2.exec(src)) && hits.length < 3) hits.push(m[0].replace(/\s+/g, " "));
  }
  console.log("=== " + n + " (" + (uses ? uses.length : 0) + " uses) ===");
  for (const h of hits) console.log("  " + h);
}
