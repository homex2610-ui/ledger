const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");

console.log("=== settings.coverage/recall/tests/mistakes/progress/order/showCompleted/showPrereqs usage ===");
for (const k of ["coverage", "recall", "tests", "mistakes", "progress", "order", "showCompleted", "showPrereqs"]) {
  const re = new RegExp(".{0,55}\\bsettings\\." + k + "\\b.{0,60}", "g");
  let m; const hits = [];
  while ((m = re.exec(src)) && hits.length < 2) hits.push(m[0].replace(/\s+/g, " "));
  console.log("  [" + k + "] " + (hits.join(" || ") || "(none)"));
}
console.log("=== PieChart usage ===");
for (const m of src.matchAll(/<PieChart[\s\S]{0,300}/g)) { console.log(m[0].slice(0, 320)); break; }
console.log("=== Date format selector in settings ===");
for (const m of src.matchAll(/.{0,60}(Date format|date format|DATE FORMAT).{0,140}/g)) console.log("  " + m[0].replace(/\s+/g, " ").slice(0, 180));
console.log("=== 'compact' options near fmt ===");
for (const m of src.matchAll(/.{0,60}compact.{0,60}/g)) {
  const t = m[0].replace(/\s+/g, " ");
  if (/dateFormat|fmt|option|label|v:|"compact"/.test(t)) console.log("  " + t.slice(0, 140));
}
console.log("=== syllabus chapter names anywhere (look in qa + src) ===");
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(d + "/" + e.name) : [d + "/" + e.name]);
for (const f of walk(".").filter(f => /\.(jsx|js|mjs|json|md)$/.test(f) && !/node_modules|dist|test-results/.test(f))) {
  const t = fs.readFileSync(f, "utf8");
  if (/Laws of Motion|Thermodynamics|Chemical Bonding|Organic Chemistry|Calculus|Integral|Quadratic/.test(t)) {
    console.log("  hit: " + f);
  }
}
