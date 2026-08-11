const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const lines = src.split("\n");
console.log("=== find end of Workspace function ===");
let inWs = false;
let wsEnd = 0;
lines.forEach((l, i) => {
  if (l.includes("function Workspace")) { inWs = true; }
  if (inWs && i > 1000 && l.trim() === "}" && !lines[i+1]?.includes("}")) { wsEnd = i; inWs = false; }
});
if (wsEnd) console.log("Workspace ends at line:", wsEnd + 1);
else console.log("Not found, checking last lines...");
for (let i = lines.length - 50; i < lines.length; i++) console.log((i + 1) + ": " + lines[i].trim().slice(0, 100));