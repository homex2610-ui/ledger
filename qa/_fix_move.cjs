const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const lines = src.split("\n");

console.log("=== find 'panel carousel' ===");
lines.forEach((l, i) => { if (l.includes("panel carousel") || l.includes("dashboard is ONE continuous")) console.log(i + 1 + ": " + l.trim()); });
console.log("=== find 'return (' in Dashboard ===");
let inDash = false;
lines.forEach((l, i) => {
  if (l.includes("function Dashboard")) inDash = true;
  if (inDash && l.trim() === "return (") console.log(i + 1 + ": " + l);
});
console.log("=== find 'workspaces' comment ===");
lines.forEach((l, i) => { if (l.includes("workspaces") && l.includes("render above")) console.log(i + 1 + ": " + l.trim()); });