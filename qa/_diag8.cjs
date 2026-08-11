const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");

const names = ["Bubble", "TimerIcon", "MiniStat", "PageHead", "countdownAccent", "DAILY_GOAL_MIN", "STATUS_ORDER", "supabase", "StatusBubble", "uid", "genCode", "normalizeInviteCode", "buildLeaderboard", "timeAgo", "addDays", "parseLocalDate", "daysBetween", "applyTheme", "THEME_PRESETS", "FONT_PRESETS", "ACCENT_PRESETS", "subjectColor", "subjectDot", "elev", "globalCss", "normalizeTheme", "LEGACY_THEME", "RANK_COLORS", "WallpaperLayer", "ProgressRing", "Sidebar", "Header", "GlobalSwipe", "fmtDateStr", "dueReviews", "reviewsByDate", "sounds", "pipTimer", "useNow", "useState", "useEffect", "useRef", "useCallback", "useMemo", "createPortal", "STATUS_LABEL", "colorMap", "hexToRgba", "fmtMin", "todayStr", "todayStrKeys", "loadTodayKey"];
for (const n of names) {
  const re = new RegExp("\\b" + n + "\\b", "g");
  const uses = src.match(re);
  if (!uses) { console.log("ABSENT   " + n); continue; }
  console.log((uses.length + "x      ") + n);
}
console.log("=== where are Bubble/TimerIcon/MiniStat/PageHead/countdownAccent used? ===");
for (const n of ["Bubble", "TimerIcon", "MiniStat", "PageHead", "countdownAccent"]) {
  const re = new RegExp(".{0,70}\\b" + n + "\\b.{0,30}", "g");
  const hits = src.match(re) || [];
  for (const h of hits.slice(0, 3)) console.log("  [" + n + "] " + h.replace(/\s+/g, " "));
}
