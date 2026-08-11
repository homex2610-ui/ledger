const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const st = src.indexOf("function SettingsTab");
console.log("SettingsTab starts at line:", src.slice(0, st).split("\n").length);
console.log("SettingsTab first 200 chars:", src.slice(st, st + 200).replace(/\n/g, " "));