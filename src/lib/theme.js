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

export const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');";

export const COLORS = {
  bg: "", bg1: "", panel: "", panel2: "", border: "", ink: "", inkSoft: "", inkDim: "",
  text: "", dim: "", faint: "", done: "", mastered: "", warn: "", danger: "",
  isLight: false,
  accentFocus: "", accentProgress: "", accentWarm: "", accentSuccess: "",
  accentPink: "", violet: "",
  bloom: [], glassShell: "", glassFill: "", glassFill2: "", glassFillStrong: "",
  glassHero: "", glassBlur: "", glassBlurRail: "", glassBlurHero: "",
  surfaceOverlay: "", borderStrong: "", inkGlow: "", shadow: "", shadowStrong: "", hoverOverlay: "",
};
export const FONTS = { display: "'Rubik', sans-serif", body: "'Rubik', sans-serif", mono: "'JetBrains Mono', monospace" };

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
export const RADIUS = { badge: 6, control: 10, card: 14, modal: 18 };

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
export const THEME_PRESETS = {
  "glass-dark": {
    label: "Caelestia", swatch: "#8B7CFF", font: "grotesk",
    bg: "#06070C", bg1: "#0A0C14", panel: "#0F111B", panel2: "#141826",
    border: "rgba(255,255,255,0.065)", text: "#EAE8F6", dim: "#9C9AB6", faint: "#6E6C88",
    done: "#6FD6A0", warn: "#F0A860", danger: "#FF5F56", accent: "#A89BFF",
    violet: "#8B7CFF", accentPink: "#E8A0C8",
    accentFocus: "#A89BFF", accentProgress: "#7FC8E8", accentWarm: "#FFA860", accentSuccess: "#6FD6A0",
    bloom: ["#8B7CFF", "#4E7CE8", "#C9457A"],
    glassShell: "#0A0C13",
    glassFill: "#10131D", glassFill2: "#0C0F17", glassFillStrong: "#161A26",
    glassHero: "#141826", glassBlur: "0px", glassBlurRail: "0px", glassBlurHero: "0px",
  },
  "glass-dark-mint": {
    label: "Marsh", swatch: "#52B98A", font: "grotesk",
    bg: "#06090C", bg1: "#0A120F", panel: "#0E1A15", panel2: "#122320",
    border: "rgba(255,255,255,0.06)", text: "#E8F3EE", dim: "#94AFA5", faint: "#6A9084",
    accent: "#52C796", violet: "#8B7CFF", accentPink: "#E8A0C8",
    accentFocus: "#52C796", accentProgress: "#7FC8E8", accentWarm: "#F4C95D", accentSuccess: "#52C796",
    done: "#52C796", warn: "#F4C95D", danger: "#FF5F56",
    bloom: ["#2E8B6E", "#3E6FA8", "#8B7CFF"],
    glassShell: "#0C120F",
    glassFill: "#101C18", glassFill2: "#0C1411", glassFillStrong: "#162622",
    glassBlur: "0px", glassBlurRail: "0px", glassBlurHero: "0px",
  },
  "glass-dark-violet": {
    label: "Ultraviolet", swatch: "#8C7BFF", font: "grotesk",
    bg: "#0B0A15", bg1: "#121020", panel: "#16132A", panel2: "#1C1838",
    border: "rgba(255,255,255,0.075)", text: "#EFEDFC", dim: "#A69FCB", faint: "#7B74B0",
    accent: "#9A8CFF", violet: "#8C7BFF", accentPink: "#E8A0C8",
    accentFocus: "#9A8CFF", accentProgress: "#7C9BFF", accentWarm: "#FFB26B", accentSuccess: "#6FD6A0",
    done: "#6FD6A0", warn: "#FFB26B", danger: "#FF5F56",
    bloom: ["#8C7BFF", "#5F8CFF", "#FF7FBF"],
    glassShell: "#100E1E",
    glassFill: "#151227", glassFill2: "#110F20", glassFillStrong: "#1A1630",
    glassBlur: "0px", glassBlurRail: "0px", glassBlurHero: "0px",
  },
  "glass-light": {
    label: "Air", swatch: "#5C78FF", font: "grotesk",
    bg: "#E9EDF7", bg1: "#F6F8FD", panel: "#FAFBFE", panel2: "#EDF1FA",
    border: "rgba(40,60,110,0.12)", text: "#1B2440", dim: "#5A6380", faint: "#6E7697",
    accent: "#4C6FFF", violet: "#6B5CE0", accentPink: "#C95A94",
    accentFocus: "#4C6FFF", accentProgress: "#5C96D8", accentWarm: "#C98A3E", accentSuccess: "#22A06B",
    done: "#22A06B", warn: "#C98A3E", danger: "#E05555",
    bloom: ["#C9D6FF", "#BFE3FF", "#FFD9E8"],
    glassShell: "rgba(255,255,255,0.55)",
    glassFill: "rgba(255,255,255,0.6)", glassFill2: "rgba(255,255,255,0.4)",
    glassFillStrong: "rgba(255,255,255,0.9)", glassHero: "rgba(255,255,255,0.95)",
    glassBlur: "0px", glassBlurRail: "0px", glassBlurHero: "0px",
  },
};

export const LEGACY_THEME = {
  ledger: "glass-dark", midnight: "glass-dark", forest: "glass-dark",
  rosequartz: "glass-dark", terminal: "glass-dark", parchment: "glass-light", mint: "glass-dark-mint",
};
export function normalizeTheme(id) {
  if (!id) return "glass-dark";
  if (THEME_PRESETS[id]) return id;
  return LEGACY_THEME[id] || "glass-dark";
}

export const FONT_PRESETS = {
  grotesk: { display: "'Rubik', sans-serif", body: "'Rubik', sans-serif", mono: "'JetBrains Mono', monospace" },
};

// Accent swatches for the Appearance panel — each tints the whole token
// system (ink/accent/glow/selection/buttons) without breaking luminance.
export const ACCENT_PRESETS = {
  lavender: { accent: "#A89BFF", accentFocus: "#A89BFF", accentProgress: "#7FC8E8", violet: "#8B7CFF" },
  indigo: { accent: "#8CA0FF", accentFocus: "#8CA0FF", accentProgress: "#7FC8E8", violet: "#6B8CFF" },
  mint: { accent: "#52C796", accentFocus: "#52C796", accentProgress: "#7FC8E8", violet: "#52C796" },
  sky: { accent: "#7FC8E8", accentFocus: "#7FC8E8", accentProgress: "#A89BFF", violet: "#6FAFCF" },
  amber: { accent: "#F0B26B", accentFocus: "#F0B26B", accentProgress: "#FFC96B", violet: "#D99A52" },
  coral: { accent: "#FF6B6B", accentFocus: "#FF6B6B", accentProgress: "#F0A860", violet: "#E05555" },
  rose: { accent: "#E8A0C8", accentFocus: "#E8A0C8", accentProgress: "#A89BFF", violet: "#C77BA5" },
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

function relLuminance(hex) {
  const h = (hex || "#000000").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function bloomRgba(hex, a) {
  return `radial-gradient(1100px 700px at 12% -8%, ${hexToRgba(hex, a)}, transparent 62%)`;
}

export function applyTheme(themeId, opts = {}) {
  const t = THEME_PRESETS[normalizeTheme(themeId)] || THEME_PRESETS["glass-dark"];
  const isLight = relLuminance(t.bg) > 0.5;
  const blooms = (t.bloom || ["#8B7CFF", "#4E7CE8", "#C9457A"]).map((c, i) =>
    `radial-gradient(${[1100, 950, 820][i] || 900}px ${[640, 560, 520][i] || 560}px at ${["12% -8%", "96% 4%", "50% 118%"][i] || "50% 100%"}, ${hexToRgba(c, isLight ? 0.1 : 0.1)}, transparent 62%)`);
  Object.assign(COLORS, {
    isLight,
    bg: t.bg, bg1: t.bg1, panel: t.panel, panel2: t.panel2, border: t.border,
    text: t.text, dim: t.dim, faint: t.faint, done: t.done, warn: t.warn, danger: t.danger,
    ink: t.accent, mastered: t.accent,
    accentFocus: t.accentFocus || t.accent, accentProgress: t.accentProgress || t.accent,
    accentWarm: t.accentWarm || t.warn, accentSuccess: t.accentSuccess || t.done,
    accentPink: t.accentPink || "#E8A0C8", violet: t.violet || "#8B7CFF",
    bloom: blooms,
    glassShell: t.glassShell, glassFill: t.glassFill, glassFill2: t.glassFill2,
    glassFillStrong: t.glassFillStrong, glassHero: t.glassHero,
    glassBlur: t.glassBlur, glassBlurRail: t.glassBlurRail, glassBlurHero: t.glassBlurHero,
    inkSoft: hexToRgba(t.accent, 0.14),
    inkDim: darken(t.accent, 60),
    inkGlow: hexToRgba(t.accent, isLight ? 0.14 : 0.22),
    borderStrong: hexToRgba(t.accent, isLight ? 0.55 : 0.45),
    hoverOverlay: isLight ? "rgba(76,111,255,0.08)" : "rgba(255,255,255,0.05)",
    surfaceOverlay: isLight ? "rgba(30,40,70,0.3)" : "rgba(3,5,12,0.5)",
    shadow: isLight ? "rgba(40,60,100,0.16)" : "rgba(0,0,0,0.42)",
    shadowStrong: isLight ? "rgba(40,60,100,0.24)" : "rgba(0,0,0,0.6)",
    bgGrad: `linear-gradient(180deg, ${t.bg1}, ${t.bg} 64%)`,
  });
  const f = FONT_PRESETS[t.font] || FONT_PRESETS.grotesk;
  Object.assign(FONTS, f);

  // ---- Live appearance overrides (Settings → Appearance) ----
  const accent = ACCENT_PRESETS[opts.accent];
  if (accent) {
    const A = accent.accent || accent;
    const glowC = accent.accentFocus || A;
    Object.assign(COLORS, {
      ink: A, mastered: A, accent: A,
      accentFocus: glowC, accentProgress: accent.accentProgress || A,
      violet: accent.violet || A,
      inkSoft: hexToRgba(A, 0.14),
      inkDim: darken(A, 60),
      inkGlow: hexToRgba(glowC, isLight ? 0.16 : 0.26),
      borderStrong: hexToRgba(glowC, isLight ? 0.6 : 0.5),
      hoverOverlay: isLight ? hexToRgba(A, 0.08) : "rgba(255,255,255,0.05)",
    });
  }
  const r = clamp(opts.radius ?? 1, 0.6, 2);
  RADIUS.badge = Math.max(4, Math.round(6 * r));
  RADIUS.control = Math.max(6, Math.round(10 * r));
  RADIUS.card = Math.max(8, Math.round(14 * r));
  RADIUS.modal = Math.max(10, Math.round(18 * r));
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

applyTheme("glass-dark");

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
  const hi = isLight ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.045)";
  const hiTop = isLight ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.07)";
  const track = isLight ? "rgba(20,30,60,0.08)" : "rgba(255,255,255,0.06)";
  const focusW = Math.round(2 * VIEW.focusRing);
  return `
${FONT_IMPORT}
*, *::before, *::after { box-sizing: border-box; }
html, body { overflow-x: hidden; width: 100%; min-height: 100%; }
/* The whole window is a deep ink field with faint violet/blue aurora blooms —
   tonal, not neon. The desktop floats on it; nothing is glassed over it. */
html { background: ${COLORS.bg}; }
body {
  color: ${COLORS.text};
  background:
    radial-gradient(130% 100% at 50% 35%, transparent 55%, ${isLight ? "rgba(30,40,80,0.09)" : "rgba(0,0,0,0.26)"} 100%),
    ${COLORS.bloom[0] || ""},
    ${COLORS.bloom[1] || ""},
    ${COLORS.bloom[2] || ""},
    ${COLORS.bgGrad};
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
::selection { background: ${hexToRgba(glowC, 0.26)}; color: ${COLORS.text}; }

/* Numerals across the whole app use tabular mono — the system look. */
.num {
  font-family: ${FONTS.mono};
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

/* System micro-label — tiny uppercase metadata, the Caelestia staple. */
.sys {
  font-family: ${FONTS.mono};
  font-size: 9px; font-weight: 600; letter-spacing: 0.16em;
  text-transform: uppercase; color: ${COLORS.faint};
  line-height: 1.1;
}

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

@keyframes lg-livePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
.lg-live { animation: lg-livePulse 2.4s ease-in-out infinite; flex-shrink: 0; }

:focus-visible { outline: ${focusW}px solid ${hexToRgba(glowC, 0.85)}; outline-offset: 2px; border-radius: 8px; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
  /* Stagger delays are sequenced time — show everything at once instead. */
  .lg-stagger > * { animation-delay: 0s !important; animation-duration: 0.001ms !important; }
  .lg-btn-shimmer::after { animation: none !important; }
}

/* ---------- Surfaces: tonal layers, no glass. ---------- */
/* widget — the default module: raised by tone + hairline border */
.lg-card {
  background: ${COLORS.glassFill};
  border: 1px solid ${COLORS.border};
  border-radius: ${RADIUS.card}px;
  box-shadow: inset 0 1px 0 ${hi}, 0 6px 20px -20px ${COLORS.shadowStrong};
  transition: border-color 0.16s ease-out, transform 0.16s cubic-bezier(0.2,0.8,0.2,1), box-shadow 0.16s ease-out;
}
.lg-card-interactive { cursor: pointer; }
.lg-card-interactive:hover {
  border-color: ${hexToRgba(glowC, 0.4)};
  transform: translateY(-1px);
  box-shadow: inset 0 1px 0 ${hi}, 0 10px 26px -18px ${COLORS.shadowStrong};
}
.lg-card-interactive:active { transform: translateY(0); }

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
@keyframes lg-statusPulse { 0%, 100% { opacity: 0.95; } 50% { opacity: 0.35; } }
.lg-statusdot { animation: lg-statusPulse 3.4s ease-in-out infinite; }

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
  box-shadow: 0 8px 22px -10px ${hexToRgba(glowC, 0.5 * VIEW.glow)}, inset 0 1px 0 rgba(255,255,255,0.2);
}
.lg-btn-ink:hover:not(:disabled) { filter: brightness(1.07); box-shadow: 0 10px 26px -10px ${hexToRgba(glowC, 0.6 * VIEW.glow)}; }
.lg-btn-ink:active:not(:disabled) { box-shadow: 0 4px 12px -6px ${hexToRgba(glowC, 0.45 * VIEW.glow)}; }
.lg-btn-ghost:hover:not(:disabled) { background: ${COLORS.hoverOverlay}; border-color: ${COLORS.borderStrong}; color: ${COLORS.text}; }

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
  box-shadow: 0 0 0 3px ${hexToRgba(glowC, 0.14)} !important;
}
.lg-input::placeholder { color: ${COLORS.faint}; }

/* Segmented control — one coherent control with the input family. */
.lg-seg {
  display: inline-flex; align-items: center; gap: 2px;
  padding: 3px; border-radius: ${RADIUS.control}px;
  background: ${COLORS.glassFill2}; border: 1px solid ${COLORS.border};
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

@keyframes lg-urgentPulse {
  0%, 100% { border-color: ${hexToRgba(COLORS.danger, 0.35)}; }
  50% { border-color: ${hexToRgba(COLORS.danger, 0.8)}; }
}
.lg-days-badge {
  position: relative;
  overflow: hidden;
  background: ${hexToRgba(COLORS.danger, 0.08)};
  border: 1px solid ${hexToRgba(COLORS.danger, 0.45)};
  border-radius: ${RADIUS.badge}px !important;
}
.lg-days-badge.lg-days-urgent { animation: lg-urgentPulse 2.6s ease-in-out infinite; }

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
  transition: width 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
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
.lg-dock-item:hover { transform: translateY(-2px); border-color: ${hexToRgba(glowC, 0.38)}; }
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
/* The rail lives inside a fixed-width wrapper (kept in flow by Sidebar.jsx);
   the rail itself tracks that wrapper exactly so expanding it on hover never
   reflows the page — it simply slides wider over the content beside it. */
.lg-side-wrap { position: relative; width: ${VIEW.railWidth}px; flex-shrink: 0; }
.lg-side {
  position: absolute; top: 0; bottom: 0; left: 0;
  width: ${VIEW.railWidth}px !important;
  padding: 18px 10px 16px;
  display: flex; flex-direction: column; align-items: center;
  overflow: visible;
  background: linear-gradient(180deg, ${COLORS.glassFill}, ${hexToRgba(COLORS.glassShell, 0.5)});
  border-right: 1px solid ${COLORS.border};
  transition: width 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), background 0.22s ease-out, border-color 0.22s ease-out;
  z-index: 44;
}
.lg-side:hover, .lg-side:focus-within {
  width: ${VIEW.railWidth + 110}px !important;
  background: ${COLORS.glassFillStrong};
  border-right: 1px solid ${hexToRgba(glowC, 0.22)};
  box-shadow: 26px 10px 46px -34px ${COLORS.shadowStrong}, 0 0 0 1px ${hexToRgba(glowC, 0.06)};
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
  transform: translateY(-50%);
  max-width: 0; opacity: 0; overflow: hidden; white-space: nowrap;
  margin-left: 0;
  pointer-events: none;
  z-index: 2;
  transition: max-width 0.24s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.18s ease-out 0.04s;
}
.lg-side:hover .dock-label, .lg-side:focus-within .dock-label { max-width: 104px; opacity: 1; }
@media (hover: none) {
  .lg-side { position: static !important; width: 64px !important; padding: 10px 10px; }
  .lg-side:hover { width: 64px !important; box-shadow: none; }
  .lg-side .dock-label { display: none !important; }
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
  transition: color 0.16s ease-out, background 0.16s ease-out, border-color 0.16s ease-out, box-shadow 0.16s ease-out;
}
.lg-nav-item:hover { color: ${COLORS.text}; background: ${COLORS.hoverOverlay}; border-color: ${hexToRgba(COLORS.text, 0.06)}; }
.lg-nav-item:active { transform: scale(0.97); }
.lg-nav-item.active {
  color: ${glowC};
  background: linear-gradient(180deg, ${hexToRgba(glowC, 0.13)}, ${hexToRgba(glowC, 0.05)});
  border-color: ${hexToRgba(glowC, 0.16)};
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
}
.lg-nav-item.active::before {
  content: "";
  position: absolute; left: -2px; top: 50%;
  transform: translateY(-50%);
  width: 2px; height: 16px; border-radius: 999px;
  background: linear-gradient(180deg, ${glowC}, ${darken(glowC, 30)});
  box-shadow: ${hexToRgba(glowC, 0.3)} 0 0 7px;
  animation: lg-tickBreathe 3.2s ease-in-out infinite;
}
@keyframes lg-tickBreathe {
  0%, 100% { box-shadow: ${hexToRgba(glowC, 0.22)} 0 0 5px; opacity: 0.75; }
  50% { box-shadow: ${hexToRgba(glowC, 0.5)} 0 0 11px; opacity: 1; }
}
/* Inside the dock: rows are full-width with no extra padding; the icon cell
   keeps its fixed 44px and the label is absolutely positioned, so hovering
   can never nudge an icon out of place. */
.lg-side .lg-nav-item { gap: 0; padding: 0; }

/* ---------- Popovers (More / Account): quiet raised menus ---------- */
/* Opacity-only entry animation — these menus are anchored with inline
   transforms (translateY centering), so a transform in the keyframes would
   permanently override the anchor position. */
@keyframes lg-popIn { from { opacity: 0; } to { opacity: 1; } }
.lg-pop { animation: lg-popIn 0.17s ease-out both; }
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

/* Command-strip cells on Home — quiet, pressable, real numbers. */
.lg-ws { transition: border-color 0.16s ease-out, background 0.16s ease-out, transform 0.16s cubic-bezier(0.2,0.8,0.2,1); }
.lg-ws:hover { border-color: ${hexToRgba(glowC, 0.45)}; background: ${COLORS.glassFillStrong}; transform: translateY(-1px); }
.lg-ws:active { transform: translateY(0); }
.lg-ws:hover .sys { color: ${COLORS.dim}; transition: color 0.16s ease-out; }

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
  .lg-side { position: static !important; width: 100% !important; height: auto !important; padding: 10px 12px !important; }
  .lg-side:hover, .lg-side:focus-within { width: 100% !important; background: transparent; border-right: none; }
  .lg-side .lg-nav-item { width: auto !important; height: 34px !important; justify-content: center !important; padding: 0 !important; }
  .lg-side .lg-ic-anchor { width: 34px !important; height: 34px !important; }
  .lg-side .dock-label, .lg-side:hover .dock-label { display: none !important; }
  .lg-side .lg-dock-divider { display: none !important; }
  .lg-side .lg-brand-cell, .lg-side .lg-account-cell { align-self: center !important; }
  .lg-side .lg-sidebar-nav { margin-top: 0 !important; }
  .lg-side .lg-pop { left: auto !important; right: 4px !important; transform: none !important; top: auto !important; max-height: 70vh; overflow-y: auto; }
  .lg-pop { left: 10px !important; right: 10px !important; top: auto !important; bottom: auto !important; max-width: calc(100vw - 20px) !important; box-shadow: 0 18px 44px -18px ${COLORS.shadowStrong} !important; }
}
@media (min-width: 981px) { .lg-signout-mobile { display: none !important; } }
@media (max-width: 720px) {
  .lg-2col { grid-template-columns: 1fr !important; }
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
