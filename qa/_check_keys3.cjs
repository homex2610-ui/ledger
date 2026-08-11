const fs = require("fs");
const src = fs.readFileSync("src/App.jsx", "utf8");
const keys = ["settings.accent", "settings.autoAccent", "settings.wallpaper", "settings.wallpaperAccent", "settings.wallpaperSwatches", "settings.sound", "settings.reminders.study", "settings.reminders.review", "settings.reminders.targets", "settings.reminders.time", "settings.sound.ringPulse"];
for (const k of keys) {
  const cnt = (src.match(new RegExp(k.replace(/\./g, "\\."), "g")) || []).length;
  if (cnt) console.log(k.padEnd(35) + cnt);
}