const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const keys = ["accent === \"default\"", "settings.rail", "settings.radius", "settings.glow", "settings.fontScale", "settings.highContrast", "settings.focusRing", "settings.weekStart", "settings.goalStatus", "settings.tests.scoreUnit", "settings.tests.showTrend", "settings.tests.showSubjectBars", "settings.tests.showGaps", "settings.mistakes.filter", "settings.mistakes.sort", "settings.mistakes.severitySort", "settings.mistakes.remind", "settings.recall.goal", "settings.recall.order", "settings.recall.goalDot", "settings.coverage.defaultView", "settings.coverage.progress", "settings.coverage.showCompleted", "settings.coverage.showPrereqs", "settings.dashboard.countdown", "settings.dashboard.clock", "settings.dashboard.studied", "settings.dashboard.now", "settings.dashboard.year", "settings.dashboard.today", "settings.dashboard.subjects", "settings.dashboard.workspaces", "settings.dashboard.status"];
for (const k of keys) {
  const cnt = (src.match(new RegExp(k.replace(/\./g, "\\.").replace(/===/g, "==="), "g")) || []).length;
  if (cnt) console.log(k.padEnd(40) + cnt);
}
console.log("=== dateFormat usage ===");
for (const m of src.matchAll(/dateFormat[\s\S]{0,80}/g)) console.log("  " + m[0].replace(/\s+/g, " ").slice(0, 120));