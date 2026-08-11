const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const spec = fs.readFileSync("qa/ledger.spec.js", "utf8");

console.log("=== date format options in settings (seg/select) ===");
const st = src.indexOf("function SettingsTab");
const seg = src.slice(st, st + 90000);
for (const m of seg.matchAll(/dateFormat[\s\S]{0,200}/g)) {
  const t = m[0].replace(/\s+/g, " ").slice(0, 200);
  if (/compact|option|label|Select|v:|Month|month/.test(t)) console.log("  " + t);
}
console.log("=== clockStyle options ===");
for (const m of seg.matchAll(/clockStyle[\s\S]{0,260}/g)) {
  const t = m[0].replace(/\s+/g, " ").slice(0, 260);
  if (/option|label|Select|v:|digital|analog/.test(t)) console.log("  " + t);
}
console.log("=== revisionStage writes ===");
for (const m of src.matchAll(/.{0,80}revisionStage.{0,80}/g)) console.log("  " + m[0].replace(/\s+/g, " ").slice(0, 170));
console.log("=== ERROR_COLORS / error kinds ===");
for (const m of src.matchAll(/.{0,50}ERROR_COLORS.{0,60}/g)) console.log("  " + m[0].replace(/\s+/g, " "));
for (const m of src.matchAll(/["'](Conceptual|Calculative|Silly|Misread)["']/g)) console.log("  kind: " + m[1]);
console.log("=== spec: MON, AUG or hairline checks ===");
for (const m of spec.matchAll(/MON|AUG|dateStr|hairline|MONDAY/g)) { }
const hi = spec.indexOf("hairline");
console.log(hi >= 0 ? spec.slice(hi - 200, hi + 300) : "(no hairline check)");
console.log("=== chipLabel region (statuses) ===");
const cl = src.indexOf("chipLabel = {");
console.log(src.slice(cl - 200, cl + 260));
