const fs = require("fs");
const app = fs.readFileSync("src/App.jsx", "utf8");
const names = ["React.", "MOTION", "row(", "stack(", "cluster(", "center(", "between(", "darken(", "lighten(", "FONT_PRESETS", "LEGACY_THEME", "FONT_IMPORT", "RADIUS", "SPACE", "VIEW", "elev(", "subjectColor", "subjectDot", "RANK_COLORS", "ACCENT_PRESETS", "THEME_PRESETS", "normalizeTheme", "applyTheme", "globalCss", "hexToRgba", "COLORS", "FONTS", "parseLocalDate", "daysBetween", "uid", "todayStr", "addDays", "fmtMin", "timeAgo", "genCode", "normalizeInviteCode", "buildLeaderboard", "supabase", "validateUpload", "fileToDataUrl", "loadWallpaperImage", "saveWallpaperImage", "clearWallpaperImage", "extractPalette", "useState", "useEffect", "useRef", "useCallback", "useMemo"];
for (const n of names) {
  const cnt = (app.match(new RegExp(n.replace(/\./g, "\\."), "g")) || []).length;
  if (cnt) console.log(n.padEnd(24) + cnt);
}
console.log("=== React. usages detail ===");
for (const m of app.matchAll(/React\.[a-zA-Z]+/g)) console.log("  " + m[0]);
console.log("=== PageHead/MiniStat/StatStrip usage ===");
for (const m of app.matchAll(/<(PageHead|MiniStat|StatStrip)[\s\S]{0,130}/g)) console.log("  " + m[0].replace(/\s+/g, " ").slice(0, 150));
