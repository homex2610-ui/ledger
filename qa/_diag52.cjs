const fs = require("fs");
const app = fs.readFileSync("src/App.jsx", "utf8");
console.log("=== notify usage ===");
for (const m of app.matchAll(/[\s\S]{0,100}\bnotify\b[\s\S]{0,100}/g)) console.log("  " + m[0].replace(/\s+/g, " ").slice(0, 200));
console.log("=== Sound usage (component?) ===");
for (const m of app.matchAll(/[\s\S]{0,80}\bSound\b[\s\S]{0,100}/g)) console.log("  " + m[0].replace(/\s+/g, " ").slice(0, 200));
console.log("=== Header/Sidebar/GlobalSwipe/ProgressRing/WallpaperLayer component file exports ===");
for (const f of ["src/components/layout/Header.jsx", "src/components/layout/Sidebar.jsx", "src/components/layout/GlobalSwipe.jsx", "src/components/ui/ProgressRing.jsx", "src/components/ui/WallpaperLayer.jsx"]) {
  const c = fs.readFileSync(f, "utf8");
  console.log("  " + f + " -> " + [...new Set(c.match(/^export (?:default )?(?:const|function) (\w+)|^export default (\w+)/gm))].join(", "));
}
console.log("=== Header imports what from Sidebar ===");
const h = fs.readFileSync("src/components/layout/Header.jsx", "utf8");
for (const m of h.matchAll(/import [\s\S]{0,120}from "\.\/Sidebar"/g)) console.log("  " + m[0]);
console.log("=== DAY/MONTH/names helpers in utils ===");
const u = fs.readFileSync("src/lib/utils.js", "utf8");
console.log(u.slice(0, 400).replace(/\n/g, "\n  "));
