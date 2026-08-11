const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const st = src.indexOf("function SettingsTab");
const seg = src.slice(st, st + 120000);
console.log("=== SettingsTab first 500 chars ===");
console.log(seg.slice(0, 500));
console.log("=== search for accent/wallpaper/sound in SettingsTab ===");
for (const m of seg.matchAll(/accent|wallpaper|sound|reminders|landingPage|defaultFocusMin|autoStartBreaks|newPerDay|defaultView|dashboard|coverage|recall|tests|mistakes/g)) {
  console.log("  " + m[0]);
}