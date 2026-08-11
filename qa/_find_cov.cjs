const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const lines = src.split("\n");
lines.forEach((l, i) => {
  if (l.includes("Coverage") && (l.includes("tab") || l.includes("function") || l.includes("component") || l.includes("view") || l.includes("===") || l.includes("title"))) {
    console.log((i + 1) + ": " + l.trim());
  }
});