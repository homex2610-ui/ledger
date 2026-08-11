const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const lines = src.split("\n");

console.log("=== search entire file for 'coverage' JSX (panel/section) ===");
lines.forEach((l, i) => {
  if (l.includes("flags.coverage") || l.includes("flags.week") || l.includes("flags.recall") || l.includes("flags.today") || l.includes("flags.subjects") || l.includes("flags.workspaces") || l.includes("flags.status")) {
    console.log((i + 1) + ": " + l.trim().slice(0, 180));
  }
});

console.log("=== search for 'flags.' usages in JSX (not const) ===");
lines.forEach((l, i) => {
  if (l.includes("flags.") && (l.includes("{") || l.includes("}") || l.includes("&&")) && !l.includes("const flags")) {
    console.log((i + 1) + ": " + l.trim().slice(0, 180));
  }
});