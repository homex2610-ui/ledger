import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import type { DailyFocusPayload } from "./shares-core.js";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const BG = "#0B3D33";
const PANEL = "#11483C";
const CREAM = "#F5F1E6";
const CREAM_DIM = "rgba(245,241,230,0.62)";
const CORAL = "#F0645A";
const EMERALD = "#6CCBC0";

let fontsLoaded = false;
let spaceGrotesk700 = "";
let spaceGrotesk500 = "";
let plusJakarta700 = "";
let plusJakarta400 = "";
let dmMono400 = "";

function fontsDir(): string | null {
  const candidates = [
    path.join((globalThis as { __dirname?: string }).__dirname ?? process.cwd(), "fonts"),
    fileURLToPath(new URL("../assets/fonts", import.meta.url)),
    path.join(process.cwd(), "assets", "fonts"),
  ];
  for (const candidate of candidates) {
    try {
      if (readFileSync(path.join(candidate, "SpaceGrotesk-Bold.ttf")).length > 0) return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

function fontDataUrl(fileName: string, dir: string | null): string {
  if (!dir) return "";
  try {
    return `url("data:font/ttf;base64,${readFileSync(path.join(dir, fileName)).toString("base64")}")`;
  } catch {
    return "";
  }
}

function loadFonts(): void {
  if (fontsLoaded) return;
  fontsLoaded = true;
  const dir = fontsDir();
  spaceGrotesk700 = fontDataUrl("SpaceGrotesk-Bold.ttf", dir);
  spaceGrotesk500 = fontDataUrl("SpaceGrotesk-Medium.ttf", dir);
  plusJakarta700 = fontDataUrl("PlusJakartaSans-Bold.ttf", dir);
  plusJakarta400 = fontDataUrl("PlusJakartaSans-Regular.ttf", dir);
  dmMono400 = fontDataUrl("DMMono-Regular.ttf", dir);
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clampName(value: string): string {
  const cleaned = value.trim();
  if (cleaned.length <= 22) return cleaned;
  return `${cleaned.slice(0, 21).trim()}…`;
}

function flame(x: number, y: number, size: number, fill: string): string {
  const s = size / 24;
  return `<path transform="translate(${x} ${y}) scale(${s})" d="M12 1.5 C13.5 5.5 19.5 8 19.5 14 C19.5 18.5 16.5 22 12 22 C7.5 22 4.5 18.5 4.5 14 C4.5 8 10.5 5.5 12 1.5 Z M12 8 C10.5 10.5 7.5 12 7.5 15 C7.5 17.5 9.5 19.5 12 19.5 C14.5 19.5 16.5 17.5 16.5 15 C16.5 12 13.5 10.5 12 8 Z" fill="${fill}"/>`;
}

function subjectBars(payload: DailyFocusPayload): string {
  const rows = payload.subjects.length ? payload.subjects : [];
  const items = rows.length ? rows : [{ subject: "Focus time", minutes: payload.minutes, percent: 100 }];
  const barX = 790;
  const barWidth = 338;
  let y = 262;
  let out = "";
  for (const item of items.slice(0, 4)) {
    const label = esc(item.subject.length > 22 ? `${item.subject.slice(0, 21)}…` : item.subject);
    const w = Math.max(10, Math.min(barWidth, Math.round((item.percent / 100) * barWidth)));
    out += `<text x="${barX}" y="${y}" font-family="DM Mono" font-size="15" fill="${CREAM_DIM}">${label}</text>`;
    out += `<rect x="${barX}" y="${y + 8}" width="${barWidth}" height="13" rx="6.5" fill="rgba(108,203,192,0.18)"/>`;
    out += `<rect x="${barX}" y="${y + 8}" width="${w}" height="13" rx="6.5" fill="${EMERALD}"/>`;
    out += `<text x="${barX + barWidth}" y="${y - 1}" text-anchor="end" font-family="DM Mono" font-size="14" fill="${CREAM}">${item.minutes}m</text>`;
    y += 52;
  }
  return out;
}

export function buildDailyFocusSvg(payload: DailyFocusPayload, options: { variant: "A" | "B"; shareUrl: string }): string {
  loadFonts();
  const name = esc(clampName(payload.displayName));

  const fontFace = (family: string, source: string) =>
    source ? `<style>@font-face{font-family:'${family}';font-style:normal;font-weight:400 700;font-display:swap;src:${source}}</style>` : "";

  const streakRow =
    options.variant === "B" && payload.streak > 0
      ? `<g><rect x="72" y="438" width="266" height="52" rx="26" fill="${CORAL}"/>${flame(96, 452, 24, "#0B3D33")}<text x="134" y="470" font-family="Space Grotesk" font-size="22" font-weight="700" fill="${BG}">${payload.streak} day streak</text></g>`
      : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
${fontFace("Space Grotesk", spaceGrotesk700 || spaceGrotesk500)}
${fontFace("Plus Jakarta Sans", plusJakarta400 || plusJakarta700)}
${fontFace("DM Mono", dmMono400)}
<rect width="1200" height="630" fill="${BG}"/>
<g stroke="rgba(245,241,230,0.05)" stroke-width="1">${[120, 240, 360, 480, 600].map((y) => `<line x1="0" y1="${y}" x2="1200" y2="${y}"/>`).join("")}${[120, 240, 360, 480, 600, 720, 840, 960, 1080].map((x) => `<line x1="${x}" y1="0" x2="${x}" y2="630"/>`).join("")}</g>
<circle cx="1120" cy="-120" r="240" fill="none" stroke="rgba(108,203,192,0.10)" stroke-width="2"/>
<circle cx="1060" cy="-60" r="150" fill="none" stroke="rgba(108,203,192,0.08)" stroke-width="2"/>
<rect x="72" y="66" width="56" height="56" rx="16" fill="none" stroke="${EMERALD}" stroke-width="2.5"/>
<polyline points="86,94 102,78 112,94 128,78" fill="none" stroke="${CORAL}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
<text x="146" y="96" font-family="Space Grotesk" font-size="27" font-weight="700" fill="${CREAM}">Ledger</text>
<text x="146" y="114" font-family="DM Mono" font-size="11.5" letter-spacing="2.5" fill="${CREAM_DIM}">KEEP MOVING</text>
<rect x="938" y="70" width="190" height="48" rx="24" fill="${PANEL}"/>
<text x="1033" y="101" text-anchor="middle" font-family="DM Mono" font-size="13" letter-spacing="2.5" fill="${EMERALD}">DAILY FOCUS</text>
<line x1="72" y1="150" x2="1128" y2="150" stroke="rgba(245,241,230,0.10)"/>
<text x="72" y="230" font-family="Plus Jakarta Sans" font-size="40" fill="${CREAM_DIM}">${name} studied</text>
<text x="72" y="382" font-family="Space Grotesk" font-size="168" font-weight="700" fill="${CREAM}">${esc(payload.minutesLabel)}</text>
<text x="76" y="416" font-family="Plus Jakarta Sans" font-size="30" fill="${CREAM_DIM}">focused today · ${esc(payload.dayLabel)}</text>
${streakRow}
<rect x="772" y="196" width="356" height="330" rx="24" fill="${PANEL}"/>
<text x="796" y="232" font-family="DM Mono" font-size="13" letter-spacing="2.5" fill="${CREAM_DIM}">TODAY'S SUBJECTS</text>
${subjectBars(payload)}
<line x1="72" y1="520" x2="1128" y2="520" stroke="rgba(245,241,230,0.10)"/>
<rect x="72" y="546" width="268" height="54" rx="27" fill="${CORAL}"/>
<text x="206" y="582" text-anchor="middle" font-family="Space Grotesk" font-size="21" font-weight="700" fill="${BG}">Study with me</text>
<path d="M320 560 L332 572 L320 584" fill="none" stroke="${BG}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
<text x="1128" y="582" text-anchor="end" font-family="DM Mono" font-size="12.5" letter-spacing="1.5" fill="${CREAM_DIM}">${esc(options.shareUrl)}</text>
</svg>`;
  return svg;
}

export async function renderShareOgPng(payload: DailyFocusPayload, options: { variant: "A" | "B"; shareUrl: string }): Promise<Buffer> {
  const svg = buildDailyFocusSvg(payload, options);
  return sharp(Buffer.from(svg)).png().toBuffer();
}