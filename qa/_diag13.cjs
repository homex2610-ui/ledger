const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");

console.log("=== full Icon ternary chain ===");
const i = src.indexOf("const Icon = w.id");
console.log(src.slice(i, i + 900));
console.log("=== all `icon: X` values ===");
for (const m of src.matchAll(/icon:\s*(\w+)/g)) console.log("  " + m[1]);
console.log("=== all icon-ish values in config arrays (dot notation refs) ===");
console.log("=== does surviving code use 'WALLPAPER_KEY'? ===");
console.log("=== Workspace tabs config (icons array) ===");
const tabs = src.match(/id:\s*"timer"[^]*?\]\s*\]\s*;/);
console.log(tabs ? tabs[0].slice(0, 1600) : "(not matched)");
