const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const lines = src.split("\n");
for (let i = 1680; i < 1690; i++) console.log((i + 1) + ": " + lines[i].trim());