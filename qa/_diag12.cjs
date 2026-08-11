const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const pan = fs.readFileSync("src/components/ui/Panels.jsx", "utf8");

console.log("=== Panels.jsx exports ===");
console.log([...pan.matchAll(/^export (?:default )?(?:function|const) (\w+)/gm)].map(m => "  " + m[1]).join("\n"));
console.log("=== Panels.jsx full (short) ===");
console.log(pan);
console.log("=== Icon def line (full) ===");
const i = src.indexOf("const Icon = ");
console.log(src.slice(i, i + 700));
console.log("=== WALLPAPER_KEY / clampAccentHex refs ===");
console.log((src.match(/WALLPAPER_KEY/g) || []).length, (src.match(/clampAccentHex/g) || []).length);
console.log("=== Timer / TimerIcon raw usages ===");
for (const m of src.matchAll(/\b(Timer|TimerIcon|TrendingUp|BookOpen)\b/g)) console.log("  " + m[0]);
console.log("=== STATUS_ORDER contexts ===");
for (const m of src.matchAll(/.{0,70}STATUS_ORDER.{0,50}/g)) console.log("  " + m[0].replace(/\s+/g, " "));
