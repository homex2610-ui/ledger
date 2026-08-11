const fs = require("fs");
const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
console.log("=== deps ===");
console.log(Object.keys(p.dependencies || {}).join(", "));
console.log("=== devDeps ===");
console.log(Object.keys(p.devDependencies || {}).join(", "));

const src = fs.readFileSync("src/App.jsx", "utf8");
console.log("=== STATUS_LABEL usages in surviving code ===");
for (const m of src.matchAll(/.{0,60}STATUS_LABEL.{0,50}/g)) console.log("  " + m[0].replace(/\s+/g, " "));
console.log("=== colorMap usages ===");
for (const m of src.matchAll(/.{0,60}colorMap.{0,50}/g)) console.log("  " + m[0].replace(/\s+/g, " "));
console.log("=== fmtDateStr usages ===");
for (const m of src.matchAll(/.{0,60}fmtDateStr.{0,50}/g)) console.log("  " + m[0].replace(/\s+/g, " "));
console.log("=== STATUS_ORDER location ===");
const so = src.match(/STATUS_ORDER[^\n]*/g);
console.log(so ? so.join("\n") : "(not in surviving file)");
console.log("=== ThemeProvider search across src ===");
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(d + "/" + e.name) : [d + "/" + e.name]);
for (const f of walk("src")) {
  if (f.endsWith(".jsx") || f.endsWith(".js")) {
    const t = fs.readFileSync(f, "utf8");
    if (t.includes("ThemeProvider")) console.log("  " + f + ": " + (t.match(/ThemeProvider/g) || []).length + "x");
  }
}
console.log("=== first surviving lines with surrounding context (where StatusBubble starts) ===");
console.log("=== Header.jsx imports (canonical import style) ===");
console.log(fs.readFileSync("src/components/layout/Header.jsx", "utf8").split("\n").slice(0, 12).join("\n"));
