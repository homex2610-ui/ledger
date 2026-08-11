const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");

console.log("=== exports of layout/ui components ===");
for (const f of ["src/components/layout/Sidebar.jsx", "src/components/layout/Header.jsx", "src/components/layout/GlobalSwipe.jsx", "src/components/ui/ProgressRing.jsx", "src/components/ui/WallpaperLayer.jsx"]) {
  const t = fs.readFileSync(f, "utf8");
  const ex = t.match(/^export (?:default )?(?:function|const) (\w+)/gm);
  console.log("  " + f.split("/").pop() + ": " + (ex ? ex.join(", ") : "(default?)"));
  const def = t.match(/export default (\w+)/);
  if (def) console.log("    default: " + def[1]);
}
console.log("=== date format options in Settings ===");
for (const m of src.matchAll(/.{0,70}(compact|"full"|"short"|"long"|weekday|"Mon"|"dd MMM").{0,60}/g)) {
  const t = m[0].replace(/\s+/g, " ");
  if (/option|fmt|date|label|value|Select|v:|title|"compact"/.test(t)) console.log("  " + t.slice(0, 150));
}
console.log("=== settings.dashboard toggles in Settings tab ===");
for (const m of src.matchAll(/.{0,60}settings\.dashboard.{0,90}/g)) console.log("  " + m[0].replace(/\s+/g, " ").slice(0, 160));
console.log("=== all `settings.dashboard` key sets ===");
const dk = new Set();
for (const m of src.matchAll(/dashboard\?\.(\w+)|dashboard\.(\w+)/g)) dk.add(m[1] || m[2]);
console.log([...dk].join(", "));
console.log("=== DEFAULT_SETTINGS fields expected ===");
for (const m of src.matchAll(/(?:\.\.\.settings,|settings\.)(\w+)\??[:.]/g)) { }
console.log("=== Header uses (props passed) ===");
const h = src.indexOf("<Header");
console.log(src.slice(h - 100, h + 200));
console.log("=== Sidebar props ===");
const s = src.indexOf("<Sidebar");
console.log(src.slice(s - 100, s + 260));
console.log("=== GlobalSwipe props ===");
const g = src.indexOf("<GlobalSwipe");
console.log(src.slice(g - 60, g + 300));
