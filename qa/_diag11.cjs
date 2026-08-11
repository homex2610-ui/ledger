const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");

console.log("=== wallpaper function refs in App ===");
for (const f of ["validateUpload", "fileToDataUrl", "loadWallpaperImage", "saveWallpaperImage", "clearWallpaperImage", "rgbToHsl", "hslToHex", "clampAccentHex", "extractPalette", "paletteFromPixels", "WALLPAPER_KEY"]) {
  const c = (src.match(new RegExp("\\b" + f + "\\b", "g")) || []).length;
  if (c) console.log("  " + f + " " + c + "x");
}
console.log("=== VIEW usage ===");
console.log((src.match(/VIEW\b/g) || []).length, "refs");
console.log("=== dateFormat values in SettingsTab/settings ===");
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(d + "/" + e.name) : [d + "/" + e.name]);
for (const f of walk("src")) {
  if (!/\.(jsx|js)$/.test(f)) continue;
  const t = fs.readFileSync(f, "utf8");
  for (const m of t.matchAll(/dateFormat[\s\S]{0,120}/g)) {
    if (/compact|dd|MMM|format/.test(m[0])) console.log("  [" + f + "] " + m[0].replace(/\s+/g, " ").slice(0, 130));
  }
}
console.log("=== TimerIcon context ===");
for (const m of src.matchAll(/.{0,80}TimerIcon.{0,80}/g)) console.log("  " + m[0].replace(/\s+/g, " "));
console.log("=== STATUS_LABEL text hints in UI ===");
for (const m of src.matchAll(/"(Not started|In progress|Mastered|Done|Backlog|Ongoing|Todo|Reviewing)"[^"]*/g)) console.log("  " + m[0].slice(0, 90));
console.log("=== MiniStat/PageHead style hints (classes near usages) ===");
const idx = src.indexOf("<MiniStat");
console.log(src.slice(idx - 200, idx + 80).replace(/\s+/g, " "));
console.log("=== does anything else reference 'DashboardPanelCarousel'? ===");
console.log("=== how many times 'lg-...' classes appear near MiniStat - just show MiniStat def search in components ===");
for (const f of walk("src/components")) {
  const t = fs.readFileSync(f, "utf8");
  if (/function MiniStat|const MiniStat/.test(t)) console.log("FOUND in " + f);
}
console.log("=== fmtDateStr-style function in utils? (parseLocalDate/daysBetween) ===");
console.log(fs.readFileSync("src/lib/utils.js", "utf8").split("\n").slice(0, 40).join("\n"));
