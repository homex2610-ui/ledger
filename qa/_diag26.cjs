const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");

console.log("=== where DEFAULT_SETTINGS is used (load settings merge) ===");
for (const m of src.matchAll(/.{0,120}DEFAULT_SETTINGS.{0,120}/g)) console.log("  " + m[0].replace(/\s+/g, " ").slice(0, 200));
console.log("=== settings fields read (settings.X) with any default hints ===");
const readFields = new Set();
for (const m of src.matchAll(/settings\.([A-Za-z_]\w*)/g)) readFields.add(m[1]);
console.log([...readFields].sort().join(", "));
console.log("=== settings nested objects ===");
for (const m of src.matchAll(/settings\.(\w+)\.(\w+)/g)) console.log("  " + m[1] + "." + m[2]);
console.log("=== flags = settings.dashboard default in Dashboard ===");
const df = src.indexOf("...dashboardSettings");
console.log(src.slice(df - 300, df + 80));
console.log("=== settings.dashboard?.X reads ===");
for (const m of src.matchAll(/(?:settings\.dashboard|dashboardSettings)(?:\?)?\.(\w+)/g)) console.log("  " + m[1]);
console.log("=== appearance/clock reads ===");
for (const m of src.matchAll(/appearance\.(\w+)/g)) console.log("  appearance." + m[1]);
