const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const lines = src.split("\n");
lines.forEach((l, i) => {
  if (l.includes("lg-mini")) {
    console.log((i + 1) + ": " + l.trim().slice(0, 200));
  }
});