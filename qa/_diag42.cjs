const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");

const names = ["STATUS_LABEL", "STATUS_ORDER", "colorMap", "REVISION_INTERVALS", "PRIORITY_ORDER", "PRIORITY_LABEL", "PRIORITY_COLORS", "EXAM_SUBJECTS", "DEFAULT_SYLLABUS", "DEFAULT_SETTINGS", "fmtDateStr", "TimerIcon", "Bubble", "useNow", "computeXP", "WALLPAPER_MODES", "ERROR_COLORS", "XP_PER_LEVEL", "LEVEL_TITLES", "DAILY_GOAL_MIN", "DEFAULT_THEME", "fmtClock", "Icon", "Btn", "Card", "Input", "SelectBox", "Row", "Toggle", "Panel", "EmptyState", "EmptyArt", "MiniStat", "PageHead", "StatStrip", "PanLabel", "StatusBubble", "Chip", "Badge", "usePersist", "stored", "demo", "GoalDot", "flash", "timeAgo", "buildLeaderboard", "normalizeInviteCode", "genCode", "addDays", "parseLocalDate", "daysBetween", "uid", "todayStr"];
for (const n of names) {
  const defRe = new RegExp("(?:const|let|var|function) " + n + "\\b");
  const useCount = (src.match(new RegExp("\\b" + n + "\\b", "g")) || []).length;
  const def = src.match(defRe);
  console.log(n.padEnd(24) + " defined: " + (def ? "YES@" + src.slice(0, def.index).split("\n").length : "NO") + "   uses: " + useCount);
}
