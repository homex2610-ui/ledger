const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const keys = ["settings.accent", "settings.autoAccent", "settings.wallpaper", "settings.wallpaperAccent", "settings.wallpaperSwatches", "settings.sound", "settings.reminders", "settings.landingPage", "settings.defaultFocusMin", "settings.autoStartBreaks", "settings.newPerDay", "settings.defaultView", "settings.dashboard", "settings.coverage", "settings.recall", "settings.tests", "settings.mistakes"];
for (const k of keys) {
  const cnt = (src.match(new RegExp(k.replace(/\./g, "\\."), "g")) || []).length;
  if (cnt) console.log(k.padEnd(30) + cnt);
}