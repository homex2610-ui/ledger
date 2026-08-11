const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const lines = src.split("\n");

console.log("=== Workspace function - find tab state and GlobalSwipe usage ===");
let inWs = false;
let wsStart = 0;
lines.forEach((l, i) => {
  if (l.includes("function Workspace")) { inWs = true; wsStart = i; }
  if (inWs && i > wsStart + 50 && l.includes("function ") && !l.includes("function Workspace")) inWs = false;
  if (inWs && (l.includes("useState") && l.includes("tab"))) console.log((i + 1) + ": " + l.trim());
  if (inWs && (l.includes("setTab") || l.includes("GlobalSwipe") || l.includes("SWIPE_CHAIN") || l.includes("tab === "))) console.log((i + 1) + ": " + l.trim().slice(0, 180));
});