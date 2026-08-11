const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");

console.log("=== THEME_PRESETS keys ===");
const th = fs.readFileSync("src/lib/theme.js", "utf8");
const tk = th.match(/THEME_PRESETS\s*=\s*\{[\s\S]{0,700}/);
console.log(tk ? tk[0].replace(/\s+/g, " ").slice(0, 750) : "(none)");
console.log("=== WallpaperLayer modes ===");
const wl = fs.readFileSync("src/components/ui/WallpaperLayer.jsx", "utf8");
console.log(wl.split("\n").filter(x => /mode|nebula|aura|"none"|===/.test(x)).slice(0, 15).join("\n"));
console.log("=== CLOCK_STYLES ===");
const cs = src.match(/CLOCK_STYLES[\s\S]{0,320}/);
console.log(cs ? cs[0].slice(0, 350) : "(none)");
