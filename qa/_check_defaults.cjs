const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const lines = src.split("\n");
console.log("=== DEFAULT_SETTINGS theme ===");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("DEFAULT_SETTINGS")) {
    console.log((i + 1) + ": " + lines[i].trim());
    // print next 20 lines
    for (let j = i; j < i + 30; j++) console.log((j + 1) + ": " + lines[j].trim());
    break;
  }
}