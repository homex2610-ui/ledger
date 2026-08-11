// Study OS design language — a dark Caelestia-inspired desktop environment.
// Tonal layers instead of glass: page (near-black blue-charcoal) → surface →
// widget → raised highlight. Blur is reserved for floating elements; depth
// comes from tone, hairline borders and sparse shadow.
//
// COLORS/FONTS are shared, mutable objects read fresh at render time by every
// component. applyTheme() rewrites their contents in place; because nothing
// captures a stale reference in a closure, the normal re-render triggered by
// changing settings.theme is enough to repaint the whole app.
//
// Because these are mutable objects (not plain re-exported values), any file
// that does `import { COLORS } from "./lib/theme"` gets a live reference to
// the SAME object App.jsx mutates.

export let FONT_IMPORT = "";

export const COLORS = {
  bg: "", bg1: "", panel: "", panel2: "", border: "", ink: "", inkSoft: "", inkDim: "",
  text: "", dim: "", faint: "", done: "", mastered: "", warn: "", danger: "",
  isLight: false,
  accentFocus: "", accentProgress: "", accentWarm: "", accentSuccess: "",
  accentPink: "", violet: "",
  glassShell: "", glassFill: "", glassFill2: "", glassFillStrong: "",
  glassHero: "", glassBlur: "", glassBlurRail: "", glassBlurHero: "",
  surfaceOverlay: "", borderStrong: "", inkGlow: "", shadow: "", shadowStrong: "", hoverOverlay: "", focusShadow: "",
  chart: [], selection: "",
  // Layered material ramp — canvas → sunken → default → raised → floating → overlay.
  canvas: "", sunken: "", overlay: "", railBg: "", atmosphere: "", onAccent: "",
  shadowRaised: "", shadowFloating: "", shadowOverlay: "",
};
export const FONTS = {
  display: "'Fraunces', Georgia, serif",
  body: "'Instrument Sans', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

export const FONT_CATALOG = {
  // Display role — an editorial serif with an optical-size axis (9…144).
  // The default voice: Fraunces carries the "Ledger" book identity in the
  // capped weights we actually ship (500/600/700); no extra weights loaded.
  "Fraunces": { family: "Fraunces", fallback: "serif", weights: [500, 600, 700], optical: true },
  "Inter": { family: "Inter", fallback: "sans-serif", weights: [400, 500, 600, 700, 800] },
  "Manrope": { family: "Manrope", fallback: "sans-serif", weights: [400, 500, 600, 700, 800] },
  "Plus Jakarta Sans": { family: "Plus Jakarta Sans", fallback: "sans-serif", weights: [400, 500, 600, 700, 800] },
  "DM Sans": { family: "DM Sans", fallback: "sans-serif", weights: [400, 500, 600, 700] },
  "Space Grotesk": { family: "Space Grotesk", fallback: "sans-serif", weights: [400, 500, 600, 700] },
  "Instrument Sans": { family: "Instrument Sans", fallback: "sans-serif", weights: [400, 500, 600, 700] },
  "IBM Plex Sans": { family: "IBM Plex Sans", fallback: "sans-serif", weights: [400, 500, 600, 700] },
  "JetBrains Mono": { family: "JetBrains Mono", fallback: "monospace", weights: [400, 500, 600, 700] },
  "IBM Plex Mono": { family: "IBM Plex Mono", fallback: "monospace", weights: [400, 500, 600, 700] },
  "Geist Mono": { family: "Geist Mono", fallback: "monospace", weights: [400, 500, 600, 700] },
  // Characterful display/mono voices — pixel-arcade (Minecraft), dot-matrix
  // (Nothing), CRT terminal and structural mono. Single-weight families stay
  // honest: one 400 in the request, no faux-bold in the UI.
  "Press Start 2P": { family: "Press Start 2P", fallback: "monospace", weights: [400], note: "Arcade pixel · Minecraft-style" },
  "DotGothic16": { family: "DotGothic16", fallback: "monospace", weights: [400], note: "Dot matrix · Nothing-style" },
  "VT323": { family: "VT323", fallback: "monospace", weights: [400], note: "CRT terminal" },
  "Space Mono": { family: "Space Mono", fallback: "monospace", weights: [400, 700], note: "Technical mono" },
};

export const TYPOGRAPHY_PRESETS = {
  ledger: { label: "Ledger", sub: "Editorial academic default", display: "Fraunces", body: "Instrument Sans", mono: "JetBrains Mono", headingWeight: 700, bodyWeight: 400, uiWeight: 600, scale: 1, tracking: "-0.02em" },
  editorial: { label: "Editorial", sub: "Quietly expressive", display: "Fraunces", body: "DM Sans", mono: "IBM Plex Mono", headingWeight: 700, bodyWeight: 400, uiWeight: 600, scale: 1.04, tracking: "-0.04em" },
  technical: { label: "Technical", sub: "Geometric and exact", display: "Space Grotesk", body: "IBM Plex Sans", mono: "IBM Plex Mono", headingWeight: 600, bodyWeight: 400, uiWeight: 600, scale: 0.98, tracking: "-0.018em" },
  minimal: { label: "Minimal", sub: "Quiet hierarchy", display: "Inter", body: "Inter", mono: "JetBrains Mono", headingWeight: 600, bodyWeight: 400, uiWeight: 500, scale: 0.98, tracking: "-0.02em" },
  terminal: { label: "Terminal", sub: "Monospace-led", display: "IBM Plex Mono", body: "IBM Plex Mono", mono: "IBM Plex Mono", headingWeight: 600, bodyWeight: 400, uiWeight: 500, scale: 0.96, tracking: "-0.01em" },
  compact: { label: "Compact", sub: "More signal per line", display: "DM Sans", body: "DM Sans", mono: "Geist Mono", headingWeight: 700, bodyWeight: 400, uiWeight: 600, scale: 0.92, tracking: "-0.025em" },
  pixel: { label: "Pixel", sub: "Arcade blocks", display: "Press Start 2P", body: "Space Grotesk", mono: "VT323", headingWeight: 400, bodyWeight: 400, uiWeight: 500, scale: 0.9, tracking: "-0.02em" },
  dotmatrix: { label: "Dot Matrix", sub: "Nothing punk-terminal", display: "DotGothic16", body: "Space Mono", mono: "DotGothic16", headingWeight: 400, bodyWeight: 400, uiWeight: 600, scale: 0.95, tracking: "-0.02em" },
};

const fontStack = (name) => {
  const font = FONT_CATALOG[name] || FONT_CATALOG.Inter;
  return `'${font.family}', ${font.fallback}`;
};

// One Google Fonts request for the active trio, whatever roles they fill.
// Fraunces ships its optical-size axis (9…144) because display sizes want the
// fine-cut small-optical glyphs; every other family stays wght-only.
const familyQuery = (font) => {
  if (font.optical) return `${font.family.replace(/ /g, "+")}:opsz,wght@9..144,${font.weights.join(";9..144,")}`;
  return `${font.family.replace(/ /g, "+")}:wght@${font.weights.join(";")}`;
};

function activeFontImport(fonts) {
  const families = [...new Set(fonts.map(name => FONT_CATALOG[name]).filter(Boolean))];
  if (families.length === 0) return "";
  const query = families.map(familyQuery).join("&family=");
  return `@import url('https://fonts.googleapis.com/css2?family=${query}&display=swap');`;
}

// Live appearance tokens — read by globalCss()/elev() fresh at render time,
// mutated by applyTheme() from the Settings page. Same mutable-object pattern
// as COLORS/FONTS: components never cache these, re-render repaints everything.
export const VIEW = {
  zoom: 100,       // % typography+layout scale
  radius: 1,       // 0..2 multiplier over RADIUS
  density: 1,      // 0.85..1.3 spacing multiplier
  glow: 1,         // 0..2 accent glow strength
  railWidth: 64,   // sidebar rail px
  highContrast: false,
  reduceMotion: false,
  focusRing: 1,    // 0..2 focus outline emphasis
};

// 4-based spacing scale. xs stays tiny on purpose (icon gaps, badge insets).
export const SPACE = { xs: 4, sm: 12, md: 18, lg: 26, xl: 36, xxl: 46, xxxl: 60 };
const BASE_SPACE = { ...SPACE };

// Radius hierarchy — Caelestia: compact system chips and cells stay tight
// (6-10), only large focal surfaces soften. Pills (999px) are status-only.
export const RADIUS = { badge: 6, control: 10, card: 14, modal: 18, xl: 22 };

// Motion tokens: calm, no bounce, OS-feel.
export const MOTION = {
  duration: { fast: 160, normal: 280, slow: 450 },
  easing: { standard: "cubic-bezier(0.2, 0.8, 0.2, 1)", spring: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
  transition: {
    hover: "background 0.16s ease-out, border-color 0.16s ease-out, transform 0.16s cubic-bezier(0.2,0.8,0.2,1)",
    fade: "opacity 0.2s ease-out",
    color: "color 0.15s ease-out",
    spring: "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
  },
};

export const row = (gap = SPACE.sm) => ({ display: "flex", alignItems: "center", gap });
export const stack = (gap = SPACE.sm) => ({ display: "flex", flexDirection: "column", gap });
export const cluster = (gap = SPACE.sm) => ({ display: "flex", flexWrap: "wrap", alignItems: "center", gap });
export const center = () => ({ display: "flex", alignItems: "center", justifyContent: "center" });
export const between = (align = "center") => ({ display: "flex", alignItems: align, justifyContent: "space-between" });

// One cohesive Caelestia language. Keys stay "glass-dark"/"glass-light" etc
// so saved settings + normalizeTheme() keep resolving. bg/panel/panel2 MUST
// stay HEX: consumers feed them into hexToRgba()/darken(). Accents are muted
// on purpose — tiny patches of color carry the hierarchy.
// One cohesive design language. Every palette is a complete color system:
// canvas → surfaces → borders → text → accent → status → charts. Tokens are
// semantic (surface-1, text-2, accent, …) — never raw "purple-500" values.
// bg/panel/panel2 MUST stay HEX: consumers feed them into hexToRgba()/darken().
export const THEME_PRESETS = {
  "nocturne": {
    label: "Nocturne", sub: "Violet / neutral dark", mode: "dark", swatch: "#8C7BFF", font: "grotesk",
    canvas: "#0A0A10", surface1: "#11101A", surface2: "#161522", surface3: "#1D1B2B",
    sunken: "#0D0C14", overlay: "#242132", rail: "#12111B",
    hover: "rgba(255,255,255,0.05)", active: "rgba(255,255,255,0.09)",
    borderSubtle: "rgba(255,255,255,0.06)", borderDefault: "rgba(255,255,255,0.10)", borderStrong: "rgba(255,255,255,0.18)",
    text1: "#F1EFF8", text2: "#A9A6C0", text3: "#7B7896", textMuted: "#565467",
    accent: "#7B6CEF", accentHover: "#8E80F4", accentSoft: "rgba(123,108,239,0.14)", onAccent: "#FFFFFF",
    success: "#4CC38A", warning: "#E0A45E", danger: "#E5605A", info: "#5BA8E0",
    chart: ["#7B6CEF", "#5BA8E0", "#4CC38A", "#E0A45E", "#E5605A"],
    focus: "#A89BFF", selection: "rgba(123,108,239,0.28)",
    countdown: "#F0625B",
  },
  "ledger": {
    label: "Ledger", sub: "Ink-blue / studio charcoal", mode: "dark", swatch: "#5F87C9", font: "grotesk",
    canvas: "#070B12", surface1: "#0D141F", surface2: "#121B2A", surface3: "#182335",
    sunken: "#0A101B", overlay: "#1E2B41", rail: "#0E1624",
    hover: "rgba(255,255,255,0.05)", active: "rgba(255,255,255,0.09)",
    borderSubtle: "rgba(255,255,255,0.06)", borderDefault: "rgba(255,255,255,0.09)", borderStrong: "rgba(255,255,255,0.17)",
    text1: "#E9EDF6", text2: "#9FA9C2", text3: "#6E7A96", textMuted: "#4E5A72",
    accent: "#5F87C9", accentHover: "#6F98D9", accentSoft: "rgba(95,135,201,0.15)", onAccent: "#FFFFFF",
    success: "#4CC38A", warning: "#E0A45E", danger: "#E5605A", info: "#5BA8E0",
    chart: ["#5F87C9", "#5BA8E0", "#4CC38A", "#E0A45E", "#E5605A"],
    focus: "#7CA5E0", selection: "rgba(95,135,201,0.28)",
    countdown: "#F0645A",
  },
  "caelestia": {
    label: "Caelestia Studio", sub: "Layered midnight / mineral cyan", mode: "dark", swatch: "#6FD6C8", font: "grotesk",
    canvas: "#070B10", surface1: "#0D151D", surface2: "#14222C", surface3: "#1D303A",
    sunken: "#090F15", overlay: "#263D47", rail: "#0B141C",
    hover: "rgba(255,255,255,0.055)", active: "rgba(111,214,200,0.12)",
    borderSubtle: "rgba(190,230,226,0.07)", borderDefault: "rgba(190,230,226,0.13)", borderStrong: "rgba(190,230,226,0.24)",
    text1: "#E8F4F1", text2: "#A7C1BE", text3: "#718D8B", textMuted: "#506966",
    accent: "#5BC7B9", accentHover: "#72D9CB", accentSoft: "rgba(91,199,185,0.16)", onAccent: "#071514",
    success: "#6CD6A0", warning: "#E9B86F", danger: "#EF7469", info: "#69BBD2",
    chart: ["#5BC7B9", "#69BBD2", "#6CD6A0", "#E9B86F", "#EF7469"],
    focus: "#83E1D3", selection: "rgba(91,199,185,0.3)",
    countdown: "#F2776A",
  },
  "midnight": {
    label: "Midnight", sub: "Cool slate / desaturated blue", mode: "dark", swatch: "#6B8AA6", font: "grotesk",
    canvas: "#0A0B0E", surface1: "#111318", surface2: "#161A20", surface3: "#1C2129",
    sunken: "#0D0F13", overlay: "#232932", rail: "#13161B",
    hover: "rgba(255,255,255,0.05)", active: "rgba(255,255,255,0.09)",
    borderSubtle: "rgba(255,255,255,0.06)", borderDefault: "rgba(255,255,255,0.09)", borderStrong: "rgba(255,255,255,0.17)",
    text1: "#E9EAEE", text2: "#9FA3AD", text3: "#767B86", textMuted: "#4E5259",
    accent: "#6B8AA6", accentHover: "#7D9CB8", accentSoft: "rgba(107,138,166,0.15)", onAccent: "#FFFFFF",
    success: "#4CC38A", warning: "#E0A45E", danger: "#E5605A", info: "#5BA8E0",
    chart: ["#6B8AA6", "#5BA8E0", "#4CC38A", "#E0A45E", "#E5605A"],
    focus: "#8AAAC6", selection: "rgba(107,138,166,0.28)",
    countdown: "#EF6A60",
  },
  "forest": {
    label: "Forest", sub: "Warm green / quiet", mode: "dark", swatch: "#4FB786", font: "grotesk",
    canvas: "#070C09", surface1: "#0D1610", surface2: "#131F17", surface3: "#1A2920",
    sunken: "#0A110C", overlay: "#21332A", rail: "#0F1913",
    hover: "rgba(255,255,255,0.05)", active: "rgba(255,255,255,0.09)",
    borderSubtle: "rgba(255,255,255,0.06)", borderDefault: "rgba(255,255,255,0.08)", borderStrong: "rgba(255,255,255,0.16)",
    text1: "#E8F1EA", text2: "#9DB4A4", text3: "#6B8474", textMuted: "#4C6356",
    accent: "#4FB786", accentHover: "#61C797", accentSoft: "rgba(79,183,134,0.15)", onAccent: "#06201C",
    success: "#4CC38A", warning: "#E0A45E", danger: "#E5605A", info: "#5BA8E0",
    chart: ["#4FB786", "#5BA8E0", "#A3C65E", "#E0A45E", "#E5605A"],
    focus: "#6FD0A0", selection: "rgba(79,183,134,0.28)",
    countdown: "#F0685C",
  },
  "parchment": {
    label: "Parchment", sub: "Warm paper / ink-blue", mode: "light", swatch: "#4A6FA5", font: "grotesk",
    canvas: "#F5F2EA", surface1: "#FCFAF5", surface2: "#F1EDE3", surface3: "#E9E4D8",
    sunken: "#ECE7DB", overlay: "#FFFFFF", rail: "#F3EFE5",
    hover: "rgba(60,50,20,0.06)", active: "rgba(60,50,20,0.10)",
    borderSubtle: "rgba(60,50,20,0.08)", borderDefault: "rgba(60,50,20,0.14)", borderStrong: "rgba(60,50,20,0.28)",
    text1: "#2A2620", text2: "#5A5342", text3: "#78705A", textMuted: "#A69D87",
    accent: "#4A6FA5", accentHover: "#3D5F92", accentSoft: "rgba(74,111,165,0.12)", onAccent: "#FFFFFF",
    success: "#3A8A5F", warning: "#B07D2E", danger: "#C25043", info: "#3E7FA8",
    chart: ["#4A6FA5", "#3E7FA8", "#3A8A5F", "#B07D2E", "#C25043"],
    focus: "#3D5F92", selection: "rgba(74,111,165,0.22)",
    countdown: "#C24330",
  },
  "rose": {
    label: "Rose", sub: "Dusty rose / warm charcoal", mode: "dark", swatch: "#C98AAE", font: "grotesk",
    canvas: "#0D0910", surface1: "#150F19", surface2: "#1C1521", surface3: "#241B2B",
    sunken: "#110B15", overlay: "#2C2133", rail: "#17101B",
    hover: "rgba(255,255,255,0.05)", active: "rgba(255,255,255,0.09)",
    borderSubtle: "rgba(255,255,255,0.06)", borderDefault: "rgba(255,255,255,0.08)", borderStrong: "rgba(255,255,255,0.16)",
    text1: "#F4EDF1", text2: "#B9A6B1", text3: "#8A7581", textMuted: "#64525E",
    accent: "#C98AAE", accentHover: "#D99DBE", accentSoft: "rgba(201,138,174,0.15)", onAccent: "#2A0F20",
    success: "#4CC38A", warning: "#E0A45E", danger: "#E5605A", info: "#5BA8E0",
    chart: ["#C98AAE", "#5BA8E0", "#4CC38A", "#E0A45E", "#E5605A"],
    focus: "#E0A6C4", selection: "rgba(201,138,174,0.28)",
    countdown: "#F06A62",
  },
  "storm": {
    label: "Storm", sub: "Steel / muted blue", mode: "dark", swatch: "#5E7B9E", font: "grotesk",
    canvas: "#0B0E13", surface1: "#12171F", surface2: "#181E28", surface3: "#1F2632",
    sunken: "#0E1219", overlay: "#272E3D", rail: "#141A24",
    hover: "rgba(255,255,255,0.05)", active: "rgba(255,255,255,0.09)",
    borderSubtle: "rgba(255,255,255,0.06)", borderDefault: "rgba(255,255,255,0.09)", borderStrong: "rgba(255,255,255,0.17)",
    text1: "#E9EDF3", text2: "#A2ABC0", text3: "#767E92", textMuted: "#4F576A",
    accent: "#5E7B9E", accentHover: "#6E8FB4", accentSoft: "rgba(94,123,158,0.15)", onAccent: "#FFFFFF",
    success: "#4CC38A", warning: "#E0A45E", danger: "#E5605A", info: "#5BA8E0",
    chart: ["#5E7B9E", "#5BA8E0", "#4CC38A", "#E0A45E", "#E5605A"],
    focus: "#7A9ABF", selection: "rgba(94,123,158,0.28)",
    countdown: "#EF665C",
  },
  "verdigris": {
    label: "Verdigris", sub: "Verdigris / black-teal", mode: "dark", swatch: "#4FB0A6", font: "grotesk",
    canvas: "#060C0D", surface1: "#0C1618", surface2: "#121D20", surface3: "#182629",
    sunken: "#091113", overlay: "#1F2F33", rail: "#0E191C",
    hover: "rgba(255,255,255,0.05)", active: "rgba(255,255,255,0.09)",
    borderSubtle: "rgba(255,255,255,0.06)", borderDefault: "rgba(255,255,255,0.09)", borderStrong: "rgba(255,255,255,0.17)",
    text1: "#E6F2F0", text2: "#9BB8B3", text3: "#6A8A86", textMuted: "#4C6A66",
    accent: "#4FB0A6", accentHover: "#5CC2B8", accentSoft: "rgba(79,176,166,0.15)", onAccent: "#07211E",
    success: "#4CC38A", warning: "#E0A45E", danger: "#E5605A", info: "#4FA3B5",
    chart: ["#4FB0A6", "#4FA3B5", "#4CC38A", "#E0A45E", "#E5605A"],
    focus: "#6CCBC0", selection: "rgba(79,176,166,0.28)",
    countdown: "#F0645A",
  },
  "terminal": {
    label: "Terminal", sub: "Phosphor / mono green", mode: "dark", swatch: "#8CE07B", font: "grotesk",
    canvas: "#070B07", surface1: "#0C140C", surface2: "#121B11", surface3: "#182313",
    sunken: "#090F09", overlay: "#1F2C1B", rail: "#0E160E",
    hover: "rgba(255,255,255,0.05)", active: "rgba(255,255,255,0.09)",
    borderSubtle: "rgba(255,255,255,0.06)", borderDefault: "rgba(255,255,255,0.08)", borderStrong: "rgba(255,255,255,0.16)",
    text1: "#E6F2E6", text2: "#96B396", text3: "#6B8A6B", textMuted: "#4C6A4C",
    accent: "#8CE07B", accentHover: "#A0EC8F", accentSoft: "rgba(140,224,123,0.14)", onAccent: "#08150A",
    success: "#8CE07B", warning: "#E0B268", danger: "#F0685E", info: "#7ED9C4",
    chart: ["#8CE07B", "#7ED9C4", "#A6D97A", "#E0B268", "#F0685E"],
    focus: "#A6F091", selection: "rgba(140,224,123,0.26)",
    countdown: "#F0685E",
  },
  "noir": {
    label: "Noir Mono", sub: "Pure neutral / acid lime", mode: "dark", swatch: "#C8EF4C", font: "grotesk",
    canvas: "#0B0B0D", surface1: "#111115", surface2: "#17171C", surface3: "#1E1E23",
    sunken: "#0E0E11", overlay: "#25252B", rail: "#131316",
    hover: "rgba(255,255,255,0.05)", active: "rgba(255,255,255,0.09)",
    borderSubtle: "rgba(255,255,255,0.06)", borderDefault: "rgba(255,255,255,0.09)", borderStrong: "rgba(255,255,255,0.17)",
    text1: "#EAEAEE", text2: "#A1A1AC", text3: "#777783", textMuted: "#4E4E58",
    accent: "#C8EF4C", accentHover: "#D6F46A", accentSoft: "rgba(200,239,76,0.14)", onAccent: "#131605",
    success: "#7EE8A8", warning: "#E0B268", danger: "#F0685E", info: "#8CE0D0",
    chart: ["#C8EF4C", "#8CE0D0", "#7EE8A8", "#E0B268", "#F0685E"],
    focus: "#D6F46A", selection: "rgba(200,239,76,0.26)",
    countdown: "#F26A5E",
  },
};

// Old theme ids → curated palette ids. Saved settings keep resolving.
export const LEGACY_THEME = {
  "glass-dark": "nocturne", "glass-dark-violet": "midnight", "glass-dark-mint": "forest",
  "glass-light": "parchment", midnight: "midnight", forest: "forest", mint: "forest",
  parchment: "parchment", rosequartz: "rose", "noir-mono": "noir",
};
export function normalizeTheme(id) {
  if (!id) return "verdigris";
  if (THEME_PRESETS[id]) return id;
  return LEGACY_THEME[id] || "verdigris";
}

export const FONT_PRESETS = {
  grotesk: { display: fontStack("Space Grotesk"), body: fontStack("Inter"), mono: fontStack("JetBrains Mono") },
};

// Accent swatches for the Appearance panel — each tints the whole token
// system (ink/accent/glow/selection/buttons) without breaking luminance.
// Twelve curated accents. onAccent (foreground on accent fills) is chosen
// automatically from the accent's luminance in applyTheme(); these fields
// only supply the hue family + companion tones.
export const ACCENT_PRESETS = {
  violet: { accent: "#A89BFF", accentFocus: "#B4A8FF", accentProgress: "#7FC8E8", violet: "#8B7CFF" },
  indigo: { accent: "#8CA0FF", accentFocus: "#9CAEFF", accentProgress: "#7FC8E8", violet: "#6B8CFF" },
  blue: { accent: "#6FA5E8", accentFocus: "#7FB1F0", accentProgress: "#7FC8E8", violet: "#5F8FD9" },
  cyan: { accent: "#5ECFE0", accentFocus: "#6FDBEB", accentProgress: "#A89BFF", violet: "#4FB8C9" },
  teal: { accent: "#3EC9A7", accentFocus: "#4ED8B5", accentProgress: "#7FC8E8", violet: "#2FA385" },
  emerald: { accent: "#5BBF6A", accentFocus: "#6BCB79", accentProgress: "#7FC8E8", violet: "#3E9B4E" },
  lime: { accent: "#B7D65A", accentFocus: "#C6E36B", accentProgress: "#8CE0B8", violet: "#9EBB42" },
  amber: { accent: "#F0B26B", accentFocus: "#FFC078", accentProgress: "#FFC96B", violet: "#D99A52" },
  orange: { accent: "#F0965E", accentFocus: "#FFA86F", accentProgress: "#FFC96B", violet: "#D9824A" },
  coral: { accent: "#FF7D6B", accentFocus: "#FF8F80", accentProgress: "#F0A860", violet: "#E05555" },
  rose: { accent: "#E8A0C8", accentFocus: "#F0AED4", accentProgress: "#A89BFF", violet: "#C77BA5" },
  pink: { accent: "#F08AB0", accentFocus: "#F79EC0", accentProgress: "#E8A0C8", violet: "#D96F9A" },
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function hexToRgba(hex, a) {
  const h = (hex || "#4FD8E0").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const safe = [r, g, b].map(v => (isNaN(v) ? 0 : v));
  return `rgba(${safe[0]},${safe[1]},${safe[2]},${a})`;
}
export function darken(hex, amt) {
  const h = (hex || "#4FD8E0").replace("#", "");
  const r = Math.max(0, parseInt(h.slice(0, 2), 16) - amt), g = Math.max(0, parseInt(h.slice(2, 4), 16) - amt), b = Math.max(0, parseInt(h.slice(4, 6), 16) - amt);
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, "0")).join("")}`;
}
export function lighten(hex, amt) {
  const h = (hex || "#4FD8E0").replace("#", "");
  const r = Math.min(255, parseInt(h.slice(0, 2), 16) + amt), g = Math.min(255, parseInt(h.slice(2, 4), 16) + amt), b = Math.min(255, parseInt(h.slice(4, 6), 16) + amt);
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, "0")).join("")}`;
}

function relLuminance(hex) {
  const h = (hex || "#000000").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function applyTheme(themeId, opts = {}) {
  const t = THEME_PRESETS[normalizeTheme(themeId)] || THEME_PRESETS["verdigris"];
  const isLight = relLuminance(t.canvas) > 0.5;
  // Semantic palette → the flat COLORS surface every component consumes.
  // One palette field feeds exactly one COLORS role — nothing is re-mixed.
  Object.assign(COLORS, {
    isLight,
    bg: t.canvas, bg1: t.surface1, panel: t.surface1, panel2: t.surface2, border: t.borderDefault,
    text: t.text1, dim: t.text2, faint: t.text3,
    done: t.success, warn: t.warning, danger: t.danger,
    ink: t.accent, mastered: t.accent, accent: t.accent,
    accentFocus: t.focus, accentProgress: t.info, accentWarm: t.warning, accentSuccess: t.success,
    accentPink: "#E8A0C8", violet: t.accent,
    chart: t.chart, selection: t.selection,
    countdownAccent: t.countdown || (isLight ? "#C24330" : "#F0645A"),
    glassShell: t.surface1, glassFill: t.surface2, glassFill2: t.surface1, glassFillStrong: t.surface3,
    glassHero: t.surface3, glassBlur: "0px", glassBlurRail: "0px", glassBlurHero: "0px",
    // Layered material ramp — the six physical steps surfaces sit on.
    canvas: t.canvas,
    sunken: t.sunken || (isLight ? darken(t.surface1, 4) : darken(t.surface1, 3)),
    overlay: t.overlay || (isLight ? "#FFFFFF" : lighten(t.surface3, 6)),
    railBg: t.rail || t.surface2,
    inkSoft: hexToRgba(t.accent, 0.12),
    inkDim: darken(t.accent, 70),
    inkGlow: hexToRgba(t.accent, isLight ? 0.10 : 0.14),
    borderStrong: t.borderStrong,
    hoverOverlay: t.hover,
    surfaceOverlay: isLight ? "rgba(40,35,20,0.18)" : "rgba(0,0,0,0.45)",
    shadow: isLight ? "rgba(40,35,20,0.14)" : "rgba(0,0,0,0.30)",
    shadowStrong: isLight ? "rgba(40,35,20,0.20)" : "rgba(0,0,0,0.45)",
    bgGrad: t.canvas,
  });
  const typography = opts.typography || {};
  const typographyPreset = TYPOGRAPHY_PRESETS[typography.preset] || TYPOGRAPHY_PRESETS.ledger;
  const display = typography.display || typographyPreset.display;
  const body = typography.body || typographyPreset.body;
  const mono = typography.mono || typographyPreset.mono;
  Object.assign(FONTS, {
    display: fontStack(display),
    body: fontStack(body),
    mono: fontStack(mono),
    ui: fontStack(body),   // semantic alias: interface text
    data: fontStack(mono), // semantic alias: metrics/readouts
  });
  FONT_IMPORT = activeFontImport([display, body, mono]);
  COLORS.typography = {
    display: typographyPreset,
    headingWeight: Number(typography.headingWeight) || typographyPreset.headingWeight,
    bodyWeight: Number(typography.bodyWeight) || typographyPreset.bodyWeight,
    uiWeight: Number(typography.uiWeight) || typographyPreset.uiWeight,
    scale: typographyPreset.scale,
    tracking: typographyPreset.tracking,
  };

  // ---- Live appearance overrides (Settings → Appearance) ----
  const accent = ACCENT_PRESETS[opts.accent];
  const hex = typeof opts.hexAccent === "string" && /^#?[0-9a-f]{6}$/i.test(opts.hexAccent) ? opts.hexAccent : null;
  const A = accent ? (accent.accent || accent) : hex ? `#${hex.replace("#", "")}` : null;
  if (A) {
    const glowC = accent ? (accent.accentFocus || A) : A;
    Object.assign(COLORS, {
      ink: A, mastered: A, accent: A,
      accentFocus: glowC, accentProgress: accent ? (accent.accentProgress || A) : A,
      violet: accent ? (accent.violet || A) : darken(A, 12),
      inkSoft: hexToRgba(A, 0.12),
      inkDim: darken(A, 70),
      inkGlow: hexToRgba(glowC, isLight ? 0.12 : 0.18),
      borderStrong: hexToRgba(glowC, isLight ? 0.55 : 0.45),
      hoverOverlay: isLight ? hexToRgba(A, 0.08) : "rgba(255,255,255,0.05)",
    });
  }
  // Derived tokens — always computed from the final accent so theme + accent
  // switches both repaint them. onAccent is luminance-chosen per accent:
  // pale accents (lime, pink, rose) get dark ink; deep ones get white.
  const A2 = COLORS.accent || t.accent;
  COLORS.onAccent = relLuminance(A2) > 0.55 ? "#0B0F1F" : "#FFFFFF";
  COLORS.atmosphere = hexToRgba(COLORS.accentFocus, isLight ? 0.075 : 0.06);
  COLORS.atmosphereSoft = hexToRgba(A2, isLight ? 0.05 : 0.042);
  // Elevation shadows — one per physical tier, all restrained (no bloom).
  COLORS.shadowRaised = `0 8px 24px -14px ${COLORS.shadowStrong}, 0 1px 3px -1px ${COLORS.shadow}`;
  COLORS.shadowFloating = `0 0 0 1px ${COLORS.inkGlow}, 0 12px 30px -16px ${COLORS.shadowStrong}`;
  COLORS.shadowOverlay = `0 0 0 1px ${COLORS.inkGlow}, 0 18px 44px -18px ${COLORS.shadowStrong}`;
  const r = clamp(opts.radius ?? 1, 0.6, 2);
  RADIUS.badge = Math.max(4, Math.round(6 * r));
  RADIUS.control = Math.max(6, Math.round(10 * r));
  RADIUS.card = Math.max(8, Math.round(14 * r));
  RADIUS.modal = Math.max(10, Math.round(18 * r));
  RADIUS.xl = Math.max(12, Math.round(22 * r));
  COLORS.focusShadow = `0 0 0 1px ${COLORS.borderStrong}, 0 0 0 4px ${COLORS.inkSoft}, 0 14px 32px -14px ${COLORS.shadowStrong}`;
  const d = clamp(opts.density ?? 1, 0.85, 1.3);
  Object.keys(BASE_SPACE).forEach(k => { SPACE[k] = Math.round(BASE_SPACE[k] * d); });
  VIEW.zoom = clamp(Number(opts.fontScale) || 100, 80, 130);
  VIEW.glow = clamp(Number(opts.glow) ?? 1, 0, 2);
  const rails = { compact: 56, comfortable: 64, wide: 72 };
  VIEW.railWidth = rails[opts.rail] || 64;
  VIEW.highContrast = !!opts.highContrast;
  VIEW.reduceMotion = !!opts.reduceMotion;
  VIEW.focusRing = clamp(Number(opts.focusRing) ?? 1, 0.5, 2);
  if (VIEW.highContrast) {
    COLORS.border = isLight ? "rgba(30,50,90,0.3)" : "rgba(255,255,255,0.18)";
    COLORS.text = isLight ? "#0B0F1F" : "#FFFFFF";
    COLORS.dim = isLight ? "#2A3550" : "#C9C7DE";
  }
}

applyTheme("verdigris");

export const RANK_COLORS = ["#F2C94C", "#C7CDD6", "#D1965A"];

// Subject identity system — one source of truth for subject colors, reused by
// target entry, recall deck, test trends, mistake ledger, filters, charts.
// Deterministic by name so a subject never changes color between screens.
// Caelestia-muted: physics = soft blue, chemistry = restrained green,
// mathematics = warm amber, biology = mint, english = dusty pink.
const SUBJECT_MAP = [
  { match: "phys", color: "#7FC8E8" },
  { match: "chem", color: "#6FD6A0" },
  { match: "math", color: "#F0B26B" },
  { match: "bio", color: "#6FD6A0" },
  { match: "english", color: "#E8A0C8" },
  { match: "reasoning", color: "#A89BFF" },
];
export function subjectColor(name) {
  const n = String(name || "").toLowerCase();
  const hit = SUBJECT_MAP.find((s) => n.includes(s.match));
  return hit ? hit.color : "#94A0B8";
}
export function subjectDot(name) {
  const c = subjectColor(name);
  return { width: 7, height: 7, borderRadius: 3, background: c, boxShadow: `0 0 0 1px ${hexToRgba(c, 0.22)}` };
}

// Elevation ladder — subtle, physical. No giant black shadows.
export function elev(level) {
  const glow = hexToRgba(COLORS.ink, (COLORS.isLight ? 0.18 : 0.2) * VIEW.glow);
  const tiers = {
    e1: `0 1px 2px ${COLORS.shadow}`,
    e2: `0 8px 24px -14px ${COLORS.shadowStrong}, 0 1px 3px -1px ${COLORS.shadow}`,
    e3: `0 0 0 1px ${glow}, 0 12px 30px -16px ${COLORS.shadowStrong}`,
    e4: `0 0 0 1px ${glow}, 0 18px 44px -18px ${COLORS.shadowStrong}`,
  };
  return tiers[level] || tiers.e2;
}

export function globalCss() {
  const isLight = COLORS.isLight;
  const accent = COLORS.ink;
  const glowC = COLORS.accentFocus || accent;
  const typography = COLORS.typography || { display: TYPOGRAPHY_PRESETS.ledger, headingWeight: 700, bodyWeight: 400, uiWeight: 600, scale: 1, tracking: "-0.025em" };
  const hi = isLight ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.045)";
  const hiTop = isLight ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.07)";
  const track = isLight ? "rgba(20,30,60,0.08)" : "rgba(255,255,255,0.06)";
  const focusW = Math.round(2 * VIEW.focusRing);
  // Film grain as a data-URI. Two intensities: the page background gets a
  // whisper of it (canvas stays near-flat), surfaces carry it at full strength.
  const grainUri = (o) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='${o}'/%3E%3C/svg%3E")`;
  return `
${FONT_IMPORT}
*, *::before, *::after { box-sizing: border-box; }
html, body { overflow-x: hidden; width: 100%; min-height: 100%; }
/* Semantic design tokens — the single source of truth for every surface.
   Components read these through the COLORS object; the CSS vars exist so
   the token system is inspectable and theme-agnostic CSS can use it. */
:root {
  --bg-canvas: ${COLORS.bg};
  --surface-sunken: ${COLORS.sunken};
  --surface-default: ${COLORS.panel};
  --surface-raised: ${COLORS.panel2};
  --surface-floating: ${COLORS.glassFillStrong};
  --surface-overlay: ${COLORS.overlay};
  --surface-rail: ${COLORS.railBg};
  --surface-1: ${COLORS.panel};
  --surface-2: ${COLORS.panel2};
  --surface-3: ${COLORS.glassFillStrong};
  --border-subtle: ${COLORS.border};
  --border-default: ${COLORS.border};
  --border-strong: ${COLORS.borderStrong};
  --border-focus: ${COLORS.accentFocus};
  --text-primary: ${COLORS.text};
  --text-secondary: ${COLORS.dim};
  --text-tertiary: ${COLORS.faint};
  --accent: ${COLORS.ink};
  --accent-hover: ${COLORS.accentFocus};
  --accent-soft: ${COLORS.inkSoft};
  --on-accent: ${COLORS.onAccent || "#FFFFFF"};
  --success: ${COLORS.done};
  --warning: ${COLORS.warn};
  --danger: ${COLORS.danger};
  --info: ${COLORS.accentProgress};
  --countdown-accent: ${COLORS.countdownAccent};
  --chart-1: ${COLORS.chart[0] || "#5BA8E0"};
  --chart-2: ${COLORS.chart[1] || "#4CC38A"};
  --chart-3: ${COLORS.chart[2] || "#E0A45E"};
  --chart-4: ${COLORS.chart[3] || "#E5605A"};
  --chart-5: ${COLORS.chart[4] || "#8C7BFF"};
  --focus-ring: ${COLORS.accentFocus};
  --selection: ${COLORS.selection};
  --radius-sm: ${RADIUS.badge}px;
  --radius-md: ${RADIUS.control}px;
  --radius-lg: ${RADIUS.card}px;
  --radius-xl: ${RADIUS.modal}px;
  --shadow-sm: 0 1px 2px ${COLORS.shadow};
  --shadow-md: 0 8px 24px -14px ${COLORS.shadowStrong}, 0 1px 3px -1px ${COLORS.shadow};
  --shadow-lg: 0 0 0 1px ${COLORS.inkGlow}, 0 18px 44px -18px ${COLORS.shadowStrong};
  --motion-fast: ${MOTION.duration.fast}ms;
  --motion-normal: ${MOTION.duration.normal}ms;
  --motion-slow: ${MOTION.duration.slow}ms;
  /* Editorial display scale — the dashboard hero. The countdown owns the
     page; the clock is a quiet companion. */
  --fs-hero: clamp(112px, 15vw, 240px);
  --fs-clock: clamp(30px, 4.4vw, 60px);
  --fs-num: clamp(24px, 3.2vw, 38px);
   --fs-title: clamp(18px, 2.4vw, 28px);
   /* Typography roles — three voices, one system. --font-ui and --font-data
     are semantic aliases of the body/mono roles; components consume roles,
     never raw families. */
   --font-display: ${FONTS.display};
   --font-body: ${FONTS.body};
   --font-mono: ${FONTS.mono};
   --font-ui: ${FONTS.body};
   --font-data: ${FONTS.mono};
   --text-xs: ${Math.round(10 * typography.scale)}px;
   --text-sm: ${Math.round(12 * typography.scale)}px;
   --text-md: ${Math.round(14 * typography.scale)}px;
   --text-lg: ${Math.round(18 * typography.scale)}px;
   --text-xl: ${Math.round(24 * typography.scale)}px;
   --text-2xl: ${Math.round(32 * typography.scale)}px;
   --text-display: ${Math.round(48 * typography.scale)}px;
   /* Fluid display scale — editorial headings breathe with the viewport and
      clamp so they never overflow a phone. */
   --text-display-xl: clamp(${Math.round(44 * typography.scale)}px, 6.5vw, ${Math.round(84 * typography.scale)}px);
   --text-display-lg: clamp(${Math.round(34 * typography.scale)}px, 5vw, ${Math.round(58 * typography.scale)}px);
   --text-heading-xl: clamp(${Math.round(26 * typography.scale)}px, 4vw, ${Math.round(40 * typography.scale)}px);
   --text-heading-lg: clamp(${Math.round(21 * typography.scale)}px, 3vw, ${Math.round(30 * typography.scale)}px);
   --text-heading-md: clamp(${Math.round(17 * typography.scale)}px, 2.2vw, ${Math.round(21 * typography.scale)}px);
   --text-data-xl: clamp(${Math.round(26 * typography.scale)}px, 3.4vw, ${Math.round(42 * typography.scale)}px);
   --text-data-lg: clamp(${Math.round(19 * typography.scale)}px, 2.4vw, ${Math.round(27 * typography.scale)}px);
   --text-data-md: clamp(${Math.round(15 * typography.scale)}px, 1.8vw, ${Math.round(18 * typography.scale)}px);
   --leading-tight: 1.08;
   --leading-normal: 1.45;
   --leading-relaxed: 1.65;
   --tracking-label: 0.14em;
   --tracking-body: 0.005em;
   --tracking-display: ${typography.tracking};
   --weight-normal: ${typography.bodyWeight};
   --weight-medium: 500;
   --weight-semibold: ${typography.uiWeight};
   --weight-bold: ${typography.headingWeight};
}
html { background: ${COLORS.bg}; }
body {
  color: ${COLORS.text};
  background:
    radial-gradient(1100px 760px at 88% -12%, ${COLORS.atmosphere} 0%, transparent 62%),
    radial-gradient(900px 640px at -6% 110%, ${COLORS.atmosphereSoft} 0%, transparent 58%),
    ${COLORS.bg};
  background-attachment: fixed;
  font-family: ${FONTS.body};
  -webkit-font-smoothing: antialiased;
}
/* Typography scale lives once on the shell: a CSS zoom (Chrome/Safari/Edge +
   Firefox ≥126) that scales every px metric uniformly on all app pages. */
.lg-shell { zoom: ${VIEW.zoom}%; }
.lg-shell-lg-zoom { zoom: ${VIEW.zoom}%; }
/* Reduced motion: user preference OR Settings toggle — the class is applied
   to the shell by App.jsx, and the media query covers OS-level preference. */
.lg-motion-off *, .lg-motion-off *::before, .lg-motion-off *::after {
  animation: none !important;
  transition-duration: 0.001ms !important;
  scroll-behavior: auto !important;
}
::selection { background: ${COLORS.selection}; color: ${COLORS.text}; }

/* Numerals across the whole app use the tabular data role — digits align in
   every readout, timer and table. */
.num {
  font-family: var(--font-data);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

/* System micro-label — tiny uppercase metadata, the Caelestia staple. The
   tracking is controlled (0.14em), never the 0.2em AI-dashboard cliché. */
.sys {
  font-family: var(--font-data);
  font-size: 9px; font-weight: 600; letter-spacing: var(--tracking-label);
  text-transform: uppercase; color: ${COLORS.faint};
  line-height: 1.1;
}

/* Type scale — the hierarchy, named once:
   display → headline → title → body → label(sys) → caption → meta → data.
   These are the canonical roles; .sys/.num remain the shorthand helpers.
   Every step reads its size from the fluid tokens above, so the scale moves
   with the typography preset and never hard-codes an orphan size. */
.t-display { font-family: var(--font-display); font-size: var(--text-display-xl); font-weight: var(--weight-semibold); letter-spacing: var(--tracking-display); line-height: 0.98; color: var(--text-primary); }
.t-display-lg { font-family: var(--font-display); font-size: var(--text-display-lg); font-weight: var(--weight-semibold); letter-spacing: var(--tracking-display); line-height: 1; color: var(--text-primary); }
.t-headline { font-family: var(--font-display); font-size: var(--text-heading-xl); font-weight: var(--weight-semibold); letter-spacing: var(--tracking-display); line-height: 1.06; color: var(--text-primary); }
.t-heading-lg { font-family: var(--font-display); font-size: var(--text-heading-lg); font-weight: var(--weight-semibold); letter-spacing: var(--tracking-display); line-height: 1.1; color: var(--text-primary); }
.t-heading-md { font-family: var(--font-ui); font-size: var(--text-heading-md); font-weight: var(--weight-semibold); letter-spacing: -0.01em; line-height: 1.25; color: var(--text-primary); }
.t-title { font-family: var(--font-ui); font-size: var(--text-lg); font-weight: var(--weight-semibold); letter-spacing: -0.01em; line-height: 1.25; color: var(--text-primary); }
.t-body { font-family: var(--font-ui); font-weight: var(--weight-normal); font-size: var(--text-md); line-height: 1.6; color: var(--text-secondary); }
.t-body-sm { font-family: var(--font-ui); font-weight: var(--weight-normal); font-size: var(--text-sm); line-height: 1.55; color: var(--text-secondary); }
.t-caption { font-family: var(--font-ui); font-weight: var(--weight-normal); font-size: ${Math.round(11.5 * typography.scale)}px; line-height: 1.5; color: var(--text-secondary); }
.t-label { font-family: var(--font-ui); font-size: var(--text-xs); font-weight: var(--weight-semibold); letter-spacing: var(--tracking-label); text-transform: uppercase; color: var(--text-tertiary); line-height: 1.3; }
.t-meta { font-family: var(--font-data); font-size: var(--text-xs); font-weight: var(--weight-medium); letter-spacing: 0.06em; color: var(--text-tertiary); }
.t-num { font-family: var(--font-data); font-variant-numeric: tabular-nums; letter-spacing: -0.02em; color: var(--text-primary); }
.t-data-xl { font-family: var(--font-data); font-size: var(--text-data-xl); font-weight: var(--weight-semibold); font-variant-numeric: tabular-nums; letter-spacing: -0.03em; line-height: 1; color: var(--text-primary); }
.t-data-lg { font-family: var(--font-data); font-size: var(--text-data-lg); font-weight: var(--weight-semibold); font-variant-numeric: tabular-nums; letter-spacing: -0.025em; line-height: 1.05; color: var(--text-primary); }
.t-data-md { font-family: var(--font-data); font-size: var(--text-data-md); font-weight: var(--weight-medium); font-variant-numeric: tabular-nums; letter-spacing: -0.015em; line-height: 1.2; color: var(--text-primary); }

/* Desktop canvas: full-bleed, no floating slab. */
.lg-shell {
  background: transparent;
  height: 100vh;
  max-width: 100vw;
}
.lg-main, .app-main { background: transparent !important; max-height: none !important; }

::-webkit-scrollbar { width: 9px; height: 9px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: ${track}; border-radius: 999px; border: 2px solid transparent; background-clip: padding-box; }
::-webkit-scrollbar-thumb:hover { background: ${hexToRgba(accent, 0.35)}; border: 2px solid transparent; background-clip: padding-box; }

.lg-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(var(--lg-min, 140px), 1fr)); }
.lg-nav-item span { white-space: nowrap; }

/* Desktop composition — two-column desk that collapses on smaller screens */
.lg-desk { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 24px; align-items: start; }
@media (max-width: 1080px) {
  .lg-desk { grid-template-columns: 1fr !important; }
  .lg-sticky { position: static !important; }
}

/* Desktop canvas — a sparse asymmetric composition, not a widget grid */
.lg-canvas { max-width: 1240px; margin: 0 auto; padding: 36px 48px 72px; min-height: calc(100vh - 140px); }
@media (max-width: 900px) {
  .lg-canvas { padding: 16px 16px 40px; min-height: auto; }
}

/* ---------- Motion primitives (reusable, respect reduced-motion) ---------- */
/* Entrance stagger — applies to direct children of .lg-stagger */
@keyframes lg-fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes lg-fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes lg-scaleIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes lg-slideInRight {
  from { opacity: 0; transform: translateX(12px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes lg-slideInLeft {
  from { opacity: 0; transform: translateX(-12px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes lg-slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Stagger delays — each child gets 1-indexed delay via inline style or nth-child */
.lg-stagger > * { animation: lg-fadeInUp 320ms cubic-bezier(0.2,0.8,0.2,1) both; }
.lg-stagger.fade > * { animation: lg-fadeIn 240ms ease-out both; }
.lg-stagger.scale > * { animation: lg-scaleIn 280ms cubic-bezier(0.2,0.8,0.2,1) both; }
.lg-stagger.slide-right > * { animation: lg-slideInRight 300ms cubic-bezier(0.2,0.8,0.2,1) both; }
.lg-stagger.slide-left > * { animation: lg-slideInLeft 300ms cubic-bezier(0.2,0.8,0.2,1) both; }
.lg-stagger.slide-up > * { animation: lg-slideUp 340ms cubic-bezier(0.2,0.8,0.2,1) both; }

/* Page/tab transition — wrap content in .lg-page-transition */
@keyframes lg-pageEnter {
  from { opacity: 0; transform: translateX(20px) scale(0.995); }
  to { opacity: 1; transform: translateX(0) scale(1); }
}
@keyframes lg-pageExit {
  from { opacity: 1; transform: translateX(0) scale(1); }
  to { opacity: 0; transform: translateX(-20px) scale(0.995); }
}
.lg-page-transition-enter { animation: lg-pageEnter 280ms cubic-bezier(0.2,0.8,0.2,1) both; }
.lg-page-transition-exit { animation: lg-pageExit 200ms ease-in both; }

/* Modal/drawer/sheet — slide from edge */
@keyframes lg-sheetEnter {
  from { opacity: 0; transform: translateY(100%); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes lg-drawerEnter {
  from { opacity: 0; transform: translateX(-100%); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes lg-modalEnter {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes lg-backdropEnter {
  from { opacity: 0; }
  to { opacity: 1; }
}
.lg-sheet-enter { animation: lg-sheetEnter 320ms cubic-bezier(0.2,0.8,0.2,1) both; }
.lg-drawer-enter { animation: lg-drawerEnter 280ms cubic-bezier(0.2,0.8,0.2,1) both; }
.lg-modal-enter { animation: lg-modalEnter 240ms cubic-bezier(0.2,0.8,0.2,1) both; }
.lg-backdrop-enter { animation: lg-backdropEnter 200ms ease-out both; }

/* Button press ripple — subtle, fast */
@keyframes lg-ripple {
  from { transform: scale(0); opacity: 0.18; }
  to { transform: scale(2.5); opacity: 0; }
}
.lg-ripple { position: relative; overflow: hidden; }
.lg-ripple::after {
  content: "";
  position: absolute; inset: 0; border-radius: inherit;
  background: radial-gradient(circle at center, ${hexToRgba(glowC, 0.35)} 0%, transparent 70%);
  transform: scale(0);
  pointer-events: none;
}
.lg-ripple:active::after { animation: lg-ripple 180ms ease-out; }

/* Focus ring morph — expands on focus, contracts on blur */
@keyframes lg-focusRingIn {
  from { box-shadow: 0 0 0 0 ${hexToRgba(glowC, 0)}; }
  to { box-shadow: 0 0 0 3px ${hexToRgba(glowC, 0.18)}; }
}
@keyframes lg-focusRingOut {
  from { box-shadow: 0 0 0 3px ${hexToRgba(glowC, 0.18)}; }
  to { box-shadow: 0 0 0 0 ${hexToRgba(glowC, 0)}; }
}
.lg-focus-ring:focus-visible {
  outline: none;
  animation: lg-focusRingIn 140ms ease-out forwards;
}

/* Skeleton shimmer — for loading states */
@keyframes lg-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.lg-skeleton {
  background: linear-gradient(90deg,
    ${COLORS.glassFill2} 25%,
    ${hexToRgba(glowC, 0.06)} 50%,
    ${COLORS.glassFill2} 75%
  );
  background-size: 200% 100%;
  animation: lg-shimmer 1.4s ease-in-out infinite;
}
.lg-skeleton-subtle { animation-duration: 2s; opacity: 0.6; }

/* List item slide/reorder */
@keyframes lg-listEnter {
  from { opacity: 0; transform: translateX(-16px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes lg-listExit {
  from { opacity: 1; transform: translateX(0); height: auto; }
  to { opacity: 0; transform: translateX(16px); height: 0; margin: 0; padding: 0; overflow: hidden; }
}
.lg-list-item-enter { animation: lg-listEnter 240ms cubic-bezier(0.2,0.8,0.2,1) both; }
.lg-list-item-exit { animation: lg-listExit 200ms ease-in both; }

/* Card entrance — for dashboards, grids */
@keyframes lg-cardEnter {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.lg-card-enter { animation: lg-cardEnter 360ms cubic-bezier(0.2,0.8,0.2,1) both; }

/* Progress ring morph — smooth value changes */
@keyframes lg-progressMorph {
  from { stroke-dashoffset: var(--lg-progress-from, 0); }
  to { stroke-dashoffset: var(--lg-progress-to, 0); }
}
.lg-progress-morph { animation: lg-progressMorph 900ms cubic-bezier(0.2,0.8,0.2,1) forwards; }

/* Toast/notification slide */
@keyframes lg-toastEnter {
  from { opacity: 0; transform: translateY(-8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes lg-toastExit {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to { opacity: 0; transform: translateY(-8px) scale(0.98); }
}
.lg-toast-enter { animation: lg-toastEnter 220ms cubic-bezier(0.2,0.8,0.2,1) both; }
.lg-toast-exit { animation: lg-toastExit 180ms ease-in both; }

/* Number count-up */
@keyframes lg-countUp {
  from { transform: translateY(0.5em); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.lg-count-up { animation: lg-countUp 400ms cubic-bezier(0.2,0.8,0.2,1) both; }

/* Reduced motion overrides */
@media (prefers-reduced-motion: reduce) {
  .lg-stagger > *,
  .lg-page-transition-enter,
  .lg-page-transition-exit,
  .lg-sheet-enter,
  .lg-drawer-enter,
  .lg-modal-enter,
  .lg-backdrop-enter,
  .lg-ripple:active::after,
  .lg-focus-ring:focus-visible,
  .lg-skeleton,
  .lg-list-item-enter,
  .lg-list-item-exit,
  .lg-card-enter,
  .lg-progress-morph,
  .lg-toast-enter,
  .lg-toast-exit,
  .lg-count-up {
    animation-duration: 0.001ms !important;
    animation-delay: 0s !important;
    transition-duration: 0.001ms !important;
  }
  .lg-skeleton { animation: none; background: ${COLORS.glassFill2}; }
}

/* ---------- Surfaces: tonal layers, no glass. ---------- */
/* Surface grain — texture lives on the modules, not the canvas behind them.
   A soft overlay blend so it reads as material, not dirt. Add .lg-grain to
   any card. Painted via ::before so :hover shadows and content stay intact;
   pointer-events:none keeps every click passing through. */
.lg-grain { position: relative; }
.lg-grain::before {
  content: "";
  position: absolute; inset: 0;
  border-radius: inherit;
  background-image: ${grainUri(0.5)};
  background-size: 140px 140px;
  opacity: 0.6;
  mix-blend-mode: overlay;
  pointer-events: none;
}
/* widget — the default surface: tone + hairline border, sitting flat on the
   canvas. Elevation-1. Interaction raises it (see .lg-card-hover below). */
.lg-card {
  background: ${COLORS.glassFill2};
  border: 1px solid ${COLORS.border};
  border-radius: ${RADIUS.card}px;
  box-shadow: inset 0 1px 0 ${hi};
  transition: border-color 0.16s ease-out, background 0.16s ease-out, transform 0.16s cubic-bezier(0.2,0.8,0.2,1), box-shadow 0.16s ease-out;
}
.lg-card-interactive { cursor: pointer; }
.lg-card-interactive:hover {
  border-color: ${hexToRgba(glowC, 0.4)};
  background: ${COLORS.glassFill};
  box-shadow: inset 0 1px 0 ${hi}, ${COLORS.shadowRaised};
}
.lg-card-interactive:active { transform: translateY(0); }

/* lg-card-hover — the quiet discoverable card: flat by default (elevation-1),
   lifts to elevation-2 on hover. Composable: add to any .lg-card. */
.lg-card-hover {
  transition: background 0.18s ease-out, transform 0.18s cubic-bezier(0.2,0.8,0.2,1), border-color 0.18s ease-out, box-shadow 0.18s ease-out;
}
.lg-card-hover:hover {
  border-color: ${hexToRgba(glowC, 0.32)};
  background: ${COLORS.glassFill};
  box-shadow: inset 0 1px 0 ${hi}, ${COLORS.shadowRaised};
}
.lg-card-hover:active { transform: translateY(0); }

/* module — quiet surface, borderless, tone-separated only */
.lg-module {
  background: ${COLORS.glassFill2};
  border-radius: ${RADIUS.card}px;
  border: 1px solid transparent;
}

.lg-row { transition: background 0.14s ease-out; border-radius: 8px; }
.lg-row:hover { background: ${COLORS.hoverOverlay}; }
/* Row content: title reads brighter on hover, destructive action wakes up. */
.lg-row-title { color: ${hexToRgba(COLORS.text, 0.9)}; transition: color 0.16s ease-out; }
.lg-row:hover .lg-row-title { color: ${COLORS.text}; }
.lg-row-del { opacity: 0.72; transition: opacity 0.16s ease-out, color 0.16s ease-out; }
.lg-row:hover .lg-row-del { opacity: 1; color: ${COLORS.danger}; }

/* Completion bubble — crisp, compact, tactile. */
.lg-bubble { transition: transform 0.18s cubic-bezier(0.2,0.8,0.2,1); }
.lg-bubble:hover { transform: scale(1.07); }
.lg-bubble:active { transform: scale(0.9); }
@keyframes lg-checkPop {
  0% { transform: scale(0.55); opacity: 0.3; }
  60% { transform: scale(1.12); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.lg-bubble-pop { animation: lg-checkPop 0.3s cubic-bezier(0.2,0.8,0.2,1) both; }

/* Status dot — ambient, alive but quiet. */
/* Status indicators — static, no decorative pulse */
.lg-statusdot { /* Static indicator — color communicates state */ }

.lg-pcell { transition: filter 0.14s ease-out, transform 0.14s ease-out; }
.lg-pcell:hover { filter: brightness(1.25); transform: scale(1.12); }

/* ---------- Buttons: compact system stamps ---------- */
.lg-btn {
  border-radius: ${RADIUS.control}px;
  transition: filter 0.14s ease-out, border-color 0.14s ease-out, background 0.14s ease-out, transform 0.14s cubic-bezier(0.2,0.8,0.2,1);
}
.lg-btn:active:not(:disabled) { transform: translateY(1px) scale(0.98); }
.lg-btn-ink {
  background: linear-gradient(150deg, ${glowC}, ${darken(glowC, 26)});
  border-color: transparent;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 22px -12px ${hexToRgba(glowC, 0.32 * VIEW.glow)};
}
.lg-btn-ink:hover:not(:disabled) { filter: brightness(1.07); box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 10px 26px -14px ${hexToRgba(glowC, 0.38 * VIEW.glow)}; }
.lg-btn-ink:active:not(:disabled) { box-shadow: inset 0 1px 0 rgba(255,255,255,0.18); }
.lg-btn-ghost:hover:not(:disabled) { background: ${COLORS.hoverOverlay}; border-color: ${COLORS.borderStrong}; color: ${COLORS.text}; }

/* Ghost mini-stamp — the compact ghost button used inside cards and rows
   (chapter actions, recall jump). Same language as lg-btn-ghost, sized for
   inline placement, no inherited browser styling. */
.lg-mini {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 4px; font-family: ${FONTS.body}; font-size: 10.5px; font-weight: 600;
  color: ${COLORS.faint}; background: transparent;
  border: 1px solid ${COLORS.border}; border-radius: 6px;
  padding: 3px 8px; cursor: pointer;
  transition: color 0.14s ease-out, border-color 0.14s ease-out, background 0.14s ease-out;
}
.lg-mini:hover { color: ${COLORS.text}; border-color: ${COLORS.borderStrong}; background: ${COLORS.hoverOverlay}; }
.lg-mini:active { transform: translateY(1px); }

/* Quiet text action — lowest-emphasis button (guest/demo, auxiliary links). */
.lg-link-btn { transition: color 0.14s ease-out, opacity 0.14s ease-out; color: ${COLORS.dim}; }
.lg-link-btn:hover { color: ${COLORS.text}; }

/* Loading shimmer on a filled primary: the same sweep + keyframes as the
   skeleton field, low-contrast so it stays behind the label. */
.lg-btn-shimmer.lg-btn-ink { position: relative; overflow: hidden; }
.lg-btn-shimmer::after {
  content: ""; position: absolute; inset: 0; z-index: 0;
  background: linear-gradient(115deg, transparent 32%, rgba(255,255,255,0.1) 50%, transparent 68%);
  background-size: 220% 100%;
  animation: lg-shimmer 1.3s ease-in-out infinite;
  pointer-events: none;
}
/* Grid-stacked button label: both states occupy one cell, so on-axis
   swapping never shifts the button's dimensions. */
.lg-btn-label { position: relative; z-index: 1; display: inline-grid; place-items: center; }
.lg-btn-label > span { grid-area: 1 / 1; transition: opacity 0.15s ease-out; }

/* ---------- Inputs: tight system fields ---------- */
.lg-input { border-radius: ${RADIUS.control}px !important; transition: border-color 0.18s ease-out, box-shadow 0.18s ease-out; }
.lg-input:hover { border-color: ${COLORS.borderStrong} !important; }
.lg-input:focus {
  outline: none;
  border-color: ${hexToRgba(glowC, 0.65)} !important;
  box-shadow: 0 0 0 3px ${hexToRgba(glowC, 0.08)} !important;
}
.lg-input::placeholder { color: ${COLORS.faint}; }

/* Segmented control — one coherent control with the input family. */
.lg-seg {
  display: inline-flex; align-items: center; gap: 2px;
  padding: 3px; border-radius: ${RADIUS.control}px;
  background: ${COLORS.sunken}; border: 1px solid ${COLORS.border};
  box-sizing: border-box;
}
.lg-seg-item {
  display: inline-flex; align-items: center; justify-content: center;
  height: 26px; padding: 0 12px; border-radius: 7px;
  border: none; background: transparent;
  color: ${COLORS.faint}; font-size: 11px; font-weight: 500;
  font-family: ${FONTS.body}; cursor: pointer;
  transition: background 0.16s ease-out, color 0.16s ease-out, box-shadow 0.16s ease-out;
}
.lg-seg-item:hover { color: ${COLORS.text}; background: ${COLORS.hoverOverlay}; }
.lg-seg-item.active {
  color: ${COLORS.text};
  background: ${COLORS.glassFillStrong};
  box-shadow: inset 0 1px 0 ${hi}, 0 2px 6px -3px ${COLORS.shadowStrong};
}
.lg-seg-item:focus-visible { outline-offset: -2px; border-radius: 7px; }

/* Status chip — quiet metadata toggle. */
.lg-chip {
  padding: 4px 9px; border-radius: 6px; cursor: pointer;
  font-family: ${FONTS.mono}; font-size: 9.5px; font-weight: 600; letter-spacing: 0.08em;
  background: transparent; border: 1px solid ${COLORS.border}; color: ${COLORS.faint};
  transition: background 0.15s ease-out, border-color 0.15s ease-out, color 0.15s ease-out;
}
.lg-chip:hover { color: ${COLORS.text}; border-color: ${hexToRgba(COLORS.text, 0.18)}; background: ${COLORS.hoverOverlay}; }
.lg-chip.active { color: ${COLORS.accentFocus}; background: ${hexToRgba(COLORS.accentFocus, 0.12)}; border-color: ${hexToRgba(COLORS.accentFocus, 0.4)}; }

input[type="checkbox"], input[type="radio"] { accent-color: ${glowC}; cursor: pointer; }

/* Settings in-page sub-nav: a quiet vertical list, active row gets the
   compact 2px accent bar (matches the dock rail's active indicator). */
.lg-settings-nav { position: sticky; top: 12px; align-self: flex-start; }
@media (max-width: 860px) {
  .lg-settings-nav { position: static !important; width: 100% !important; display: flex; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
  .lg-settings-nav::-webkit-scrollbar { display: none; }
  .lg-settings-nav .lg-settings-item { flex-shrink: 0; }
}
/* Flat toggle switches (Settings) — quiet until used. */
.lg-switch { outline: none; }
.lg-switch:focus-within {
  outline: ${focusW}px solid ${hexToRgba(glowC, 0.8)};
  outline-offset: 2px;
  border-radius: 999px;
}

/* ---------- Page transition: gentle fade, no bounce ---------- */
@keyframes lg-fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.lg-page { animation: lg-fadeUp 0.3s cubic-bezier(0.2,0.8,0.2,1) both; }

@keyframes lg-tick { 0% { transform: translateY(4px) scale(1.02); opacity: 0.3; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
.lg-tick { animation: lg-tick 0.38s cubic-bezier(0.2,0.8,0.2,1) both; }

/* The hero bento grid: Next Move | countdown share one glass row. */
.lg-hero-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 12px; }
/* ---------- Focal surface: the one soft-raise container ---------- */
.lg-hero {
  position: relative;
  overflow: hidden;
  background: linear-gradient(168deg, ${COLORS.glassFillStrong}, ${COLORS.glassFill});
  border: 1px solid ${COLORS.border};
  border-radius: ${RADIUS.modal}px;
  box-shadow: inset 0 1px 0 ${hiTop};
}
.lg-hero::after {
  content: ""; position: absolute; left: 0; right: 0; top: -1px; height: 1px;
  background: linear-gradient(90deg, transparent, ${hexToRgba(glowC, 0.45)}, transparent);
}

/* ---------- Progress: squared system bars, no glow ---------- */
@keyframes lg-fillIn { from { width: 0%; } to { width: var(--lg-w, 100%); } }
.lg-progress {
  background: ${isLight ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.055)"};
  border-radius: 3px;
  overflow: hidden;
  box-shadow: inset 0 1px 2px ${isLight ? "rgba(20,30,60,0.12)" : "rgba(0,0,0,0.4)"};
}
.lg-progress-fill {
  background: linear-gradient(90deg, ${darken(glowC, 18)}, ${glowC});
  border-radius: 3px;
  animation: lg-fillIn 0.6s cubic-bezier(0.2,0.8,0.2,1) both;
  transform-origin: left;
  transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* ---------- Empty state dish ---------- */
.lg-empty-icon {
  width: 40px; height: 40px; border-radius: ${RADIUS.control}px;
  display: flex; align-items: center; justify-content: center;
  background: ${COLORS.glassFill2}; border: 1px solid ${COLORS.border};
}

/* ---------- Dock (floating timer, popovers): the ONLY blurred surfaces ---------- */
.lg-dock {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.lg-dock-item {
  position: relative;
  display: flex; flex-direction: column; gap: 8px;
  padding: 14px 16px;
  border-radius: ${RADIUS.card}px;
  border: 1px solid ${COLORS.border};
  background: ${COLORS.glassFill};
  box-shadow: inset 0 1px 0 ${hi};
  cursor: pointer; text-align: left;
  transition: transform 0.18s cubic-bezier(0.2,0.8,0.2,1), border-color 0.18s ease-out;
}
.lg-dock-item:hover { border-color: ${hexToRgba(glowC, 0.38)}; }
.lg-dock-item.primary {
  background: linear-gradient(165deg, ${hexToRgba(glowC, 0.26)}, ${COLORS.glassFill});
  border-color: ${hexToRgba(glowC, 0.5)};
}
.lg-dock-icon { transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1); }
.lg-dock-item:hover .lg-dock-icon { transform: translateY(-1px) scale(1.04); }
@media (max-width: 720px) { .lg-dock { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

input[type="range"] { accent-color: ${glowC}; cursor: pointer; }
.lg-cell, .lg-cell:hover, .lg-cell:focus { border-radius: ${RADIUS.badge}px; }

/* ---------- Dock rail: slim icon column ---------- */
/* Deterministic dock geometry: the rail and every layer under it use real
   pixel widths, never percentage chains inside centered flex containers
   (those collapse to content width and squeeze the icons). Each item is an
   anchored 44×44 hit cell; the label only ever fades/expands to the right,
   the rail keeps its 64px state until it slides open on hover — so icons
   never move and never get clipped. The rail also owns a quiet hairline
   surface of its own so the icons read as one deliberate instrument, not
   loose glyphs floating on the page. */
.lg-sidebar {
  width: 64px !important;
  background: transparent;
  border: none;
  box-shadow: none;
}
/* The rail lives inside a flex wrapper that reserves space in the shell row.
   Expanding the rail grows the wrapper, so the main column is pushed over —
   content never renders underneath the rail, in any state (hover, keyboard
   focus or pinned). Sidebar.jsx toggles .lg-side-wrap-open; the CSS :hover /
   :focus-within rules below keep the rail's visuals in sync with it. */
.lg-side-wrap { position: relative; width: ${VIEW.railWidth}px; flex-shrink: 0; transition: width 0.28s cubic-bezier(0.3, 1.1, 0.4, 1); }
.lg-side-wrap.lg-side-wrap-open { width: ${VIEW.railWidth + 110}px; }
.lg-side {
  position: absolute; top: 0; bottom: 0; left: 0;
  width: 100% !important;
  padding: 18px 10px 16px;
  display: flex; flex-direction: column; align-items: center;
  overflow: visible;
  background: ${COLORS.railBg};
  border-right: 1px solid ${COLORS.border};
  box-shadow: inset 0 1px 0 ${hi};
  transition: background 0.22s ease-out, border-color 0.22s ease-out;
  z-index: 44;
}
.lg-side:hover, .lg-side:focus-within, .lg-side-wrap-open .lg-side {
  background: ${COLORS.railBg};
  border-right: 1px solid ${hexToRgba(glowC, 0.22)};
  box-shadow: inset 0 1px 0 ${hi}, 26px 10px 46px -34px ${COLORS.shadowStrong}, 0 0 0 1px ${hexToRgba(glowC, 0.06)};
}
/* Pinned (collapsed-toggle) state — the rail stays open without hover. Same
   visuals as :hover, declared after it so it wins on the label rules. */
.lg-side-pinned {
  background: ${COLORS.railBg};
  border-right: 1px solid ${hexToRgba(glowC, 0.22)};
  box-shadow: inset 0 1px 0 ${hi}, 26px 10px 46px -34px ${COLORS.shadowStrong}, 0 0 0 1px ${hexToRgba(glowC, 0.06)};
}
/* The one fixed-size surface in the rail: a 44×44 hit cell, icon centered.
   Some hand-grounded geometry: 64px dock → 44px clickable → 20px icon. */
.lg-ic-anchor {
  width: 44px; height: 44px;
  flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 8px;
  transition: background 0.16s ease-out;
}
/* The nav list is allowed to stretch to fill the rail, and its rows are
   centered as a group — no dead air between the overflow button and the
   avatar at the bottom. */
.lg-sidebar-nav { width: 100%; justify-content: center; }
/* Dock labels are absolutely positioned against the 44px icon column, so
   expanding the rail on hover never nudges the icons themselves — labels
   just fade into the space beside each row. */
.lg-side .dock-label {
  position: absolute;
  left: 44px; top: 50%;
  transform: translateY(-50%) translateX(-100%);
  width: 104px; opacity: 0; overflow: hidden; white-space: nowrap;
  pointer-events: none;
  z-index: 2;
  transition: transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.18s ease-out 0.04s;
}
.lg-side:hover .dock-label, .lg-side:focus-within .dock-label { transform: translateY(-50%) translateX(0); opacity: 1; }
.lg-side-pinned .dock-label { transform: translateY(-50%) translateX(0); opacity: 1; }
/* Brand wordmark — fades in beside the mark on hover/pin, like the labels. */
.lg-side .lg-brand-name {
  position: absolute; left: 44px; top: 50%;
  transform: translateY(-50%) translateX(-100%);
  width: 170px; opacity: 0; overflow: hidden; white-space: nowrap;
  pointer-events: none; z-index: 2;
  display: flex; align-items: baseline; gap: 8px;
  transition: transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.18s ease-out 0.04s;
}
.lg-side:hover .lg-brand-name, .lg-side:focus-within .lg-brand-name, .lg-side-pinned .lg-brand-name { transform: translateY(-50%) translateX(0); opacity: 1; }
/* Pin toggle — the only way to keep the rail open; appears on hover/pin.
   It pops in with a spring and the icon flips 180° when pinned. */
.lg-pin-btn {
  position: absolute; top: 12px; right: 8px;
  width: 22px; height: 22px; border-radius: 7px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid transparent; background: transparent;
  color: ${COLORS.faint}; cursor: pointer;
  opacity: 0; pointer-events: none;
  transform: scale(0.6);
  z-index: 10;
  transition: opacity 0.18s ease-out, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.16s ease-out, background 0.16s ease-out;
}
.lg-side:hover .lg-pin-btn, .lg-side:focus-within .lg-pin-btn, .lg-side-pinned .lg-pin-btn { opacity: 1; pointer-events: auto; transform: scale(1); }
.lg-pin-btn:hover { color: ${glowC}; background: ${COLORS.hoverOverlay}; }
.lg-pin-btn[aria-pressed="true"] { color: ${glowC}; }
.lg-pin-btn svg { transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1); }
.lg-pin-btn[aria-pressed="true"] svg { transform: rotate(180deg); }
@media (hover: none) {
  .lg-side { position: static !important; width: 64px !important; padding: 10px 10px; }
  .lg-side:hover { width: 64px !important; box-shadow: none; }
  .lg-side-wrap.lg-side-wrap-open { width: 64px !important; }
  .lg-side .dock-label, .lg-side .lg-brand-name { display: none !important; }
  .lg-side .lg-pin-btn { display: none !important; }
}
.lg-nav-item {
  position: relative;
  display: flex; align-items: center;
  width: 100%; height: 44px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: ${COLORS.faint};
  background: transparent;
  border: 1px solid transparent;
  overflow: visible;
  transition: color 0.16s ease-out, background 0.16s ease-out, border-color 0.16s ease-out, box-shadow 0.16s ease-out, width 0.28s cubic-bezier(0.3, 1.1, 0.4, 1);
}
.lg-nav-item:hover { color: ${COLORS.text}; background: ${COLORS.hoverOverlay}; border-color: ${hexToRgba(COLORS.text, 0.06)}; }
.lg-nav-item:active { transform: scale(0.97); }
.lg-nav-item.active {
  color: ${glowC};
  background: ${isLight ? hexToRgba(glowC, 0.10) : hexToRgba(glowC, 0.09)};
  border-color: ${hexToRgba(glowC, 0.14)};
  box-shadow: inset 0 1px 0 ${hi};
}
.lg-nav-item.active::before {
  content: "";
  position: absolute; left: -2px; top: 50%;
  transform: translateY(-50%);
  width: 2px; height: 16px; border-radius: 999px;
  background: ${glowC};
  /* Static indicator — no decorative pulse. Active state communicated via
     this bar + the quiet surface fill above; no glow, no gradient wash. */
}
/* Inside the dock: rows are fixed 44px cells with no extra padding; the icon
   cell shares that exact width, so the whole column sits on one center line
   and labels (absolutely positioned) can never nudge an icon out of place. */
.lg-side .lg-nav-item { gap: 0; padding: 0; width: 44px; height: 44px; }
/* Open rail: the entire row becomes ONE click target — icon, label and the
   whitespace between them all live inside the button's hit area. The icon
   column never moves; the row only grows rightward. */
.lg-side-wrap-open .lg-side .lg-nav-item,
.lg-side:hover .lg-nav-item,
.lg-side:focus-within .lg-nav-item,
.lg-side-pinned .lg-nav-item {
  width: 100%;
  transition: width 0.28s cubic-bezier(0.3, 1.1, 0.4, 1);
}

/* The account cell docks to the rail floor — it stays a 44px cell on the
   same center line as the nav, but the nav group centers above it. When the
   rail opens the cell stretches with it, so the streak label sits inside a
   full-width row surface. */
.lg-account-cell { position: absolute; bottom: 14px; left: 10px; right: 10px; }
.lg-side-wrap-open .lg-account-cell, .lg-side:hover .lg-account-cell, .lg-side-pinned .lg-account-cell {
  width: auto !important;
  border-radius: 10px;
  transition: width 0.28s cubic-bezier(0.3, 1.1, 0.4, 1), background 0.16s ease-out;
}
.lg-account-cell:hover { background: ${COLORS.hoverOverlay}; }

/* ---------- Dock motion ---------- */
/* One-time staggered rise as the rail mounts. Fill is backwards so the
   entrance releases after it runs and never blocks the :active scale. */
@keyframes lgNavIn { from { opacity: 0; transform: translateY(8px); } }
.lg-side .lg-nav-item { animation: lgNavIn 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.lg-side .lg-nav-item:nth-child(1) { animation-delay: 0.04s; }
.lg-side .lg-nav-item:nth-child(2) { animation-delay: 0.08s; }
.lg-side .lg-nav-item:nth-child(3) { animation-delay: 0.12s; }
.lg-side .lg-nav-item:nth-child(4) { animation-delay: 0.16s; }
.lg-side .lg-nav-item:nth-child(5) { animation-delay: 0.2s; }
.lg-side .lg-nav-item:nth-child(6) { animation-delay: 0.24s; }
.lg-side .lg-nav-item:nth-child(8) { animation-delay: 0.3s; }
/* Icon micro-interaction: a springy pop on hover, squash on press. */
.lg-side .lg-nav-item .lg-ic-anchor {
  transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.16s ease-out, box-shadow 0.22s ease-out;
}
.lg-side .lg-nav-item:hover .lg-ic-anchor { transform: scale(1.06); }
.lg-side .lg-nav-item:active .lg-ic-anchor { transform: scale(0.94); }
/* Active row: the icon inherits the row's accent color — no glow halo. */
.lg-nav-item.active .lg-ic-anchor { box-shadow: none; }
/* The active left tick grows in on tab change. */
@keyframes lgBarIn { from { transform: translateY(-50%) scaleY(0.2); opacity: 0; } }
.lg-nav-item.active::before { animation: lgBarIn 0.32s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
/* Recall dot — soft attention pulse (suppressed by lg-motion-off). */
@keyframes lgDotPulse {
  0% { box-shadow: 0 0 0 0 ${hexToRgba(glowC, 0.55)}, 0 0 0 2px ${COLORS.bg}; }
  70% { box-shadow: 0 0 0 6px ${hexToRgba(glowC, 0)}, 0 0 0 2px ${COLORS.bg}; }
  100% { box-shadow: 0 0 0 0 ${hexToRgba(glowC, 0)}, 0 0 0 2px ${COLORS.bg}; }
}
.lg-notice-dot { animation: lgDotPulse 1.8s ease-out infinite; }
/* Labels cascade in as the rail opens — one beat per row, top to bottom. */
.lg-side:hover .lg-nav-item:nth-child(1) .dock-label, .lg-side:focus-within .lg-nav-item:nth-child(1) .dock-label { transition-delay: 0.03s; }
.lg-side:hover .lg-nav-item:nth-child(2) .dock-label, .lg-side:focus-within .lg-nav-item:nth-child(2) .dock-label { transition-delay: 0.055s; }
.lg-side:hover .lg-nav-item:nth-child(3) .dock-label, .lg-side:focus-within .lg-nav-item:nth-child(3) .dock-label { transition-delay: 0.08s; }
.lg-side:hover .lg-nav-item:nth-child(4) .dock-label, .lg-side:focus-within .lg-nav-item:nth-child(4) .dock-label { transition-delay: 0.105s; }
.lg-side:hover .lg-nav-item:nth-child(5) .dock-label, .lg-side:focus-within .lg-nav-item:nth-child(5) .dock-label { transition-delay: 0.13s; }
.lg-side:hover .lg-nav-item:nth-child(6) .dock-label, .lg-side:focus-within .lg-nav-item:nth-child(6) .dock-label { transition-delay: 0.155s; }
.lg-side:hover .lg-nav-item:nth-child(8) .dock-label, .lg-side:focus-within .lg-nav-item:nth-child(8) .dock-label { transition-delay: 0.18s; }
.lg-side:hover .lg-account-cell .dock-label, .lg-side:focus-within .lg-account-cell .dock-label { transition-delay: 0.2s; }
.lg-side:hover .lg-brand-name, .lg-side:focus-within .lg-brand-name { transition-delay: 0.22s; }
/* Brand plate — square mono tile, not a glowing gem. Hover: a quiet lift
   with the inset top edge only — no outer bloom. */
.lg-brand-plate { transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s ease-out; }
.lg-brand-cell:hover .lg-brand-plate { transform: scale(1.05); box-shadow: inset 0 1px 0 rgba(255,255,255,0.24); }

/* ---------- Popovers (Account): quiet raised menus ---------- */
/* Slide + fade + settle entrance. Anchored via left/bottom (no inline
   transforms), so a transform in the keyframes is safe here; the mobile
   override pins transform: none !important and keeps the full-width sheet. */
@keyframes lg-popIn { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
.lg-pop { animation: lg-popIn 0.22s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
.lg-pop-item {
  font-family: ${FONTS.body};
  display: flex; align-items: center; gap: 9px;
  width: 100%;
  padding: 7px 10px; border-radius: 7px;
  cursor: pointer; border: none; text-align: left;
  background: transparent; color: ${COLORS.text};
  font-size: 12px;
  transition: background 0.14s ease-out, color 0.14s ease-out;
}
.lg-pop-item:hover { background: ${COLORS.hoverOverlay}; color: ${COLORS.text}; }
.lg-pop-item.active { color: ${glowC}; }

/* ---------- Account command center (Sidebar → Profile) ----------
   Portaled to <body> (never inside the sidebar's stacking context), so it
   can be a plain fixed-position surface with viewport clamping — no giant
   z-index arms race, no clipping behind the rail. */
@keyframes lg-apIn { from { opacity: 0; transform: translateY(10px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes lg-apOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(6px) scale(0.985); } }
@keyframes lg-apFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes lg-apSpin { to { transform: rotate(360deg); } }
.lg-ap-panel { animation: lg-apIn 0.2s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
.lg-ap-panel.lg-ap-closing { animation: lg-apOut 0.13s ease-out both; }
.lg-ap-backdrop { position: fixed; inset: 0; background: rgba(4, 6, 10, 0.45); animation: lg-apFade 0.18s ease-out both; }
.lg-ap-item {
  font-family: ${FONTS.body};
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 8px 12px; border-radius: 8px;
  cursor: pointer; border: none; text-align: left;
  background: transparent; color: ${COLORS.text};
  font-size: 12.5px;
  transition: background 0.14s ease-out, color 0.14s ease-out;
}
.lg-ap-item:hover { background: ${COLORS.hoverOverlay}; color: ${COLORS.text}; }
.lg-ap-item:focus-visible { outline: 2px solid ${glowC}; outline-offset: -2px; }
.lg-ap-item[aria-disabled="true"] { opacity: 0.55; cursor: default; }
.lg-ap-item .lg-ap-value { margin-left: auto; color: ${COLORS.faint}; font-family: ${FONTS.mono}; font-size: 10px; letter-spacing: 0.04em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px; }
.lg-ap-item.danger { color: ${COLORS.danger}; }
.lg-ap-item.danger:hover { color: ${COLORS.danger}; background: ${hexToRgba(COLORS.danger, 0.1)}; }
/* The desktop panel is an anchored fixed surface (left/top set from JS);
   below 820px it becomes a bottom sheet with safe-area breathing room. */
@media (max-width: 820px) {
  .lg-ap-anchor { left: 10px !important; right: 10px !important; top: auto !important; bottom: max(10px, env(safe-area-inset-bottom)) !important; width: auto !important; max-width: none !important; }
  .lg-ap-panel { max-height: min(78vh, 640px) !important; overflow-y: auto !important; border-radius: 20px 20px 14px 14px !important; }
}
@media (prefers-reduced-motion: reduce) {
  .lg-ap-panel, .lg-ap-backdrop { animation: none !important; }
}

/* Command-strip cells on Home — quiet, pressable, real numbers. */
.lg-ws { transition: border-color 0.16s ease-out, background 0.16s ease-out, transform 0.16s cubic-bezier(0.2,0.8,0.2,1), box-shadow 0.16s ease-out; }
.lg-ws:hover { border-color: ${hexToRgba(glowC, 0.45)}; background: ${COLORS.glassFillStrong}; transform: translateY(-1px) scale(1.015); box-shadow: inset 0 1px 0 ${hi}, 0 12px 30px -16px ${COLORS.shadowStrong}; }
.lg-ws:active { transform: translateY(0) scale(0.995); }
.lg-ws:hover .sys { color: ${COLORS.dim}; transition: color 0.16s ease-out; }
/* Workspace tile affordance — the chevron stays quiet until the tile is
   under the pointer, then slides out and tints to the accent. No text
   footer repeated on every tile. */
.lg-ws-arrow { opacity: 0; transform: translateX(-4px); transition: opacity 0.16s ease-out, transform 0.16s cubic-bezier(0.2,0.8,0.2,1), color 0.16s ease-out; color: ${COLORS.faint}; margin-left: auto; }
.lg-ws:hover .lg-ws-arrow { opacity: 1; transform: translateX(0); color: ${glowC}; }
.lg-ws:focus-visible .lg-ws-arrow { opacity: 1; transform: translateX(0); color: ${glowC}; }

/* ---------- Auth screen: editorial split, no floating card ---------- */
.lg-auth { width: 100%; max-width: 980px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(320px, 380px); border: 1px solid ${COLORS.border}; border-radius: ${RADIUS.modal}px; overflow: hidden; background: ${COLORS.panel}; box-shadow: ${COLORS.shadowRaised}; }
.lg-auth-mark { display: flex; flex-direction: column; justify-content: space-between; padding: 46px 42px; border-right: 1px solid ${COLORS.border}; background: ${COLORS.panel2}; }
.lg-auth-form { display: flex; flex-direction: column; justify-content: center; padding: 36px 32px; background: ${COLORS.panel}; }
@media (max-width: 860px) {
  .lg-auth { grid-template-columns: 1fr; max-width: 440px; }
  .lg-auth-mark { border-right: 0; border-bottom: 1px solid ${COLORS.border}; padding: 30px 26px 26px; gap: 26px; }
  .lg-auth-form { padding: 28px 26px 30px; }
}
/* Feed text lines: clipped at two lines so the row footer never overlaps;
   very long topic titles scroll horizontally on hover instead of vanishing. */
.lg-feed-line { overflow-x: auto; overflow-y: hidden; scrollbar-width: none; -ms-overflow-style: none; }
.lg-feed-line::-webkit-scrollbar { display: none; }
.lg-feed-line:hover { scrollbar-width: thin; scrollbar-color: ${COLORS.borderStrong} transparent; }

/* Year grid — Ledger's signature cell map. */
.lg-year {
  display: grid;
  grid-template-columns: repeat(53, minmax(0, 1fr));
  grid-auto-rows: minmax(0, 1fr);
  gap: 2px;
}
.lg-ycell {
  border-radius: 2px;
  background: ${COLORS.panel2};
  transition: filter 0.14s ease-out, transform 0.14s ease-out;
}
.lg-ycell:hover { filter: brightness(1.4); transform: scale(1.25); z-index: 2; }

/* Skeleton loading shimmer */
@keyframes lg-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.lg-skeleton {
  background: linear-gradient(90deg, ${COLORS.glassFill2} 25%, ${COLORS.border} 50%, ${COLORS.glassFill2} 75%);
  background-size: 200% 100%;
  animation: lg-shimmer 1.4s ease-in-out infinite;
  border-radius: ${RADIUS.control}px;
}

/* Brand plate — square mono tile, not a glowing gem */
.lg-brand-plate {
  width: 28px; height: 28px; border-radius: 8px;
  background: linear-gradient(150deg, ${glowC}, ${darken(glowC, 40)});
  display: flex; align-items: center; justify-content: center;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.24), 0 6px 14px -8px ${hexToRgba(glowC, 0.55 * VIEW.glow)};
}

/* ---------- Wallpaper layer: full-page background behind the app ---------- */
/* A fixed layer under the content. Nebula = transparent (the body's own
   starfield shows through); Black = near-solid ink; Custom = uploaded image
   with the same dark vignette treatment the body gradient already uses. */
.lg-wall {
  position: fixed; inset: 0; z-index: 0;
  pointer-events: none;
  background-color: transparent;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  background-attachment: fixed;
}
.lg-wall::after {
  content: ""; position: absolute; inset: 0;
  background: radial-gradient(130% 100% at 50% 35%, transparent 55%, ${isLight ? "rgba(30,40,80,0.11)" : "rgba(0,0,0,0.34)"} 100%);
}
@keyframes lg-wallFade { from { opacity: 0; } to { opacity: 1; } }
.lg-wall.lg-wall-in { animation: lg-wallFade 0.32s ease-out both; }
/* Content floats above the wall; the wall never captures input. */
/* The canvas and the dock rail are both z-index:1 siblings — the rail's
   popovers (More workspaces, account menu) absolutely position over the
   canvas area, so the rail must stack above the main column or the
   transparent canvas would swallow every click on them. */
.app-shell > .app-main { position: relative; z-index: 1; }
.app-shell > .lg-side-wrap { position: relative; z-index: 3; }

/* ---------- Dashboard coverage ring: static, no ambient pulse ---------- */
.lg-ring-pulse { transform-origin: center; }
.lg-ring-pulse-static { transform-origin: center; }

/* ---------- Weekly ring: shake burst on session log ---------- */
@keyframes lg-ringShake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-3px); }
  40% { transform: translateX(3px); }
  60% { transform: translateX(-2px); }
  80% { transform: translateX(2px); }
}
.lg-ring-burst { animation: lg-ringShake 160ms ease-out; transform-origin: center; }
/* The days ring is a static instrument — no ambient breathing. A live session
   reads through the week-segment pulse instead, which communicates state. */
.lg-days-ring .lg-ring-pulse { transform-origin: center; }
.lg-tests-hero { display: grid; grid-template-columns: minmax(260px, 1.3fr) repeat(3, minmax(130px, 0.7fr)); align-items: stretch; gap: 1px; background: ${COLORS.border}; border: 1px solid ${COLORS.border}; border-radius: ${RADIUS.card}px; overflow: hidden; }
.lg-tests-score { padding: 24px 26px; background: ${COLORS.panel2}; }
.lg-tests-score-number { color: ${COLORS.text}; font-family: ${FONTS.mono}; font-size: clamp(54px, 7vw, 82px); font-weight: 700; line-height: 0.95; letter-spacing: -0.08em; margin: 18px 0 14px; }
.lg-tests-score-number span { color: ${COLORS.accentFocus}; font-size: 0.36em; letter-spacing: 0; margin-left: 8px; }
.lg-tests-track { height: 5px; background: ${COLORS.border}; border-radius: 5px; overflow: hidden; max-width: 420px; }
.lg-tests-track span { display: block; height: 100%; background: ${COLORS.accentFocus}; border-radius: inherit; }
.lg-tests-score .t-caption { margin-top: 10px; color: ${COLORS.faint}; }
.lg-tests-stat { display: flex; flex-direction: column; justify-content: center; gap: 7px; padding: 20px; background: ${COLORS.panel}; border-left: 1px solid ${COLORS.border}; }
.lg-tests-stat strong { color: ${COLORS.text}; font-size: 25px; }
.lg-tests-stat > span:last-child { color: ${COLORS.faint}; font-size: 11px; line-height: 1.4; }
@media (max-width: 720px) { .lg-tests-hero { grid-template-columns: 1fr 1fr; } .lg-tests-score { grid-column: 1 / -1; } .lg-tests-stat { border-left: 0; border-top: 1px solid ${COLORS.border}; } }

/* ---------- 7-Day Ring animations ---------- */
/* Entrance stagger: each segment fades in with a slight delay */
@keyframes lg-weekSegEnter {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}
/* Live-update pulse for today segment while session running */
@keyframes lg-weekSegLive {
  0%, 100% { filter: drop-shadow(0 0 0 transparent); }
  50% { filter: drop-shadow(0 0 6px ${hexToRgba(COLORS.accentFocus, 0.6)}); }
}
.lg-week-seg-live { animation: lg-weekSegLive 2s ease-in-out infinite; transform-origin: center; }
/* Target-met pulse — reuses reward feedback visual language */
@keyframes lg-weekSegPulse {
  0% { transform: scale(1); filter: drop-shadow(0 0 0 transparent); }
  50% { transform: scale(1.08); filter: drop-shadow(0 0 10px ${hexToRgba(COLORS.done, 0.5)}); }
  100% { transform: scale(1); filter: drop-shadow(0 0 0 transparent); }
}
.lg-week-seg-pulse { animation: lg-weekSegPulse 600ms ease-out; transform-origin: center; }
/* Hover lift */
.lg-week-seg:hover { filter: brightness(1.15) drop-shadow(0 0 4px ${hexToRgba(COLORS.accentFocus, 0.4)}); transition: filter 0.14s ease-out; cursor: default; }
/* Reduced motion: disable all stagger/ambient animations */
@media (prefers-reduced-motion: reduce) {
  .lg-week-seg-enter { animation: none !important; opacity: 1 !important; transform: scale(1) !important; }
  .lg-week-seg-live { animation: none !important; }
  .lg-week-seg-pulse { animation: none !important; }
}

/* ---------- 7-day ring companion widget (dashboard hero) ---------- */
/* A glass card that sits in the hero bento grid. It is embedded inside a
   .lg-hero surface, so it carries no tile of its own — the parent provides
   the glass tier. Hover: glow + brighten only — never scale or move, or the
   hairline ring segments would slide out from under the pointer and break
   the tooltip hover interaction. */
.lg-ring-widget {
  background: transparent;
  border: 1px solid transparent;
  border-radius: ${RADIUS.control}px;
  transition: filter 0.2s ease-out, box-shadow 0.26s ease-out;
}
.lg-ring-widget:hover {
  filter: brightness(1.15);
  box-shadow: 0 0 0 1px ${hexToRgba(glowC, 0.22)}, 0 10px 30px -14px ${hexToRgba(glowC, 0.3)};
}
@media (prefers-reduced-motion: reduce) {
  .lg-side .lg-nav-item { animation: none !important; }
  .lg-side .lg-nav-item .lg-ic-anchor { transform: none !important; }
  .lg-nav-item.active::before { animation: none !important; }
  .lg-notice-dot { animation: none !important; }
  .lg-brand-cell:hover .lg-brand-plate { transform: none; }
  .lg-pop { animation: none !important; }
}

/* ---------- Coverage rows: fixed grid so every column stays aligned ---------- */
.lg-ch-row {
  display: grid;
  grid-template-columns: 26px 20px 22px minmax(150px, 1fr) 150px auto 120px 38px auto;
  align-items: center;
  column-gap: 12px;
  padding: 11px 10px;
  border-radius: 8px;
}
.lg-ch-row .lg-ch-prereq { justify-self: end; min-width: 0; }
.lg-ch-row .lg-ch-actions {
  display: flex; gap: 6px; align-items: center;
  opacity: 0; pointer-events: none;
  transition: opacity 0.16s ease-out;
}
.lg-ch-row:hover .lg-ch-actions, .lg-ch-row:focus-within .lg-ch-actions, .lg-ch-row.lg-ch-actions-locked .lg-ch-actions { opacity: 1; pointer-events: auto; }
.lg-ch-row .lg-ch-actions button { pointer-events: auto; }
.lg-row-lift { transition: background 0.16s ease-out, box-shadow 0.16s ease-out; }
.lg-row-lift:hover { background: ${COLORS.hoverOverlay}; box-shadow: 0 6px 18px -12px ${COLORS.shadowStrong}; }
/* "Start here" highlight — the first chapter a 0% subject should open. */
.lg-ch-start { box-shadow: inset 0 0 0 1px ${hexToRgba(glowC, 0.4)}; background: linear-gradient(90deg, ${hexToRgba(glowC, 0.09)}, transparent 55%); }
.lg-ch-start .lg-ch-dot { box-shadow: 0 0 0 3px ${hexToRgba(glowC, 0.25)}; /* Static indicator — no decorative pulse */ }
@media (max-width: 900px) {
  .lg-ch-row { grid-template-columns: 26px 20px 22px minmax(0, 1fr) auto; }
  .lg-ch-row .lg-ch-prereq, .lg-ch-row .lg-ch-rec, .lg-ch-row .lg-ch-pct, .lg-ch-row .lg-ch-date { display: none; }
}

/* ---------- Flip clock: retro rotateX digit flip ---------- */
.lg-flipcell {
  position: relative; width: 0.62em; height: 1em;
  perspective: 320px;
}
.lg-flip-half {
  position: absolute; left: 0; right: 0; height: 50%;
  overflow: hidden;
  line-height: 2em;
  text-align: center;
  font-family: ${FONTS.mono};
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.045em;
  background: ${COLORS.glassFill};
  border: 1px solid ${COLORS.border};
}
.lg-flip-half.top { top: 0; border-radius: 7px 7px 2px 2px; border-bottom: none; }
.lg-flip-half.bot { bottom: 0; border-radius: 2px 2px 7px 7px; border-top: none; line-height: 0em; }
.lg-flip-half.bot span { display: block; transform: translateY(-50%); }
@keyframes lg-flipTop { from { transform: rotateX(0deg); } to { transform: rotateX(-90deg); } }
@keyframes lg-flipBot { from { transform: rotateX(90deg); } to { transform: rotateX(0deg); } }
.lg-flip-half.flipping.top { animation: lg-flipTop 0.16s ease-in both; }
.lg-flip-half.flipping.bot { animation: lg-flipBot 0.16s ease-out 0.16s both; }

/* ---------- Mobile ---------- */
@media (max-width: 980px) {
  .lg-shell, .app-shell { margin: 0 !important; border-radius: 0 !important; flex-direction: column !important; max-width: 100% !important; min-height: 100vh !important; height: auto !important; overflow-y: auto !important; }
  .lg-sidebar, .sidebar { width: 100% !important; flex-direction: row !important; align-items: center; padding: 10px 14px !important; border-right: none !important; border-bottom: 1px solid ${COLORS.border}; gap: 10px; }
  .lg-sidebar-meta, .lg-sidebar-foot, .sidebar-foot { display: none !important; }
  .lg-sidebar-brand { padding: 0 !important; border: none !important; margin: 0 !important; }
  .lg-sidebar-nav { flex-direction: row !important; overflow-x: auto; flex: 1; gap: 6px !important; scrollbar-width: none; }
  .lg-sidebar-nav::-webkit-scrollbar { display: none; }
  .lg-nav-item { flex-shrink: 0; border: 1px solid transparent !important; }
  .lg-nav-item.active { box-shadow: none !important; }
  .lg-nav-item.active::before { display: none !important; }
  .lg-signout-mobile { display: inline-flex !important; }
  .lg-main, .app-main { padding: 18px !important; }
  .lg-side-wrap { width: 100% !important; }
  .lg-side-wrap.lg-side-wrap-open { width: 100% !important; }
  .lg-side { position: static !important; width: 100% !important; height: auto !important; padding: 10px 12px !important; }
  .lg-side:hover, .lg-side:focus-within { width: 100% !important; background: transparent; border-right: none; }
  .lg-side .lg-nav-item { width: auto !important; height: 34px !important; justify-content: center !important; padding: 0 !important; }
  .lg-side .lg-ic-anchor { width: 34px !important; height: 34px !important; }
  .lg-side .dock-label, .lg-side:hover .dock-label { display: none !important; }
  .lg-side .lg-brand-name { display: none !important; }
  .lg-side .lg-pin-btn { display: none !important; }
  .lg-side .lg-dock-divider { display: none !important; }
  .lg-side .lg-brand-cell, .lg-side .lg-account-cell { align-self: center !important; position: static !important; }
  .lg-side .lg-sidebar-nav { margin-top: 0 !important; }
  .lg-side .lg-pop { left: auto !important; right: 4px !important; transform: none !important; top: auto !important; max-height: 70vh; overflow-y: auto; }
  .lg-pop { left: 10px !important; right: 10px !important; top: auto !important; bottom: auto !important; max-width: calc(100vw - 20px) !important; box-shadow: 0 18px 44px -18px ${COLORS.shadowStrong} !important; }
}
@media (min-width: 981px) { .lg-signout-mobile { display: none !important; } }
.lg-coverage-page [style*="transition"], .lg-coverage-page [class*="lg-row"] { transition: none !important; }
.lg-coverage-page [class*="lg-stagger"], .lg-coverage-page [class*="lg-card-enter"] { animation: none !important; }
.lg-coverage-hero { grid-template-columns: minmax(250px, 0.72fr) minmax(0, 1.8fr) !important; }
.lg-coverage-read { grid-template-columns: minmax(0, 1fr) minmax(165px, 0.52fr) !important; }
.lg-coverage-hero > div:first-child { min-height: 252px; display: flex; flex-direction: column; justify-content: center; }
.lg-coverage-read { min-height: 252px; }
.lg-coverage-page .lg-coverage-row { margin: 6px 0; border: 1px solid ${COLORS.border} !important; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 20px -18px ${COLORS.shadowStrong}; }
.lg-coverage-page .lg-coverage-row .lg-row-inner { min-height: 58px; padding: 12px 14px !important; border-radius: 0 !important; }
.lg-coverage-page .lg-coverage-row.is-available { background: ${hexToRgba(COLORS.panel, 0.72)}; }
.lg-coverage-page .lg-coverage-row.is-available:hover { border-color: ${hexToRgba(COLORS.accentFocus, 0.45)} !important; background: ${hexToRgba(COLORS.accentFocus, 0.045)}; }
.lg-coverage-page .lg-coverage-row.is-blocked { border-style: dashed !important; background: ${hexToRgba(COLORS.sunken, 0.5)}; }
.lg-coverage-page .lg-coverage-row.state-doing { box-shadow: inset 2px 0 0 ${COLORS.accentFocus}, inset 0 0 26px ${hexToRgba(COLORS.accentFocus, 0.05)}, 0 10px 24px -18px ${COLORS.accentFocus}; }
.lg-coverage-page .lg-coverage-row.state-done { box-shadow: inset 2px 0 0 ${COLORS.done}; }
.lg-coverage-page .lg-coverage-row.state-mastered { box-shadow: inset 2px 0 0 ${COLORS.ink}; }
.lg-coverage-page .lg-coverage-row.is-blocked .lg-dependency-badge { color: ${COLORS.accentFocus} !important; border-color: ${hexToRgba(COLORS.accentFocus, 0.34)} !important; background: ${hexToRgba(COLORS.accentFocus, 0.07)} !important; }
.lg-coverage-page .lg-dependency-link { position: relative; margin-left: -2px; }
/* Coverage follows the dashboard's quiet, typographic language rather than
   presenting itself as a separate illustrated product surface. */
.lg-coverage-hero { display: block !important; background: transparent !important; border: 0 !important; overflow: visible !important; border-radius: 0 !important; }
.lg-coverage-hero > div:first-child { min-height: 0 !important; display: block !important; padding: 24px 24px 28px !important; background: ${COLORS.panel} !important; border: 1px solid ${COLORS.border}; }
.lg-coverage-hero > div:first-child > div:first-of-type { display: none; }
.lg-coverage-hero > div:first-child > div:nth-of-type(2) { display: block; }
.lg-coverage-hero > div:first-child > div:nth-of-type(3) { display: flex; align-items: center; gap: 28px; }
.lg-coverage-hero > div:first-child > div:nth-of-type(3) > div:first-child { flex: 0 0 auto; }
.lg-coverage-hero > div:first-child > div:nth-of-type(3) > div:last-child { flex: 1; }
.lg-coverage-read { min-height: 0 !important; display: flex !important; padding: 24px !important; border: 1px solid ${COLORS.border}; border-top: 0; background: ${COLORS.panel2} !important; }
.lg-coverage-read > div:first-child { flex: 1; }
.lg-coverage-read > div:last-child { flex: 0 0 300px; border-left: 1px solid ${COLORS.border}; padding-left: 24px; }
.lg-coverage-page .lg-coverage-row { margin: 0 !important; border: 0 !important; border-bottom: 1px solid ${COLORS.border} !important; border-radius: 0 !important; box-shadow: none !important; overflow: visible !important; background: transparent !important; }
.lg-coverage-page .lg-coverage-row .lg-row-inner { min-height: 52px; padding: 10px 4px !important; display: grid !important; grid-template-columns: 28px 24px minmax(220px, 1.35fr) minmax(190px, 0.8fr) 72px 40px minmax(270px, auto) 18px; gap: 12px !important; align-items: center; }
.lg-dependency-stack { display: flex; align-items: center; gap: 7px; min-width: 0; }
.lg-dependency-badge { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lg-coverage-page .lg-coverage-row.state-doing { box-shadow: inset 2px 0 0 ${COLORS.accentFocus} !important; background: ${hexToRgba(COLORS.accentFocus, 0.045)} !important; }
.lg-coverage-page .lg-coverage-row.state-done, .lg-coverage-page .lg-coverage-row.state-mastered { opacity: 0.62; }
.lg-coverage-page .lg-coverage-row.is-blocked { background: transparent !important; border-style: solid !important; }
.lg-coverage-page .lg-dependency-link { border: 0; width: 16px; color: ${COLORS.faint}; }
.lg-coverage-page .lg-coverage-index { font-family: ${FONTS.mono} !important; font-size: 9.5px !important; }
.lg-coverage-page .lg-coverage-readout, .lg-coverage-page .lg-coverage-dot { font-family: ${FONTS.mono} !important; letter-spacing: 0.08em !important; }
.lg-coverage-page { position: relative; }
.lg-coverage-page::before { content: ""; position: absolute; inset: 0 -40px; pointer-events: none; background: linear-gradient(90deg, transparent 0, ${hexToRgba(COLORS.accentFocus, 0.025)} 42%, transparent 72%); border-top: 1px solid ${hexToRgba(COLORS.text, 0.035)}; }
.lg-coverage-page > * { position: relative; }
.lg-coverage-readout, .lg-coverage-dot, .lg-coverage-index { font-family: ${FONTS.mono} !important; }
.lg-coverage-row { position: relative; border-left: 3px solid transparent; }
.lg-coverage-row.state-doing { background: ${hexToRgba(COLORS.accentFocus, 0.065)}; border-left-color: ${COLORS.accentFocus}; }
.lg-coverage-row.state-doing .lg-progress > div { box-shadow: 0 0 10px ${hexToRgba(COLORS.accentFocus, 0.34)}; }
.lg-coverage-row.state-done, .lg-coverage-row.state-mastered { opacity: 0.68; }
.lg-coverage-row.state-mastered { border-left-color: ${COLORS.ink}; }
.lg-coverage-row.is-blocked { opacity: 0.48; background: ${hexToRgba(COLORS.sunken, 0.42)}; border-left-color: ${COLORS.border}; }
.lg-coverage-row.is-blocked .lg-mini { color: ${COLORS.faint} !important; border-color: ${COLORS.border} !important; }
.lg-dependency-link { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; color: ${COLORS.accentFocus}; border-left: 1px solid ${hexToRgba(COLORS.accentFocus, 0.5)}; border-bottom: 1px solid ${hexToRgba(COLORS.accentFocus, 0.5)}; border-radius: 0 0 0 6px; flex-shrink: 0; }

/* ---------- Community: editorial study network ---------- */
.lg-community { max-width: 1240px; margin: 0 auto; display: grid; gap: 22px; color: ${COLORS.text}; font-family: var(--font-body); }
.lg-community-header { display: flex; justify-content: space-between; align-items: end; gap: 30px; padding: 8px 0 2px; }
.lg-community-kicker, .lg-community-label { color: ${COLORS.faint}; font-family: var(--font-mono); font-size: var(--text-xs); font-weight: var(--weight-semibold); letter-spacing: var(--tracking-label); text-transform: uppercase; }
.lg-community-kicker { color: ${COLORS.accentFocus}; }
.lg-community-header h1 { max-width: 700px; margin: 9px 0 0; color: ${COLORS.text}; font-family: var(--font-display); font-size: clamp(30px, 4vw, 50px); font-weight: var(--weight-bold); letter-spacing: var(--tracking-display); line-height: var(--leading-tight); }
.lg-community-header p { margin: 10px 0 0; color: ${COLORS.dim}; font-size: var(--text-md); line-height: var(--leading-normal); }
.lg-community-header-tools { display: flex; align-items: end; gap: 22px; flex-wrap: wrap; justify-content: end; }
.lg-community-code { min-width: 124px; }
.lg-community-code.is-compact { padding-bottom: 4px; }
.lg-community-code-line { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.lg-community-code code { color: ${COLORS.text}; font-family: var(--font-mono); font-size: var(--text-md); font-weight: var(--weight-semibold); letter-spacing: 0.12em; }
.lg-community-code button, .lg-community-icon-button { display: inline-grid; place-items: center; width: 28px; height: 28px; padding: 0; border: 1px solid ${COLORS.border}; border-radius: ${RADIUS.badge}px; background: transparent; color: ${COLORS.faint}; cursor: pointer; transition: color .16s ease, border-color .16s ease, background .16s ease; }
.lg-community-code button:hover, .lg-community-icon-button:hover { color: ${COLORS.text}; border-color: ${COLORS.accentFocus}; background: ${hexToRgba(COLORS.accentFocus, 0.08)}; }
.lg-community-tabs { display: flex; gap: 18px; border-bottom: 1px solid ${COLORS.border}; }
.lg-community-tabs button { position: relative; padding: 7px 0 9px; border: 0; background: transparent; color: ${COLORS.faint}; font-family: var(--font-mono); font-size: var(--text-xs); font-weight: var(--weight-semibold); letter-spacing: var(--tracking-label); cursor: pointer; }
.lg-community-tabs button::after { content: ""; position: absolute; right: 0; bottom: -1px; left: 0; height: 2px; background: transparent; transform: scaleX(0); transition: transform .18s ease, background .18s ease; }
.lg-community-tabs button.is-active { color: ${COLORS.text}; }
.lg-community-tabs button.is-active::after { background: ${COLORS.accentFocus}; transform: scaleX(1); }
.lg-community-overview { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)) minmax(220px, 1.35fr); border-top: 1px solid ${COLORS.border}; border-bottom: 1px solid ${COLORS.border}; }
.lg-community-metric, .lg-community-activity-summary { min-height: 94px; padding: 16px 18px; border-right: 1px solid ${COLORS.border}; }
.lg-community-metric-value { margin-top: 10px; color: ${COLORS.text}; font-family: var(--font-mono); font-size: clamp(18px, 2.1vw, 27px); font-weight: var(--weight-semibold); letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
.lg-community-metric-value.is-accent { color: ${COLORS.accentFocus}; }
.lg-community-metric-detail, .lg-community-activity-summary span { margin-top: 6px; color: ${COLORS.faint}; font-size: var(--text-xs); line-height: var(--leading-normal); }
.lg-community-activity-summary { border-right: 0; }
.lg-community-activity-summary > div:nth-child(2) { display: flex; align-items: center; gap: 7px; margin-top: 10px; color: ${COLORS.text}; font-size: var(--text-sm); }
.lg-community-status-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${COLORS.accentFocus}; box-shadow: 0 0 0 3px ${hexToRgba(COLORS.accentFocus, 0.12)}; }
.lg-community-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(220px, 0.28fr); gap: 30px; align-items: start; }
.lg-community-workspace { min-width: 0; border-top: 2px solid ${COLORS.text}; }
.lg-workspace-heading { display: flex; align-items: end; justify-content: space-between; gap: 18px; padding: 18px 0 16px; border-bottom: 1px solid ${COLORS.border}; }
.lg-workspace-heading h2 { margin: 7px 0 0; color: ${COLORS.text}; font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-bold); letter-spacing: var(--tracking-display); }
.lg-workspace-note { color: ${COLORS.faint}; font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: .08em; }
.lg-circle-add-row, .lg-group-create-strip { display: grid; grid-template-columns: minmax(170px, .8fr) minmax(0, 1fr) auto; gap: 16px; align-items: center; padding: 15px 0; border-bottom: 1px solid ${COLORS.border}; }
.lg-circle-add-row strong, .lg-group-create-strip strong { display: block; color: ${COLORS.text}; font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: .11em; }
.lg-circle-add-row span, .lg-group-create-strip span { display: block; margin-top: 5px; color: ${COLORS.faint}; font-size: var(--text-xs); }
.lg-community-form-inline { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.lg-community-form-inline input { min-width: 0; width: 170px; height: 34px; padding: 0 10px; border: 1px solid ${COLORS.border}; border-radius: ${RADIUS.badge}px; outline: none; background: ${COLORS.sunken}; color: ${COLORS.text}; font: var(--weight-normal) var(--text-sm)/1 var(--font-body); }
.lg-community-form-inline input:focus { border-color: ${COLORS.accentFocus}; box-shadow: 0 0 0 3px ${hexToRgba(COLORS.accentFocus, 0.12)}; }
.lg-community-form-inline input[aria-label*="code"] { font-family: var(--font-mono); letter-spacing: .1em; }
.lg-community-form-inline label { display: flex; align-items: center; gap: 5px; color: ${COLORS.faint}; font-size: var(--text-xs); }
.lg-community-form-inline label input { width: 13px; height: 13px; margin: 0; accent-color: ${COLORS.accentFocus}; }
.lg-community-button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 34px; padding: 0 12px; border: 1px solid transparent; border-radius: ${RADIUS.badge}px; font: var(--weight-semibold) var(--text-xs)/1 var(--font-body); cursor: pointer; transition: background .16s ease, border-color .16s ease, color .16s ease, transform .16s ease; }
.lg-community-button:active { transform: translateY(1px); }
.lg-community-button:disabled { opacity: .45; cursor: not-allowed; }
.lg-community-button.is-primary { background: ${COLORS.accentFocus}; color: ${COLORS.onAccent}; }
.lg-community-button.is-primary:hover { background: ${COLORS.accent}; }
.lg-community-button.is-secondary { border-color: ${COLORS.border}; background: transparent; color: ${COLORS.text}; }
.lg-community-button.is-secondary:hover { border-color: ${COLORS.accentFocus}; background: ${COLORS.hoverOverlay}; }
.lg-community-button.is-quiet { border-color: ${COLORS.border}; background: ${COLORS.sunken}; color: ${COLORS.dim}; }
.lg-community-form-message { grid-column: 2 / -1; color: ${COLORS.accentFocus}; font-size: var(--text-xs); }
.lg-circle-member-list, .lg-group-list { display: grid; }
.lg-circle-member-row { display: grid; grid-template-columns: 34px minmax(0, 1fr) 72px 28px; gap: 13px; align-items: center; min-height: 82px; border-bottom: 1px solid ${COLORS.border}; }
.lg-circle-avatar { display: grid; place-items: center; width: 30px; height: 30px; border: 1px solid ${COLORS.borderStrong}; border-radius: ${RADIUS.badge}px; color: ${COLORS.accentFocus}; font-family: var(--font-mono); font-size: var(--text-xs); font-weight: var(--weight-semibold); }
.lg-circle-member-heading { display: flex; align-items: center; gap: 8px; min-width: 0; }
.lg-circle-member-heading strong { overflow: hidden; color: ${COLORS.text}; font-size: var(--text-sm); font-weight: var(--weight-semibold); text-overflow: ellipsis; white-space: nowrap; }
.lg-circle-member-meta, .lg-circle-member-stat small, .lg-group-row-stat span { display: block; margin-top: 4px; color: ${COLORS.faint}; font-size: var(--text-xs); }
.lg-community-tag { padding: 3px 5px; border: 1px solid ${hexToRgba(COLORS.accentFocus, 0.35)}; color: ${COLORS.accentFocus}; font-family: var(--font-mono); font-size: 8px; letter-spacing: .08em; }
.lg-community-progress { height: 3px; margin-top: 10px; background: ${COLORS.border}; }
.lg-community-progress span { display: block; height: 100%; background: ${COLORS.accentFocus}; transition: width .28s ease; }
.lg-circle-member-stat { text-align: right; }
.lg-circle-member-stat span, .lg-group-row-stat strong { color: ${COLORS.text}; font-family: var(--font-mono); font-size: var(--text-sm); font-variant-numeric: tabular-nums; }
.lg-community-empty-state { padding: 34px 0 30px; border-bottom: 1px solid ${COLORS.border}; }
.lg-community-empty-state h2 { max-width: 430px; margin: 9px 0 0; color: ${COLORS.text}; font-family: var(--font-display); font-size: var(--text-xl); font-weight: var(--weight-bold); letter-spacing: var(--tracking-display); }
.lg-community-empty-state p { max-width: 450px; margin: 8px 0 18px; color: ${COLORS.dim}; font-size: var(--text-sm); line-height: var(--leading-relaxed); }
.lg-community-workspace-footer { display: flex; align-items: center; gap: 18px; padding-top: 20px; color: ${COLORS.faint}; font-size: var(--text-xs); }
.lg-community-workspace-footer .lg-community-code { display: flex; align-items: center; gap: 10px; }
.lg-community-workspace-footer .lg-community-code-line { margin-top: 0; }
.lg-group-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 0; border-bottom: 1px solid ${COLORS.border}; }
.lg-community-segmented { display: flex; gap: 16px; }
.lg-community-segmented button { padding: 5px 0; border: 0; border-bottom: 2px solid transparent; background: transparent; color: ${COLORS.faint}; font: var(--weight-semibold) var(--text-xs)/1 var(--font-mono); letter-spacing: .1em; cursor: pointer; }
.lg-community-segmented button.is-active { border-bottom-color: ${COLORS.accentFocus}; color: ${COLORS.text}; }
.lg-group-create-strip { grid-template-columns: minmax(170px, .8fr) minmax(0, 1fr) minmax(0, 1fr); }
.lg-group-row { display: grid; grid-template-columns: minmax(0, 1fr) 125px auto; gap: 20px; align-items: center; min-height: 98px; padding: 16px 0; border-bottom: 1px solid ${COLORS.border}; }
.lg-group-row h3, .lg-group-detail h3 { margin: 6px 0 0; color: ${COLORS.text}; font-family: var(--font-display); font-size: var(--text-lg); font-weight: var(--weight-bold); letter-spacing: var(--tracking-display); }
.lg-group-meta { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-top: 10px; color: ${COLORS.faint}; font-size: var(--text-xs); }
.lg-group-meta span { display: inline-flex; align-items: center; gap: 5px; }
.lg-group-row-stat { padding-left: 16px; border-left: 1px solid ${COLORS.border}; }
.lg-group-row-stat strong { display: block; margin-top: 6px; color: ${COLORS.accentFocus}; font-size: var(--text-lg); }
.lg-group-row-actions { display: flex; align-items: center; justify-content: end; gap: 6px; }
.lg-group-detail { display: grid; grid-template-columns: minmax(0, 1fr) minmax(220px, .7fr); gap: 25px; margin-top: 24px; padding-top: 18px; border-top: 1px solid ${COLORS.border}; }
.lg-group-detail p { margin: 8px 0 0; color: ${COLORS.dim}; font-size: var(--text-sm); }
.lg-group-detail-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 15px; }
.lg-group-members-admin { max-width: 420px; margin-top: 22px; padding-top: 14px; border-top: 1px solid ${COLORS.border}; }
.lg-group-admin-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 0; border-bottom: 1px solid ${COLORS.border}; color: ${COLORS.dim}; font-size: var(--text-xs); }
.lg-community-aside { min-width: 0; padding-top: 2px; }
.lg-community-aside-rule { width: 28px; height: 2px; margin-bottom: 17px; background: ${COLORS.accentFocus}; }
.lg-community-aside-number { margin-top: 15px; color: ${COLORS.text}; font-family: var(--font-mono); font-size: clamp(34px, 4vw, 58px); font-weight: var(--weight-semibold); letter-spacing: -.06em; }
.lg-community-aside p { margin: 3px 0 0; color: ${COLORS.dim}; font-size: var(--text-sm); }
.lg-community-aside-total { margin-top: 16px; color: ${COLORS.accentFocus}; font-family: var(--font-mono); font-size: var(--text-sm); }
.lg-community-activity { margin-top: 28px; padding-top: 17px; border-top: 1px solid ${COLORS.border}; }
.lg-activity-list { display: grid; gap: 15px; margin-top: 15px; }
.lg-activity-item { display: grid; grid-template-columns: 58px minmax(0, 1fr); gap: 8px; color: ${COLORS.dim}; font-size: var(--text-xs); line-height: var(--leading-normal); }
.lg-activity-item time { color: ${COLORS.faint}; font-family: var(--font-mono); font-size: 9px; }
.lg-activity-item strong { color: ${COLORS.text}; font-weight: var(--weight-semibold); }
.lg-community-muted { margin: 12px 0 0; color: ${COLORS.faint}; font-size: var(--text-xs); line-height: var(--leading-relaxed); }

@media (prefers-reduced-motion: reduce) {
  .lg-community-tabs button::after, .lg-community-button, .lg-community-code button, .lg-community-icon-button, .lg-community-progress span { transition: none; }
}
@media (max-width: 980px) {
  .lg-community-header { align-items: start; flex-direction: column; }
  .lg-community-header-tools { width: 100%; align-items: center; justify-content: space-between; }
  .lg-community-layout { grid-template-columns: 1fr; }
  .lg-community-aside { display: grid; grid-template-columns: auto 1fr; column-gap: 14px; align-items: baseline; padding-top: 16px; border-top: 1px solid ${COLORS.border}; }
  .lg-community-aside-rule { grid-row: 1 / span 3; margin: 4px 0 0; }
  .lg-community-aside-number { margin-top: 0; }
  .lg-community-aside p, .lg-community-aside-total { grid-column: 2; margin-top: 0; }
  .lg-community-aside .lg-community-activity { grid-column: 1 / -1; }
}
@media (max-width: 720px) {
  .lg-community { gap: 16px; }
  .lg-community-header h1 { font-size: clamp(28px, 8vw, 38px); }
  .lg-community-overview { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .lg-community-metric:nth-child(2n) { border-right: 0; }
  .lg-community-activity-summary { grid-column: 1 / -1; min-height: 76px; border-top: 1px solid ${COLORS.border}; }
  .lg-circle-add-row, .lg-group-create-strip { grid-template-columns: 1fr; gap: 10px; }
  .lg-community-form-message { grid-column: auto; }
  .lg-group-toolbar { align-items: stretch; flex-direction: column; }
  .lg-group-toolbar .lg-community-form-inline input { flex: 1; width: auto; }
  .lg-group-row { grid-template-columns: minmax(0, 1fr) auto; gap: 12px; }
  .lg-group-row-stat { display: none; }
  .lg-group-row-actions { grid-column: 1 / -1; justify-content: start; }
  .lg-group-detail { grid-template-columns: 1fr; }
  .lg-community-workspace-footer { align-items: start; flex-direction: column; gap: 10px; }
}
@media (max-width: 480px) {
  .lg-community-header-tools { align-items: start; flex-direction: column; gap: 13px; }
  .lg-community-tabs { width: 100%; }
  .lg-community-tabs button { flex: 1; text-align: center; }
  .lg-circle-member-row { grid-template-columns: 30px minmax(0, 1fr) 28px; gap: 9px; }
  .lg-circle-member-stat { display: none; }
  .lg-community-header p { max-width: 280px; }
}
@media (max-width: 720px) {
  .lg-coverage-page .lg-row-inner { display: flex !important; }
  .lg-coverage-page .lg-dependency-stack { order: 3; flex: 1 1 100%; padding-left: 52px; }
  .lg-community-empty, .lg-community-index, .lg-community-columns { grid-template-columns: 1fr !important; }
  .lg-community-index > div:last-child { border-left: 0 !important; border-top: 1px solid ${COLORS.border}; }
  .lg-coverage-hero { grid-template-columns: 1fr !important; }
  .lg-coverage-read { grid-template-columns: 1fr !important; gap: 18px !important; }
  .lg-coverage-read > div:last-child { border-left: 0 !important; border-top: 1px solid ${COLORS.border}; padding: 16px 0 0 !important; }
  .lg-coverage-page .lg-row-inner { gap: 8px !important; padding-left: 6px !important; padding-right: 6px !important; }
  .lg-coverage-page .lg-row-title-wrap { flex-basis: calc(100% - 80px) !important; }
  .lg-2col { grid-template-columns: 1fr !important; }
  .lg-hero-grid { grid-template-columns: 1fr !important; }
  .lg-nav-item .dock-label, .lg-nav-item span.dock-label { display: none; }
  .lg-hero { padding: 20px !important; }
  .lg-year { grid-template-columns: repeat(26, minmax(0, 1fr)); }
  /* Dense rows wrap instead of overflowing; optional metadata drops out. */
  .lg-row-inner { flex-wrap: wrap !important; }
  .lg-row-title-wrap { flex: 1 1 140px !important; min-width: 100px !important; }
  .lg-narrow-hide { display: none !important; }
}
@media (max-width: 480px) {
  .lg-grid { grid-template-columns: repeat(2, 1fr) !important; }
  .lg-main, .app-main { padding: 14px !important; }
}
`;
}
