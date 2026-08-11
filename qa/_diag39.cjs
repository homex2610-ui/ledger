const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const st = src.indexOf("function SettingsTab");
const seg = src.slice(st, st + 400000);
const lines = seg.split("\n");

console.log("=== SettingsTab lines 350-520 raw ===");
for (let i = 349; i < 520 && i < lines.length; i++) console.log((i + 1) + ": " + lines[i]);
