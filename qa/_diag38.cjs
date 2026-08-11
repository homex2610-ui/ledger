const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const st = src.indexOf("function SettingsTab");
const seg = src.slice(st, st + 400000);

console.log("=== lines containing o.v or seg-item in SettingsTab (with context) ===");
const lines = seg.split("\n");
lines.forEach((l, i) => {
  if (/o\.v|seg-item|landingPage|defaultView|dateFormat|goals|newPerDay|goalDot/.test(l)) {
    console.log((i + 1) + ": " + l.trim().slice(0, 200));
  }
});
