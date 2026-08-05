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

// 8px-grid spacing scale, exported so components can reference SPACE.md
// instead of a bare "16" — keeps future spacing edits centralized even
// though the app renders via inline styles rather than CSS classes.
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };

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

// Each theme is a full palette, not just an accent color swapped in — the
// background, panel depth, and ink color all shift together so switching
// actually reads as a different room, not the same room with a new lamp.
export const THEME_PRESETS = {
  ledger: {
    label: "Ledger", swatch: "#C98A3E", font: "ledger",
    bg: "#121110", panel: "#1B1917", panel2: "#221F1B", border: "#332F27",
    text: "#F0EDE6", dim: "#A39C8C", faint: "#6B6558",
    done: "#6FA287", warn: "#D9A441", danger: "#C1443D", accent: "#C98A3E",
  },
  midnight: {
    label: "Midnight", swatch: "#5B8CFF", font: "grotesk",
    bg: "#0A0D14", panel: "#111624", panel2: "#161C2E", border: "#232B42",
    text: "#E8ECF7", dim: "#8B93AC", faint: "#4C5470",
    done: "#3FBF8A", warn: "#E8A23D", danger: "#F0665F", accent: "#5B8CFF",
  },
  parchment: {
    label: "Parchment", swatch: "#966B3C", font: "newsreader",
    bg: "#F2ECDD", panel: "#FBF8F0", panel2: "#EDE4CE", border: "#D9CBA5",
    text: "#2A2318", dim: "#6B5F45", faint: "#A5977A",
    done: "#3F7D50", warn: "#A96A16", danger: "#B23B30", accent: "#966B3C",
  },
  forest: {
    label: "Forest", swatch: "#52B788", font: "ledger",
    bg: "#0B1512", panel: "#12201A", panel2: "#182B22", border: "#243D31",
    text: "#E7F2EB", dim: "#8FAF9F", faint: "#4A6459",
    done: "#52B788", warn: "#D9A441", danger: "#E0645A", accent: "#52B788",
  },
  rosequartz: {
    label: "Rose Quartz", swatch: "#E88DA0", font: "newsreader",
    bg: "#1A1216", panel: "#241A20", panel2: "#2E1F27", border: "#432F3B",
    text: "#F6E9EE", dim: "#B593A0", faint: "#6B4E5B",
    done: "#7CC6A6", warn: "#E2A857", danger: "#E85D6F", accent: "#E88DA0",
  },
  terminal: {
    label: "Terminal", swatch: "#5EEAD4", font: "grotesk",
    bg: "#08090A", panel: "#101213", panel2: "#161819", border: "#26292B",
    text: "#E9EEEC", dim: "#8FA19C", faint: "#4B5957",
    done: "#5EEAD4", warn: "#E8B23D", danger: "#F0665F", accent: "#5EEAD4",
  },
};

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
  const t = THEME_PRESETS[themeId] || THEME_PRESETS.ledger;
  const isLight = relLuminance(t.bg) > 0.5;
  Object.assign(COLORS, {
    bg: t.bg, panel: t.panel, panel2: t.panel2, border: t.border,
    text: t.text, dim: t.dim, faint: t.faint, done: t.done, warn: t.warn, danger: t.danger,
    ink: t.accent, mastered: t.accent,
    inkSoft: hexToRgba(t.accent, isLight ? 0.14 : 0.16),
    inkDim: darken(t.accent, 55),
    inkGlow: hexToRgba(t.accent, isLight ? 0.22 : 0.28),
    borderStrong: hexToRgba(t.accent, isLight ? 0.5 : 0.55),
    hoverOverlay: hexToRgba(t.accent, isLight ? 0.05 : 0.06),
    surfaceOverlay: isLight ? "rgba(20,16,8,0.35)" : "rgba(0,0,0,0.55)",
    // Light themes (parchment) get a soft warm-dark shadow so panels don't
    // look like they're floating over paper; dark themes get true black at
    // low alpha since the panel/bg contrast already does most of the work.
    shadow: isLight ? "rgba(60,45,20,0.10)" : "rgba(0,0,0,0.28)",
    shadowStrong: isLight ? "rgba(60,45,20,0.18)" : "rgba(0,0,0,0.48)",
  });
  const f = FONT_PRESETS[t.font] || FONT_PRESETS.ledger;
  Object.assign(FONTS, f);
}

// Populate COLORS/FONTS immediately with the default theme, so the sign-in
// screen (which renders before any session — and therefore before Workspace
// ever calls applyTheme with the user's saved preference) isn't left with
// blank colors. Workspace re-applies the user's actual theme once settings load.
applyTheme("ledger");

// Universal medal colors for leaderboard ranks — these stay fixed regardless
// of the active theme (gold/silver/bronze read as "rank" everywhere, the way
// a theme-tinted version wouldn't).
export const RANK_COLORS = ["#E8C547", "#C7CDD6", "#C98A5C"];

// Shared responsive stylesheet, rebuilt from current COLORS on every call so
// it always matches the active theme. Injected once per top-level screen
// (Workspace, AuthScreen, Onboarding) via a <style> tag.
export function globalCss() {
  return `
${FONT_IMPORT}
*, *::before, *::after { box-sizing: border-box; }
html, body { overflow-x: hidden; width: 100%; }
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 4px; }

.lg-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(var(--lg-min, 140px), 1fr)); }
.lg-nav-item span { white-space: nowrap; }

/* Keyboard focus is always visible, regardless of theme or element type */
:focus-visible { outline: 2px solid ${COLORS.ink}; outline-offset: 2px; border-radius: 4px; }

/* Respect reduced-motion preference across every animated rule below */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
}

/* Card: soft gradient body + lifted shadow instead of a flat fill, so
   surfaces read with real depth. .lg-card-interactive adds a hover lift for
   clickable cards (group rows, leaderboard container, etc). */
.lg-card {
  background: linear-gradient(165deg, ${COLORS.panel}, ${COLORS.panel2});
  box-shadow: 0 1px 0 ${hexToRgba("#ffffff", 0.02)} inset, 0 10px 24px -14px ${COLORS.shadowStrong}, 0 1px 3px ${COLORS.shadow};
  transition: box-shadow 0.2s ease-out, transform 0.2s ease-out, border-color 0.2s ease-out;
}
.lg-card-interactive { cursor: pointer; }
.lg-card-interactive:hover {
  border-color: ${COLORS.borderStrong};
  box-shadow: 0 1px 0 ${hexToRgba("#ffffff", 0.02)} inset, 0 16px 32px -16px ${COLORS.shadowStrong}, 0 1px 3px ${COLORS.shadow};
  transform: translateY(-1px);
}

/* Row hover inside a card list (leaderboard rows, group rows) */
.lg-row { transition: background 0.15s ease-out; }
.lg-row:hover { background: ${COLORS.hoverOverlay}; }

/* Button interaction states — active press, hover lift on the filled
   variant, subtle wash on the ghost variant. Matches Btn's ink/ghost/
   danger/subtle variants already defined in App.jsx. */
.lg-btn { transition: filter 0.15s ease-out, box-shadow 0.15s ease-out, transform 0.1s ease-out; }
.lg-btn:active:not(:disabled) { transform: translateY(1px); }
.lg-btn-ink:hover:not(:disabled) { filter: brightness(1.08); box-shadow: 0 6px 16px -8px ${COLORS.inkGlow}; }
.lg-btn-ghost:hover:not(:disabled) { background: ${COLORS.hoverOverlay}; border-color: ${COLORS.borderStrong}; }

/* Skeleton loading shimmer — swap in place of a bare spinner or blank div
   while data loads. Usage: <div class="lg-skeleton" style="height:40px" />. */
@keyframes lg-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.lg-skeleton {
  background: linear-gradient(90deg, ${COLORS.panel2} 25%, ${COLORS.border} 50%, ${COLORS.panel2} 75%);
  background-size: 200% 100%;
  animation: lg-shimmer 1.4s ease-in-out infinite;
  border-radius: ${RADIUS.control}px;
}

@media (max-width: 980px) {
  .lg-shell { flex-direction: column !important; max-width: 100% !important; border-radius: 0 !important; min-height: 100vh !important; }
  .lg-sidebar { width: 100% !important; flex-direction: row !important; align-items: center; padding: 10px 12px !important; border-right: none !important; border-bottom: 1px solid ${COLORS.border}; gap: 10px; }
  .lg-sidebar-meta, .lg-sidebar-foot { display: none !important; }
  .lg-sidebar-brand { padding: 0 !important; border: none !important; margin: 0 !important; }
  .lg-sidebar-nav { flex-direction: row !important; overflow-x: auto; flex: 1; gap: 4px !important; scrollbar-width: none; }
  .lg-sidebar-nav::-webkit-scrollbar { display: none; }
  .lg-nav-item { border-left: none !important; border-bottom: 3px solid transparent; flex-shrink: 0; }
  .lg-nav-item.active { border-bottom-color: ${COLORS.ink}; }
  .lg-signout-mobile { display: inline-flex !important; }
  .lg-main { padding: 16px !important; max-height: none !important; }
  .lg-side { grid-template-columns: 1fr !important; }
}
@media (min-width: 981px) {
  .lg-signout-mobile { display: none !important; }
}
@media (max-width: 720px) {
  .lg-2col { grid-template-columns: 1fr !important; }
  .lg-nav-item span { display: none; }
}
@media (max-width: 480px) {
  .lg-grid { grid-template-columns: repeat(2, 1fr) !important; }
  .lg-main { padding: 12px !important; }
}
`;
}
