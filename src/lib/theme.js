// Extracted from App.jsx, verbatim — no logic changes.
//
// COLORS/FONTS are shared, mutable objects read fresh at render time by every
// component (they read COLORS.ink, FONTS.display, etc directly rather than
// importing a static value). applyTheme() rewrites their contents in place;
// because nothing captures a stale reference in a closure, the normal
// re-render triggered by changing settings.theme is enough to repaint the
// whole app — no context provider or prop drilling required.
//
// Because these are mutable objects (not plain re-exported values), any file
// that does `import { COLORS } from "./lib/theme"` gets a live reference to
// the SAME object App.jsx mutates. That's what makes it safe to move this
// module out of App.jsx: extraction doesn't change *when* or *how* the theme
// updates, only *where* the object is declared.

export const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&family=Newsreader:opsz,wght@6..72,500;6..72,600;6..72,700&display=swap');";

export const COLORS = {
  bg: "", panel: "", panel2: "", border: "", ink: "", inkSoft: "", inkDim: "",
  text: "", dim: "", faint: "", done: "", mastered: "", warn: "", danger: "",
  isLight: false,
  // Semantic additions — computed per-theme in applyTheme() below, alongside
  // the original tokens above (kept untouched so nothing that already reads
  // COLORS.panel/border/etc. needs to change).
  surfaceOverlay: "",   // modal/dropdown backdrop, always a translucent black/white regardless of theme
  borderStrong: "",     // higher-contrast border for focus/active states, vs. the default (subtle) border
  inkGlow: "",          // stronger accent wash for hero panels and active nav — distinct from inkSoft's faint tint
  shadow: "",           // ambient card shadow, tuned lighter for light themes so panels don't look like they're floating
  shadowStrong: "",     // elevated/hover shadow
  hoverOverlay: "",     // very faint accent wash for row/card hover backgrounds
};
export const FONTS = { display: "'Fraunces', serif", body: "'Inter', sans-serif", mono: "'JetBrains Mono', monospace" };

// 4-based spacing scale, exported so components can reference SPACE.md
// instead of a bare "14" — keeps future spacing edits centralized even
// though the app renders via inline styles rather than CSS classes.
// Values were widened in the spaciousness pass (sm 8→12, md 12→18,
// lg 16→26, xl 24→36, xxl 32→46, xxxl 48→60) so every consumer that uses
// the tokens breathes noticeably; one knob tunes the whole app. xs stays
// tiny on purpose (icon gaps, badge insets) — small elements shouldn't
// inherit the increase.
export const SPACE = { xs: 4, sm: 12, md: 18, lg: 26, xl: 36, xxl: 46, xxxl: 60 };

// Radius hierarchy per element weight — small controls get tighter corners
// than containers, containers tighter than modals. Matches the visual
// convention already used ad hoc across the app (7-10px on buttons/inputs,
// 8-10px on cards); centralizing it makes future components consistent
// without having to eyeball a new number each time.
export const RADIUS = { badge: 6, control: 8, card: 10, modal: 16 };

// Motion tokens, split into raw durations/easings and composed transition
// strings — components that need to sequence or stagger animations can use
// MOTION.duration.fast directly, while most just want the ready-made
// MOTION.transition.hover string. Values match what globalCss() already
// uses inline (0.15s/0.2s ease-out); centralizing them here means future
// additions stay consistent instead of each new rule picking its own number.
export const MOTION = {
  duration: { fast: 120, normal: 180, slow: 280 },
  easing: { standard: "ease-out", spring: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
  transition: {
    hover: "background 0.15s ease-out, border-color 0.15s ease-out, transform 0.15s ease-out",
    fade: "opacity 0.18s ease-out",
    color: "color 0.15s ease-out",
  },
};

// Small flex-layout helpers — return a style object to spread into an
// inline `style` prop, e.g. `style={{ ...row(8), ...myOverrides }}`. Purely
// additive: nothing existing has to adopt these, they just remove
// boilerplate from new/edited components going forward.
export const row = (gap = SPACE.sm) => ({ display: "flex", alignItems: "center", gap });
export const stack = (gap = SPACE.sm) => ({ display: "flex", flexDirection: "column", gap });
export const cluster = (gap = SPACE.sm) => ({ display: "flex", flexWrap: "wrap", alignItems: "center", gap });
export const center = () => ({ display: "flex", alignItems: "center", justifyContent: "center" });
export const between = (align = "center") => ({ display: "flex", alignItems: align, justifyContent: "space-between" });

// One cohesive Glass design language, inverted light/dark palette. Keep the
// original consumer contract intact — { label, swatch, font, bg, panel,
// panel2, border, text, dim, faint, done, warn, danger, accent } with the
// same reference as before — and extend it additively with glass-specific
// tokens (glassFill*/glassBlur) that only globalCss()/surfaces opt into.
// panel/panel2/bg stay HEX here: several consumers feed them into
// hexToRgba()/darken(), which would silently break on rgba() strings.
export const THEME_PRESETS = {
  "glass-light": {
    label: "Glass Light", swatch: "#4F6BFF", font: "grotesk",
    bg: "#EEF2F9", panel: "#F6F8FC", panel2: "#E9EDF5", border: "rgba(31,42,69,0.10)",
    text: "#1B1A28", dim: "#414556", faint: "#767C8C",
    done: "#14997B", warn: "#BB7E14", danger: "#D13B3B", accent: "#4F6BFF",
    glassFill: "rgba(255,255,255,0.42)", glassFill2: "rgba(255,255,255,0.2)",
    glassFillStrong: "rgba(255,255,255,0.62)", glassBlur: "18px",
  },
  "glass-dark": {
    label: "Glass Dark", swatch: "#6C86F5", font: "grotesk",
    bg: "#0B0D13", panel: "#171A22", panel2: "#1E222E", border: "rgba(255,255,255,0.09)",
    text: "#F1F2F7", dim: "#A9AFBD", faint: "#7E8492",
    done: "#3FD0A0", warn: "#E8A23D", danger: "#F0665F", accent: "#6C86F5",
    glassFill: "rgba(24,27,34,0.5)", glassFill2: "rgba(24,27,34,0.28)",
    glassFillStrong: "rgba(38,42,54,0.66)", glassBlur: "18px",
  },
};

// Removed-theme migration. Every old id that ever shipped maps to the variant
// that matches its ACTUAL background luminance (checked below, not guessed
// from its name) so a returning dark-theme user never gets flipped to light.
// parchment was the only removed light theme; the rest (ledger/midnight/
// forest/rosequartz/terminal) all had dark backgrounds → glass-dark.
// Unknown or missing ids → glass-light (the safe neutral default).
export const LEGACY_THEME = {
  ledger: "glass-dark", midnight: "glass-dark", forest: "glass-dark",
  rosequartz: "glass-dark", terminal: "glass-dark", parchment: "glass-light",
};
export function normalizeTheme(id) {
  if (!id) return "glass-light";
  if (THEME_PRESETS[id]) return id;
  return LEGACY_THEME[id] || "glass-light";
}

export const FONT_PRESETS = {
  ledger: { display: "'Fraunces', serif", body: "'Inter', sans-serif", mono: "'JetBrains Mono', monospace" },
  grotesk: { display: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif", mono: "'JetBrains Mono', monospace" },
  newsreader: { display: "'Newsreader', serif", body: "'Inter', sans-serif", mono: "'JetBrains Mono', monospace" },
};

export function hexToRgba(hex, a) {
  const h = (hex || "#C98A3E").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
export function darken(hex, amt) {
  const h = (hex || "#C98A3E").replace("#", "");
  const r = Math.max(0, parseInt(h.slice(0, 2), 16) - amt), g = Math.max(0, parseInt(h.slice(2, 4), 16) - amt), b = Math.max(0, parseInt(h.slice(4, 6), 16) - amt);
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, "0")).join("")}`;
}

// Relative luminance of a theme's background, used to decide whether a
// theme is "light" (parchment) or "dark" (everything else) — a proper
// luminance check rather than a hardcoded hex string match, so adding a
// future light theme doesn't silently fall through to dark-mode alpha
// values without anyone noticing.
function relLuminance(hex) {
  const h = (hex || "#000000").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function applyTheme(themeId) {
  const t = THEME_PRESETS[normalizeTheme(themeId)] || THEME_PRESETS["glass-light"];
  const isLight = relLuminance(t.bg) > 0.5;
  Object.assign(COLORS, {
    isLight,
    bg: t.bg, panel: t.panel, panel2: t.panel2, border: t.border,
    text: t.text, dim: t.dim, faint: t.faint, done: t.done, warn: t.warn, danger: t.danger,
    ink: t.accent, mastered: t.accent,
    // Glass-only tokens — consumed by globalCss() and the few inline
    // surfaces that need a translucent fill. Split out of panel/panel2 on
    // purpose: marks stay hex so hexToRgba()/darken() keep working.
    glassFill: t.glassFill, glassFill2: t.glassFill2, glassFillStrong: t.glassFillStrong,
    glassBlur: t.glassBlur,
    inkSoft: hexToRgba(t.accent, isLight ? 0.14 : 0.16),
    inkDim: darken(t.accent, 55),
    inkGlow: hexToRgba(t.accent, isLight ? 0.22 : 0.28),
    borderStrong: hexToRgba(t.accent, isLight ? 0.5 : 0.55),
    hoverOverlay: hexToRgba(t.accent, isLight ? 0.05 : 0.06),
    surfaceOverlay: isLight ? "rgba(20,16,8,0.35)" : "rgba(0,0,0,0.55)",
    // Light themes get a soft warm-dark shadow so panels don't float; dark
    // themes get true black at low alpha since panel/bg contrast works harder.
    shadow: isLight ? "rgba(60,70,110,0.12)" : "rgba(0,0,0,0.32)",
    shadowStrong: isLight ? "rgba(60,70,110,0.2)" : "rgba(0,0,0,0.55)",
  });
  const f = FONT_PRESETS[t.font] || FONT_PRESETS.ledger;
  Object.assign(FONTS, f);
}

// Populate COLORS/FONTS immediately with the default theme, so the sign-in
// screen (which renders before any session — and therefore before Workspace
// ever calls applyTheme with the user's saved preference) isn't left with
// blank colors. Workspace re-applies the user's actual theme once settings load.
applyTheme("glass-light");

// Universal medal colors for leaderboard ranks — these stay fixed regardless
// of the active theme (gold/silver/bronze read as "rank" everywhere, the way
// a theme-tinted version wouldn't).
export const RANK_COLORS = ["#E8C547", "#C7CDD6", "#C98A5C"];

// Elevation ladder — returns the layered shadow string for a tier, built
// from the CURRENT theme's COLORS at call time (theme can change under us,
// so these are computed per-render, not exported as constants).
//   e1 → flat surface (hairline contact)
//   e2 → default card
//   e3 → focused/important card (accent-tinted ring + stronger lift)
//   e4 → floating element (modal, dock, hover-elevated card)
export function elev(level) {
  const hi = COLORS.isLight ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.05)";
  const ring = COLORS.isLight ? hexToRgba(COLORS.ink, 0.14) : hexToRgba(COLORS.ink, 0.18);
  const tiers = {
    e1: `inset 0 1px 0 ${hi}, 0 1px 2px ${COLORS.shadow}`,
    e2: `inset 0 1px 0 ${hi}, 0 1px 2px ${COLORS.shadow}, 0 8px 20px -12px ${COLORS.shadowStrong}`,
    e3: `inset 0 1px 0 ${hi}, 0 2px 4px ${COLORS.shadow}, 0 18px 36px -16px ${COLORS.shadowStrong}, 0 0 0 1px ${ring}`,
    e4: `inset 0 1px 0 ${hi}, 0 4px 8px ${COLORS.shadow}, 0 26px 50px -22px ${COLORS.shadowStrong}, 0 0 0 1px ${hexToRgba(COLORS.ink, COLORS.isLight ? 0.1 : 0.12)}`,
  };
  return tiers[level] || tiers.e2;
}

// Shared responsive stylesheet, rebuilt from current COLORS on every call so
// it always matches the active theme. Injected once per top-level screen
// (Workspace, AuthScreen, Onboarding) via a <style> tag.
export function globalCss() {
  const isLight = COLORS.isLight;
  const hi = isLight ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.05)";
  const hiTop = isLight ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.08)";
  return `
${FONT_IMPORT}
*, *::before, *::after { box-sizing: border-box; }
html, body { overflow-x: hidden; width: 100%; min-height: 100%; }
/* The page itself is the atmosphere: a soft multi-stop gradient of pale
   white → very pale blue → lavender that the glass panels blur and reveal.
   html carries BOTH the base color and the gradient. body must stay
   TRANSPARENT: if body carried an opaque background, painting order would
   put body's layer on top of body::before (root-step negative z-index is
   painted before the parent block's own background — CSS 2.1 E.2), so the
   atmosphere would be hidden and every backdrop-filter would sample a flat
   opaque color. Opaque color stays on html (behind everything); the layers
   above html are: the fixed atmosphere grid → translucent panels. */
html {
  background:
    radial-gradient(1100px 760px at 74% -16%, ${isLight ? "rgba(112,130,255,0.34)" : "rgba(96,118,224,0.30)"}, ${isLight ? "rgba(112,130,255,0.12)" : "rgba(96,118,224,0.08)"} 42%, transparent 62%),
    radial-gradient(840px 640px at 8% 108%, ${isLight ? "rgba(189,179,255,0.26)" : "rgba(120,92,200,0.26)"}, transparent 58%),
    radial-gradient(640px 460px at 46% 6%, ${isLight ? "rgba(255,255,255,0.9)" : "rgba(46,52,78,0.45)"}, transparent 60%),
    radial-gradient(560px 420px at 92% 26%, ${isLight ? "rgba(255,190,150,0.24)" : "rgba(64,56,92,0.36)"}, transparent 58%),
    /* Tight interior orbs give the glass panels something concrete to blur and
       smear at their own edges — a soft 1200px wash alone reads as flat tint
       even when backdrop-filter compositing is correct. With background-
       attachment: fixed these sit in the viewport, so the top-of-page hero and
       the first row of cards actually blur them. */
    radial-gradient(300px 290px at 52% 17%, ${isLight ? "rgba(112,130,255,0.40)" : "rgba(96,118,224,0.42)"}, transparent 62%),
    radial-gradient(340px 300px at 72% 34%, ${isLight ? "rgba(189,179,255,0.34)" : "rgba(120,92,200,0.36)"}, transparent 60%),
    radial-gradient(320px 280px at 24% 26%, ${isLight ? "rgba(255,214,175,0.30)" : "rgba(86,72,120,0.34)"}, transparent 58%),
    radial-gradient(340px 320px at 22% 34%, ${isLight ? "rgba(112,130,255,0.30)" : "rgba(96,118,224,0.32)"}, rgba(255,255,255,0) 55%, transparent 64%),
    radial-gradient(300px 280px at 71% 58%, ${isLight ? "rgba(189,179,255,0.26)" : "rgba(120,92,200,0.28)"}, transparent 60%),
    radial-gradient(260px 240px at 48% 108%, ${isLight ? "rgba(255,214,175,0.28)" : "rgba(64,56,92,0.34)"}, transparent 58%),
    linear-gradient(180deg, rgba(0,0,0,0) 58%, ${isLight ? "rgba(64,74,120,0.12)" : "rgba(0,0,0,0.48)"} 100%),
    ${COLORS.bg};
  /* fixed, NOT scroll: the orb positions above are % of the attachment box.
     With scroll (document) attachment on a tall dashboard the orbs land
     thousands of px below the hero, leaving a flat uniform wash behind the
     glass panels — a correct backdrop-filter then has nothing to smear and
     the whole glass system reads flat. Viewport-fixed keeps the atmosphere
     behind the hero and cards at every scroll position so the blur is
     actually visible. */
  background-attachment: fixed;
}
body {
  color: ${COLORS.text};
  background: transparent;
}
::selection { background: ${hexToRgba(COLORS.ink, 0.28)}; }

/* The app window sits on its own slightly-lifted translucent sheet above the
   atmospheric page background — the page gradient glows through the glass
   and panels get depth. NO backdrop-filter here on purpose: a full-viewport
   backdrop-filter becomes the backdrop root for everything inside it (CSS
   Filter Effects: the nearest ancestor with a filter/backdrop-filter wins),
   so inner .lg-hero/.lg-card would blur against the shell's own already
   flattened translucent fill instead of the page atmosphere — the exact
   "computed style right, pixels flat" failure. The shell stays a plain
   translucent sheet; the blur happens per-panel where it's visible. */
.app-shell {
  background: linear-gradient(170deg, ${hexToRgba(COLORS.panel, 0.42)}, ${hexToRgba(COLORS.panel2, 0.32)} 42%, ${hexToRgba(COLORS.bg, 0.3)});
  box-shadow: inset 0 1px 0 ${hi}, 0 32px 72px -36px ${COLORS.shadowStrong};
}
.app-main {
  /* soft light falling from the top of the content area, plus a repeating
     seam every 26px that the glass panels blur — gives the backdrop-filter
     something concrete to smear at each panel edge (without HR detail
     behind a panel, a correct blur is invisible). 2px-wide seam lines at
     ~0.2 ink alpha survive a 16-26px blur as soft bands; 1px lines wash out
     to nothing behind the panel fills. Theme-aware color so the grid is
     legible in both themes. */
  background:
    radial-gradient(120% 340px at 50% 0%, ${hexToRgba(COLORS.ink, isLight ? 0.05 : 0.07)}, transparent 70%),
    repeating-linear-gradient(180deg, ${hexToRgba(COLORS.ink, isLight ? 0.26 : 0.30)} 0, ${hexToRgba(COLORS.ink, 0)} 3px, ${hexToRgba(COLORS.ink, 0)} 26px);
}

::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: ${hexToRgba(COLORS.ink, 0.45)}; }

.lg-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(var(--lg-min, 140px), 1fr)); }
.lg-nav-item span { white-space: nowrap; }

/* Keyboard focus is always visible, regardless of theme or element type */
:focus-visible { outline: 2px solid ${COLORS.ink}; outline-offset: 2px; border-radius: 4px; }

/* Respect reduced-motion preference across every animated rule below */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
}

/* ---------- Glass cards: translucent surface + blur + hairline + depth ----------
   Level 2 surface. The fill uses hexToRgba() on the theme's hex panel tokens
   so the fallback path (no backdrop-filter) simply drops to opaque panels.
   Blur stays off tiny nested chips — those use the same tokens inline without
   their own backdrop-filter, per the blur policy. */
.lg-card {
  background: linear-gradient(170deg, ${hexToRgba(COLORS.panel, 0.58)}, ${hexToRgba(COLORS.panel2, 0.46)});
  backdrop-filter: blur(16px) saturate(1.18);
  -webkit-backdrop-filter: blur(16px) saturate(1.18);
  border: 1px solid ${COLORS.border};
  box-shadow:
    inset 0 1px 0 ${hi},
    0 1px 2px ${COLORS.shadow},
    0 10px 24px -14px ${COLORS.shadowStrong};
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out, border-color 0.2s ease-out;
}
.lg-card-interactive { cursor: pointer; }
.lg-card-interactive:hover {
  border-color: ${COLORS.borderStrong};
  box-shadow:
    inset 0 1px 0 ${hi},
    0 2px 4px ${COLORS.shadow},
    0 18px 34px -18px ${COLORS.shadowStrong},
    0 0 0 1px ${hexToRgba(COLORS.ink, 0.07)};
  transform: translateY(-2px);
}
.lg-card-interactive:active { transform: translateY(0) scale(0.99); }

/* Row hover inside a card list (leaderboard rows, group rows) */
.lg-row { transition: background 0.15s ease-out; }
.lg-row:hover { background: ${COLORS.hoverOverlay}; }

/* Prep-progress day grid cells: a quiet brighten on hover, nothing more */
.lg-pcell { transition: filter 0.15s ease-out; }
.lg-pcell:hover { filter: brightness(1.18); }

/* ---------- Buttons: lift on hover, settle on press ---------- */
.lg-btn {
  transition: filter 0.15s ease-out, box-shadow 0.15s ease-out, transform 0.12s ease-out, border-color 0.15s ease-out, background 0.15s ease-out;
}
.lg-btn:active:not(:disabled) { transform: translateY(1px) scale(0.97); }
.lg-btn-ink:hover:not(:disabled) { filter: brightness(1.1); box-shadow: 0 6px 16px -8px ${COLORS.inkGlow}; }
.lg-btn-ghost:hover:not(:disabled) { background: ${COLORS.hoverOverlay}; border-color: ${COLORS.borderStrong}; }

/* ---------- Inputs: focus ring glow ---------- */
.lg-input { transition: border-color 0.15s ease-out, box-shadow 0.15s ease-out, background 0.15s ease-out; }
.lg-input:hover { border-color: ${COLORS.borderStrong}; }
.lg-input:focus {
  outline: none;
  border-color: ${COLORS.ink} !important;
  box-shadow: 0 0 0 3px ${hexToRgba(COLORS.ink, isLight ? 0.16 : 0.2)};
}

/* ---------- Page transitions: gentle fade + rise per tab ----------
   Fade only — no transform here. fill-mode:both on a transform keyframe
   leaves translateY(0) applied forever, and any non-none transform on a
   wrapper above the glass panels makes it a containing block/composited
   layer that can sit between the atmosphere and backdrop-filter (the §2
   anti-pattern). Opacity animation alone is already a composited layer
   that releases when finished. */
@keyframes lg-fadeUp { from { opacity: 0; } to { opacity: 1; } }
.lg-page { animation: lg-fadeUp 0.3s ease-out both; }

/* Countdown number tick — retriggers via a changing key on the element */
@keyframes lg-tick {
  0% { transform: translateY(4px) scale(1.02); opacity: 0.3; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
.lg-tick { animation: lg-tick 0.4s ease-out both; }

/* ---------- Hero panel: the hero is the highest-fidelity glass in the app — 
   Level 3. Stronger fill than a card, ambient accent lighting, a faint
   reflection near the top edge, deeper blur. Never a solid accent wall. */
.lg-hero {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(158deg, ${isLight ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.05)"} 0%, transparent 26%, transparent 78%, ${isLight ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)"} 100%),
    radial-gradient(640px 320px at 82% -50%, ${hexToRgba(COLORS.ink, isLight ? 0.14 : 0.2)}, transparent 65%),
    radial-gradient(420px 260px at 2% 130%, ${hexToRgba(COLORS.ink, isLight ? 0.09 : 0.12)}, transparent 60%),
    radial-gradient(120% 70% at 50% -30%, ${hiTop}, transparent 55%),
    linear-gradient(170deg, ${hexToRgba(COLORS.panel, 0.52)}, ${hexToRgba(COLORS.panel2, 0.42)});
  backdrop-filter: blur(16px) saturate(1.3);
  -webkit-backdrop-filter: blur(16px) saturate(1.3);
  border: 1px solid ${COLORS.border};
  box-shadow:
    inset 0 1px 0 ${hi},
    0 2px 4px ${COLORS.shadow},
    0 22px 48px -20px ${COLORS.shadowStrong},
    0 0 0 1px ${hexToRgba(COLORS.ink, isLight ? 0.14 : 0.18)};
  border-radius: 14px;
}

/* Days-remaining focal chip — the red is "urgent, intentional", never an
   error. A slow ambient glow pulse only when time is genuinely short. */
@keyframes lg-urgentPulse {
  0%, 100% { box-shadow: inset 0 1px 0 ${hi}, 0 0 0 1px ${hexToRgba(COLORS.danger, 0.28)}, 0 10px 26px -14px ${hexToRgba(COLORS.danger, 0.55)}; }
  50% { box-shadow: inset 0 1px 0 ${hi}, 0 0 0 1px ${hexToRgba(COLORS.danger, 0.5)}, 0 14px 34px -12px ${hexToRgba(COLORS.danger, 0.8)}; }
}
.lg-days-badge {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(240px 120px at 20% -60%, ${hexToRgba(COLORS.danger, 0.22)}, transparent 70%),
    linear-gradient(170deg, ${COLORS.panel2}, ${COLORS.panel});
  border: 1px solid ${hexToRgba(COLORS.danger, 0.3)};
  box-shadow: inset 0 1px 0 ${hi}, 0 10px 26px -14px ${hexToRgba(COLORS.danger, 0.55)};
  border-radius: 12px;
}
.lg-days-badge.lg-days-urgent { animation: lg-urgentPulse 3s ease-in-out infinite; }

/* ---------- Progress fills: gradient + soft glow ---------- */
.lg-progress { background: ${hexToRgba(COLORS.panel2, 0.7)}; border-radius: 999px; overflow: hidden; box-shadow: inset 0 1px 2px ${COLORS.shadow}; }
.lg-progress-fill {
  background-image: linear-gradient(90deg, ${darken(COLORS.ink, 30)}, ${COLORS.ink});
  border-radius: 999px;
  box-shadow: 0 0 10px ${hexToRgba(COLORS.ink, 0.4)};
  transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

/* ---------- Empty state: soft plate instead of bare text ---------- */
.lg-empty-icon {
  width: 42px; height: 42px; border-radius: 13px;
  display: flex; align-items: center; justify-content: center;
  background: ${hexToRgba(COLORS.panel2, 0.72)};
  border: 1px solid ${COLORS.border};
  box-shadow: inset 0 1px 0 ${hi};
}

/* ---------- Quick-action dock: one system, four lit cells ---------- */
.lg-dock {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  padding: 16px;
  border-radius: ${RADIUS.modal}px;
  border: 1px solid ${COLORS.border};
  background:
    radial-gradient(560px 220px at 50% -60%, ${hexToRgba(COLORS.ink, isLight ? 0.07 : 0.09)}, transparent 65%),
    linear-gradient(170deg, ${hexToRgba(COLORS.panel, 0.55)}, ${hexToRgba(COLORS.panel2, 0.45)});
  backdrop-filter: blur(${COLORS.glassBlur}) saturate(1.15);
  -webkit-backdrop-filter: blur(${COLORS.glassBlur}) saturate(1.15);
  box-shadow: inset 0 1px 0 ${hi}, 0 14px 30px -18px ${COLORS.shadowStrong};
}
.lg-dock-item {
  position: relative;
  display: flex; flex-direction: column; gap: 10px;
  padding: 18px 20px;
  border-radius: ${RADIUS.card}px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer; text-align: left;
  transition: background 0.16s ease-out, border-color 0.16s ease-out, transform 0.14s ease-out, box-shadow 0.16s ease-out;
}
.lg-dock-item:hover {
  background: ${COLORS.hoverOverlay};
  border-color: ${COLORS.borderStrong};
  transform: translateY(-2px);
  box-shadow: 0 12px 24px -14px ${COLORS.shadowStrong};
}
.lg-dock-item:active { transform: translateY(0) scale(0.98); }
.lg-dock-item.primary {
  border-color: ${hexToRgba(COLORS.ink, COLORS.isLight ? 0.35 : 0.45)};
  background: linear-gradient(170deg, ${hexToRgba(COLORS.ink, isLight ? 0.13 : 0.16)}, ${hexToRgba(COLORS.ink, isLight ? 0.02 : 0.03)} 75%);
}
.lg-dock-icon { transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1); }
.lg-dock-item:hover .lg-dock-icon { transform: translateY(-2px); }
@media (max-width: 720px) {
  .lg-dock { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

/* Range sliders (Reality check, etc.) pick up the accent */
input[type="range"] { accent-color: ${COLORS.ink}; cursor: pointer; }

/* ---------- Heatmap/calendar cells ---------- */
.lg-cell { transition: transform 0.12s ease-out, box-shadow 0.12s ease-out, border-color 0.12s ease-out; }
.lg-cell:hover { transform: translateY(-1px); box-shadow: 0 4px 10px -4px ${COLORS.shadowStrong}; border-color: ${COLORS.ink}; }

/* ---------- Sidebar: premium glass layer, active item stays elevated ---------- */
.lg-sidebar {
  background:
    radial-gradient(560px 340px at -12% -8%, ${hexToRgba(COLORS.ink, isLight ? 0.07 : 0.08)}, transparent 62%),
    linear-gradient(185deg, ${hexToRgba(COLORS.panel, 0.8)}, ${hexToRgba(COLORS.panel2, 0.66)});
  backdrop-filter: blur(16px) saturate(1.15);
  -webkit-backdrop-filter: blur(16px) saturate(1.15);
  border-right: 1px solid ${COLORS.border};
}
.lg-nav-item {
  position: relative;
  display: flex; align-items: center; gap: 14px;
  padding: 12px 14px; border-radius: 12px;
  cursor: pointer; font-size: 13px;
  font-family: ${FONTS.body};
  color: ${COLORS.dim};
  background: transparent;
  border: none;
  transition: color 0.16s ease-out, background 0.16s ease-out, box-shadow 0.16s ease-out, transform 0.16s ease-out;
}
.lg-nav-item::before {
  content: ""; position: absolute; left: -12px; top: 50%; transform: translateY(-50%);
  width: 3px; height: 0; border-radius: 2px; background: ${COLORS.ink};
  box-shadow: 0 0 8px ${COLORS.inkGlow};
  transition: height 0.22s ease-out;
}
.lg-nav-item:hover { color: ${COLORS.text}; background: ${COLORS.hoverOverlay}; transform: translateX(1px); }
.lg-nav-item:hover::before { height: 10px; }
.lg-nav-item.active {
  color: ${COLORS.text}; font-weight: 600;
  background: linear-gradient(90deg, ${hexToRgba(COLORS.ink, isLight ? 0.13 : 0.16)}, ${hexToRgba(COLORS.ink, isLight ? 0.04 : 0.05)});
  box-shadow: inset 0 0 0 1px ${hexToRgba(COLORS.ink, 0.16)}, 0 6px 18px -10px ${COLORS.inkGlow};
}
.lg-nav-item.active::before { height: 20px; }
.lg-nav-item.active:hover { transform: none; }

/* Skeleton loading shimmer */
@keyframes lg-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.lg-skeleton {
  background: linear-gradient(90deg, ${COLORS.panel2} 25%, ${COLORS.border} 50%, ${COLORS.panel2} 75%);
  background-size: 200% 100%;
  animation: lg-shimmer 1.4s ease-in-out infinite;
  border-radius: ${RADIUS.control}px;
}

/* Brand plate on the sign-in screen */
.lg-brand-plate {
  width: 30px; height: 30px; border-radius: 8px;
  background: linear-gradient(150deg, ${COLORS.ink}, ${darken(COLORS.ink, 25)});
  box-shadow: 0 0 0 1px ${hexToRgba(COLORS.ink, 0.35)}, 0 4px 14px -6px ${COLORS.inkGlow};
  display: flex; align-items: center; justify-content: center;
}

/* ---------- No-backdrop-filter fallback ----------
   Glass must never break reading: without backdrop-filter we drop any
   translucency straight back to the opaque theme panels — same layout,
   same shadows, fully readable. */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .app-shell { background: linear-gradient(170deg, ${COLORS.panel2}, ${COLORS.panel} 42%, ${COLORS.bg}); }
  .lg-card { background: linear-gradient(170deg, ${COLORS.panel}, ${COLORS.panel2}); }
  .lg-hero { background:
      radial-gradient(640px 320px at 82% -50%, ${hexToRgba(COLORS.ink, isLight ? 0.13 : 0.18)}, transparent 65%),
      linear-gradient(170deg, ${COLORS.panel}, ${COLORS.panel2}); }
  .lg-dock { background: linear-gradient(170deg, ${COLORS.panel}, ${COLORS.panel2}); }
  .lg-sidebar { background: linear-gradient(185deg, ${COLORS.panel}, ${COLORS.panel2}); }
  .lg-progress { background: ${COLORS.panel2}; }
  .lg-empty-icon { background: ${COLORS.panel2}; }
}

/* ---------- Mobile: cheaper glass ----------
   Small screens don't need heavy compositing — reduce blur and shadow so
   scrolling stays smooth without changing the elevation logic. */
@media (max-width: 720px) {
  .lg-card, .lg-hero, .lg-sidebar, .lg-dock {
    backdrop-filter: blur(10px) saturate(1.1);
    -webkit-backdrop-filter: blur(10px) saturate(1.1);
  }
  .lg-hero { box-shadow: inset 0 1px 0 ${hi}, 0 10px 24px -16px ${COLORS.shadowStrong}; }
}

@media (max-width: 980px) {
  .lg-shell, .app-shell { flex-direction: column !important; max-width: 100% !important; border-radius: 0 !important; min-height: 100vh !important; height: auto !important; overflow-y: auto !important; }
  .lg-sidebar, .sidebar { width: 100% !important; flex-direction: row !important; align-items: center; padding: 14px 16px !important; border-right: none !important; border-bottom: 1px solid ${COLORS.border}; gap: 14px; }
  .lg-sidebar-meta, .lg-sidebar-foot, .sidebar-foot { display: none !important; }
  .lg-sidebar-brand { padding: 0 !important; border: none !important; margin: 0 !important; }
  .lg-sidebar-nav { flex-direction: row !important; overflow-x: auto; flex: 1; gap: 8px !important; scrollbar-width: none; }
  .lg-sidebar-nav::-webkit-scrollbar { display: none; }
  .lg-nav-item { border: none !important; border-bottom: 3px solid transparent !important; flex-shrink: 0; }
  .lg-nav-item.active { border-bottom-color: ${COLORS.ink} !important; }
  .lg-nav-item::before { display: none; }
  .lg-signout-mobile { display: inline-flex !important; }
  .lg-main, .app-main { padding: 20px !important; max-height: none !important; }
  .lg-side { grid-template-columns: 1fr !important; }
}
@media (min-width: 981px) {
  .lg-signout-mobile { display: none !important; }
}
@media (max-width: 720px) {
  .lg-2col { grid-template-columns: 1fr !important; }
  .lg-nav-item span { display: none; }
  .lg-hero { padding: 20px !important; }
}
@media (max-width: 480px) {
  .lg-grid { grid-template-columns: repeat(2, 1fr) !important; }
  .lg-main, .app-main { padding: 16px !important; }
}
`;
}
