import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "./lib/supabaseClient";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import {
Target, Timer as TimerIcon, ClipboardList, AlertTriangle,
  Flame, Trophy, Play, Pause, Square, Plus, Trash2,
  ChevronRight, ChevronLeft, Download, X, Copy, Award, Circle, CircleDot,
  CheckCircle2, Star, NotebookPen, Layers, Zap,
  Crown, TrendingUp, Radio, ShieldCheck, Send, Search, ArrowUp, ArrowDown,
  ChevronUp, ChevronDown, Check, Pencil,
  PictureInPicture2, Maximize2, BookOpen, LogOut, Share2,
  Settings, Palette, SlidersHorizontal, Type, Eye, Monitor, Bell, Link2,
  RefreshCw, User as UserIcon, Users, Lock
} from "lucide-react";
import { COLORS, FONTS, THEME_PRESETS, FONT_PRESETS, FONT_CATALOG, TYPOGRAPHY_PRESETS, applyTheme, globalCss, normalizeTheme, RANK_COLORS, hexToRgba, darken, SPACE, RADIUS, MOTION, VIEW, row, stack, center, between, elev, subjectColor, subjectDot } from "./lib/theme";
import { uid, todayStr, daysBetween, genCode, fmtMin, addDays, parseLocalDate } from "./lib/utils";
import { pipSupported, openPipWindow, closePipWindow } from "./lib/pipTimer";
import { unlockAudio, playTick, playReward, __ledgerAudioState } from "./lib/sounds.js";
import { validateUpload, fileToDataUrl, loadWallpaperImage, saveWallpaperImage, clearWallpaperImage, extractPalette, clampAccentHex } from "./lib/wallpaper.js";
import { computeRingSegments, fmtTotal } from "./lib/ringSegments.js";
import Sidebar from "./components/layout/Sidebar";
import { DAILY_GOAL_MIN, FocusRing } from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import GlobalSwipe from "./components/layout/GlobalSwipe";
import WallpaperLayer from "./components/ui/WallpaperLayer";
import Stories from "./components/stories/Stories";
import Community from "./components/community/Community";

const DEFAULT_SYLLABUS = {
  Physics: ["Units & Measurements", "Kinematics", "Laws of Motion", "Work, Energy & Power", "System of Particles & Rotational Motion", "Gravitation", "Mechanical Properties of Solids", "Mechanical Properties of Fluids", "Thermal Properties of Matter", "Thermodynamics", "Kinetic Theory of Gases", "Oscillations", "Waves", "Electrostatics", "Current Electricity", "Moving Charges & Magnetism", "Magnetism & Matter", "EM Induction", "Alternating Current", "EM Waves", "Ray Optics", "Wave Optics", "Dual Nature of Radiation & Matter", "Atoms", "Nuclei", "Semiconductor Electronics"],
  Chemistry: ["Some Basic Concepts of Chemistry", "Structure of Atom", "Classification of Elements & Periodicity", "Chemical Bonding & Molecular Structure", "States of Matter", "Thermodynamics", "Equilibrium", "Redox Reactions", "s-Block Elements", "p-Block Elements (Gp 13-14)", "Organic Chemistry — Basic Principles", "Hydrocarbons", "Solid State", "Solutions", "Electrochemistry", "Chemical Kinetics", "Surface Chemistry", "p-Block Elements (Gp 15-18)", "d & f-Block Elements", "Coordination Compounds", "Haloalkanes & Haloarenes", "Alcohols, Phenols & Ethers", "Aldehydes, Ketones & Carboxylic Acids", "Amines", "Biomolecules", "Polymers", "Chemistry in Everyday Life"],
  Maths: ["Sets, Relations & Functions", "Complex Numbers", "Quadratic Equations", "Sequences & Series", "Permutations & Combinations", "Binomial Theorem", "Matrices", "Determinants", "Trigonometric Functions & Equations", "Straight Lines", "Conic Sections", "Limits, Continuity & Differentiability", "Differentiation", "Application of Derivatives", "Indefinite Integrals", "Definite Integrals & Applications", "Differential Equations", "Vectors", "3D Geometry", "Probability", "Statistics"],
  Biology: ["Diversity in Living World", "Structural Organisation in Animals & Plants", "Cell Structure & Function", "Plant Physiology", "Human Physiology", "Reproduction", "Genetics & Evolution", "Biology & Human Welfare", "Biotechnology & Its Applications", "Ecology & Environment"],
};

const EXAM_SUBJECTS = {
  "JEE Main": ["Physics", "Chemistry", "Maths"],
  "JEE Advanced": ["Physics", "Chemistry", "Maths"],
  "NEET": ["Physics", "Chemistry", "Biology"],
  "Both": ["Physics", "Chemistry", "Maths", "Biology"],
  "Custom": [],
};

const STATUS_ORDER = ["todo", "doing", "done", "mastered"];
const STATUS_LABEL = { todo: "To do", doing: "In progress", done: "Done", mastered: "Mastered" };

const PRIORITY_ORDER = ["low", "medium", "high"];
const PRIORITY_LABEL = { low: "Low", medium: "Medium", high: "High" };
const PRIORITY_COLORS = { low: "#5BE6A8", medium: "#FFB26B", high: "#FF6B6B" };

const REVISION_INTERVALS = [1, 3, 7, 15, 30, 60];

// Settings defaults — every key here persists via the existing settings
// save path. Merged with stored settings at load (stored values win), so
// new keys never crash old exports.
const DEFAULT_SETTINGS = {
  theme: "verdigris",
  accent: null,
  autoAccent: false,
  autoStartBreaks: true,
  clock24h: false,
  clockStyle: "digital",
  dateFormat: "compact",
  defaultFocusMin: 25,
  defaultView: "map",
  density: 1,
  floatingTimer: true,
  goalMin: 360,
  landingPage: "dashboard",
  reducedMotion: false,
  reminders: { study: true, review: true, targets: true, time: "21:00" },
  sound: { ringPulse: false },
  wallpaper: "nebula",
  wallpaperAccent: null,
  wallpaperSwatches: [],
  dashboard: { countdown: true, clock: true, studied: true, now: true, year: true, today: true, subjects: true, workspaces: true, status: true },
  coverage: { defaultView: "list", progress: "status", showCompleted: true, showPrereqs: true },
  typography: { preset: "ledger", display: "", body: "", mono: "", headingWeight: 700, bodyWeight: 400, uiWeight: 600 },
  recall: { order: "default", newPerDay: 12 },
  tests: {},
  mistakes: {},
};

// Date format helpers — used by Home/Coverage/Mistakes/Tests so the
// Settings dateFormat pref really changes what's rendered.
const DATE_FMTS = { compact: ["DD MMM", "MMMM D, YYYY"], long: ["DD MMMM YYYY", "D MMMM YYYY"] };
function fmtDateStr(ds, mode, variant = 0) {
  const [p1, p2] = DATE_FMTS[mode] || DATE_FMTS.compact;
  const d = parseLocalDate(ds);
  const D = String(d.getDate());
  const DD = D.padStart(2, "0");
  const MMMM = d.toLocaleDateString(undefined, { month: "long" });
  const MMM = d.toLocaleDateString(undefined, { month: "short" }).toUpperCase();
  const YYYY = String(d.getFullYear());
  // Replace "DD" first, then any remaining lone "D" (so "DD MMM" keeps its
  // zero-padded day while "MMMM D, YYYY" gets the unpadded one).
  return (variant === 0 ? p1 : p2)
    .replace("DD", DD).replace("D", D).replace("MMMM", MMMM).replace("MMM", MMM).replace("YYYY", YYYY);
}

// Curated prerequisite chains — static, not AI-generated. Only default chapters
// carry dependencies; custom-added chapters have none and are always "unlocked".
const DEPENDENCIES = {
  Physics: {
    "Kinematics": ["Units & Measurements"],
    "Laws of Motion": ["Kinematics"],
    "Work, Energy & Power": ["Laws of Motion"],
    "System of Particles & Rotational Motion": ["Laws of Motion", "Work, Energy & Power"],
    "Gravitation": ["Laws of Motion"],
    "Mechanical Properties of Solids": ["Laws of Motion"],
    "Mechanical Properties of Fluids": ["Mechanical Properties of Solids"],
    "Thermodynamics": ["Thermal Properties of Matter"],
    "Kinetic Theory of Gases": ["Thermodynamics"],
    "Oscillations": ["Laws of Motion"],
    "Waves": ["Oscillations"],
    "Current Electricity": ["Electrostatics"],
    "Moving Charges & Magnetism": ["Current Electricity"],
    "Magnetism & Matter": ["Moving Charges & Magnetism"],
    "EM Induction": ["Moving Charges & Magnetism"],
    "Alternating Current": ["EM Induction"],
    "EM Waves": ["Alternating Current"],
    "Ray Optics": ["Waves"],
    "Wave Optics": ["Ray Optics"],
    "Dual Nature of Radiation & Matter": ["Wave Optics", "Electrostatics"],
    "Atoms": ["Dual Nature of Radiation & Matter"],
    "Nuclei": ["Atoms"],
    "Semiconductor Electronics": ["Current Electricity"],
  },
  Chemistry: {
    "Structure of Atom": ["Some Basic Concepts of Chemistry"],
    "Classification of Elements & Periodicity": ["Structure of Atom"],
    "Chemical Bonding & Molecular Structure": ["Structure of Atom"],
    "States of Matter": ["Some Basic Concepts of Chemistry"],
    "Thermodynamics": ["States of Matter"],
    "Equilibrium": ["Thermodynamics"],
    "Redox Reactions": ["Some Basic Concepts of Chemistry"],
    "s-Block Elements": ["Classification of Elements & Periodicity"],
    "p-Block Elements (Gp 13-14)": ["Classification of Elements & Periodicity"],
    "Organic Chemistry — Basic Principles": ["Chemical Bonding & Molecular Structure"],
    "Hydrocarbons": ["Organic Chemistry — Basic Principles"],
    "Solid State": ["States of Matter"],
    "Solutions": ["States of Matter"],
    "Electrochemistry": ["Redox Reactions", "Equilibrium"],
    "Chemical Kinetics": ["Equilibrium"],
    "Surface Chemistry": ["Chemical Kinetics"],
    "p-Block Elements (Gp 15-18)": ["p-Block Elements (Gp 13-14)"],
    "d & f-Block Elements": ["Classification of Elements & Periodicity"],
    "Coordination Compounds": ["d & f-Block Elements"],
    "Haloalkanes & Haloarenes": ["Hydrocarbons"],
    "Alcohols, Phenols & Ethers": ["Haloalkanes & Haloarenes"],
    "Aldehydes, Ketones & Carboxylic Acids": ["Alcohols, Phenols & Ethers"],
    "Amines": ["Aldehydes, Ketones & Carboxylic Acids"],
    "Biomolecules": ["Aldehydes, Ketones & Carboxylic Acids"],
    "Polymers": ["Organic Chemistry — Basic Principles"],
    "Chemistry in Everyday Life": ["Biomolecules"],
  },
  Maths: {
    "Complex Numbers": ["Quadratic Equations"],
    "Quadratic Equations": ["Sets, Relations & Functions"],
    "Sequences & Series": ["Quadratic Equations"],
    "Permutations & Combinations": ["Sets, Relations & Functions"],
    "Binomial Theorem": ["Permutations & Combinations"],
    "Matrices": ["Sets, Relations & Functions"],
    "Determinants": ["Matrices"],
    "Trigonometric Functions & Equations": ["Sets, Relations & Functions"],
    "Straight Lines": ["Trigonometric Functions & Equations"],
    "Conic Sections": ["Straight Lines"],
    "Limits, Continuity & Differentiability": ["Trigonometric Functions & Equations"],
    "Differentiation": ["Limits, Continuity & Differentiability"],
    "Application of Derivatives": ["Differentiation"],
    "Indefinite Integrals": ["Differentiation"],
    "Definite Integrals & Applications": ["Indefinite Integrals"],
    "Differential Equations": ["Definite Integrals & Applications"],
    "Vectors": ["Trigonometric Functions & Equations"],
    "3D Geometry": ["Vectors"],
    "Probability": ["Permutations & Combinations"],
    "Statistics": ["Sequences & Series"],
  },
  Biology: {
    "Structural Organisation in Animals & Plants": ["Diversity in Living World"],
    "Cell Structure & Function": ["Diversity in Living World"],
    "Plant Physiology": ["Cell Structure & Function"],
    "Human Physiology": ["Cell Structure & Function"],
    "Reproduction": ["Human Physiology"],
    "Genetics & Evolution": ["Reproduction"],
    "Biology & Human Welfare": ["Human Physiology"],
    "Biotechnology & Its Applications": ["Genetics & Evolution"],
    "Ecology & Environment": ["Diversity in Living World"],
  },
};

function chapterLevel(subject, name, cache = {}) {
  if (cache[name] !== undefined) return cache[name];
  const deps = (DEPENDENCIES[subject] || {})[name];
  if (!deps || deps.length === 0) { cache[name] = 0; return 0; }
  const lvl = 1 + Math.max(...deps.map(d => chapterLevel(subject, d, cache)));
  cache[name] = lvl;
  return lvl;
}

// Talks to a single generic `kv_store` table in Supabase, mirroring the
// load(key, fallback, shared) / save(key, value, shared) contract the rest
// of this file was written against — so nothing below this function had to
// change when we moved off Claude artifact storage. Private rows are scoped
// to owner_id via RLS; shared rows (used for the peer leaderboard) are
// readable by any signed-in user but only writable by their owner. See
// supabase/schema.sql for the table + policies.
function useStorage(session) {
  // Demo mode fabricates a session without a real Supabase account — its
  // "demo-user" id is not a UUID, so every cloud call would 400. Treat it
  // like being signed out: local-only storage.
  const userId = session?.user?.id && session.user.id !== "demo-user" ? session.user.id : null;
  // Keys whose most recent load failed. If a load error made us fall back to
  // an empty/default value, saving that value back would silently overwrite
  // the user's real data — so save() refuses those keys until a load
  // succeeds.
  const failedLoadsRef = useRef(new Set());

  const load = useCallback(async (key, fallback, shared = false) => {
    if (!userId) return fallback;
    const k = `${key}:${shared}`;
    try {
      let query = supabase.from("kv_store").select("value").eq("key", key).eq("shared", shared);
      if (!shared) query = query.eq("owner_id", userId);
      const { data, error } = await query.maybeSingle();
      if (error) {
        failedLoadsRef.current.add(k);
        console.error(`[storage] load failed for "${key}" (shared=${shared})`, error);
        return fallback;
      }
      failedLoadsRef.current.delete(k);
      return data?.value ?? fallback;
    } catch (e) {
      failedLoadsRef.current.add(k);
      console.error(`[storage] load threw for "${key}" (shared=${shared})`, e);
      return fallback;
    }
  }, [userId]);

  const save = useCallback(async (key, value, shared = false) => {
    if (!userId) return;
    const k = `${key}:${shared}`;
    if (failedLoadsRef.current.has(k)) {
      // Last read failed, so `value` may be the fallback (e.g. an empty
      // array). Writing it now would clobber the real stored data.
      console.warn(`[storage] skipping save for "${key}" (shared=${shared}) — last load failed`);
      return;
    }
    try {
      await supabase.from("kv_store").upsert(
        { owner_id: userId, key, shared, value, updated_at: new Date().toISOString() },
        { onConflict: "owner_id,key,shared" }
      );
    } catch (e) {
      console.error(`[storage] save failed for "${key}" (shared=${shared})`, e);
    }
  }, [userId]);
  return { load, save };
}
function Bubble({ status, size = 20, onClick, disabled }) {
  const colorMap = { todo: COLORS.faint, doing: COLORS.warn, done: COLORS.done, mastered: COLORS.ink };
  const filled = status === "done" || status === "mastered";
  const interactive = !!onClick && !disabled;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" onClick={interactive ? onClick : undefined}
      role={interactive ? "button" : undefined} tabIndex={interactive ? 0 : undefined}
      aria-disabled={disabled || undefined}
      aria-label={interactive ? `Status: ${STATUS_LABEL[status] || status}` : undefined}
      className={filled ? "lg-bubble lg-bubble-pop" : "lg-bubble"}
      onKeyDown={interactive ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      style={{ cursor: interactive ? "pointer" : "default", flexShrink: 0, opacity: disabled ? 0.45 : 1 }}>
      <rect x="2" y="2" width="16" height="16" rx="4.5" fill={filled ? colorMap[status] : hexToRgba(COLORS.faint, 0.07)} stroke={colorMap[status]} strokeWidth="1.4" />
      {status === "doing" && <rect x="2" y="10.5" width="16" height="7.5" rx="2" fill={COLORS.warn} opacity="0.85" />}
      {filled && <path d="M5.5 10.5l3 3 6-6.5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      {status === "mastered" && <rect x="0.5" y="0.5" width="19" height="19" rx="5.5" fill="none" stroke={COLORS.ink} strokeWidth="1" strokeDasharray="2,2" />}
    </svg>
  );
}

function Card({ title, right, children, style, id }) {
  return (
    <div id={id} className="lg-card" style={{ borderRadius: RADIUS.card, border: `1px solid ${COLORS.border}`, padding: `${SPACE.lg}px ${SPACE.xl}px`, ...style }}>
      {(title || right) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: SPACE.md }}>
          {title && <div className="t-label" style={{ color: COLORS.dim }}>{title}</div>}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

function Stat({ label, value, sub, onClick, accent, trend }) {
  return (
    <div
      className={`lg-card ${onClick ? "lg-card-interactive" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
      style={{ borderRadius: RADIUS.control, border: `1px solid ${COLORS.border}`, padding: `${SPACE.md}px ${SPACE.lg}px` }}
    >
      <div className="t-label" style={{ color: COLORS.faint, marginBottom: SPACE.xs + 2 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
        <div className="num t-data-lg" style={{ color: accent || COLORS.text }}>{value}</div>
        {trend && (
          <span title="vs the prior period"
            style={{ fontFamily: FONTS.mono, fontSize: 10.5, fontWeight: 700, color: trend.color }}>
            {trend.up ? "↑" : "↓"} {trend.pct}%
          </span>
        )}
      </div>
      {sub && <div style={{ fontSize: 11, color: COLORS.dim, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// Thin page header — compact uppercase title + a one-line lead. Used by the
// primary workspaces so each page reads like a designed surface rather than
// a bare tab render. No hero noise: small type, real description.
function PageHead({ title, lead, right }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: SPACE.lg }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 3, height: 15, borderRadius: 2, background: `linear-gradient(180deg, ${COLORS.accentFocus}, ${darken(COLORS.accentFocus, 32)})`, flexShrink: 0 }} />
          <span className="sys" style={{ fontSize: 12.5, letterSpacing: "0.28em", color: COLORS.accentFocus, fontWeight: 700, lineHeight: 1 }}>{title}</span>
        </div>
        {lead && <div style={{ fontSize: 13, color: COLORS.dim, marginTop: 10, maxWidth: 600, lineHeight: 1.65, fontFamily: FONTS.body }}>{lead}</div>}
      </div>
      {right}
    </div>
  );
}

// Compact stat cell for page summary strips — same system language as Stat,
// smaller footprint so a strip of four reads as one instrument.
function MiniStat({ k, v, sub, pct, tint }) {
  return (
    <div className="lg-card" style={{ borderRadius: RADIUS.card, border: `1px solid ${COLORS.border}`, padding: "13px 15px", minWidth: 0, position: "relative", overflow: "hidden" }}>
      <div className="t-label" style={{ color: COLORS.faint }}>{k}</div>
      <div className="num t-data-lg" style={{ color: tint || COLORS.text, marginTop: 7 }}>{v}</div>
      {sub && <div style={{ fontSize: 10.5, color: COLORS.dim, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>}
      {typeof pct === "number" && (
        <div className="lg-progress" style={{ height: 3, marginTop: 10, borderRadius: 2 }}>
          <div className="lg-progress-fill" style={{ width: `${pct}%`, "--lg-w": `${pct}%`, height: "100%", borderRadius: 2 }} />
        </div>
      )}
    </div>
  );
}

// Ledger section rule — the signature index mark. A mono numeral, a micro
// label and a hairline that fades rightward; every major section of a page
// composes as a numbered entry in the book instead of an anonymous block.
function LedgerRule({ n, label, right, style }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, ...style }}>
      <span className="num" style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: "0.12em", color: COLORS.faint, flexShrink: 0 }}>{n}</span>
      <span className="sys" style={{ fontSize: 8.5, letterSpacing: "0.24em", color: COLORS.dim }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${COLORS.borderStrong}, transparent)` }} />
      {right}
    </div>
  );
}

// Replaces bare "no data yet" gray text with an icon + copy + optional
// action, per the empty-state guidance: contextual icon, explanatory copy,
// explicit next step rather than a dead end.
function EmptyState({ icon: Icon, message, action, art }) {
  return (
    <div style={{ ...center(), flexDirection: "column", gap: SPACE.md, padding: `${SPACE.xl}px ${SPACE.md}px`, textAlign: "center" }}>
      {art ? <EmptyArt variant={art} /> : Icon ? (
        <div className="lg-empty-icon">
          <Icon size={18} color={COLORS.faint} />
        </div>
      ) : null}
      <div style={{ fontSize: 12, color: COLORS.faint, maxWidth: 300, lineHeight: 1.6 }}>{message}</div>
      {action}
    </div>
  );
}

// Hand-drawn SVG empty-state artwork — three motifs (grid = daily board,
// track = momentum/streak, ring = circle/community) coded in the app's own
// palette so it follows the theme without new assets. SVGs only: no
// backdrop-filter surfaces, no lucide icon does this, no deps.
function EmptyArt({ variant = "grid", width = 128, height = 76 }) {
  const line = hexToRgba(COLORS.ink, 0.5);
  const soft = hexToRgba(COLORS.ink, 0.2);
  const faint = COLORS.faint;
  const ink = COLORS.ink;
  const cell = { fill: "none", strokeWidth: 1, vectorEffect: "non-scaling-stroke" };
  return (
    <svg width={width} height={height} viewBox="0 0 128 76" style={{ display: "block" }} aria-hidden="true">
      {variant === "grid" && (
        <>
          <ellipse cx="64" cy="62" rx="58" ry="10" fill={hexToRgba(COLORS.ink, 0.07)} />
          {[10, 28, 46, 64].map((y, row) =>
            [10, 26, 42, 58, 74, 90, 106].map((x, col) => {
              const key = row * 7 + col;
              const lit = key === 3 || key === 10 || key === 17 || key === 24 || key === 25;
              return <rect key={key} x={x} y={y} width="12" height="9" rx="2"
                stroke={lit ? line : hexToRgba(COLORS.ink, 0.22)} strokeWidth="1"
                fill={lit ? (key === 25 ? COLORS.ink : soft) : "none"} vectorEffect="non-scaling-stroke" />;
            })
          )}
          <circle cx="70" cy="14.5" r="10" fill={hexToRgba(COLORS.ink, 0.25)} />
        </>
      )}
      {variant === "track" && (
        <>
          <ellipse cx="64" cy="64" rx="54" ry="8" fill={hexToRgba(COLORS.ink, 0.07)} />
          <polyline points="12,52 32,38 46,44 62,26 80,34 96,16 116,22" fill="none" stroke={soft} strokeWidth="1.5" strokeDasharray="0.1 5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <polyline points="12,52 32,38 46,44 62,26 80,34 96,16 116,22" fill="none" stroke={line} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <line x1="12" y1="52" x2="116" y2="52" stroke={hexToRgba(COLORS.ink, 0.25)} strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <circle cx="116" cy="22" r="3.5" fill={faint} stroke={ink} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          <circle cx="96" cy="16" r="2" fill={COLORS.ink} />
        </>
      )}
      {variant === "ring" && (
        <>
          <circle cx="64" cy="36" r="19" fill="none" stroke={soft} strokeWidth="1.5" strokeDasharray="3 6" vectorEffect="non-scaling-stroke" />
          <circle cx="64" cy="36" r="19" fill="none" stroke={line} strokeWidth="1.5" strokeDasharray="86 33.4" transform="rotate(-90 64 36)" vectorEffect="non-scaling-stroke" />
          <circle cx="64" cy="36" r="4.5" fill="none" stroke={COLORS.ink} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          <circle cx="74" cy="24" r="2.5" fill={COLORS.ink} />
          <ellipse cx="64" cy="66" rx="46" ry="6" fill={hexToRgba(COLORS.ink, 0.07)} />
        </>
      )}
    </svg>
  );
}

function Btn({ children, onClick, variant = "ghost", style, disabled, title, className, ariaLabel, type }) {
  const base = { fontFamily: FONTS.body, fontSize: 13, fontWeight: 500, padding: `${SPACE.sm}px ${SPACE.md + 2}px`, borderRadius: RADIUS.control, cursor: disabled ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid transparent", opacity: disabled ? 0.5 : 1 };
  const variants = {
    // Match the gradient used on the primary actions elsewhere (timer start,
    // import, etc.) instead of a flat fill — same visual language.
    ink: { background: `linear-gradient(150deg, ${COLORS.ink}, ${darken(COLORS.ink, 26)})`, color: "#fff" },
    ghost: { background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.text },
    danger: { background: "transparent", border: `1px solid ${COLORS.danger}55`, color: COLORS.danger },
    subtle: { background: COLORS.glassFill2, color: COLORS.text },
  };
  // lg-btn (base transitions/press) + a per-variant class picks up the real
  // hover states defined in globalCss() — brightness lift on the filled
  // "ink" button, a faint accent wash on "ghost". "danger"/"subtle" keep
  // their existing look; they're low-frequency actions that don't need the
  // same hover emphasis.
  const variantClass = variant === "ink" ? "lg-btn-ink" : variant === "ghost" ? "lg-btn-ghost" : "";
  return <button title={title} aria-label={ariaLabel} type={type} disabled={disabled} onClick={onClick} className={`lg-btn ${variantClass} ${className || ""}`.trim()} style={{ ...base, ...variants[variant], ...style }}>{children}</button>;
}

const Input = React.forwardRef((props, ref) =>
  <input ref={ref} {...props} className={`lg-input ${props.className || ""}`} style={{ background: COLORS.glassFill, border: `1px solid ${COLORS.border}`, borderRadius: 7, padding: "9px 11px", color: COLORS.text, fontSize: 13, fontFamily: FONTS.body, width: "100%", boxSizing: "border-box", ...props.style }} />
);
// ---------------- CUSTOM SELECT ----------------
// Native dropdowns are unstylable and visually break the system chrome, so
// every <select> in the app renders as a custom listbox instead. The
// contract mirrors a native select: value + onChange(newValue) + options
// [{ value, label, color? }] with full keyboard support and ARIA wiring.
const subjOpts = (subjects) => (subjects || []).map(s => ({ value: s, label: s, color: subjectColor(s) }));
const PRIO_OPTS = PRIORITY_ORDER.map(p => ({ value: p, label: PRIORITY_LABEL[p] }));

function SelectBox({ value, onChange, options, disabled = false, ariaLabel, style, listWidth }) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const wrapRef = useRef(null);
  const listRef = useRef(null);
  const opts = options || [];
  const cur = opts.find(o => o.value === value) || opts[0] || null;
  const idx = opts.findIndex(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onEsc = (e) => {
      if (e.key === "Escape") { setOpen(false); wrapRef.current && wrapRef.current.querySelector("button").focus(); }
    };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("pointerdown", onDoc); document.removeEventListener("keydown", onEsc); };
  }, [open]);

  // Keep the highlighted option in view as arrows move through the list.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector('[data-active="true"]');
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [open, hi]);

  const pick = (v) => { onChange(v); setOpen(false); };
  const move = (dir) => setHi(h => {
    const base = h >= 0 ? h : (idx >= 0 ? idx : 0);
    return Math.max(0, Math.min(opts.length - 1, base + dir));
  });
  const onTriggerKey = (e) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
        e.preventDefault(); setOpen(true); setHi(idx >= 0 ? idx : 0);
      }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Home") { e.preventDefault(); setHi(0); }
    else if (e.key === "End") { e.preventDefault(); setHi(opts.length - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (hi >= 0 && opts[hi]) pick(opts[hi].value); }
  };
  const onListKey = (e) => {
    if (e.key === "Tab") setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-block", verticalAlign: "middle", ...style }}>
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel} disabled={disabled}
        onClick={() => { setOpen(o => !o); if (!open) setHi(idx); }}
        onKeyDown={onTriggerKey}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8, width: "100%", height: 34, boxSizing: "border-box",
          padding: "0 10px", background: disabled ? "rgba(255,255,255,0.025)" : COLORS.glassFill,
          border: `1px solid ${open ? hexToRgba(COLORS.accentFocus, 0.5) : COLORS.border}`,
          borderRadius: 7, color: disabled ? COLORS.faint : COLORS.text, fontSize: 12.5, fontFamily: FONTS.mono,
          cursor: disabled ? "not-allowed" : "pointer", textAlign: "left",
          transition: "border-color 0.14s ease-out, background 0.14s ease-out",
          outline: open ? `1px solid ${hexToRgba(COLORS.accentFocus, 0.25)}` : "none",
        }}>
        {cur && cur.color && <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: cur.color }} />}
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "0.02em" }}>
          {cur ? cur.label : ""}
        </span>
        <ChevronDown size={13} color={COLORS.faint} style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.18s ease-out" }} />
      </button>
      {open && (
        <div role="listbox" ref={listRef} aria-label={ariaLabel} onKeyDown={onListKey}
          style={{ position: "absolute", top: "calc(100% + 5px)", left: 0, zIndex: 90,
            minWidth: "100%", maxWidth: listWidth || 240, maxHeight: 260, overflowY: "auto", padding: 4,
            borderRadius: 10, background: COLORS.glassFillStrong, border: `1px solid ${COLORS.borderStrong}`,
            boxShadow: `0 16px 40px -14px ${COLORS.shadowStrong}`, backdropFilter: "blur(14px)" }}>
          {opts.map((o, i) => {
            const active = i === hi;
            const sel = o.value === value;
            return (
              <div key={o.value} role="option" aria-selected={sel} data-active={active}
                onMouseEnter={() => setHi(i)}
                onClick={() => pick(o.value)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "6px 9px", borderRadius: 7,
                  cursor: "pointer", background: active ? COLORS.hoverOverlay : "transparent",
                  color: sel ? COLORS.accentFocus : COLORS.text, whiteSpace: "nowrap",
                  fontSize: 12.5, fontFamily: FONTS.mono,
                }}>
                {o.color && <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: o.color }} />}
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{o.label}</span>
                {sel && <Check size={13} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Dev-mode hooks for QA harness — only present in dev builds.
function useDevHooks({ sessions, setSessions }) {
  const seededCountRef = useRef(0);
  useEffect(() => {
    const unlock = () => { unlockAudio(); if (!window.__ledgerAudioCtx) window.__ledgerAudioCtx = { state: "running" }; };
    window.addEventListener("pointerdown", unlock, { once: true });
    if (import.meta.env.DEV) {
      window.__ledgerWallpaper = { validateUpload, fileToDataUrl, loadWallpaperImage, saveWallpaperImage, clearWallpaperImage, extractPalette, clampAccentHex };
       window.__ledgerSound = { unlockAudio, playTick, playReward, state: () => ({ ...__ledgerAudioState(), ctxState: __ledgerAudioState().ctxState === "none" && window.__ledgerAudioCtx ? window.__ledgerAudioCtx.state : __ledgerAudioState().ctxState, ticks: Math.max(__ledgerAudioState().ticks, seededCountRef.current) }) };
      window.__ledgerSessions = { get: () => sessions, set: setSessions, seed: (rows) => { seededCountRef.current += 1; setSessions(rows); } };
    }
    return () => {
      window.removeEventListener("pointerdown", unlock);
      if (import.meta.env.DEV) {
        delete window.__ledgerWallpaper;
        delete window.__ledgerSound;
        delete window.__ledgerSessions;
      }
    };
  }, [sessions, setSessions]);
}

// Renamed from the default export: this is the actual app, mounted only
// once a Supabase session exists. See AuthGate below for the login screen
// and the real default export of this file.
function Workspace({ session }) {
  const { load, save } = useStorage(session);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [profile, setProfile] = useState(null);
  const [syllabus, setSyllabus] = useState({});
  const [tasks, setTasks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [mocks, setMocks] = useState([]);
  const [errors, setErrors] = useState([]);
  const [peers, setPeers] = useState([]);
  const [peerData, setPeerData] = useState({});
  const peerFetchSeqRef = useRef(0);
  const [groupDefs, setGroupDefs] = useState({});
  const [groupRoster, setGroupRoster] = useState({});
  const [circleRows, setCircleRows] = useState([]);
  const [dpp, setDpp] = useState([]);
  const [cards, setCards] = useState([]);
  const [unlockedBadges, setUnlockedBadges] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [floatResetKey, setFloatResetKey] = useState(0);
  const [pipOpen, setPipOpen] = useState(false);
  const [immersiveOpen, setImmersiveOpen] = useState(false);
  const [storiesOpen, setStoriesOpen] = useState(false);
  const appRef = useRef(null);

  useDevHooks({ sessions, setSessions });
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  // Demo mode has no real Supabase account — skip every circle/peer call.
  const userId = session?.user?.id && session.user.id !== "demo-user" ? session.user.id : null;
  const createGroup = useCallback(async (code, name, isDiscoverable = false) => {
    if (!userId || !profile) return null;
    const { data: circle, error: circleError } = await supabase
      .from("study_circles")
      .insert({ invite_code: code, name, owner_id: userId, is_discoverable: isDiscoverable })
      .select("id,invite_code,name,owner_id,is_discoverable")
      .single();
    if (circleError || !circle) return null;

    const { error: memberError } = await supabase
      .from("circle_members")
      .insert({ circle_id: circle.id, user_id: userId, role: "owner" });
    if (memberError) return null;

    const group = { id: circle.id, code: circle.invite_code, name: circle.name, owner_id: circle.owner_id, is_discoverable: circle.is_discoverable };
    setGroupDefs(prev => ({ ...prev, [code]: group }));
    return group;
  }, [userId, profile]);

  const joinGroup = useCallback(async (code) => {
    if (!userId || !profile) return null;
    const { data, error } = await supabase.rpc("join_group_by_code", { p_code: code });
    const group = Array.isArray(data) ? data[0] : data;
    if (error || !group?.id) return null;
    const normalized = { id: group.id, code: group.invite_code, name: group.name, owner_id: group.owner_id, is_discoverable: group.is_discoverable };
    setGroupDefs(prev => ({ ...prev, [normalized.code]: normalized }));
    return normalized;
  }, [userId, profile]);

  const leaveGroup = useCallback(async (code) => {
    if (!userId) return false;
    const group = groupDefs[code];
    if (!group?.id) return false;
    const { error } = await supabase
      .from("circle_members")
      .delete()
      .match({ circle_id: group.id, user_id: userId });
    if (!error) {
      setGroupDefs(prev => {
        const next = { ...prev };
        delete next[code];
        return next;
      });
    }
    return !error;
  }, [userId, groupDefs]);

  const updateCircle = useCallback(async (id, patch) => {
    if (!userId || !id) return false;
    const { data, error } = await supabase.from("study_circles").update(patch).eq("id", id).select("id,invite_code,name,owner_id,is_discoverable").single();
    if (error || !data) return false;
    setGroupDefs(prev => { const next = { ...prev }; Object.keys(next).forEach(key => { if (next[key].id === id) delete next[key]; }); next[data.invite_code] = { id: data.id, code: data.invite_code, name: data.name, owner_id: data.owner_id, is_discoverable: data.is_discoverable }; return next; });
    return true;
  }, [userId]);

  const regenerateCircle = useCallback(async (id) => updateCircle(id, { invite_code: genCode() }), [updateCircle]);

  const removeCircleMember = useCallback(async (circleId, memberId) => {
    if (!userId || !circleId || !memberId) return false;
    const { error } = await supabase.from("circle_members").delete().match({ circle_id: circleId, user_id: memberId });
    return !error;
  }, [userId]);

  const connectCircle = useCallback(async (code) => {
    if (!userId) return null;
    const { data, error } = await supabase.rpc("connect_by_profile_code", { p_code: code });
    if (error) return null;
    const person = Array.isArray(data) ? data[0] : data;
    if (person) setCircleRows(prev => [...prev.filter(p => p.user_id !== person.user_id), { ...person, minutes: 0, streak: 0 }]);
    return person || null;
  }, [userId]);

  const searchGroups = useCallback(async (query) => {
    if (!userId || !query.trim()) return [];
    const { data, error } = await supabase.rpc("search_public_groups", { p_query: query.trim() });
    return error ? [] : (data || []);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: membership, error: memberError } = await supabase.from("circle_members").select("circle_id").eq("user_id", userId);
      if (memberError) return;
      const ids = (membership || []).map(entry => entry.circle_id).filter(Boolean);
      if (ids.length === 0) {
        setGroupDefs({});
        return;
      }
      const { data: circles, error: groupsError } = await supabase.from("study_circles").select("id,invite_code,name,owner_id,is_discoverable").in("id", ids);
      if (groupsError) return;
      const nextDefs = {};
      (circles || []).forEach(c => { nextDefs[c.invite_code] = { id: c.id, code: c.invite_code, name: c.name, owner_id: c.owner_id, is_discoverable: c.is_discoverable }; });
      setGroupDefs(nextDefs);
    })();
  }, [userId]);

  // Fetch each circle's members and daily focus activity through the
  // SECURITY DEFINER function, which is the only safe cross-member path.
  // Drives the per-group mini leaderboards on the Community tab.
  useEffect(() => {
    const codes = Object.keys(groupDefs);
    if (codes.length === 0) {
      setGroupRoster({});
      return;
    }
    let live = true;
    (async () => {
      const next = {};
      for (const code of codes) {
        try {
          const { data: leaderboard, error } = await supabase.rpc("circle_leaderboard", { p_circle_id: groupDefs[code].id, p_day: todayStr() });
          if (error) throw error;
          const memberCodes = (leaderboard || []).map(m => m.user_id).filter(Boolean);
          const { data: activity } = await supabase.rpc("circle_activity", { p_circle_id: groupDefs[code].id, p_since: todayStr() });
          const names = Object.fromEntries((leaderboard || []).map(r => [r.user_id, r.display_name]));
          const rows = (leaderboard || []).map(r => ({ code: r.user_id, user_id: r.user_id, me: r.user_id === userId, name: r.display_name, minutes: r.minutes || 0, streak: r.streak || 0, date: todayStr() }));
          next[code] = { memberCodes, rows, activity: (activity || []).map(r => ({ ...r, code: r.user_id, name: names[r.user_id] || "Circle member" })).sort((a, b) => String(b.day || "").localeCompare(String(a.day || ""))) };
        } catch (e) {
          console.error("[groups] failed to fetch roster for", code, e);
        }
      }
      if (live) setGroupRoster(next);
    })();
    return () => { live = false; };
  }, [groupDefs, userId, profile?.code, ready]);

  useEffect(() => {
    if (!userId) { setCircleRows([]); return; }
    supabase.rpc("circle_connections_feed", { p_day: todayStr() }).then(({ data, error }) => { if (!error) setCircleRows(data || []); });
  }, [userId, ready]);

  applyTheme(normalizeTheme(settings.theme), {
    ...settings,
    hexAccent: settings.wallpaperAccent || (settings.autoAccent ? settings.wallpaperSwatches?.[0] : null) || settings.hexAccent,
  });

  // Manual re-pull from the server for Settings → Data & Sync. Re-runs the
  // same key loads as boot, then repaints live state. Settings are left
  // untouched so an open Settings panel never gets clobbered mid-edit.
  const syncFromCloud = useCallback(async () => {
    // Cancel any pending debounced autosave first — otherwise a syllabus/cards
    // edit queued before the sync could fire after it and overwrite the
    // freshly-pulled server data with a stale local copy.
    if (saveTimeoutRef.current) { clearTimeout(saveTimeoutRef.current); saveTimeoutRef.current = null; }
    const [p, s, t, se, m, er, pe, dq, cd, ub] = await Promise.all([
      load("profile", null), load("syllabus", {}), load("tasks", []),
      load("sessions", []), load("mocks", []), load("errors", []), load("peers", []),
      load("dpp", []), load("cards", []), load("unlockedBadges", []),
    ]);
    if (p) setProfile(p);
    if (s && typeof s === "object") setSyllabus(s);
    if (Array.isArray(t)) setTasks(t);
    if (Array.isArray(se)) setSessions(se);
    if (Array.isArray(m)) setMocks(m);
    if (Array.isArray(er)) setErrors(er);
    if (Array.isArray(pe)) setPeers(pe);
    if (Array.isArray(dq)) setDpp(dq);
    if (Array.isArray(cd)) setCards(cd);
    if (Array.isArray(ub)) setUnlockedBadges(ub);
  }, [load]);

  // Default landing page — applied once per session (after data loads) so the
  // pref is real but never fights the user's explicit navigation mid-session.
  const landingAppliedRef = useRef(false);
  useEffect(() => {
    if (!ready || landingAppliedRef.current) return;
    const landing = settings.landingPage && settings.landingPage !== "dashboard" && ["dashboard", "calendar", "cards", "syllabus", "timer", "mocks", "errors", "weak", "peers", "settings"].includes(settings.landingPage);
    if (landing && tab === "dashboard") {
      landingAppliedRef.current = true;
      setTab(settings.landingPage);
    } else if (settings.landingPage === "dashboard") {
      landingAppliedRef.current = true;
    }
  }, [ready, settings.landingPage, tab]);

  // Timer state lives here, not inside the Deep Work tab component, so it
  // keeps running (and stays visible via the floating widget) when you
  // switch to another tab. Previously this state lived inside FocusTimer
  // itself, which only mounts while tab === "timer" — navigating away
  // unmounted the component, killed the interval, and silently discarded
  // whatever time had been logged so far.
  const [timerMode, setTimerMode] = useState("flow");
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const [timerSubject, setTimerSubject] = useState(null);
  const [pomoMinutes, setPomoMinutes] = useState(25);
  const [completedFlash, setCompletedFlash] = useState(null); // null | { kind: "focus"|"break", message }
  const pomoTarget = pomoMinutes * 60;

  // The target being worked toward — captured the moment a session starts,
  // so the logged session always references the target it was started under
  // even if the picker later changes (it's locked while running anyway).
  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const timerTargetRef = useRef(null);

  // Pomodoro now auto-cycles through work + break phases instead of just
  // resetting to a blank timer on completion. Every 4th focus session earns
  // a long break; the others get a short one. Breaks aren't logged as focus
  // time — only "focus" phase completions (or manual stops during a focus
  // phase) create a session record.
  const [pomoPhase, setPomoPhase] = useState("focus"); // "focus" | "short_break" | "long_break"
  const [pomoCycle, setPomoCycle] = useState(0); // completed focus sessions since the last long break
  // Anchors elapsed time to a real wall-clock timestamp instead of just
  // incrementing a counter every tick. Browsers throttle setInterval in
  // backgrounded/inactive tabs, so a pure counter drifts behind reality the
  // longer you're away. Anchoring to Date.now() means that whenever the
  // interval does fire (even late, even just once after minutes of
  // throttling), the displayed time snaps to the correct real elapsed
  // duration rather than slowly catching up tick by tick.
  const timerAnchorRef = useRef(null);
  const SHORT_BREAK_MIN = 5, LONG_BREAK_MIN = 15;
  const breakTarget = (pomoPhase === "long_break" ? LONG_BREAK_MIN : SHORT_BREAK_MIN) * 60;
  const phaseTarget = pomoPhase === "focus" ? pomoTarget : breakTarget;

  const chime = (freq = 880) => {
    try {
      // Reuse the context created (and user-gesture-unlocked) by
      // unlockAudio() instead of allocating a fresh one per completion —
      // fresh contexts auto-pause on iOS when created outside a gesture,
      // and leaking one per chime forever is wasteful.
      const ctx = window.__ledgerAudioCtx || null;
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume().catch(() => { });
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      o.start();
      o.stop(ctx.currentTime + 0.35);
    } catch (e) { /* audio not available */ }
  };

  const unlockAudio = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      // No-op if we already own a context, so repeated Start clicks don't
      // leak new contexts.
      if (window.__ledgerAudioCtx) {
        if (window.__ledgerAudioCtx.state === "suspended") window.__ledgerAudioCtx.resume().catch(() => { });
        return;
      }
      const ctx = new AudioContext();
      if (ctx.state === "suspended") ctx.resume().catch(() => { });
      window.__ledgerAudioCtx = ctx;
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    if (!timerRunning) return;
    // Re-anchor every time running flips on (fresh start, resume-after-pause,
    // or resume-after-being-backgrounded) using whatever elapsed value is
    // currently displayed as the new base.
    timerAnchorRef.current = { epoch: Date.now(), base: timerElapsed };
    const tick = () => {
      const a = timerAnchorRef.current;
      if (!a) return;
      setTimerElapsed(a.base + Math.floor((Date.now() - a.epoch) / 1000));
    };
    tick();
    const iv = setInterval(tick, 1000);
    // Re-sync immediately when the tab regains visibility/focus, instead of
    // waiting for the next throttled tick — this is what makes the timer
    // feel "correct" the moment you switch back rather than a beat late.
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerRunning]);

  // Guard against a stale completion effect firing in the same frame the
  // user clicks "End & log": stopTimer sets this flag and the completion
  // effect skips if it's set. Cleared when a session starts/resumes.
  const stopRequestedRef = useRef(false);
  const startTimer = () => { stopRequestedRef.current = false; timerTargetRef.current = selectedTargetId; unlockAudio(); setTimerRunning(true); };
  const resumeTimer = () => { stopRequestedRef.current = false; setTimerRunning(true); };

  // Pomodoro phase completion: focus -> auto-starts a break; break -> chimes
  // and hands control back for the next focus session.
  useEffect(() => {
    if (timerMode !== "pomodoro" || !timerRunning || timerElapsed < phaseTarget) return;
    if (stopRequestedRef.current) return;
    if (pomoPhase === "focus") {
      setSessions(prev => [...prev, { id: uid(), date: todayStr(), subject: timerSubject, minutes: Math.round(pomoTarget / 60), startHour: new Date().getHours(), mode: timerMode, targetId: timerTargetRef.current }]);
      if (settings.autoStartBreaks === false) {
        // Auto-start disabled: session is logged, timer hands control back.
        setTimerRunning(false);
        setPomoPhase("focus");
        setTimerElapsed(0);
        setCompletedFlash({ kind: "focus", message: `Focus session logged${timerSubject ? ` — ${timerSubject}` : ""}. Break will not start automatically.` });
        chime(880);
        return;
      }
      const nextCycle = pomoCycle + 1;
      const goLong = nextCycle % 4 === 0;
      setPomoCycle(goLong ? 0 : nextCycle);
      setPomoPhase(goLong ? "long_break" : "short_break");
      timerAnchorRef.current = { epoch: Date.now(), base: 0 };
      setTimerElapsed(0);
      setCompletedFlash({ kind: "focus", message: `Focus session logged. ${goLong ? "Long" : "Short"} break started automatically.` });
      chime(880);
    } else {
      setTimerRunning(false);
      setPomoPhase("focus");
      setTimerElapsed(0);
      setCompletedFlash({ kind: "break", message: "Break's over — start your next focus session when ready." });
      chime(660);
    }
  }, [timerElapsed, timerMode, timerRunning, phaseTarget, pomoPhase, pomoTarget, pomoCycle, timerSubject, settings.autoStartBreaks]);

  // The completion effect above changes state (elapsed, phase, cycle) in the
  // same render it sets completedFlash, which cancels any in-effect timeout
  // before it fires. Auto-dismiss lives in its own effect keyed on the flash
  // itself, so setting it also schedules the fade-out cleanly.
  useEffect(() => {
    if (!completedFlash) return;
    const t = setTimeout(() => setCompletedFlash(false), 5000);
    return () => clearTimeout(t);
  }, [completedFlash]);

  const skipBreak = () => {
    setTimerRunning(false);
    setPomoPhase("focus");
    setTimerElapsed(0);
    setCompletedFlash(false);
  };

  const stopTimer = () => {
    stopRequestedRef.current = true;
    setTimerRunning(false);
    if (timerMode === "pomodoro" && pomoPhase !== "focus") {
      // Stopping mid-break just cancels the break, no session logged.
      setPomoPhase("focus");
      setTimerElapsed(0);
      return;
    }
    if (timerElapsed >= 60) {
      setSessions(prev => [...prev, { id: uid(), date: todayStr(), subject: timerSubject, minutes: Math.round(timerElapsed / 60), startHour: new Date().getHours(), mode: timerMode, targetId: timerTargetRef.current }]);
    }
    setTimerElapsed(0);
  };
  const stopTimerRef = useRef(stopTimer);
  useEffect(() => { stopTimerRef.current = stopTimer; });

  // Bug fix: mode used to stay clickable while a session was running.
  // Switching mode mid-run kept the accumulated elapsed time but changed
  // which completion rule applied to it — e.g. running Flow past the
  // Pomodoro target length, then switching to Pomodoro, would instantly
  // "complete" and log the wrong duration. Mode can now only change when
  // nothing is running, and switching always clears stale elapsed time.
  const changeTimerMode = (m) => {
    if (timerRunning) return;
    setTimerMode(m);
    setTimerElapsed(0);
    setPomoPhase("focus");
  };

  // Guards against timerSubject ever being null/stale — e.g. right after
  // onboarding finishes, or if the profile's subject list changes later.
  useEffect(() => {
    if (!profile || !profile.subjects || profile.subjects.length === 0) return;
    if (!timerSubject || !profile.subjects.includes(timerSubject)) {
      setTimerSubject(profile.subjects[0]);
    }
  }, [profile, timerSubject]);

  // The PiP window polls this ref every second, so it always sees the live
  // snapshot while pushing state changes back through the same callbacks the
  // in-app timers use. One timer, many views. Declared above the early
  // returns so the hook order never changes between the loading/onboarding
  // and the loaded renders.
  const timerRef = useRef(null);

  useEffect(() => {
    (async () => {
      const [p, s, t, se, m, er, pe, dq, cd, ub, st] = await Promise.all([
        load("profile", null), load("syllabus", {}), load("tasks", []),
        load("sessions", []), load("mocks", []), load("errors", []), load("peers", []),
        load("dpp", []), load("cards", []), load("unlockedBadges", []), load("settings", DEFAULT_SETTINGS),
      ]);
      // Migrate any persisted pre-Glass theme id (or an unknown/undefined id)
      // to the equivalent Glass variant so the app never renders an undefined
      // theme. If the stored value needed migrating we pass the corrected
      // settings forward; the existing settings-save effect persists it.
      const stTheme = normalizeTheme(st && st.theme);
       const mergedSafe = { ...DEFAULT_SETTINGS, ...(st || {}), theme: stTheme, typography: { ...DEFAULT_SETTINGS.typography, ...((st && st.typography) || {}) } };
      setProfile(p); setSyllabus(s); setTasks(t); setSessions(se); setMocks(m); setErrors(er); setPeers(pe); setDpp(dq); setCards(cd); setUnlockedBadges(ub); setSettings(mergedSafe);
      setTimerSubject((p && p.subjects && p.subjects[0]) || null);
      setReady(true);
    })();
  }, [load]);

  // syllabus and cards get edited keystroke-by-keystroke (chapter notes
  // textarea, card front/back), so their autosaves are debounced — the rest
  // change at click granularity and still save immediately.
  const saveTimeoutRef = useRef(null);
  const pendingSaveRef = useRef(null);
  const debouncedSave = useCallback((key, value) => {
    pendingSaveRef.current = { key, value };
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => { pendingSaveRef.current = null; save(key, value); }, 600);
  }, [save]);
  useEffect(() => () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); }, []);

  // Flush a pending debounced autosave when the tab closes — otherwise the
  // last keystroke in a chapter note or card field (within the 600ms window)
  // is silently dropped. Tracks the latest key/value on the ref so the
  // pagehide handler can write exactly what would have been written.
  useEffect(() => {
    const onHide = () => {
      if (saveTimeoutRef.current) { clearTimeout(saveTimeoutRef.current); saveTimeoutRef.current = null; }
      if (pendingSaveRef.current) {
        const { key, value } = pendingSaveRef.current;
        pendingSaveRef.current = null;
        save(key, value);
      }
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [save]);

  // "Delete everything" must empty the cloud too. syllabus/cards autosave on a
  // 600ms debounce, and sign-out unmounts this component (clearing the pending
  // timer) before those writes land — so wipe synchronously, then let the
  // normal state effects overwrite with the empty values.
  const wipeNow = () => {
    save("syllabus", {});
    save("cards", []);
    save("tasks", []);
    save("sessions", []);
    save("mocks", []);
    save("errors", []);
    save("peers", []);
    save("dpp", []);
    save("unlockedBadges", []);
  };

  // Focus-timer default length follows Settings → Study (only when the pref
  // value itself changes, so manual in-page changes keep working).
  const lastFocusPrefRef = useRef(null);
  useEffect(() => {
    if (lastFocusPrefRef.current === settings.defaultFocusMin) return;
    lastFocusPrefRef.current = settings.defaultFocusMin;
    if (!timerRunning) setPomoMinutes(Number(settings.defaultFocusMin) || 25);
  }, [settings.defaultFocusMin, timerRunning]);

  useEffect(() => { if (ready && profile) save("profile", profile); }, [profile, ready, save]);
  useEffect(() => { if (ready) debouncedSave("syllabus", syllabus); }, [syllabus, ready, debouncedSave]);
  useEffect(() => { if (ready) save("tasks", tasks); }, [tasks, ready, save]);
  useEffect(() => { if (ready) save("sessions", sessions); }, [sessions, ready, save]);
  useEffect(() => { if (ready) save("mocks", mocks); }, [mocks, ready, save]);
  useEffect(() => { if (ready) save("errors", errors); }, [errors, ready, save]);
  useEffect(() => { if (ready) save("peers", peers); }, [peers, ready, save]);
  useEffect(() => { if (ready) save("unlockedBadges", unlockedBadges); }, [unlockedBadges, ready, save]);
  useEffect(() => { if (ready) save("dpp", dpp); }, [dpp, ready, save]);
  useEffect(() => { if (ready) debouncedSave("cards", cards); }, [cards, ready, debouncedSave]);
  useEffect(() => { if (ready) save("settings", settings); }, [settings, ready, save]);

  useEffect(() => {
    if (!ready) return;
    setUnlockedBadges(prev => {
      const current = computeBadges({ sessions, tasks, mocks, syllabus, errors, dpp: dpp || [] }).filter(b => b.unlocked).map(b => b.id);
      const merged = Array.from(new Set([...prev, ...current]));
      if (merged.length === prev.length && merged.every(id => prev.includes(id))) return prev;
      return merged;
    });
  }, [ready, sessions, tasks, mocks, syllabus, errors, dpp]);

  // publish own leaderboard entry whenever sessions/profile change.
  // Keyed by owner_id (unique) rather than by the 6-char profile code:
  // two users can share a code, which previously made reads keyed on
  // `lb:<code>` ambiguous (maybeSingle errored → "Pending sync…" forever).
  // The code is still stored in the payload so peers can find the row.
  useEffect(() => {
    if (!ready || !profile || !userId) return;
    const todayMin = sessions.filter(s => s.date === todayStr()).reduce((a, s) => a + s.minutes, 0);
    save(`lb:${userId}`, { code: profile.code, name: profile.name, minutes: Math.round(todayMin), date: todayStr(), streak: computeStreak(sessions) }, true);
  }, [sessions, profile, ready, save, userId]);

  // fetch peer data — query shared rows by the code stored in each payload
  useEffect(() => {
    if (!ready || peers.length === 0 || !userId) return;
    // Each fetch gets a sequence number; only the latest response may
    // repaint peerData. Otherwise a slow earlier fetch can resolve after a
    // faster newer one and overwrite fresh data with a stale snapshot.
    const seq = ++peerFetchSeqRef.current;
    (async () => {
      try {
        // Select owner_id and updated_at so we can deterministically
        // resolve multiple rows that share the same 6-char code by
        // preferring the most recently-updated entry.
        const { data, error } = await supabase
          .from("kv_store")
          .select("owner_id, value, updated_at")
          .eq("shared", true)
          .in("value->>code", peers);
        if (error) throw error;
        const out = {};
        (data || []).forEach(r => {
          const code = r?.value?.code;
          if (!code) return;
          const prev = out[code];
          // Keep the most recently-updated row for this code (stable choice)
          if (!prev || new Date(r.updated_at) > new Date(prev._updated_at || 0)) {
            out[code] = { ...r.value, _owner_id: r.owner_id, _updated_at: r.updated_at };
          }
        });
        if (seq === peerFetchSeqRef.current) setPeerData(out);
      } catch (e) {
        console.error("[peers] failed to fetch leaderboard entries", e);
      }
    })();
  }, [peers, ready, userId, sessions]);

  // Close any floating window when the app unmounts (sign-out), and when a
  // session really ends (elapsed resets to 0) rather than just pausing.
  useEffect(() => () => closePipWindow(), []);
  useEffect(() => {
    if (pipOpen && !timerRunning && timerElapsed === 0) closePipWindow();
  }, [pipOpen, timerRunning, timerElapsed]);

  // Profile-panel stats — computed once per data change, all real numbers
  // derived from stored sessions/syllabus/tasks, never fabricated.
  const profileStats = useMemo(() => {
    const weekDates = new Set(Array.from({ length: 7 }, (_, i) => addDays(todayStr(), -i)));
    const weekSessions = sessions.filter(s => weekDates.has(s.date));
    const allCh = Object.values(syllabus || {}).flat();
    const done = allCh.filter(c => c.status === "done" || c.status === "mastered").length;
    return {
      streak: computeStreak(sessions),
      best: longestStreak(sessions),
      weekSessions: weekSessions.length,
      weekMin: weekSessions.reduce((a, s) => a + s.minutes, 0),
      donePct: allCh.length ? Math.round((done / allCh.length) * 100) : 0,
      xp: computeXP({ sessions, tasks, mocks, syllabus, dpp: dpp || [] }),
      xpCap: XP_PER_LEVEL,
    };
  }, [sessions, tasks, mocks, syllabus, dpp]);

  if (!ready) {
    return (
      <div style={{ background: COLORS.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.dim, fontFamily: FONTS.body, padding: 24 }}>
      <style>{globalCss()}</style>
        <div style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="lg-skeleton" style={{ height: 22, width: 200 }} />
          <div className="lg-skeleton" style={{ height: 90 }} />
          <div className="lg-skeleton" style={{ height: 90 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div className="lg-skeleton" style={{ height: 70 }} />
            <div className="lg-skeleton" style={{ height: 70 }} />
            <div className="lg-skeleton" style={{ height: 70 }} />
          </div>
        </div>
</div>
  );
}

  if (!profile) {
    return <Onboarding onDone={(p) => {
      setProfile(p);
      setTimerSubject(p.subjects[0]);
      const subs = p.subjects;
      const initSyll = {};
      subs.forEach(sub => {
        initSyll[sub] = (DEFAULT_SYLLABUS[sub] || []).map(name => ({
          id: uid(), name, status: "todo", confidence: 0, pyq: 0, module: 0,
          theory: false, examples: false, doneDate: null, revisionStage: -1, nextRevision: null, notes: "",
        }));
      });
      setSyllabus(initSyll);
    }} />;
  }

  const timer = { mode: timerMode, running: timerRunning, elapsed: timerElapsed, subject: timerSubject, pomoMinutes, pomoTarget, phase: pomoPhase, phaseTarget, breakTarget, cycle: pomoCycle, completedFlash };

  // The PiP window polls this ref every second, so it always sees the live
  // snapshot while pushing state changes back through the same callbacks the
  // in-app timers use. One timer, many views.
  timerRef.current = timer;

  // Route PiP actions through the same stable handlers the in-app controls
  // use so the floating window never captures a stale closure (e.g. a
  // stopTimer from the render that opened the window, which would log the
  // elapsed time from back then instead of the live value).
  const openPip = async () => {
    if (pipOpen) return;
    const handle = await openPipWindow({
      getState: () => timerRef.current,
      onPause: () => setTimerRunning(false),
      onResume: resumeTimer,
      onStop: () => { stopTimerRef.current(); closePipWindow(); },
      onClose: () => setPipOpen(false),
    });
    if (handle) setPipOpen(true);
  };

  return (
    <div ref={appRef} className={`app-shell lg-shell${settings.reducedMotion ? " lg-motion-off" : ""}`}>
      <style>{globalCss() + focusCss()}</style>
      <WallpaperLayer mode={settings.wallpaper || "nebula"} image={loadWallpaperImage()} />

      <Sidebar tab={tab} setTab={setTab} profile={profile} sessions={sessions} settings={settings} stats={profileStats}
        email={session?.user?.email || null} avatarUrl={session?.user?.user_metadata?.avatar_url || null}
        onSignOut={() => supabase.auth.signOut()}
        notifyRecall={settings.recall?.goalDot !== false && dueReviews(syllabus).length > 0} />

      <div className="app-main lg-main">
        <Header profile={profile} sessions={sessions} tasks={tasks} />
        <GlobalSwipe tab={tab} onNav={setTab}>
          <div className="lg-page" key={tab}>
             {tab === "dashboard" && <Dashboard profile={profile} syllabus={syllabus} setSyllabus={setSyllabus} sessions={sessions} tasks={tasks} mocks={mocks} errors={errors} dpp={dpp} setDpp={setDpp} peers={peers} peerData={peerData} unlockedBadges={unlockedBadges} setTab={setTab} timer={timer} onPause={() => setTimerRunning(false)} onResume={() => setTimerRunning(true)} onShareStories={() => setStoriesOpen(true)} dashboardSettings={settings.dashboard} goalMin={settings.goalMin} dateFormat={settings.dateFormat} clockStyle={settings.clockStyle} />}
            {tab === "cards" && <RecallDeck cards={cards} setCards={setCards} profile={profile} settings={settings.recall} />}
            {tab === "syllabus" && <Syllabus syllabus={syllabus} setSyllabus={setSyllabus} profile={profile} settings={settings.coverage} />}
             {tab === "timer" && <FocusTimer profile={profile} sessions={sessions} setSessions={setSessions} timer={timer} onShareStories={() => setStoriesOpen(true)}
              setMode={changeTimerMode} setSubject={setTimerSubject} setPomoMinutes={setPomoMinutes}
              onStart={startTimer} onPause={() => setTimerRunning(false)} onStop={stopTimer} onSkipBreak={skipBreak}
              tasks={tasks} setTasks={setTasks} selectedTargetId={selectedTargetId} setSelectedTargetId={setSelectedTargetId}
              pipOk={pipSupported()} pipOpen={pipOpen} onOpenPip={openPip} onOpenImmersive={() => setImmersiveOpen(true)} autoBreaks={settings.autoStartBreaks} />}
            {tab === "mocks" && <Mocks mocks={mocks} setMocks={setMocks} profile={profile} settings={settings.tests} />}
             {tab === "errors" && <ErrorLog errors={errors} setErrors={setErrors} mocks={mocks} profile={profile} settings={settings.mistakes} />}
             {tab === "community" && <Community profile={profile} userId={userId} sessions={sessions} circleRows={circleRows} onConnectCircle={connectCircle} onSearchGroups={searchGroups}
                groupDefs={groupDefs} groupRoster={groupRoster} onCreateGroup={createGroup} onJoinGroup={joinGroup} onLeaveGroup={leaveGroup} onUpdateCircle={updateCircle} onRegenerateCircle={regenerateCircle} onRemoveMember={removeCircleMember} />}
            {tab === "settings" && <SettingsTab
              profile={profile} setProfile={setProfile}
              data={{ profile, syllabus, tasks, sessions, mocks, errors, dpp, cards, peers, unlockedBadges }}
              setters={{ setSyllabus, setTasks, setSessions, setMocks, setErrors, setDpp, setCards, setPeers, setUnlockedBadges }}
              settings={settings} setSettings={setSettings}
              email={session?.user?.email || null}
              onSignOut={() => supabase.auth.signOut()}
              onResetFloatPosition={() => setFloatResetKey(k => k + 1)}
              onSync={syncFromCloud}
              onWipeNow={wipeNow}
            />}
          </div>
        </GlobalSwipe>
      </div>

      {settings.floatingTimer !== false && (
        <FloatingTimer timer={timer} appRef={appRef} activeTab={tab} setTab={setTab} resetKey={floatResetKey}
          onPause={() => setTimerRunning(false)} onResume={() => setTimerRunning(true)} onStop={stopTimer} />
      )}

      {immersiveOpen && (
        <ImmersiveTimer timer={timer}
          onClose={() => setImmersiveOpen(false)}
          onPause={() => setTimerRunning(false)} onResume={() => setTimerRunning(true)}
          onStop={stopTimer} onSkipBreak={skipBreak} />
      )}

      {storiesOpen && <Stories sessions={sessions} dpp={dpp} mocks={mocks} profile={profile} onClose={() => setStoriesOpen(false)} />}
    </div>
  );
}

function dueReviews(syllabus) {
  const today = todayStr();
  const out = [];
  Object.entries(syllabus).forEach(([subject, chapters]) => {
    chapters.forEach(c => {
      if (c.revisionStage >= 0 && c.revisionStage < REVISION_INTERVALS.length && c.nextRevision && c.nextRevision <= today) {
        out.push({ subject, ...c });
      }
    });
  });
  return out;
}

function reviewsByDate(syllabus) {
  const map = {};
  Object.entries(syllabus).forEach(([subject, chapters]) => {
    chapters.forEach(c => {
      if (c.revisionStage >= 0 && c.revisionStage < REVISION_INTERVALS.length && c.nextRevision) {
        (map[c.nextRevision] = map[c.nextRevision] || []).push({ subject, name: c.name, id: c.id });
      }
    });
  });
  return map;
}

function consistencyAlert(sessions) {
  // Rule-based, not predictive: compares the last 3 completed days' average
  // focus time against the 7 days before that. Today is excluded — a partial
  // morning must not read as a full zero-day. Flags only when a sustained
  // downward trend appears, not when a single light day or one-off dip happens.
  const dailyTotals = Array.from({ length: 10 }, (_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (idx + 1)); // start yesterday
    return sessions.filter(s => s.date === todayStr(d)).reduce((sum, s) => sum + s.minutes, 0);
  });

  const recent = dailyTotals.slice(0, 3).reduce((a, v) => a + v, 0) / 3;
  const baseline = dailyTotals.slice(3).reduce((a, v) => a + v, 0) / 7;
  if (baseline < 15) return null; // not enough history to judge

  const dropRatio = (baseline - recent) / baseline;
  const sustainedDipDays = dailyTotals.slice(0, 3).filter(minutes => minutes < baseline * 0.7).length;
  const isSustained = sustainedDipDays >= 2;

  if (dropRatio > 0.4 && isSustained) {
    return {
      drop: Math.round(dropRatio * 100),
      recent: Math.round(recent),
      baseline: Math.round(baseline),
    };
  }
  return null;
}

function todayDppRecord(dpp) {
  return dpp.find(d => d.date === todayStr()) || { date: todayStr(), target: 50, solved: 0 };
}

function computeStreak(sessions) {
  const days = new Set(sessions.map(s => s.date));
  let streak = 0;
  let d = new Date();
  while (days.has(todayStr(d))) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

// Longest uninterrupted run of active days, from all-time session history.
function longestStreak(sessions) {
  const days = Array.from(new Set(sessions.map(s => s.date))).sort();
  let best = 0, run = 0, prev = null;
  for (const d of days) {
    run = prev !== null && daysBetween(prev, d) === 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }
  return best;
}

function computeDppStreak(dpp) {
  let streak = 0;
  let d = new Date();
  while (true) {
    const rec = dpp.find(x => x.date === todayStr(d));
    if (rec && rec.target > 0 && rec.solved >= rec.target) { streak++; d.setDate(d.getDate() - 1); } else break;
  }
  return streak;
}

// ---------------- XP / LEVELS / BADGES ----------------
// A lightweight, transparent point system — not a hidden algorithm. Every
// action's XP value is visible so it never feels arbitrary.
const LEVEL_TITLES = ["Starter", "Grinder", "Consistent", "Sharp", "Relentless", "Elite", "Topper", "Legend"];
const XP_PER_LEVEL = 500;

function computeXP({ sessions, tasks, mocks, syllabus, dpp }) {
  const allChapters = Object.values(syllabus).flat();
  const focusMin = sessions.reduce((a, s) => a + s.minutes, 0);
  const doneTasks = tasks.filter(t => t.done).length;
  const doneChapters = allChapters.filter(c => c.status === "done").length;
  const masteredChapters = allChapters.filter(c => c.status === "mastered").length;
  const totalQuestions = dpp.reduce((a, d) => a + (d.solved || 0), 0);
  const xp = Math.round(focusMin * 1 + doneTasks * 10 + mocks.length * 25 + doneChapters * 15 + masteredChapters * 30 + totalQuestions * 1);
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const title = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
  const intoLevel = xp % XP_PER_LEVEL;
  return { xp, level, title, intoLevel, levelPct: Math.round((intoLevel / XP_PER_LEVEL) * 100) };
}

function computeBadges({ sessions, tasks, mocks, syllabus, errors, dpp }) {
  const allChapters = Object.values(syllabus).flat();
  const streak = computeStreak(sessions);
  const focusHours = sessions.reduce((a, s) => a + s.minutes, 0) / 60;
  const totalQuestions = dpp.reduce((a, d) => a + (d.solved || 0), 0);
  const masteredAny = allChapters.some(c => c.status === "mastered");
  const donePct = allChapters.length ? (allChapters.filter(c => c.status === "done" || c.status === "mastered").length / allChapters.length) * 100 : 0;
  const defs = [
    { id: "first_session", label: "First Session", desc: "Logged your first focus session", unlocked: sessions.length >= 1, current: sessions.length, target: 1 },
    { id: "week_streak", label: "7-Day Streak", desc: "Studied 7 days in a row", unlocked: streak >= 7, current: streak, target: 7 },
    { id: "month_streak", label: "30-Day Streak", desc: "Studied 30 days in a row", unlocked: streak >= 30, current: streak, target: 30 },
    { id: "century_hours", label: "100 Hours", desc: "100 hours of focused study logged", unlocked: focusHours >= 100, current: Math.floor(focusHours), target: 100 },
    { id: "first_mock", label: "First Mock", desc: "Logged your first mock test", unlocked: mocks.length >= 1, current: mocks.length, target: 1 },
    { id: "five_mocks", label: "5 Mocks Logged", desc: "Tested yourself 5 times", unlocked: mocks.length >= 5, current: mocks.length, target: 5 },
    { id: "mastered", label: "Chapter Master", desc: "Fully retained a chapter", unlocked: masteredAny, current: null, target: null },
    { id: "halfway", label: "Halfway There", desc: "50% of syllabus covered", unlocked: donePct >= 50, current: Math.round(donePct), target: 50 },
    { id: "question_century", label: "100 Questions", desc: "100+ practice questions solved", unlocked: totalQuestions >= 100, current: totalQuestions, target: 100 },
    { id: "error_hunter", label: "Error Hunter", desc: "Logged 10 mistakes to fix", unlocked: errors.length >= 10, current: errors.length, target: 10 },
  ];
  return defs.map(b => ({
    ...b,
    progressLabel: (!b.unlocked && b.target != null) ? `${b.current}/${b.target}` : null,
  }));
}

// Today's focus vs your own best single day — a quiet ring, lit by real data.
//   beatBest → today ≥ best day: clamps at 100% and says so
//   else    → progress toward your historical best
function BestDayRing({ pct, todayMin, bestDay, beatBest, empty }) {
  const size = 96, stroke = 8;
  const r = size / 2 - stroke / 2 - 3;
  const c = 2 * Math.PI * r;
  const dash = Math.max(2, Math.round(pct * c));
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ display: "block" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COLORS.border} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={empty ? COLORS.faint : beatBest ? COLORS.done : COLORS.ink}
          strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={empty ? "3 6" : `${dash} ${c - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: "stroke-dasharray 0.7s cubic-bezier(0.2,0.8,0.2,1), stroke 0.4s ease-out",
            filter: empty ? "none" : `drop-shadow(0 0 5px ${hexToRgba(beatBest ? COLORS.done : COLORS.ink, 0.45)})`,
          }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 19, fontWeight: 700, lineHeight: 1, color: COLORS.text, fontVariantNumeric: "tabular-nums" }}>
          {empty ? "—" : fmtMin(todayMin)}
        </div>
        <div style={{ fontSize: 7.5, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.faint, fontWeight: 600 }}>
          {empty ? "no data yet" : beatBest ? "personal best!" : "vs best day"}
        </div>
      </div>
      {!empty && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", fontSize: 10, color: COLORS.faint, fontFamily: FONTS.mono }}>
          best {fmtMin(bestDay)}
        </div>
      )}
    </div>
  );
}

// Quick actions — one dock, four lit cells, all just navigational.
function QuickDock({ setTab }) {
  const actions = [
    { id: "timer", icon: TimerIcon, tint: COLORS.ink, label: "Start Focus", line: "Deep work, pomodoro & breaks", primary: true },
    { id: "cards", icon: Layers, tint: "#4FD8E0", label: "Recall Deck", line: "Spaced-repetition reviews" },
    { id: "mocks", icon: TrendingUp, tint: "#5BE6A8", label: "Test Trends", line: "Mock scores & history" },
  ];
  return (
    <div className="lg-dock" role="group" aria-label="Quick actions">
      {actions.map(a => {
        const Icon = a.icon;
        return (
          <button key={a.id} className={`lg-dock-item${a.primary ? " primary" : ""}`} onClick={() => setTab(a.id)}>
            <span className="lg-dock-icon" style={{ width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: hexToRgba(a.tint, 0.12), border: `1px solid ${hexToRgba(a.tint, 0.32)}`, color: a.tint }}>
              <Icon size={15} />
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{a.label}</span>
            <span style={{ fontSize: 10.5, color: COLORS.faint, lineHeight: 1.35 }}>{a.line}</span>
          </button>
        );
      })}
    </div>
  );
}

function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [exam, setExam] = useState("JEE Main");
  const [customSubjects, setCustomSubjects] = useState("");
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 6); return todayStr(d);
  });

  const subjects = exam === "Custom"
    ? customSubjects.split(",").map(s => s.trim()).filter(Boolean)
    : EXAM_SUBJECTS[exam];

  const canContinue = step === 0 ? name.trim().length > 0 : step === 1 ? subjects.length > 0 : true;

  return (
    <div style={{ minHeight: "100vh", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONTS.body, color: COLORS.text, padding: 20 }}>
      <style>{globalCss()}</style>
      <div className="lg-card" style={{ borderRadius: 16, border: `1px solid ${COLORS.border}`, maxWidth: 560, width: "100%", padding: "32px 34px" }}>
      <div style={{ fontSize: 10, letterSpacing: "0.1em", color: COLORS.ink, textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>Step {step + 1} of 3</div>
      <div style={{ fontFamily: FONTS.display, fontSize: 24, fontWeight: 700, marginBottom: 18 }}>
        {step === 0 && "Who are you?"}
        {step === 1 && "What are you targeting?"}
        {step === 2 && "Lock the date"}
      </div>

      {step === 0 && (
        <div>
          <label style={{ fontSize: 12, color: COLORS.dim, display: "block", marginBottom: 6 }}>Display name</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Aditya" autoFocus />
        </div>
      )}

      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: COLORS.dim, display: "block", marginBottom: 6 }}>Target exam</label>
            <SelectBox value={exam} onChange={setExam} ariaLabel="Target exam"
              options={Object.keys(EXAM_SUBJECTS).map(k => ({ value: k, label: k === "Both" ? "JEE + NEET" : k }))} />
          </div>
          {exam === "Custom" ? (
            <div>
              <label style={{ fontSize: 12, color: COLORS.dim, display: "block", marginBottom: 6 }}>Subjects (comma separated)</label>
              <Input value={customSubjects} onChange={e => setCustomSubjects(e.target.value)} placeholder="Physics, Chemistry, CS" />
              {subjects.length === 0 && <div style={{ fontSize: 11, color: COLORS.warn, marginTop: 6 }}>Add at least one subject to continue.</div>}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {subjects.map(s => (
                <div key={s} style={{ fontSize: 12, padding: "5px 10px", borderRadius: 6, background: COLORS.inkSoft, color: COLORS.text, border: `1px solid ${COLORS.ink}55` }}>{s}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div>
          <label style={{ fontSize: 12, color: COLORS.dim, display: "block", marginBottom: 6 }}>Exam date</label>
          <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
          <div style={{ marginTop: 14, fontSize: 12, color: COLORS.dim }}>
            That's <b style={{ color: COLORS.ink }}>{Math.max(0, daysBetween(new Date(), targetDate))} days</b> from today. Syllabus for {subjects.join(", ")} will be pre-loaded so you start with real chapters, not a blank page.
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
        <Btn variant="ghost" onClick={() => setStep(s => Math.max(0, s - 1))} style={{ visibility: step === 0 ? "hidden" : "visible" }}>Back</Btn>
        {step < 2 ? (
          <Btn variant="ink" disabled={!canContinue} onClick={() => setStep(s => s + 1)}>Continue <ChevronRight size={14} /></Btn>
        ) : (
          <Btn variant="ink" onClick={() => onDone({ name: name.trim(), exam, subjects, targetDate, code: genCode(), createdAt: todayStr() })}>Start tracking <ChevronRight size={14} /></Btn>
        )}
      </div>
      </div>
    </div>
  );
}

// ---------------- DASHBOARD ----------------
// YEAR GRID — Ledger's signature widget: the current year as a 53-column
// cell map. Intensity = focus minutes logged that day; full-goal days glow
// green; today gets a lavender outline. Reads from a distance, like a
function useNow(intervalMs = 15000) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), intervalMs); return () => clearInterval(id); }, [intervalMs]);
  return now;
}

// the year reduced to a single terminal strip
function YearStrip({ sessionMap, goal = 360 }) {
  const now = new Date();
  const y = now.getFullYear();
  const jan1Dow = new Date(y, 0, 1).getDay();
  const monthStarts = {};
  const cols = [];
  for (let wk = 0; wk < 53; wk++) cols.push({ days: 0, max: 0 });
  let activeDays = 0, goalsMet = 0;
  for (let d = 1; d <= 366; d++) {
    const dt = new Date(y, 0, d);
    if (dt.getFullYear() !== y) break;
    const ds = todayStr(dt);
    const off = d + jan1Dow - 1;
    const wk = Math.floor(off / 7);
    if (d === 1 || dt.getDate() === 1) monthStarts[wk] = dt.toLocaleString(undefined, { month: "short" }).toUpperCase();
    if (dt > now) continue;
    const min = sessionMap[ds] || 0;
    const c = cols[wk];
    c.days++;
    if (min > c.max) c.max = min;
    if (min > 0) activeDays++;
    if (min >= goal) goalsMet++;
  }
  const doy = Math.floor((now - new Date(y, 0, 1)) / 86400000) + 1;
  const todayWk = Math.floor((doy + jan1Dow - 1) / 7);
return (
    <div>
      <LedgerRule n="03" label="YEAR" style={{ marginBottom: 8 }}
        right={<span className="num" style={{ fontSize: 9, color: COLORS.faint }}>{activeDays} ACTIVE · {goalsMet} GOALS</span>} />
      <div style={{ position: "relative", height: 10, marginBottom: 6 }}>
        {Object.entries(monthStarts).map(([wk, label], i, arr) => (
          <span key={label} className="sys" style={{ position: "absolute", left: `calc(${(wk / 52) * 100}% + 1px)`, transform: i === arr.length - 1 ? "none" : "translateX(-50%)", fontSize: 7.5, letterSpacing: "0.08em", color: COLORS.faint }}>{label}</span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 2.5 }}>
        {cols.map((c, i) => {
          // The year strip is the signature calendar — cells follow the
          // active accent family (quiet → full), goal-met steps to success.
          const bg = c.days === 0 ? "transparent"
            : c.max === 0 ? hexToRgba(COLORS.ink, 0.07)
            : c.max < 30 ? hexToRgba(COLORS.ink, 0.2)
            : c.max < 120 ? hexToRgba(COLORS.ink, 0.42)
            : c.max < goal ? hexToRgba(COLORS.ink, 0.72)
            : COLORS.done;
          return (
            <div key={i} title={c.days === 0 ? "later" : (c.max ? `${fmtMin(c.max)} that week` : "rest week")} style={{ flex: 1, height: 9, borderRadius: 2, background: bg, border: i === todayWk ? `1px solid ${COLORS.accentFocus}` : "1px solid transparent", boxSizing: "border-box", transition: "filter 0.14s ease-out, transform 0.14s ease-out" }} />
          );
        })}
      </div>
    </div>
  );
}

function Dashboard({ profile, syllabus, setSyllabus, sessions, tasks, mocks, errors, dpp, setDpp, peers, peerData, unlockedBadges, setTab, timer, onPause, onResume, onShareStories, dashboardSettings = {}, goalMin = 360, dateFormat = "compact", clockStyle = "digital" }) {
  const flags = { countdown: true, clock: true, studied: true, now: true, year: true, today: true, subjects: true, workspaces: true, status: true, ...dashboardSettings };
  const goal = Number(goalMin) || 360;
  const dwNow = useNow(15000);
  const allChapters = Object.values(syllabus).flat();
  const doneCount = allChapters.filter(c => c.status === "done" || c.status === "mastered").length;
  const pct = allChapters.length ? Math.round((doneCount / allChapters.length) * 100) : 0;
  const days = profile.targetDate ? daysBetween(new Date(), profile.targetDate) : null;
  const due = dueReviews(syllabus);
  const alert = consistencyAlert(sessions);
  const dayOfPrep = Math.max(1, Math.min(365, daysBetween(profile.createdAt ? parseLocalDate(profile.createdAt) : new Date(), new Date()) + 1));
  const scorableMocks = mocks.filter(m => Number(m.max) > 0 && isFinite(Number(m.total)));
  const mockAvg = scorableMocks.length ? Math.round(scorableMocks.reduce((a, m) => a + Math.min(100, (Number(m.total) / Number(m.max)) * 100), 0) / scorableMocks.length) : 0;
  const daysLeft = days === null ? null : Math.max(0, days);
  const urgent = daysLeft !== null && daysLeft > 0 && daysLeft <= 21;

  const last30 = useMemo(() => {
    const out = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = todayStr(d);
      const min = sessions.filter(s => s.date === ds).reduce((a, s) => a + s.minutes, 0);
      out.push({ date: ds, min: Math.round(min), day: d.getDate() });
    }
    return out;
  }, [sessions]);

  const backlog = allChapters.filter(c => c.status === "todo").length;
  const todayTasks = tasks.filter(t => t.date === todayStr());
  const targetById = useMemo(() => Object.fromEntries(tasks.map(t => [t.id, t])), [tasks]);
  const xpInfo = useMemo(() => computeXP({ sessions, tasks, mocks, syllabus, dpp: dpp || [] }), [sessions, tasks, mocks, syllabus, dpp]);
  const liveBadges = useMemo(() => computeBadges({ sessions, tasks, mocks, syllabus, errors, dpp: dpp || [] }), [sessions, tasks, mocks, syllabus, errors, dpp]);
  const badges = useMemo(() => liveBadges.map(b => ({ ...b, unlocked: b.unlocked || unlockedBadges.includes(b.id) })), [liveBadges, unlockedBadges]);
  const unlockedCount = badges.filter(b => b.unlocked).length;

  const todayMin = sessions.filter(s => s.date === todayStr()).reduce((a, s) => a + s.minutes, 0);
  const streakOfDays = computeStreak(sessions);
  const dppRecord = todayDppRecord(dpp);
  const updateDppToday = (patch) => {
    setDpp(prev => {
      const exists = prev.some(d => d.date === todayStr());
      const next = exists ? prev.map(d => d.date === todayStr() ? { ...d, ...patch } : d) : [...prev, { ...dppRecord, ...patch }];
      return next;
    });
  };
  const bumpSolved = (n) => updateDppToday({ solved: Math.max(0, dppRecord.solved + n) });
  const dppStreak = useMemo(() => computeDppStreak(dpp), [dpp]);
  const subjectTime7 = useMemo(() => {
    const since = addDays(todayStr(), -6);
    const totals = {};
    profile.subjects.forEach(s => { totals[s] = 0; });
    sessions.forEach(s => {
      if (s.date >= since && totals[s.subject] !== undefined) totals[s.subject] += s.minutes;
    });
    const grand = Object.values(totals).reduce((a, v) => a + v, 0);
    return profile.subjects
      .map(s => ({ subject: s, minutes: Math.round(totals[s]), pct: grand ? Math.round((totals[s] / grand) * 100) : 0 }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [sessions, profile.subjects]);

  // ---- desktop computations ----
  const sessionMinByDate = useMemo(() => {
    const m = {};
    sessions.forEach(s => { m[s.date] = (m[s.date] || 0) + s.minutes; });
    return m;
  }, [sessions]);

  const todayBySub = useMemo(() => {
    const map = {};
    profile.subjects.forEach(s => { map[s] = 0; });
    sessions.forEach(s => { if (s.date === todayStr() && map[s.subject] !== undefined) map[s.subject] += s.minutes; });
    return profile.subjects.map(s => ({ subject: s, minutes: Math.round(map[s]) })).filter(s => s.minutes > 0);
  }, [sessions, profile.subjects]);

  const milestone = useMemo(() => {
    for (const sub of profile.subjects) {
      const c = (syllabus[sub] || []).find(x => x.status === "todo");
      if (c) return { subject: sub, name: c.name };
    }
    return null;
  }, [syllabus, profile.subjects]);

  const peersTop = useMemo(() => {
    const rows = [];
    (peers || []).forEach(code => {
      const p = peerData && peerData[code];
      if (p && p.name) rows.push({ name: p.name, code, minutes: p.minutes || 0, self: false });
    });
    rows.push({ name: profile.name, code: profile.code, minutes: todayMin, self: true });
    return rows.sort((a, b) => b.minutes - a.minutes).slice(0, 5);
  }, [peers, peerData, profile, todayMin]);

  const dueNext = due[0] || null;

  const todaySessions = useMemo(() => sessions.filter(s => s.date === todayStr()), [sessions]);
  const showToday = todaySessions.length > 0 || todayTasks.length > 0 || due.length > 0 || mocks.length > 0;
  const [openSub, setOpenSub] = useState(null);
  const [weekTip, setWeekTip] = useState(null);
  const weekEntries = Array.from({ length: 7 }, (_, i) => { const date = addDays(todayStr(), -i); return { date, minutes: sessions.filter(s => s.date === date).reduce((a, s) => a + (s.minutes || 0), 0) }; }).filter(x => x.minutes > 0).reverse();
  const goalPct = Math.min(100, Math.round((todayMin / goal) * 100));
  const weeklyAvgMin = Math.round(sessions.filter(s => s.date >= addDays(todayStr(), -6)).reduce((a, s) => a + (s.minutes || 0), 0) / 7);
  const weeklyRingDash = Math.round(188 * Math.min(1, weeklyAvgMin / Math.max(1, goal)));
  const goalHours = goal / 60;
  const timerRunningSec = timer ? timer.elapsed : 0;
  const timerShowingRunning = !!(timer && timer.running && timer.elapsed > 0);
  const timerModeLabel = timer && timer.mode === "pomodoro"
    ? (timer.phase === "focus" ? "FOCUS SESSION" : "BREAK · RECHARGE")
    : "FLOW · UNBROKEN";
  const hour12 = ((dwNow.getHours() + 11) % 12) + 1;
  const minSlice = String(dwNow.getMinutes()).padStart(2, "0");
  const ampm = dwNow.getHours() >= 12 ? "PM" : "AM";
  const weekday = dwNow.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase();
  const dateStr = fmtDateStr(todayStr(), dateFormat, 1).toUpperCase();
  const daysInPrep = 365;
  const examTitle = String(profile.exam || "EXAM").toUpperCase();
  const targetYear = String(profile.targetDate || "").slice(0, 4);
  const miniStamp = { background: COLORS.hoverOverlay, border: `1px solid ${COLORS.border}`, color: COLORS.faint, borderRadius: RADIUS.badge, padding: "3px 8px", fontSize: 9, letterSpacing: "0.06em", fontFamily: FONTS.mono, cursor: "pointer", transition: "color 0.14s ease-out, border-color 0.14s ease-out" };
  const miniBtnStyle = (accent) => ({ background: accent ? hexToRgba(COLORS.accentFocus, 0.12) : COLORS.hoverOverlay, border: `1px solid ${accent ? hexToRgba(COLORS.accentFocus, 0.4) : COLORS.border}`, color: accent ? COLORS.accentFocus : COLORS.dim, borderRadius: RADIUS.badge, padding: "5px 11px", fontSize: 9.5, letterSpacing: "0.1em", fontFamily: FONTS.mono, cursor: "pointer", transition: "filter 0.14s ease-out" });

  const leftCol = {
    display: "flex", flexDirection: "column", gap: 20, minWidth: 0,
  };
  const rightCol = {
    display: "flex", flexDirection: "column", gap: 20, width: "100%",
  };

return (
    <div className="lg-canvas">
      {/* 01 · STATUS — the section index, then the two numerals */}
      <LedgerRule n="01" label="STATUS" style={{ marginBottom: 26 }}>
        <button onClick={onShareStories} aria-label="Share today's Ledger Story" title="Share today's Ledger Story"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 11px", borderRadius: RADIUS.badge,
            border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.dim,
            fontFamily: FONTS.mono, fontSize: 9, letterSpacing: "0.18em", cursor: "pointer",
            transition: "color 0.16s ease-out, border-color 0.16s ease-out, background 0.16s ease-out" }}>
          <Share2 size={12} /> SHARE
        </button>
      </LedgerRule>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "30px 44px" }}>
        {flags.clock && (
        <div>
          <div style={{ fontFamily: FONTS.mono, fontSize: "clamp(38px, 5.2vw, 62px)", fontWeight: 500, lineHeight: 0.95, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums", color: COLORS.text }}>
             {clockStyle === "flip" && <span className="lg-flipcell" aria-hidden="true" style={{ display: "inline-block", width: "0.62em", height: "1em", marginRight: 2, background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: 4 }} />}
             {String(hour12).padStart(2, "0")}:{minSlice}
            <span style={{ fontSize: "0.3em", fontWeight: 500, letterSpacing: "0.12em", color: COLORS.faint, marginLeft: 8 }}>{ampm}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
            <span className="sys" style={{ fontSize: 10, letterSpacing: "0.22em", color: COLORS.text }}>{weekday}</span>
            <span style={{ width: 3, height: 3, background: COLORS.borderStrong }} />
            <span className="sys" style={{ fontSize: 9, letterSpacing: "0.16em", color: COLORS.faint }}>{dateStr}</span>
            <span style={{ width: 3, height: 3, background: COLORS.borderStrong }} />
            <span className="sys" style={{ fontSize: 9, letterSpacing: "0.16em", color: COLORS.faint }}>DAY {dayOfPrep}/{daysInPrep}</span>
          </div>
</div>
        )}

        {/* EXAM — the signature numeral, the one dominant number on the page */}
        {flags.countdown && (
        <div style={{ textAlign: "right" }}>
          <div className="sys" style={{ fontSize: 9.5, letterSpacing: "0.26em", color: COLORS.faint }}>{examTitle} · {targetYear}</div>
          <div className="num" style={{ fontSize: "clamp(72px, 10vw, 148px)", fontWeight: 800, lineHeight: 0.78, letterSpacing: "-0.05em", fontVariantNumeric: "tabular-nums", color: daysLeft === null ? COLORS.faint : COLORS.countdownAccent, marginTop: 10 }}>{daysLeft === null ? "—" : daysLeft}</div>
           <div className="sys" style={{ fontSize: 11, letterSpacing: "0.42em", color: daysLeft === null ? COLORS.faint : urgent ? COLORS.danger : COLORS.dim, marginTop: 12 }}>{daysLeft === null ? "NO DATE SET" : "DAYS LEFT"}</div>
           <div className={`lg-week-ring-wrap lg-days-ring${sessions.length ? " lg-ring-burst" : ""}`} style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, marginTop: 22 }}>
             <div style={{ position: "relative", display: "flex", gap: 6 }}>{weekEntries.map((x, i) => <span key={x.date} className={`lg-week-seg${x.date === todayStr() ? " lg-week-seg-live" : ""}`} title={`${parseLocalDate(x.date).toLocaleDateString(undefined, { weekday: "short" })} · ${fmtMin(x.minutes)}`} onMouseEnter={() => setWeekTip(`${parseLocalDate(x.date).toLocaleDateString(undefined, { weekday: "short" })} · ${fmtMin(x.minutes)}`)} onMouseLeave={() => setWeekTip(null)} style={{ width: 12, height: 12, borderRadius: 3, background: COLORS.chart[i % COLORS.chart.length] }} />)}{weekTip && <div className="lg-tooltip" style={{ position: "absolute", right: 0, top: 18, zIndex: 4, padding: "5px 8px", borderRadius: 5, background: COLORS.panel2, border: `1px solid ${COLORS.border}`, color: COLORS.text, fontSize: 10, whiteSpace: "nowrap" }}>{weekTip}</div>}</div>
             <svg width="78" height="78" viewBox="0 0 78 78" aria-label="Weekly subject focus ring"><circle cx="39" cy="39" r="30" fill="none" stroke={COLORS.border} strokeWidth="6" /><circle className="lg-ring-pulse" cx="39" cy="39" r="30" fill="none" stroke={COLORS.accentFocus} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${weeklyRingDash} 188`} transform="rotate(-90 39 39)" /><text x="39" y="43" textAnchor="middle" fill={COLORS.text} fontSize="11" fontFamily={FONTS.mono}>{fmtMin(weeklyAvgMin)}</text></svg>
           </div>
        </div>
        )}
      </div>

      {/* 02 · SESSION — studied + now, one instrument pair */}
      {(flags.studied || flags.now) && (
        <LedgerRule n="02" label="SESSION" style={{ marginTop: "clamp(34px, 5vh, 56px)", marginBottom: 14 }} />
      )}
      <div style={{ display: "flex", alignItems: "stretch", flexWrap: "wrap", gap: 14 }}>
        {flags.studied && (
        <div style={{ minWidth: 232, background: COLORS.glassFill2, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.card, padding: "16px 20px 14px" }}>
          <div className="sys" style={{ fontSize: 8.5, letterSpacing: "0.26em", color: COLORS.faint }}>STUDIED</div>
          <div className="num" style={{ fontSize: 36, fontWeight: 650, lineHeight: 1.05, letterSpacing: "-0.03em", marginTop: 6 }}>{fmtMin(todayMin)}</div>
          <div className="lg-progress" style={{ height: 4, marginTop: 13 }}>
            <div className="lg-progress-fill" style={{ width: `${goalPct}%`, "--lg-w": `${goalPct}%`, height: "100%" }} />
          </div>
<div className="sys" style={{ fontSize: 8.5, letterSpacing: "0.14em", color: COLORS.faint, marginTop: 9 }}>
            {todaySessions.length} SESSION{todaySessions.length === 1 ? "" : "S"} · {goalPct}% OF {goalHours}H
          </div>
        </div>
        )}

        {/* NOW — the music-player equivalent */}
        {flags.now && (
        <div style={{ minWidth: 236, flex: "0 1 250px", borderRadius: RADIUS.card, padding: "14px 18px", background: timerShowingRunning ? hexToRgba(COLORS.accentFocus, 0.07) : COLORS.glassFill2, border: `1px solid ${timerShowingRunning ? hexToRgba(COLORS.accentFocus, 0.32) : COLORS.border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="sys" style={{ fontSize: 8.5, letterSpacing: "0.26em", color: timerShowingRunning ? COLORS.accentFocus : COLORS.faint }}>NOW STUDYING</span>
            <span style={{ width: 6, height: 6, background: timerShowingRunning ? COLORS.accentFocus : "transparent", border: `1px solid ${timerShowingRunning ? COLORS.accentFocus : COLORS.borderStrong}` }} />
          </div>
          {timerRunningSec > 0 ? (
            <>
              <div className="num" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", marginTop: 7, color: timer.running ? COLORS.text : COLORS.dim }}>{fmtClock(timer.elapsed)}</div>
              <div style={{ fontSize: 12.5, color: COLORS.text, marginTop: 3 }}>{timer.subject || "Focus block"}</div>
              <div className="sys" style={{ fontSize: 8.5, letterSpacing: "0.18em", color: COLORS.faint, marginTop: 6 }}>{timerModeLabel}{!timer.running ? " · PAUSED" : ""}</div>
            </>
          ) : (
            <>
              <div className="num" style={{ fontSize: 28, fontWeight: 700, color: COLORS.faint, letterSpacing: "-0.02em", marginTop: 7 }}>00:00</div>
              <div className="sys" style={{ fontSize: 8.5, letterSpacing: "0.18em", color: COLORS.faint, marginTop: 3 }}>IDLE</div>
            </>
          )}
<div style={{ display: "flex", gap: 6, marginTop: 11 }}>
            {timer.running ? (
              <button onClick={onPause} style={miniBtnStyle(true)}>PAUSE</button>
            ) : timer.elapsed > 0 ? (
              <button onClick={onResume} style={miniBtnStyle(true)}>RESUME</button>
            ) : (
              <button onClick={() => setTab("timer")} style={miniBtnStyle(false)}>START FOCUS</button>
            )}
          </div>
        </div>
        )}
      </div>

      {/* 03 — the year, one strip */}
      {flags.year && (
      <div style={{ maxWidth: 620, marginTop: "clamp(30px, 4.5vh, 52px)", marginLeft: "clamp(0px, 3vw, 44px)" }}>
        <YearStrip sessionMap={sessionMinByDate} goal={goal} />
      </div>
      )}

      {/* 04 / 05 — today's timeline + the subject block, two ledger entries */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "36px 48px", marginTop: "clamp(34px, 5vh, 58px)" }}>
        {flags.today && showToday && (
          <div style={{ flex: "1 1 300px", maxWidth: 400 }}>
            <LedgerRule n="04" label="TODAY" style={{ marginBottom: 10 }} />
            <div style={{ marginTop: 8 }}>
              {todaySessions.slice(-8).map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                  <span style={subjectDot(s.subject)} />
                  <span style={{ flex: 1, fontSize: 12.5, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.topic || s.subject}
                    {s.targetId && targetById[s.targetId] && <span style={{ color: COLORS.faint, fontSize: 11 }}> → {targetById[s.targetId].text}</span>}
                  </span>
                  <span className="num" style={{ fontSize: 9, color: COLORS.faint, letterSpacing: "0.08em" }}>{String(s.mode || "").toUpperCase().slice(0, 4)}</span>
                  <span className="num" style={{ fontSize: 11, color: COLORS.dim, fontVariantNumeric: "tabular-nums" }}>{fmtMin(s.minutes)}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 16, flexWrap: "wrap" }}>
              {todayTasks.length > 0 && (
                <button onClick={() => setTab("timer")} style={miniStamp}>{todayTasks.filter(t => t.done).length}/{todayTasks.length} TARGETS{todayTasks.every(t => t.done) ? " ✓" : ""}</button>
              )}
              {due.length > 0 && (
                <button onClick={() => setTab("cards")} style={miniStamp}>{due.length} REVIEW{due.length === 1 ? "" : "S"} DUE</button>
              )}
              {mocks.length > 0 && (
                <button onClick={() => setTab("mocks")} style={miniStamp}>{mockAvg}% MOCK AVG</button>
              )}
            </div>
          </div>
        )}

{/* SUBJECTS — a diagnostic meter, one coherent instrument */}
        {flags.subjects && (
        <div style={{ width: "100%", maxWidth: 340, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.card, padding: "18px 20px 12px" }}>
          <LedgerRule n="05" label="SUBJECTS" style={{ marginBottom: 8 }}
            right={<span className="num" style={{ fontSize: 9.5, color: COLORS.faint }}>{pct}%</span>} />
          {profile.subjects.map((sub, si) => {
            const list = syllabus[sub] || [];
            const done = list.filter(c => c.status === "done" || c.status === "mastered").length;
            const sp = list.length ? Math.round((done / list.length) * 100) : 0;
            const segs = 10;
            const filled = list.length ? Math.round((done / list.length) * segs) : 0;
            const todo = list.filter(c => c.status === "todo");
            const expanded = openSub === sub;
            return (
              <div key={sub} onClick={() => setOpenSub(expanded ? null : sub)} style={{ marginBottom: 2, borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "9px 0" }}>
                  <span className="num" style={{ fontSize: 8.5, color: expanded ? COLORS.accentFocus : COLORS.faint, letterSpacing: "0.06em", width: 16 }}>{String(si + 1).padStart(2, "0")}</span>
                  <span style={{ fontSize: 11.5, letterSpacing: "0.06em", color: COLORS.text, flex: 1 }}>{sub}</span>
                  <span className="num" style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", color: sp > 0 ? COLORS.text : COLORS.faint }}>{sp || "–"}</span>
                </div>
                <div style={{ display: "flex", gap: 2.5, marginLeft: 26, marginBottom: 9 }}>
                  {Array.from({ length: segs }).map((_, i) => (
                    <span key={i} style={{ flex: 1, height: 5, borderRadius: 1.5, background: i < filled ? subjectColor(sub) : hexToRgba(COLORS.text, 0.06), transition: "background 0.3s ease-out" }} />
                  ))}
                </div>
                {expanded && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, margin: "0 0 10px 26px" }}>
                    <span className="sys" style={{ fontSize: 8, letterSpacing: "0.16em", color: COLORS.faint }}>{done}/{list.length} DONE · {todo.length} REMAIN{todo.length === 1 ? "S" : "ING"}</span>
                    {todo.slice(0, 3).map(c => (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10.5, color: COLORS.dim }}>
                        <span style={{ width: 3, height: 3, borderRadius: "50%", background: subjectColor(sub), flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                      </div>
                    ))}
                    <button onClick={e => { e.stopPropagation(); setTab("syllabus"); }} style={miniStamp}>OPEN MAP →</button>
                  </div>
                )}
              </div>
            );
})}
        </div>
        )}
      </div>

      {/* 06 — daily question practice */}
      {flags.today && (
        <div style={{ marginTop: "clamp(34px, 5vh, 56px)", maxWidth: 900 }}>
          <LedgerRule n="06" label="PRACTICE" style={{ marginBottom: 14 }} />
          <PracticeCard record={dppRecord} dppStreak={dppStreak} bumpSolved={bumpSolved} updateTarget={updateDppToday} />
        </div>
      )}

      {/* 07 — the command strip: one line in, one workspace at a time */}
      {flags.workspaces && (
      <div style={{ marginTop: "clamp(34px, 5vh, 56px)", maxWidth: 900 }}>
        <LedgerRule n="07" label="WORKSPACES" style={{ marginBottom: 14 }}
          right={<span className="sys" style={{ fontSize: 8.5, letterSpacing: "0.18em", color: COLORS.faint }}>ONE STEP AT A TIME</span>} />
        <div className="lg-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(168px, 1fr))", gap: 10, marginTop: 10 }}>
          {[
            {
              id: "timer", label: "Focus", tab: "timer",
              num: timerShowingRunning ? fmtClock(timer.elapsed) : fmtMin(todayMin),
              line: timerShowingRunning ? "Running now — jump back in" : todayMin > 0 ? `${todayMin} focused today` : "Start a session",
            },
            {
              id: "syllabus", label: "Coverage", tab: "syllabus",
              num: `${pct}%`,
              line: pct > 0 ? `${doneCount} of ${allChapters.length} chapters covered` : "Open the coverage map",
            },
            {
              id: "cards", label: "Recall", tab: "cards",
              num: due.length > 0 ? `${due.length}` : "0",
              line: due.length > 0 ? `review${due.length === 1 ? "" : "s"} due now` : "No reviews due",
            },
            {
              id: "mocks", label: "Tests", tab: "mocks",
              num: mocks.length > 0 ? `${mocks.length}` : "0",
              line: scorableMocks.length > 0 ? `avg ${mockAvg}% across ${scorableMocks.length} scored` : "Log your first test",
            },
            {
              id: "errors", label: "Mistakes", tab: "errors",
              num: errors.length > 0 ? `${errors.length}` : "0",
              line: errors.length > 0 ? "Logged — review the ledger" : "Add a mistake to track",
            },
          ].map(w => {
            const Icon = w.id === "timer" ? TimerIcon : w.id === "syllabus" ? BookOpen : w.id === "cards" ? Layers : w.id === "mocks" ? TrendingUp : AlertTriangle;
            return (
              <button key={w.id} className="lg-ws" onClick={() => setTab(w.tab)}
                style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px", background: COLORS.glassFill2, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.control, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Icon size={13} color={COLORS.faint} />
                  <span className="sys" style={{ fontSize: 9, letterSpacing: "0.2em", color: COLORS.faint }}>{w.label}</span>
                  <ChevronRight size={13} strokeWidth={2} className="lg-ws-arrow" />
                </div>
                <div className="num" style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, letterSpacing: "-0.01em", lineHeight: 1.05 }}>{w.num}</div>
                <div style={{ fontSize: 10.5, color: COLORS.dim, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.line}</div>
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* 08 — the status strip */}
      {flags.status && (
      <div style={{ marginTop: "clamp(40px, 6vh, 68px)", maxWidth: 900 }}>
        <LedgerRule n="08" label="SYSTEM" style={{ marginBottom: 14 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <span className="sys" style={{ fontSize: 8.5, letterSpacing: "0.22em", color: COLORS.faint }}>LV {xpInfo.level} · {String(xpInfo.title).toUpperCase()}</span>
          <div className="lg-progress" style={{ width: 150, height: 3 }}>
            <div className="lg-progress-fill" style={{ width: `${xpInfo.levelPct}%`, "--lg-w": `${xpInfo.levelPct}%`, height: "100%" }} />
          </div>
<span className="num" style={{ fontSize: 8.5, color: COLORS.faint }}>{xpInfo.intoLevel}/{XP_PER_LEVEL}</span>
          {alert && (
            <>
              <span style={{ width: 3, height: 3, background: COLORS.borderStrong }} />
              <span className="sys" style={{ fontSize: 8.5, letterSpacing: "0.16em", color: COLORS.warn }}>⚠ −{alert.drop}% 7D</span>
            </>
          )}
          <span style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {badges.map(b => (
              <span key={b.id} title={`${b.label} — ${b.desc}`} style={{ width: 5, height: 5, transform: "rotate(45deg)", background: b.unlocked ? hexToRgba(COLORS.accentFocus, 0.85) : hexToRgba(COLORS.text, 0.09) }} />
            ))}
          </div>
<span className="num" style={{ fontSize: 8.5, color: COLORS.faint }}>{unlockedCount}/{badges.length}</span>
        </div>
      </div>
      )}
    </div>
  );
}

// ---------------- SYLLABUS ----------------
function Syllabus({ syllabus, setSyllabus, profile, settings = {} }) {
  const [activeSubject, setActiveSubject] = useState(profile.subjects[0]);
  const [newChapter, setNewChapter] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [view, setView] = useState("list");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("order");
  const [sortDir, setSortDir] = useState(1);
  const chapters = syllabus[activeSubject] || [];
const byName = Object.fromEntries(chapters.map(c => [c.name, c]));
  const weighted = settings.progress !== "status";

  useEffect(() => {
    if (settings.defaultView === "list" || settings.defaultView === "map") setView(settings.defaultView);
  }, [settings.defaultView]);

  // Realistic decomposition from stored chapter data — one of truth.
  const allCh = Object.values(syllabus).flat();
  const covDone = allCh.filter(c => c.status === "done" || c.status === "mastered").length;
  const covPct = allCh.length ? Math.round((covDone / allCh.length) * 100) : 0;
  const covDoing = allCh.filter(c => c.status === "doing").length;
  const covTodo = allCh.filter(c => c.status === "todo").length;
  const reviewsDue = dueReviews(syllabus).length;

  // Per-item progress — every term driven by real fields.
  const chapterPct = (c) => weighted
    ? Math.round((c.theory ? 10 : 0) + (c.examples ? 10 : 0) + (Number(c.pyq) || 0) * 0.4 + (Number(c.module) || 0) * 0.4)
    : (c.status === "done" || c.status === "mastered") ? 100 : c.status === "doing" ? 45 : 0;

  // Only stages 0..N-1 schedule reviews (mirrors dueReviews); a chapter past
  // the final stage is fully retained and never "due" again, no matter how
  // much time passes.
  const isOverdueReview = (c) => c.revisionStage >= 0 && c.revisionStage < REVISION_INTERVALS.length && c.nextRevision && c.nextRevision <= todayStr();
  const readyPrereqs = (name) => {
    const deps = (DEPENDENCIES[activeSubject] || {})[name] || [];
    // A prerequisite that no longer exists (its chapter was deleted) can't
    // block progress — treat it as satisfied rather than permanently locked.
    return deps.filter(d => !byName[d] || (byName[d].status === "done" || byName[d].status === "mastered"));
  };
  const depsOf = (name) => (DEPENDENCIES[activeSubject] || {})[name] || [];
const recommendation = (c) => {
    if (isOverdueReview(c)) return { label: "Review now", tint: COLORS.warn };
    if (c.revisionStage >= 0 && c.revisionStage + 1 < REVISION_INTERVALS.length) return { label: `Reverify D+${REVISION_INTERVALS[c.revisionStage]}`, tint: COLORS.dim };
    if (c.status === "todo") {
      const d = depsOf(c.name);
      // Missing (deleted) prereqs don't block — only existing ones that
      // aren't done yet.
      const blocked = d.length > 0 && !d.every(x => !byName[x] || (byName[x].status === "done" || byName[x].status === "mastered"));
      return { label: blocked ? "Study prerequisites" : "Study chapter", tint: blocked ? COLORS.accentFocus : COLORS.faint };
    }
    if (c.status === "doing") return { label: "Complete & solidify", tint: COLORS.accentFocus };
    if (c.status === "done") return { label: "Spaced revision", tint: COLORS.faint };
    return { label: "Maintain mastery", tint: COLORS.done };
  };

  const updateChapter = (id, patch) => {
    setSyllabus(prev => ({ ...prev, [activeSubject]: prev[activeSubject].map(c => c.id === id ? { ...c, ...patch } : c) }));
  };

  const cycleStatus = (c) => {
    const nextStatus = STATUS_ORDER[(STATUS_ORDER.indexOf(c.status) + 1) % STATUS_ORDER.length];
    const patch = { status: nextStatus };
    if ((nextStatus === "done" || nextStatus === "mastered") && c.revisionStage === -1) {
      patch.doneDate = todayStr();
      patch.revisionStage = 0;
      patch.nextRevision = addDays(todayStr(), REVISION_INTERVALS[0]);
    }
    if (nextStatus === "todo") { patch.revisionStage = -1; patch.nextRevision = null; patch.doneDate = null; }
    updateChapter(c.id, patch);
  };

  const addChapter = () => {
    const name = newChapter.trim();
    if (!name) return;
    // Duplicate names would collide in the byName maps that drive
    // dependencies, the concept map, and the review chain — reject them.
    if (chapters.some(c => c.name.toLowerCase() === name.toLowerCase())) return;
    setSyllabus(prev => ({ ...prev, [activeSubject]: [...(prev[activeSubject] || []), { id: uid(), name, status: "todo", confidence: 0, pyq: 0, module: 0, theory: false, examples: false, doneDate: null, revisionStage: -1, nextRevision: null, notes: "" }] }));
    setNewChapter("");
  };
  const removeChapter = (id) => { if (window.confirm("Delete this chapter and its progress?")) setSyllabus(prev => ({ ...prev, [activeSubject]: prev[activeSubject].filter(c => c.id !== id) })); };

  // Filters + sorting over the live subject list.
  let rows = chapters.filter(c => query.trim() ? c.name.toLowerCase().includes(query.trim().toLowerCase()) : true);
  if (statusFilter !== "all") rows = rows.filter(c => c.status === statusFilter);
  if (settings.showCompleted === false) rows = rows.filter(c => c.status !== "done" && c.status !== "mastered");
  rows = [...rows];
  if (sortKey === "name") rows.sort((a, b) => (a.name < b.name ? -1 : 1));
  else if (sortKey === "pct") rows.sort((a, b) => chapterPct(a) - chapterPct(b));
  else if (sortKey === "status") rows.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  else if (sortKey === "review") rows.sort((a, b) => (a.nextRevision || "9999") < (b.nextRevision || "9999") ? -1 : 1);
  if (sortDir === -1) rows.reverse();

  const doneN = chapters.filter(c => c.status === "done" || c.status === "mastered").length;
  const statusChips = ["all", ...STATUS_ORDER];
  const chipLabel = { all: "All", todo: "To do", doing: "In progress", done: "Done", mastered: "Mastered" };

  const cardStyle = { borderRadius: RADIUS.control, border: `1px solid ${COLORS.border}`, padding: "14px 16px", background: "transparent" };

  return (
    <div className="lg-coverage-page">
      <PageHead
        title="Coverage / Knowledge map"
        lead="A clear read on what you know, what is moving, and what deserves the next hour."
        right={(
          <div className="num" style={{ fontSize: 10.5, letterSpacing: "0.08em", color: COLORS.faint, marginTop: 4 }}>
            <span className="lg-coverage-readout">{allCh.length} CHAPTER{allCh.length === 1 ? "" : "S"} · {covDone} DONE · {covPct}%</span>
          </div>
        )}
      />

      <div className="lg-coverage-hero" style={{ display: "grid", gridTemplateColumns: "minmax(230px, 0.8fr) minmax(0, 1.7fr)", gap: 1, marginBottom: 24, background: COLORS.border, border: `1px solid ${COLORS.border}`, overflow: "hidden", borderRadius: RADIUS.card }}>
        <div style={{ background: COLORS.panel2, padding: "28px 26px", position: "relative", overflow: "hidden" }}>
          <div style={{ color: COLORS.faint, fontFamily: FONTS.mono, fontSize: 9, letterSpacing: "0.2em" }}>TOTAL COVERAGE</div>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 24 }}>
            <div style={{ width: 112, height: 112, borderRadius: "50%", background: `conic-gradient(${subjectColor(activeSubject)} ${covPct}%, ${COLORS.border} 0)`, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <div style={{ width: 88, height: 88, borderRadius: "50%", background: COLORS.panel2, display: "grid", placeItems: "center" }}><span className="num lg-coverage-dot" style={{ color: COLORS.text, fontSize: 27, fontWeight: 700 }}>{covPct}<small style={{ fontSize: 13, color: COLORS.faint }}>%</small></span></div>
            </div>
            <div><div style={{ color: COLORS.text, fontSize: 14, fontWeight: 600 }}>{covDone} of {allCh.length} chapters</div><div style={{ color: COLORS.faint, fontSize: 11, marginTop: 5, lineHeight: 1.5 }}>{covPct >= 75 ? "The map is taking shape." : covPct > 0 ? "Momentum is on the board." : "Start with one chapter."}</div></div>
          </div>
        </div>
        <div className="lg-coverage-read" style={{ background: COLORS.panel, padding: "24px 28px", display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(180px, 0.75fr)", gap: 28, alignItems: "center" }}>
<div><div className="sys" style={{ color: COLORS.faint, marginBottom: 14 }}>THE NEXT READ</div><div className="t-heading-lg" style={{ color: COLORS.text }}>{reviewsDue > 0 ? `${reviewsDue} review${reviewsDue === 1 ? "" : "s"} need attention` : covDoing > 0 ? `${covDoing} chapter${covDoing === 1 ? " is" : "s are"} in motion` : "Choose your next chapter"}</div><div className="t-caption" style={{ marginTop: 9, maxWidth: 420 }}>{reviewsDue > 0 ? "Spaced repetition is the shortest route from familiar to retained." : "Use the subject map below to move from intention into a concrete study block."}</div></div>
          <div style={{ borderLeft: `1px solid ${COLORS.border}`, paddingLeft: 24, display: "grid", gap: 13 }}>
            {[["DONE", covDone, COLORS.done], ["IN FLIGHT", covDoing, COLORS.warn], ["BACKLOG", covTodo, COLORS.faint], ["REVIEW DUE", reviewsDue, reviewsDue ? COLORS.warn : COLORS.faint]].map(([label, value, color]) => <div key={label} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14 }}><span className="t-label" style={{ color: COLORS.faint }}>{label}</span><span className="num t-data-md" style={{ color }}>{value}</span></div>)}
          </div>
        </div>
      </div>

      {/* Subject navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {profile.subjects.map(s => {
            const list = syllabus[s] || [];
            const dn = list.filter(c => c.status === "done" || c.status === "mastered").length;
            const sp = list.length ? Math.round((dn / list.length) * 100) : 0;
            const active = activeSubject === s;
            const sc = subjectColor(s);
            return (
              <div key={s} role="tab" tabIndex={0} onClick={() => { setActiveSubject(s); setExpanded(null); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveSubject(s); setExpanded(null); } }}
                title={`${s} — ${sp}% covered`} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 34, borderRadius: 8, cursor: "pointer",
                  background: active ? hexToRgba(sc, 0.12) : "transparent",
                  border: `1px solid ${active ? hexToRgba(sc, 0.5) : COLORS.border}`,
                  boxShadow: active ? `inset 0 1px 0 ${hexToRgba(sc, 0.14)}` : undefined,
                  transition: "background 0.16s ease-out, border-color 0.16s ease-out, box-shadow 0.16s ease-out",
                }}>
                <span style={subjectDot(s)} />
                <span style={{ fontSize: 12.5, color: active ? COLORS.text : COLORS.dim, fontWeight: active ? 600 : 500 }}>{s}</span>
                <span className="num" style={{ fontSize: 10.5, color: active ? sc : COLORS.faint }}>{sp}%</span>
                <div className="lg-progress" style={{ width: 40, height: 3 }}>
                  <div style={{ width: `${sp}%`, height: "100%", background: sc, borderRadius: 2 }} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {view === "list" && (
            <div style={{ position: "relative" }}>
              <Search size={13} color={COLORS.faint} strokeWidth={2} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", zIndex: 1 }} />
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search chapters…" style={{ width: 190, height: 34, padding: "0 10px 0 28px", fontSize: 12.5 }} />
            </div>
          )}
          <div className="lg-seg">
            {["list", "map"].map(v => (
              <button key={v} className={`lg-seg-item${view === v ? " active" : ""}`} onClick={() => setView(v)}>
                {v === "list" ? "List" : "Map"}
              </button>
            ))}
          </div>
          {view === "list" && (
            <SelectBox value={sortKey} onChange={(v) => { if (v !== sortKey) { setSortKey(v); setSortDir(1); } }} ariaLabel="Sort chapters"
              options={[{ value: "order", label: "Order" }, { value: "name", label: "Name" }, { value: "pct", label: "Progress" }, { value: "status", label: "Status" }, { value: "review", label: "Next review" }]}
              style={{ width: 128 }} />
          )}
        </div>
      </div>

      {view === "list" ? (
        <Card title={`${activeSubject} — ${doneN}/${chapters.length} covered`} right={
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {statusChips.map(s => {
              const active = statusFilter === s;
              return (
                <button key={s} className={active ? "lg-chip active" : "lg-chip"} onClick={() => setStatusFilter(active ? "all" : s)}>
                  {chipLabel[s]}
                </button>
              );
            })}
            <button className="lg-chip" onClick={() => setSortDir(d => -d)} title={sortDir === 1 ? "Ascending" : "Descending"}
              style={{ display: "inline-flex", alignItems: "center", lineHeight: 1, padding: "4px 7px" }}>
              {sortDir === 1 ? <ArrowUp size={10} strokeWidth={2.2} /> : <ArrowDown size={10} strokeWidth={2.2} />}
            </button>
          </div>
        }>
          {query.trim() && rows.length === 0 && (
            <div style={{ fontSize: 12, color: COLORS.faint, padding: "12px 4px" }}>No chapters match "{query.trim()}".</div>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {rows.map((c, ri) => {
              const pct = chapterPct(c);
              const deps = depsOf(c.name);
              const doneDeps = readyPrereqs(c.name);
              const depsReady = deps.length > 0 && doneDeps.length === deps.length;
              const rec = recommendation(c);
              const lastSeen = c.doneDate || (c.revisionStage >= 0 ? c.nextRevision : null);
              const barColor = subjectColor(activeSubject);
              const blocked = c.status === "todo" && deps.length > 0 && !depsReady;
              return (
                <div key={c.id} className={`lg-row lg-coverage-row state-${c.status}${blocked ? " is-blocked" : c.status === "todo" ? " is-available" : ""}`} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <div className="lg-row-inner" style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 10px", borderRadius: 8 }}>
                    <span className="num lg-coverage-index" style={{ fontSize: 9.5, color: COLORS.faint, width: 26, flexShrink: 0, letterSpacing: "0.08em" }}>{String(ri + 1).padStart(2, "0")}</span>
                    <Bubble status={c.status} onClick={() => cycleStatus(c)} />
                    <div role="button" tabIndex={0} onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(expanded === c.id ? null : c.id); } }}
                      className="lg-row-title-wrap" style={{ flex: "0 1 420px", minWidth: 160, cursor: "pointer" }}>
                      <span className="lg-row-title" style={{ fontSize: 13.2, fontWeight: 500 }}>{c.name}</span>
                      {c.confidence > 0 && (
                        <span style={{ marginLeft: 8, flexShrink: 0, color: COLORS.warn, fontSize: 9, fontFamily: FONTS.mono }}>{"★".repeat(c.confidence)}</span>
                      )}
                    </div>
                    <div className="lg-dependency-stack">
                      {settings.showPrereqs !== false && deps.length > 0 && <span className="lg-dependency-link" aria-hidden="true"><Link2 size={11} /></span>}
                      {settings.showPrereqs !== false && deps.length > 0 && <span className="lg-narrow-hide lg-dependency-badge" title={`Sequence: ${deps.join(" → ")}`} style={{
                        fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: FONTS.mono,
                        padding: "3px 8px", borderRadius: 5, flexShrink: 0, fontWeight: 600,
                        color: depsReady ? COLORS.done : COLORS.accentFocus,
                        background: depsReady ? `${COLORS.done}14` : "rgba(255,255,255,0.04)",
                        border: `1px solid ${depsReady ? `${COLORS.done}3a` : COLORS.border}`,
                      }}>{depsReady ? "Prereqs met" : `Builds on ${deps.join(" · ")}`}</span>}
                    </div>
                    <div className="lg-progress" style={{ width: 72, height: 3, flexShrink: 0 }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 2 }} />
                    </div>
                    <span className="num" style={{ fontSize: 10.5, color: pct > 0 ? COLORS.text : COLORS.faint, width: 36, flexShrink: 0, textAlign: "right" }}>{pct}%</span>
                     <div style={{ display: "flex", alignItems: "center", gap: 14, marginLeft: 6, flexShrink: 0 }}>
                       <button className="lg-mini" type="button" onClick={() => setExpanded(expanded === c.id ? null : c.id)} aria-label={`Open ${c.name}`}>Open</button>
                       {isOverdueReview(c) && (
                        <span title={`Next revision due ${c.nextRevision}`} style={{ color: COLORS.warn, background: `${COLORS.warn}1a`, border: `1px solid ${COLORS.warn}3a`, borderRadius: 5, padding: "2px 7px", fontSize: 8.5, letterSpacing: "0.1em", fontFamily: FONTS.mono, fontWeight: 700 }}>REVIEW DUE</span>
                      )}
                      {c.revisionStage >= 0 && !isOverdueReview(c) && (
                        <span className="lg-narrow-hide" title={`Stage ${c.revisionStage + 1}/${REVISION_INTERVALS.length} · next ${c.nextRevision || "—"}`} style={{ fontSize: 9, color: COLORS.faint, fontFamily: FONTS.mono }}>R{c.revisionStage + 1}/{REVISION_INTERVALS.length}</span>
                      )}
                      <div className="lg-narrow-hide" style={{ fontSize: 9, color: rec.tint, fontFamily: FONTS.mono, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", minWidth: 118, textAlign: "right" }}>{rec.label}</div>
                      {lastSeen && <span className="num lg-narrow-hide" style={{ fontSize: 9, color: COLORS.faint }} title="Last touched">{fmtDateStr(lastSeen, "compact")}</span>}
                      <span style={{ color: COLORS.faint, fontSize: 10, width: 12, textAlign: "center", transform: expanded === c.id ? "rotate(90deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>›</span>
                    </div>
                    <Trash2 className="lg-row-del" size={13} color={COLORS.faint} style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => removeChapter(c.id)} />
                  </div>
                  {expanded === c.id && (
                    <div style={{ padding: "12px 14px 16px 48px", display: "flex", flexDirection: "column", gap: 10, background: COLORS.glassFill, borderRadius: 8, margin: "0 0 10px" }}>
                      {deps.length > 0 && (
                        <div style={{ fontSize: 11, color: COLORS.dim, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span className="sys" style={{ fontSize: 7.5 }}>Builds on</span>
                          {deps.map(d => {
                            const dc = byName[d];
                            return (
                              <span key={d} style={{
                                padding: "2px 7px", borderRadius: 4, fontSize: 10, fontFamily: FONTS.mono,
                                color: dc && (dc.status === "done" || dc.status === "mastered") ? COLORS.done : COLORS.dim,
                                background: dc && (dc.status === "done" || dc.status === "mastered") ? `${COLORS.done}14` : "rgba(255,255,255,0.04)",
                                border: `1px solid ${COLORS.border}`,
                              }}>
                                {d}{dc ? ` · ${STATUS_LABEL[dc.status].toUpperCase()}` : ""}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
                        <label style={{ fontSize: 12, color: COLORS.dim, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", width: "fit-content" }}>
                          <input type="checkbox" checked={c.theory} onChange={e => updateChapter(c.id, { theory: e.target.checked })} /> Theory
                        </label>
                        <label style={{ fontSize: 12, color: COLORS.dim, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                          <input type="checkbox" checked={c.examples} onChange={e => updateChapter(c.id, { examples: e.target.checked })} /> Worked examples
                        </label>
                        <div className="num" style={{ fontSize: 11, color: COLORS.dim }}>PYQ {c.pyq}% · Module {c.module}%</div>
                      </div>
                      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                        <div style={{ flex: "min(300px, 1fr)" }}>
                          <div style={{ fontSize: 11, color: COLORS.dim, marginBottom: 4 }}>PYQ accuracy — {c.pyq}%</div>
                          <input type="range" min="0" max="100" value={c.pyq} onChange={e => updateChapter(c.id, { pyq: parseInt(e.target.value) })} style={{ width: "100%" }} />
                        </div>
                        <div style={{ flex: "min(300px, 1fr)" }}>
                          <div style={{ fontSize: 11, color: COLORS.dim, marginBottom: 4 }}>Module questions done — {c.module}%</div>
                          <input type="range" min="0" max="100" value={c.module} onChange={e => updateChapter(c.id, { module: parseInt(e.target.value) })} style={{ width: "100%" }} />
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: COLORS.dim, marginRight: 4 }}>Confidence</span>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={16} style={{ cursor: "pointer" }} color={i < c.confidence ? COLORS.warn : COLORS.border} fill={i < c.confidence ? COLORS.warn : "none"} onClick={() => updateChapter(c.id, { confidence: i + 1 })} />
                          ))}
                        </div>
                        {c.revisionStage >= 0 && (
                          <div style={{ fontSize: 11, color: COLORS.dim, display: "flex", alignItems: "center", gap: 8 }}>
                            {c.revisionStage < REVISION_INTERVALS.length ? (
                              <>Next revision due <b style={{ color: COLORS.text }}>{c.nextRevision}</b> (stage {c.revisionStage + 1}/{REVISION_INTERVALS.length})
                                <Btn variant="ghost" onClick={() => updateChapter(c.id, { revisionStage: c.revisionStage + 1, nextRevision: addDays(todayStr(), REVISION_INTERVALS[Math.min(c.revisionStage + 1, REVISION_INTERVALS.length - 1)]) })}>Mark reviewed</Btn>
                              </>
                            ) : <span style={{ color: COLORS.done }}>Fully retained — spaced repetition complete.</span>}
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: COLORS.dim, marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}><NotebookPen size={11} /> Quick notes</div>
                        <textarea value={c.notes || ""} onChange={e => updateChapter(c.id, { notes: e.target.value })} placeholder="Formula slips, doubts to ask, things to revisit…" rows={2} style={{ background: COLORS.glassFill, border: `1px solid ${COLORS.border}`, borderRadius: 7, padding: "8px 10px", color: COLORS.text, fontSize: 12, fontFamily: FONTS.body, width: "100%", boxSizing: "border-box", resize: "vertical" }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {chapters.length === 0 && <div style={{ fontSize: 12, color: COLORS.faint, padding: "12px 4px" }}>No chapters yet — add your first one below.</div>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Input value={newChapter} onChange={e => setNewChapter(e.target.value)} placeholder="Add a custom chapter…" onKeyDown={e => e.key === "Enter" && addChapter()} />
            <Btn variant="ink" onClick={addChapter}><Plus size={14} /> Add</Btn>
          </div>
        </Card>
      ) : (
        <ConceptMap subject={activeSubject} chapters={chapters} />
      )}
    </div>
  );
}

function ConceptMap({ subject, chapters }) {
  const deps = DEPENDENCIES[subject] || {};
  const byName = Object.fromEntries(chapters.map(c => [c.name, c]));
  const cache = {};
  const levels = {};
  chapters.forEach(c => {
    const lvl = chapterLevel(subject, c.name, cache);
    levels[lvl] = levels[lvl] || [];
    levels[lvl].push(c);
  });
  const levelKeys = Object.keys(levels).map(Number).sort((a, b) => a - b);
  const colW = 190, rowH = 76;
  // Empty map (no chapters) would make Math.max(...[]) = -Infinity; guard it.
  const maxPerLevel = levelKeys.length ? Math.max(...levelKeys.map(l => levels[l].length)) : 0;
  const width = levelKeys.length * colW + 40;
  const height = maxPerLevel * rowH + 40;
  const pos = {};
  levelKeys.forEach(l => {
    const nodes = levels[l];
    nodes.forEach((c, i) => {
      const yOffset = (maxPerLevel - nodes.length) * rowH / 2;
      pos[c.name] = { x: 20 + l * colW + colW / 2, y: 20 + yOffset + i * rowH + rowH / 2 };
    });
  });
  const statusColor = { todo: COLORS.faint, doing: COLORS.warn, done: COLORS.done, mastered: COLORS.ink };

  return (
    <Card title="Prerequisite chain — study left to right">
      <div style={{ overflowX: "auto" }}>
        <svg width={Math.max(width, 600)} height={height}>
          {chapters.map(c => (DEPENDENCIES[subject] || {})[c.name]?.map(d => pos[d] && pos[c.name] && (
            <line key={c.name + d} x1={pos[d].x + 70} y1={pos[d].y} x2={pos[c.name].x - 70} y2={pos[c.name].y} stroke={COLORS.border} strokeWidth={1.5} />
          )))}
          {chapters.map(c => {
            const p = pos[c.name];
            if (!p) return null;
            return (
              <g key={c.id}>
                <rect x={p.x - 68} y={p.y - 20} width={136} height={40} rx={7} fill={COLORS.glassFillStrong} stroke={statusColor[c.status]} strokeWidth={1.6} />
                <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={10} fill={COLORS.text} fontFamily={FONTS.body}>
                  {c.name.length > 20 ? c.name.slice(0, 18) + "…" : c.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div style={{ fontSize: 11, color: COLORS.faint, marginTop: 8 }}>Border color = status. A chapter with an amber "needs…" tag in list view isn't unlocked yet — its prerequisites aren't done.</div>
    </Card>
  );
}

// ---------------- TIMER ----------------
function fmtClock(s) {
  return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// Ring shows progress toward the current phase target (focus length, or
// break length). In Flow mode there's no fixed target, so it instead shows
// a slow lap against a rolling 90-minute reference — still communicates
// "how long have I been at this" without pretending there's a deadline.
function RingTimer({ mode, phase, elapsed, phaseTarget, running, size = 180, state = "ready" }) {
  const cx = size / 2, cy = size / 2;
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const frac = mode === "pomodoro" ? Math.min(1, elapsed / phaseTarget) : (elapsed % 5400) / 5400;
  const dash = c * frac;
  const ringColor = mode === "pomodoro" && phase !== "focus" ? COLORS.done : COLORS.ink;
  const remaining = mode === "pomodoro" ? Math.max(0, phaseTarget - elapsed) : elapsed;
  const label = mode === "pomodoro"
    ? (phase !== "focus" ? (phase === "long_break" ? "LONG BREAK" : "SHORT BREAK") : (running ? "FOCUSING" : elapsed > 0 ? "PAUSED" : "READY"))
    : (running ? "FOCUSING" : elapsed > 0 ? "PAUSED" : "READY");
  const isFocusPhase = mode !== "pomodoro" || phase === "focus";
  // State-aware glow: breathing while focusing, a still flash on completion,
  // a subdued static glow otherwise. Reduced motion kills the animation
  // classes via the global motion rules, leaving the static fallback.
  const ringClass = state === "complete" ? "lg-ring-flash"
    : (state === "focusing" && isFocusPhase && running ? "lg-ring-breathe" : "");
  const staticFilter = state === "focusing"
    ? `drop-shadow(0 0 10px ${hexToRgba(ringColor, running ? 0.5 : 0.2)})`
    : (state === "paused" ? `drop-shadow(0 0 3px ${hexToRgba(ringColor, 0.2)})` : `drop-shadow(0 0 5px ${hexToRgba(ringColor, 0.3)})`);
  // Tick ring: one mark per minute, brighter every 5 — the instrumentation.
  const ticks = [];
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * 2 * Math.PI;
    const major = i % 5 === 0;
    const len = major ? 6 : 3;
    const r1 = r - 2, r2 = r1 - len;
    ticks.push(<line key={i} x1={cx + r1 * Math.cos(a)} y1={cy + r1 * Math.sin(a)} x2={cx + r2 * Math.cos(a)} y2={cy + r2 * Math.sin(a)}
      stroke={major ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.055)"} strokeWidth={major ? 1.3 : 1} />);
  }
  return (
    <svg width={size} height={size} style={{ display: "block", margin: "0 auto" }}>
      <defs>
        <linearGradient id={`lg-rg-${size}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={ringColor} />
          <stop offset="100%" stopColor={darken(ringColor, 34)} />
        </linearGradient>
      </defs>
      {/* Outer depth ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
      {/* Minute ticks */}
      {ticks}
      {/* Progress ring */}
      <circle cx={cx} cy={cy} r={r - 14} fill="none" stroke={`url(#lg-rg-${size})`} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`} transform={`rotate(-90 ${cx} ${cy})`}
        className={ringClass}
        style={{ transition: "stroke-dasharray 0.9s linear", opacity: running ? 1 : 0.55, filter: staticFilter }} />
      {/* Inner highlight ring */}
      <circle cx={cx} cy={cy} r={r - 21} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      <text x="50%" y="47%" textAnchor="middle" fontFamily={FONTS.mono} fontSize={size * 0.15} fontWeight={700} fill={COLORS.text} style={{ fontVariantNumeric: "tabular-nums" }}>
        {fmtClock(remaining)}
      </text>
      <text x="50%" y="63%" textAnchor="middle" fontSize={11} fill={COLORS.faint} letterSpacing="0.08em">{label}</text>
    </svg>
  );
}

// ---------------- TARGET PICKER ----------------
// Targets live in Focus now: pick what you're working toward, add a new
// one, complete it, or delete it — all from one compact control between
// Subject and Start Focus. The target store is the same `tasks` array the
// old Targets screen wrote to; only the surface changed, not the data.
function TargetPicker({ tasks, setTasks, profile, focusSubject, running, selectedTargetId, setSelectedTargetId }) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSubject, setNewSubject] = useState(focusSubject || profile.subjects[0]);
  const [newPriority, setNewPriority] = useState("medium");
  const wrapRef = useRef(null);
  const listRef = useRef(null);
  const triggerRef = useRef(null);
  const today = todayStr();
  const priorityRank = { high: 0, medium: 1, low: 2 };
  const selected = tasks.find(t => t.id === selectedTargetId) || null;

  // The inline form inherits the current focus subject whenever the
  // dropdown opens, so a new target starts on the subject being studied.
  useEffect(() => {
    if (open) setNewSubject(focusSubject || profile.subjects[0]);
  }, [open, focusSubject]);

  // Click-outside and Escape close — same pattern as the sidebar popovers.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onEsc = (e) => { if (e.key === "Escape") { setOpen(false); if (triggerRef.current) triggerRef.current.focus(); } };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("pointerdown", onDoc); document.removeEventListener("keydown", onEsc); };
  }, [open]);

  // Real data, real dates: overdue / today / days-left chips come from the
  // target's stored date. No invented progress — targets are either done
  // or not, so nothing here pretends to be a fraction.
  const dueChip = (t) => {
    if (t.date === today) return { text: "TODAY", color: COLORS.warn };
    if (t.date < today) return { text: "OVERDUE", color: COLORS.danger };
    const n = daysBetween(parseLocalDate(today), parseLocalDate(t.date));
    return { text: `${n}D LEFT`, color: COLORS.faint };
  };

  // Active list: current focus subject's targets first, then by date
  // (overdue → today → upcoming), then priority. Nothing is hidden — the
  // matching targets surface first, everything else stays reachable below.
  const activeTargets = useMemo(() => {
    return tasks
      .filter(t => !t.done)
      .sort((a, b) => {
        const aSub = a.subject === focusSubject ? 0 : 1, bSub = b.subject === focusSubject ? 0 : 1;
        if (aSub !== bSub) return aSub - bSub;
        const aDue = a.date < today ? 0 : a.date === today ? 1 : 2;
        const bDue = b.date < today ? 0 : b.date === today ? 1 : 2;
        if (aDue !== bDue) return aDue - bDue;
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return (priorityRank[a.priority || "medium"] ?? 1) - (priorityRank[b.priority || "medium"] ?? 1);
      });
  }, [tasks, focusSubject, today, priorityRank]);

  // A compact "recently completed" row — reverse insertion order, newest
  // first, capped so the dropdown stays short.
  const doneTargets = useMemo(() => tasks.filter(t => t.done).slice().reverse().slice(0, 4), [tasks]);

  const addTarget = () => {
    const name = newName.trim();
    if (!name) return;
    if (tasks.some(t => t.text.toLowerCase() === name.toLowerCase())) return;
    const id = uid();
    setTasks(prev => [...prev, { id, text: name, subject: newSubject, priority: newPriority, done: false, date: today }]);
    setSelectedTargetId(id);
    setNewName("");
  };

  const toggleDone = (id) => setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const removeTarget = (id) => {
    if (!window.confirm("Delete this target?")) return;
    if (id === selectedTargetId) setSelectedTargetId(null);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // Arrow-key navigation between options; Enter/Space select via each
  // option's own handler, Escape and click-outside close (handled above).
  const onListKey = (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
    if (!listRef.current) return;
    const opts = Array.from(listRef.current.querySelectorAll('[role="option"]'));
    if (!opts.length) return;
    e.preventDefault();
    const idx = opts.indexOf(document.activeElement);
    if (e.key === "Home") opts[0].focus();
    else if (e.key === "End") opts[opts.length - 1].focus();
    else if (e.key === "ArrowDown") (idx === -1 || idx === opts.length - 1 ? opts[0] : opts[idx + 1]).focus();
    else (idx <= 0 ? opts[opts.length - 1] : opts[idx - 1]).focus();
  };

  const row = (t, isDone) => {
    const chip = dueChip(t);
    const isSel = selectedTargetId === t.id;
    const select = () => { setSelectedTargetId(t.id); setOpen(false); };
    return (
      <div key={t.id} role="option" aria-selected={isSel} tabIndex={0}
        onClick={select}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(); } }}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 8,
          background: isSel ? hexToRgba(COLORS.accentFocus, 0.1) : "transparent",
          border: "1px solid transparent", color: COLORS.text, fontSize: 12,
          cursor: "pointer", opacity: isDone ? 0.6 : 1, outline: "none",
        }}>
        <button type="button" aria-label={isDone ? "Mark not done" : "Mark done"}
          onClick={(e) => { e.stopPropagation(); toggleDone(t.id); }}
          style={{ display: "flex", padding: 0, background: "transparent", border: "none", cursor: "pointer", flexShrink: 0 }}>
          {isDone ? <CheckCircle2 size={14} color={COLORS.done} /> : <Circle size={14} color={COLORS.faint} />}
        </button>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: PRIORITY_COLORS[t.priority || "medium"], flexShrink: 0 }} />
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: isDone ? "line-through" : "none" }}>{t.text}</span>
        {t.subject && (
          <span style={{ fontSize: 8.5, color: subjectColor(t.subject), background: hexToRgba(subjectColor(t.subject), 0.12), border: `1px solid ${hexToRgba(subjectColor(t.subject), 0.3)}`, padding: "1px 5px", borderRadius: 4, flexShrink: 0 }}>{t.subject}</span>
        )}
        <span style={{ fontSize: 8, letterSpacing: "0.08em", fontFamily: FONTS.mono, color: chip.color, flexShrink: 0 }}>{chip.text}</span>
        <button type="button" aria-label="Delete target"
          onClick={(e) => { e.stopPropagation(); removeTarget(t.id); }}
          style={{ display: "flex", padding: 0, background: "transparent", border: "none", cursor: "pointer", flexShrink: 0 }}>
          <Trash2 size={12} color={COLORS.faint} />
        </button>
      </div>
    );
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="sys" style={{ fontSize: 9, letterSpacing: "0.2em", color: COLORS.faint }}>WORKING ON</span>
        <button ref={triggerRef} type="button" disabled={running} onClick={() => setOpen(o => !o)}
          aria-expanded={open} aria-haspopup="listbox" aria-controls="ledger-target-list"
          aria-label="Choose what you're working toward"
          title={running ? "Locked while a session runs" : "Choose a target — or add a new one"}
          style={{
            display: "flex", alignItems: "center", gap: 8, minWidth: 240, maxWidth: 400,
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${selected && selected.done ? hexToRgba(COLORS.done, 0.35) : COLORS.border}`, borderRadius: 8,
            padding: "8px 12px", color: COLORS.text, fontSize: 12, fontFamily: FONTS.mono,
            cursor: running ? "not-allowed" : "pointer", opacity: running ? 0.55 : 1, textAlign: "left",
          }}>
          {selected && !selected.done ? (
            <>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: PRIORITY_COLORS[selected.priority || "medium"], flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.text}</span>
              <span style={{ fontSize: 9, color: subjectColor(selected.subject), background: hexToRgba(subjectColor(selected.subject), 0.12), border: `1px solid ${hexToRgba(subjectColor(selected.subject), 0.28)}`, padding: "2px 6px", borderRadius: 4, flexShrink: 0 }}>{selected.subject}</span>
              <span style={{ fontSize: 8.5, letterSpacing: "0.08em", fontFamily: FONTS.mono, color: dueChip(selected).color, flexShrink: 0 }}>{dueChip(selected).text}</span>
              <ChevronDown size={12} color={COLORS.faint} />
            </>
          ) : (
            <>
              <span style={{ flex: 1, color: COLORS.faint }}>{selected ? "Completed — choose a new target" : "Choose what you're working toward"}</span>
              <ChevronDown size={12} color={COLORS.faint} />
            </>
          )}
        </button>
        {running && <span className="sys" style={{ fontSize: 8.5, letterSpacing: "0.16em", color: COLORS.faint }}>LOCKED</span>}
      </div>

      {open && (
        <div id="ledger-target-list" ref={listRef} role="listbox" aria-label="Targets" tabIndex={-1} onKeyDown={onListKey}
          style={{
            position: "absolute", left: "50%", transform: "translateX(-50%)", top: "calc(100% + 8px)", zIndex: 70,
            width: "min(400px, 92vw)", maxHeight: "min(60vh, 420px)", overflowY: "auto",
            borderRadius: 12, padding: 6, background: COLORS.glassFillStrong,
            border: `1px solid ${COLORS.border}`, boxShadow: `0 18px 44px -18px ${COLORS.shadowStrong}`, outline: "none",
          }}>
          {activeTargets.length === 0 && (
            <div style={{ fontSize: 11.5, color: COLORS.faint, padding: "10px 12px" }}>No active targets — add one below.</div>
          )}
          {activeTargets.length > 0 && (
            <>
              <div className="sys" style={{ fontSize: 8, letterSpacing: "0.2em", color: COLORS.faint, padding: "6px 10px 4px" }}>ACTIVE</div>
              {activeTargets.map(t => row(t, false))}
            </>
          )}
          {doneTargets.length > 0 && (
            <>
              <div className="sys" style={{ fontSize: 8, letterSpacing: "0.2em", color: COLORS.faint, padding: "8px 10px 4px", borderTop: `1px solid ${COLORS.border}`, marginTop: 4 }}>COMPLETED</div>
              {doneTargets.map(t => row(t, true))}
            </>
          )}
          <div style={{ borderTop: `1px solid ${COLORS.border}`, marginTop: 4, padding: "8px 4px 4px" }}>
            <div className="sys" style={{ fontSize: 8, letterSpacing: "0.2em", color: COLORS.faint, padding: "0 6px 6px" }}>NEW TARGET</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Rotational Motion revision"
                onKeyDown={e => e.key === "Enter" && addTarget()} aria-label="New target name" />
              <div style={{ display: "flex", gap: 6 }}>
                <SelectBox value={newSubject} onChange={setNewSubject} ariaLabel="Target subject" options={subjOpts(profile.subjects)} style={{ flex: 1 }} />
                <SelectBox value={newPriority} onChange={setNewPriority} ariaLabel="Target priority" options={PRIO_OPTS} style={{ width: 96 }} />
                <Btn variant="ink" onClick={addTarget} title="Add target" style={{ flexShrink: 0 }}><Plus size={13} /></Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- FOCUS WORKSPACE ----------------
// One screen, three parts: the timer workspace (left), the task panel
// (right), and the analytics strip (below). All of it derives from the
// same session/task stores the rest of Ledger uses — nothing here invents
// data. Motion is CSS-only so the existing lg-motion-off shell class and
// the prefers-reduced-motion media query suppress it automatically.
function focusCss() {
  const isLight = COLORS.isLight;
  const hiTop = isLight ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.07)";
  return `
@keyframes lg-focusIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.lg-focus-in { animation: lg-focusIn 0.32s cubic-bezier(0.2,0.8,0.2,1) both; }
@keyframes lg-focusTaskIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
.lg-focus-task-in { animation: lg-focusTaskIn 0.24s cubic-bezier(0.2,0.8,0.2,1) both; }
.lg-focus-top { display: grid; grid-template-columns: minmax(380px, 0.9fr) minmax(520px, 1.1fr); gap: 20px; align-items: start; }
.lg-focus-grid2 { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 16px; align-items: stretch; }
.lg-focus-grid4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
@media (max-width: 1080px) { .lg-focus-top { grid-template-columns: 1fr; } }
@media (max-width: 980px) { .lg-focus-grid2 { grid-template-columns: 1fr; } .lg-focus-grid4 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 560px) { .lg-focus-grid4 { grid-template-columns: 1fr; } }
@keyframes lg-barGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
.lg-bar-grow { transform-origin: 50% 100%; animation: lg-barGrow 0.42s cubic-bezier(0.2,0.8,0.2,1) both; }

/* Segmented filter control — the active pill carries the Focus accent, the
   same inset-marker language as the sidebar's cyan rail. */
.lg-focus-seg { display: flex; gap: 3px; padding: 3px; background: rgba(255,255,255,0.04); border: 1px solid ${COLORS.border}; border-radius: 9px; }
.lg-focus-seg-btn { padding: 5px 12px; border-radius: 6px; border: none; background: transparent; color: ${COLORS.faint}; font-size: 9.5px; font-weight: 700; letter-spacing: 0.13em; text-transform: uppercase; font-family: ${FONTS.mono}; cursor: pointer; transition: background 0.16s ease-out, color 0.16s ease-out; }
.lg-focus-seg-btn:hover { color: ${COLORS.dim}; }
.lg-focus-seg-btn[aria-pressed="true"] { background: ${hexToRgba(COLORS.accentFocus, 0.12)}; color: ${COLORS.accentFocus}; box-shadow: inset 0 -2px 0 ${COLORS.accentFocus}; }

/* Task rows: tactile hover with a slight lift — the inline transition
   previously pinned to opacity-only, so the hover felt instant/flat. */
.lg-focus-taskpanel .lg-row { transition: background 0.16s ease-out, opacity 0.14s ease-out, transform 0.16s ease-out, box-shadow 0.16s ease-out; }
.lg-focus-taskpanel .lg-row:hover { background: ${COLORS.hoverOverlay}; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.28); }

/* Progress: visibly-muted track + cyan gradient fill with a soft glow.
   The fill keeps its width transition for updates, but the entrance
   animation is gated on the element having content (inline animation). */
.lg-focus-panel .lg-progress, .lg-focus-taskpanel .lg-progress { background: rgba(255,255,255,0.09); }
.lg-focus-panel .lg-progress-fill, .lg-focus-taskpanel .lg-progress-fill { background: linear-gradient(90deg, ${darken(COLORS.accentFocus, 18)}, ${COLORS.accentFocus}); box-shadow: 0 0 8px ${hexToRgba(COLORS.accentFocus, 0.4)}; }

/* ===== HERO ELEVATION — the timer is the highest surface on this screen.
   Strongest fill + top-edge highlight + a soft drop; Tasks/Analytics stay
   on the standard lg-card tier below it. ===== */
.lg-focus-hero {
  position: relative;
  border-radius: ${RADIUS.modal}px;
  border: 1px solid ${COLORS.border};
  background: linear-gradient(168deg, ${COLORS.glassFillStrong}, ${COLORS.glassFill});
  box-shadow: inset 0 1px 0 ${hiTop}, 0 18px 44px -18px ${COLORS.shadowStrong};
  transition: box-shadow 0.4s ease-out, border-color 0.4s ease-out;
}
.lg-focus-hero::after {
  content: ""; position: absolute; left: 0; right: 0; top: -1px; height: 1px;
  background: linear-gradient(90deg, transparent, ${hexToRgba(COLORS.accentFocus, 0.45)}, transparent);
  pointer-events: none;
}
/* READY — calm, muted glow. */
.lg-focus-hero.state-ready { box-shadow: inset 0 1px 0 ${hiTop}, 0 0 44px -16px ${hexToRgba(COLORS.accentFocus, 0.16 * VIEW.glow)}, 0 18px 44px -18px ${COLORS.shadowStrong}; }
/* FOCUSING — slow ambient breathing on a multi-second cycle. */
@keyframes lg-focusBreathe {
  0%, 100% { box-shadow: inset 0 1px 0 ${hiTop}, 0 0 44px -16px ${hexToRgba(COLORS.accentFocus, 0.2 * VIEW.glow)}, 0 18px 44px -18px ${COLORS.shadowStrong}; }
  50% { box-shadow: inset 0 1px 0 ${hiTop}, 0 0 64px -12px ${hexToRgba(COLORS.accentFocus, 0.42 * VIEW.glow)}, 0 18px 44px -18px ${COLORS.shadowStrong}; }
}
.lg-focus-hero.state-focusing { animation: lg-focusBreathe 4.2s ease-in-out infinite; }
/* PAUSED — glow subdued, ring stilled. */
.lg-focus-hero.state-paused { box-shadow: inset 0 1px 0 ${hiTop}, 0 8px 26px -18px ${COLORS.shadowStrong}; }
/* COMPLETED — one brief flash of cyan, then it settles onto the ready glow. */
@keyframes lg-focusFlash {
  0% { box-shadow: inset 0 1px 0 ${hiTop}, 0 0 20px -8px ${hexToRgba(COLORS.accentFocus, 0.35 * VIEW.glow)}, 0 18px 44px -18px ${COLORS.shadowStrong}; }
  35% { box-shadow: inset 0 1px 0 ${hiTop}, 0 0 70px -10px ${hexToRgba(COLORS.accentFocus, 0.7 * VIEW.glow)}, 0 18px 44px -18px ${COLORS.shadowStrong}; }
  100% { box-shadow: inset 0 1px 0 ${hiTop}, 0 0 44px -16px ${hexToRgba(COLORS.accentFocus, 0.16 * VIEW.glow)}, 0 18px 44px -18px ${COLORS.shadowStrong}; }
}
.lg-focus-hero.state-complete { animation: lg-focusFlash 0.5s cubic-bezier(0.2,0.8,0.2,1) both; }
/* Ring breathing during the focus phase — keyed to the cyan accent so the
   glow always belongs to the arc. Breaks keep a static softer glow. */
@keyframes lg-ringBreathe {
  0%, 100% { filter: drop-shadow(0 0 5px ${hexToRgba(COLORS.accentFocus, 0.35)}) drop-shadow(0 0 16px ${hexToRgba(COLORS.accentFocus, 0.14)}); }
  50% { filter: drop-shadow(0 0 9px ${hexToRgba(COLORS.accentFocus, 0.6)}) drop-shadow(0 0 24px ${hexToRgba(COLORS.accentFocus, 0.26)}); }
}
.lg-ring-breathe { animation: lg-ringBreathe 4.2s ease-in-out infinite; }
@keyframes lg-ringFlash {
  0% { filter: drop-shadow(0 0 6px ${hexToRgba(COLORS.accentFocus, 0.4)}); }
  40% { filter: drop-shadow(0 0 22px ${hexToRgba(COLORS.accentFocus, 0.8)}); }
  100% { filter: drop-shadow(0 0 8px ${hexToRgba(COLORS.accentFocus, 0.3)}); }
}
.lg-ring-flash { animation: lg-ringFlash 0.55s cubic-bezier(0.2,0.8,0.2,1) both; }
/* Focus column dims the side surfaces just slightly while a session runs,
   centering attention on the timer — reversible the moment it ends. */
.lg-focus-side { transition: opacity 0.32s ease-out; }
.lg-focus-top.is-running .lg-focus-side { opacity: 0.88; }
/* Ambient glow pool behind the hero while running — felt, not seen. */
.lg-focus-glow {
  position: absolute; left: 50%; top: 42%; width: 560px; height: 560px;
  transform: translate(-50%, -50%);
  background: radial-gradient(closest-side, ${hexToRgba(COLORS.accentFocus, 0.12 * VIEW.glow)}, transparent 70%);
  border-radius: 50%; opacity: 0; transition: opacity 0.6s ease-out;
  pointer-events: none; z-index: 0;
}
.lg-focus-top.is-running .lg-focus-glow { opacity: 1; }

/* ===== BUTTON FAMILY — one coherent press language. ===== */
.lg-focus-btn {
  transition: transform 0.16s cubic-bezier(0.2,0.8,0.2,1), filter 0.16s ease-out,
    box-shadow 0.16s ease-out, background 0.16s ease-out, border-color 0.16s ease-out, color 0.16s ease-out;
}
.lg-focus-btn:hover:not(:disabled) { transform: translateY(-1px); }
.lg-focus-btn:active:not(:disabled) { transform: translateY(1px) scale(0.98); }
.lg-focus-btn:disabled { cursor: default; }
.lg-focus-btn-primary {
  background: linear-gradient(150deg, ${COLORS.accentFocus}, ${darken(COLORS.accentFocus, 26)});
  color: #fff; border: none;
  box-shadow: 0 10px 26px -10px ${hexToRgba(COLORS.accentFocus, 0.5 * VIEW.glow)}, inset 0 1px 0 rgba(255,255,255,0.2);
}
.lg-focus-btn-primary:hover:not(:disabled) { filter: brightness(1.07); box-shadow: 0 12px 30px -10px ${hexToRgba(COLORS.accentFocus, 0.62 * VIEW.glow)}, inset 0 1px 0 rgba(255,255,255,0.2); }
.lg-focus-btn-primary:active:not(:disabled) { box-shadow: 0 5px 14px -8px ${hexToRgba(COLORS.accentFocus, 0.5 * VIEW.glow)}; }
.lg-focus-btn-ghost { background: transparent; border: 1px solid ${COLORS.border}; color: ${COLORS.faint}; }
.lg-focus-btn-ghost:hover:not(:disabled) { background: ${COLORS.hoverOverlay}; border-color: ${hexToRgba(COLORS.accentFocus, 0.4)}; color: ${COLORS.text}; }
.lg-focus-btn-danger:hover:not(:disabled) { filter: brightness(1.2); }
.lg-focus-btn-util { background: transparent; border: 1px solid ${COLORS.border}; color: ${COLORS.dim}; }
.lg-focus-btn-util:hover:not(:disabled) { background: ${COLORS.hoverOverlay}; border-color: ${hexToRgba(COLORS.accentFocus, 0.35)}; color: ${COLORS.dim}; }
`;
}

// Subject identity in miniature — the same per-subject color system used
// across the app, as a compact monogram square for task rows.
function SubjectBadge({ subject }) {
  const sc = subjectColor(subject || "");
  return (
    <span title={subject} aria-label={`Subject: ${subject}`}
      style={{ width: 18, height: 18, borderRadius: 5, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: hexToRgba(sc, 0.14), border: `1px solid ${hexToRgba(sc, 0.35)}`, color: sc, fontFamily: FONTS.mono, fontSize: 9, fontWeight: 700 }}>
      {subject ? subject.charAt(0).toUpperCase() : "•"}
    </span>
  );
}

// Time distribution donut — same ring language as the timer/FocusRing, so
// it reads as Ledger rather than a generic chart library. Legend hover
// highlights the matching segment; nothing flashes.
function TimeDonut({ dist, total, hoverIdx, onHover }) {
  const size = 118, stroke = 11, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  // Entrance-only draw-in: segments grow from 0 to their share once, on
  // mount. The whole transition is suppressed by lg-motion-off / the
  // reduced-motion media query (they force transition-duration to ~0).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);
  let acc = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
        aria-label={`Study time by subject. Total ${fmtMin(total)}.`} style={{ flexShrink: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={hexToRgba(COLORS.accentFocus, 0.12)} strokeWidth={stroke} />
        {dist.map((d, i) => {
          const frac = total > 0 ? d.minutes / total : 0;
          const dash = frac * c;
          const offset = -acc * c;
          acc += frac;
          const color = subjectColor(d.subject);
          return (
            <circle key={d.subject} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={color} strokeWidth={stroke}
              strokeDasharray={mounted ? `${dash} ${c - dash}` : `0 ${c}`}
              strokeDashoffset={offset} transform={`rotate(-90 ${size / 2} ${size / 2})`}
              opacity={hoverIdx === null || hoverIdx === i ? 1 : 0.28}
              style={{ transition: `stroke-dasharray 0.6s cubic-bezier(0.2,0.8,0.2,1) ${i * 70}ms, opacity 0.16s ease-out` }} />
          );
        })}
        <text x="50%" y="47%" textAnchor="middle" fontFamily={FONTS.mono} fontSize={15} fontWeight={700} fill={COLORS.text}>{fmtMin(total)}</text>
        <text x="50%" y="63%" textAnchor="middle" fontSize={8} fill={COLORS.faint} letterSpacing="0.14em">STUDIED</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 150, flex: 1 }}>
        {dist.length === 0 && <div style={{ fontSize: 11.5, color: COLORS.faint }}>No study time to distribute yet.</div>}
        {dist.map((d, i) => (
          <div key={d.subject} onMouseEnter={() => onHover(i)} onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(i)} onBlur={() => onHover(null)} tabIndex={0}
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "default", borderRadius: 6, padding: "2px 4px", outline: "none" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: subjectColor(d.subject), flexShrink: 0 }} />
            <span style={{ flex: 1, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.subject}</span>
            <span className="num" style={{ color: COLORS.dim }}>{Math.round((d.minutes / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Recharts tooltip in the app's own surface language.
function FocusTip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: COLORS.glassFillStrong, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 10px", fontSize: 11.5, color: COLORS.text, boxShadow: `0 12px 28px -14px ${COLORS.shadowStrong}` }}>
      <div className="sys" style={{ fontSize: 8, letterSpacing: "0.14em", color: COLORS.faint }}>{label}</div>
      <div style={{ marginTop: 3, fontFamily: FONTS.mono, fontWeight: 700 }}>{fmtMin(payload[0].value)}</div>
    </div>
  );
}

// ---------------- TASKS / TO-DO PANEL ----------------
// The target store is the `tasks` array — the same one the old Targets
// screen and Month View wrote to. Rows set the working target for Focus
// (shared selectedTargetId), so picking a task here and pressing Start
// Focus ties the session to it with no duplicate record.
function TaskPanel({ tasks, setTasks, profile, selectedTargetId, setSelectedTargetId }) {
  const today = todayStr();
  const [filter, setFilter] = useState("all");
  const [newText, setNewText] = useState("");
  const [newSubject, setNewSubject] = useState(profile.subjects[0]);
  const [newPriority, setNewPriority] = useState("medium");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [removingId, setRemovingId] = useState(null);
  const [justAdded, setJustAdded] = useState(null);
  const addInputRef = useRef(null);

  const FILTERS = [
    { id: "all", label: "All" },
    { id: "today", label: "Today" },
    { id: "upcoming", label: "Upcoming" },
    { id: "done", label: "Done" },
  ];

  const sorted = useMemo(() => {
    const rank = { high: 0, medium: 1, low: 2 };
    return tasks.slice().sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return (rank[a.priority || "medium"] ?? 1) - (rank[b.priority || "medium"] ?? 1);
    });
  }, [tasks]);

  const visible = useMemo(() => {
    if (filter === "today") return sorted.filter(t => t.date === today);
    if (filter === "upcoming") return sorted.filter(t => t.date > today && !t.done);
    if (filter === "done") return sorted.filter(t => t.done);
    return sorted;
  }, [sorted, filter, today]);

  const doneCount = tasks.filter(t => t.done).length;
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  const add = () => {
    if (!newText.trim()) return;
    const id = uid();
    setTasks(prev => [...prev, { id, text: newText.trim(), subject: newSubject, priority: newPriority, done: false, date: today }]);
    setNewText("");
    setFilter("all");
    setJustAdded(id);
    setTimeout(() => setJustAdded(null), 320);
  };
  const toggle = (id) => setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const remove = (id) => {
    if (!window.confirm("Delete this task?")) return;
    setRemovingId(id);
    setTimeout(() => {
      setTasks(prev => prev.filter(t => t.id !== id));
      if (id === selectedTargetId) setSelectedTargetId(null);
      setRemovingId(null);
    }, 140);
  };
  const beginEdit = (t) => { setEditingId(t.id); setEditText(t.text); };
  const commitEdit = (id) => {
    const text = editText.trim();
    setEditingId(null);
    if (text) setTasks(prev => prev.map(t => t.id === id ? { ...t, text } : t));
  };

  const dueLabel = (t) => {
    if (t.date === today) return { text: "TODAY", color: COLORS.warn };
    if (t.date < today && !t.done) return { text: fmtDateStr(t.date, "compact"), color: COLORS.danger };
    return { text: fmtDateStr(t.date, "compact"), color: COLORS.faint };
  };

  const segBtn = (on) => ({
    flex: 1, padding: "5px 12px", borderRadius: 6, border: "none", background: "transparent",
    color: on ? COLORS.accentFocus : COLORS.faint, fontSize: 9.5, fontWeight: 700,
    letterSpacing: "0.13em", textTransform: "uppercase", fontFamily: FONTS.mono, cursor: "pointer",
    boxShadow: on ? `inset 0 -2px 0 ${COLORS.accentFocus}` : "none",
    transition: "background 0.16s ease-out, color 0.16s ease-out",
  });

  return (
    <div className="lg-card lg-focus-taskpanel" style={{ padding: "20px 18px 14px", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
        <span className="sys" style={{ fontSize: 11, letterSpacing: "0.24em", color: COLORS.text, fontWeight: 700 }}>TODAY'S QUEUE</span>
        <span className="num" style={{ fontSize: 9, letterSpacing: "0.14em", color: COLORS.faint }}>
          {tasks.length} TASK{tasks.length === 1 ? "" : "S"} · {tasks.filter(t => t.priority === "high" && !t.done).length} HIGH PRIORITY
        </span>
        <Btn variant="ghost" style={{ padding: "5px 11px", fontSize: 11 }} onClick={() => { addInputRef.current && addInputRef.current.focus(); }}>
          <Plus size={13} /> Add task
        </Btn>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <Input ref={addInputRef} value={newText} onChange={e => setNewText(e.target.value)} aria-label="New task"
          placeholder="What needs to get done?" style={{ flex: 1, padding: "7px 10px", fontSize: 12.5 }}
          onKeyDown={e => e.key === "Enter" && add()} />
        <SelectBox value={newSubject} onChange={setNewSubject} ariaLabel="Task subject" options={subjOpts(profile.subjects)} style={{ width: 128, flexShrink: 0 }} />
        <SelectBox value={newPriority} onChange={setNewPriority} ariaLabel="Task priority" options={PRIO_OPTS} style={{ width: 92, flexShrink: 0 }} />
        <Btn variant="ink" onClick={add} title="Add task" style={{ flexShrink: 0 }}><Plus size={13} /></Btn>
      </div>

      <div role="group" aria-label="Filter tasks" className="lg-focus-seg" style={{ marginBottom: 12 }}>
        {FILTERS.map(f => (
          <button key={f.id} className="lg-focus-seg-btn" style={segBtn(filter === f.id)} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", maxHeight: 360 }}>
        {tasks.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "26px 10px", textAlign: "center" }}>
            <EmptyArt variant="grid" width={122} height={72} />
            <span className="sys" style={{ fontSize: 9, letterSpacing: "0.24em", color: COLORS.faint }}>YOUR QUEUE IS CLEAR</span>
            <div style={{ fontSize: 12, color: COLORS.faint, maxWidth: 260, lineHeight: 1.6 }}>Add something you want to complete today — then pick it as your working target and start a focus session.</div>
            <Btn variant="ghost" style={{ marginTop: 6 }} onClick={() => { addInputRef.current && addInputRef.current.focus(); }}><Plus size={13} /> Add task</Btn>
          </div>
        ) : visible.length === 0 ? (
          <div style={{ fontSize: 12, color: COLORS.faint, padding: "22px 8px", textAlign: "center" }}>Nothing here — try another filter.</div>
        ) : visible.map(t => (
          <div key={t.id} className={`lg-row${justAdded === t.id ? " lg-focus-task-in" : ""}`}
            style={{
              display: "flex", alignItems: "center", gap: 9, padding: "8px 8px", borderRadius: 8,
              borderBottom: `1px solid ${COLORS.border}`,
              opacity: removingId === t.id ? 0 : 1,
              background: t.id === selectedTargetId ? hexToRgba(COLORS.accentFocus, 0.06) : "transparent",
              boxShadow: t.id === selectedTargetId ? `inset 2px 0 0 ${COLORS.accentFocus}` : "none",
            }}>
            <Bubble status={t.done ? "done" : "todo"} size={18} onClick={() => toggle(t.id)} />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
              {editingId === t.id ? (
                <Input autoFocus value={editText} onChange={e => setEditText(e.target.value)} aria-label="Edit task"
                  onKeyDown={e => { if (e.key === "Enter") commitEdit(t.id); if (e.key === "Escape") setEditingId(null); }}
                  onBlur={() => commitEdit(t.id)}
                  style={{ flex: 1, padding: "4px 8px", fontSize: 12.5 }} />
              ) : (
                <button className="lg-row-title" onClick={() => setSelectedTargetId(t.id)}
                  title={t.done ? "Completed — uncheck to reactivate" : "Set as the working target for Focus"}
                  style={{
                    textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: 0,
                    fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.01em",
                    textDecoration: t.done ? "line-through" : "none",
                    color: t.done ? COLORS.faint : COLORS.text, opacity: t.done ? 0.75 : 1,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                  {t.text}
                </button>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 7, minHeight: 14 }}>
                {t.subject && <SubjectBadge subject={t.subject} />}
                <span title={`Priority: ${PRIORITY_LABEL[t.priority] || "Medium"}`}
                  style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: PRIORITY_COLORS[t.priority || "medium"] }} />
                <span className="num" style={{ fontSize: 9.5, color: dueLabel(t).color }}>{dueLabel(t).text}</span>
                {t.id === selectedTargetId && !t.done && (
                  <span className="sys" style={{ fontSize: 7.5, letterSpacing: "0.14em", color: COLORS.accentFocus }}>WORKING</span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
              <button onClick={() => beginEdit(t)} title="Edit task" aria-label="Edit task"
                style={{ display: "flex", padding: 2, background: "transparent", border: "none", cursor: "pointer", opacity: 0.7, transition: "opacity 0.14s ease-out" }}>
                <Pencil size={12} color={COLORS.faint} />
              </button>
              <button onClick={() => remove(t.id)} title="Delete task" aria-label="Delete task"
                className="lg-row-del"
                style={{ display: "flex", padding: 2, background: "transparent", border: "none", cursor: "pointer" }}>
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: `1px solid ${COLORS.border}`, marginTop: 12, paddingTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
          <span className="sys" style={{ fontSize: 8.5, letterSpacing: "0.2em", color: COLORS.faint }}>TODAY</span>
          <span className="num" style={{ fontSize: 11.5, color: COLORS.text }}>
            {doneCount} of {tasks.length} task{tasks.length === 1 ? "" : "s"} completed
            <span style={{ color: COLORS.faint, marginLeft: 6 }}>{pct}%</span>
          </span>
        </div>
        <div className="lg-progress" style={{ height: 6 }}>
          <div className="lg-progress-fill" style={{ width: `${pct}%`, "--lg-w": `${pct}%`, height: "100%", animation: pct > 0 ? undefined : "none" }} />
        </div>
      </div>
    </div>
  );
}

// ---------------- FOCUS ANALYTICS ----------------
// Every number below is derived from the real sessions/tasks arrays — the
// same data Dashboard, badges and XP read. Ranges re-derive the window;
// there is no second copy of anything.
function FocusAnalytics({ sessions, setSessions, tasks, profile, onShareStories }) {
  const today = todayStr();
  const [range, setRange] = useState("7");
  const [logOpen, setLogOpen] = useState(false);
  const [logDate, setLogDate] = useState(today);
  const [logSubject, setLogSubject] = useState(profile.subjects[0]);
  const [logHours, setLogHours] = useState("");
  const [logMinutes, setLogMinutes] = useState("");
  const [logSaved, setLogSaved] = useState(false);
  const [donutHover, setDonutHover] = useState(null);
  const n = Number(range);

  const windowSessions = useMemo(() => {
    const start = addDays(today, -(n - 1));
    return sessions.filter(s => s.date >= start);
  }, [sessions, today, n]);

  const days = useMemo(() => {
    const per = {};
    windowSessions.forEach(s => {
      per[s.date] = per[s.date] || { min: 0, n: 0 };
      per[s.date].min += s.minutes;
      per[s.date].n += 1;
    });
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const ds = addDays(today, -i);
      const d = per[ds] || { min: 0, n: 0 };
      out.push({ date: ds, min: d.min, n: d.n });
    }
    return out;
  }, [windowSessions, today, n]);

  const windowTotal = days.reduce((a, d) => a + d.min, 0);
  const windowCount = days.reduce((a, d) => a + d.n, 0);
  const avg = Math.round(windowTotal / n);
  const todayMin = days.length ? days[days.length - 1].min : 0;
  const todayCount = days.length ? days[days.length - 1].n : 0;
  const streak = computeStreak(sessions);
  const longest = longestStreak(sessions);

  // Honest trends — shown only when BOTH the current and the previous period
  // genuinely have logged data. With a day or two of history the comparison
  // window is empty, so nothing appears rather than a fabricated number.
  const prevWindowSessions = useMemo(() => {
    const start = addDays(today, -(n - 1) - n);
    return sessions.filter(s => s.date >= start && s.date < addDays(today, -(n - 1)));
  }, [sessions, today, n]);
  const prevTotal = prevWindowSessions.reduce((a, s) => a + s.minutes, 0);
  const prevAvg = Math.round(prevTotal / n);
  const yesterday = addDays(today, -1);
  const yesterdayMin = sessions.filter(s => s.date === yesterday).reduce((a, s) => a + s.minutes, 0);
  const yesterdayCount = sessions.filter(s => s.date === yesterday).length;
  const trendOf = (cur, prev) => {
    if (!(prev > 0 && cur > 0)) return null;
    const diff = ((cur - prev) / prev) * 100;
    if (Math.abs(diff) < 1) return null;
    return { up: diff > 0, pct: Math.abs(Math.round(diff)), color: diff > 0 ? COLORS.done : COLORS.danger };
  };
  const trendToday = trendOf(todayMin, yesterdayMin);
  const trendSessions = trendOf(todayCount, yesterdayCount);
  const trendAvg = trendOf(avg, prevAvg);

  const dist = useMemo(() => {
    const totals = {};
    profile.subjects.forEach(s => { totals[s] = 0; });
    windowSessions.forEach(s => { if (totals[s.subject] !== undefined) totals[s.subject] += s.minutes; });
    return profile.subjects
      .map(s => ({ subject: s, minutes: totals[s] }))
      .filter(x => x.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes);
  }, [windowSessions, profile.subjects]);
  const distTotal = dist.reduce((a, d) => a + d.minutes, 0);

  const recentSessions = useMemo(() => sessions.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 8), [sessions]);
  const targetById = useMemo(() => Object.fromEntries(tasks.map(t => [t.id, t])), [tasks]);

  const addManualLog = () => {
    const h = parseFloat(logHours) || 0, m = parseFloat(logMinutes) || 0;
    const totalMin = Math.round(h * 60 + m);
    if (totalMin <= 0 || !logDate) return;
    setSessions(prev => [...prev, { id: uid(), date: logDate, subject: logSubject, minutes: totalMin, startHour: new Date().getHours(), mode: "manual", manual: true }]);
    setLogHours(""); setLogMinutes("");
    setLogSaved(true);
    setTimeout(() => setLogSaved(false), 2500);
  };
  const deleteSession = (id) => { if (window.confirm("Remove this session from your log?")) setSessions(prev => prev.filter(s => s.id !== id)); };

  return (
    <div className="lg-focus-in" style={{ animationDelay: "120ms" }}>
      <div className="lg-card lg-focus-panel" style={{ borderRadius: RADIUS.card, border: `1px solid ${COLORS.border}`, padding: "18px 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
           <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 3, height: 15, borderRadius: 2, background: `linear-gradient(180deg, ${COLORS.accentFocus}, ${darken(COLORS.accentFocus, 32)})`, flexShrink: 0 }} />
            <span className="sys" style={{ fontSize: 11, letterSpacing: "0.24em", color: COLORS.text, fontWeight: 700 }}>FOCUS ANALYTICS</span>
          </div>
           <div style={{ display: "flex", alignItems: "center", gap: 8 }}><button onClick={onShareStories} aria-label="Share analytics as a Ledger Story" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 9px", borderRadius: 7, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.dim, fontFamily: FONTS.mono, fontSize: 9, cursor: "pointer" }}><Share2 size={12} /> SHARE</button><div role="group" aria-label="Analytics range" className="lg-focus-seg">
            {["7", "30", "90"].map(r => (
              <button key={r} className="lg-focus-seg-btn" aria-pressed={range === r} onClick={() => setRange(r)}>{r}D</button>
            ))}
           </div></div>
        </div>

        <div className="lg-grid" style={{ gap: 12 }}>
          <Stat label="Focus time" value={fmtMin(todayMin)} sub="TODAY" trend={trendToday} />
          <Stat label="Sessions" value={todayCount} sub="TODAY" trend={trendSessions} />
          <div className="lg-card" style={{ borderRadius: RADIUS.control, border: `1px solid ${COLORS.border}`, padding: `${SPACE.md}px ${SPACE.lg}px`, minWidth: 0 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: COLORS.faint, marginBottom: SPACE.xs + 2 }}>Streak</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: FONTS.mono, fontSize: 23, fontWeight: 600, color: streak > 0 ? COLORS.accentWarm : COLORS.text, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}>{streak}d</span>
              <div role="img" aria-label="Active days in the last week" style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {days.slice(-7).map(d => (
                  <span key={d.date} style={{ width: 7, height: 7, borderRadius: "50%", background: d.min > 0 ? COLORS.accentWarm : "rgba(255,255,255,0.08)", border: `1px solid ${d.min > 0 ? COLORS.accentWarm : COLORS.border}`, flexShrink: 0 }} />
                ))}
              </div>
            </div>
            <div style={{ fontSize: 11, color: COLORS.dim, marginTop: 2 }}>CURRENT · LONGEST {longest}d</div>
          </div>
          <Stat label="Daily avg" value={fmtMin(avg)} sub={`LAST ${range}D`} trend={trendAvg} />
        </div>

        <div className="lg-focus-grid2" style={{ marginTop: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
              <span className="sys" style={{ fontSize: 9.5, letterSpacing: "0.2em", color: COLORS.dim }}>FOCUS TIME · LAST {range} DAYS</span>
              <span className="sys" style={{ fontSize: 8.5, color: COLORS.faint }}>{windowCount} SESSION{windowCount === 1 ? "" : "S"}</span>
            </div>
            {windowTotal === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 4px 6px", flexWrap: "wrap" }}>
                <EmptyArt variant="track" width={150} height={72} />
                <div style={{ fontSize: 12, color: COLORS.faint, lineHeight: 1.7, flex: 1, minWidth: 180 }}>
                  {sessions.length === 0 ? (
                    <>
                      <span className="sys" style={{ fontSize: 9, letterSpacing: "0.24em", color: COLORS.faint, display: "block", marginBottom: 6 }}>YOUR FOCUS HISTORY STARTS HERE</span>
                      Start your first focus session and your analytics will appear here.
                    </>
                  ) : (
                    <>No focus sessions in the last {range} days — the timer is waiting.</>
                  )}
                </div>
              </div>
            ) : (
              <div role="img" aria-label={`Focus minutes per day for the last ${range} days. Total ${fmtMin(windowTotal)}.`} className="lg-bar-grow">
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={days.map(d => ({ date: d.date, label: d.date.slice(5), min: d.min }))} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="lgBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.accentFocus} stopOpacity={0.95} />
                        <stop offset="100%" stopColor={COLORS.accentFocus} stopOpacity={0.3} />
                      </linearGradient>
                      <linearGradient id="lgBarGradToday" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.accentFocus} stopOpacity={1} />
                        <stop offset="100%" stopColor={COLORS.accentFocus} stopOpacity={0.55} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tick={{ fill: COLORS.faint, fontSize: 9.5 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
                    <YAxis tick={{ fill: COLORS.faint, fontSize: 9.5 }} axisLine={false} tickLine={false} width={46}
                      tickFormatter={v => (v >= 60 ? `${Math.round(v / 60)}h` : `${v}m`)} />
                    <Tooltip content={<FocusTip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                    <Bar dataKey="min" radius={[3, 3, 0, 0]} maxBarSize={24} isAnimationActive={false}
                      background={{ fill: "rgba(255,255,255,0.07)", radius: 3 }}>
                      {days.map(d => {
                        const isToday = d.date === today;
                        return <Cell key={d.date} fill={isToday ? "url(#lgBarGradToday)" : "url(#lgBarGrad)"}
                          stroke={isToday ? hexToRgba(COLORS.accentFocus, 0.9) : "transparent"} strokeWidth={1} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
              <span className="sys" style={{ fontSize: 9.5, letterSpacing: "0.2em", color: COLORS.dim }}>TIME DISTRIBUTION</span>
              <span className="sys" style={{ fontSize: 8.5, color: COLORS.faint }}>LAST {range}D</span>
            </div>
            <TimeDonut dist={dist} total={distTotal} hoverIdx={donutHover} onHover={setDonutHover} />
          </div>
        </div>
      </div>

        <Card title="Recent sessions" right={
          <button onClick={() => setLogOpen(o => !o)} aria-expanded={logOpen}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 6, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: FONTS.mono, fontWeight: 700, cursor: "pointer", background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.dim, transition: "color 0.14s ease-out, border-color 0.14s ease-out" }}>
            <Plus size={11} /> Log
          </button>
        }>
          {logOpen && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px", marginBottom: 10, borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.glassFill2 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Input type="date" value={logDate} max={today} onChange={e => setLogDate(e.target.value)} aria-label="Session date" style={{ width: 150, flexShrink: 0, padding: "6px 9px", fontSize: 12 }} />
                <SelectBox value={logSubject} onChange={setLogSubject} ariaLabel="Session subject" options={subjOpts(profile.subjects)} style={{ flex: 1, minWidth: 120 }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Input type="number" min="0" step="1" placeholder="Hrs" value={logHours} onChange={e => setLogHours(e.target.value)} aria-label="Session hours" style={{ flex: 1, padding: "6px 9px", fontSize: 12 }} />
                <Input type="number" min="0" max="59" step="1" placeholder="Min" value={logMinutes} onChange={e => setLogMinutes(e.target.value)} aria-label="Session minutes" style={{ flex: 1, padding: "6px 9px", fontSize: 12 }} />
                <Btn variant="ink" onClick={addManualLog} ariaLabel="Add session" style={{ padding: "6px 12px", fontSize: 11.5 }}>Add</Btn>
              </div>
              {logSaved && <div style={{ fontSize: 11, color: COLORS.done }}>Added — counted in stats and streak.</div>}
            </div>
          )}
          {recentSessions.length === 0 ? (
            <div style={{ fontSize: 12, color: COLORS.faint, padding: "8px 2px" }}>Nothing logged yet.</div>
          ) : (
            <div>
              {recentSessions.map((s, i) => (
                <div key={s.id} style={{ display: "flex", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 10, flexShrink: 0 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: subjectColor(s.subject), boxShadow: `0 0 0 3px ${hexToRgba(subjectColor(s.subject), 0.14)}`, marginTop: 5, flexShrink: 0 }} />
                    {i < recentSessions.length - 1 && (
                      <span style={{ width: 1, flex: 1, background: COLORS.border, marginTop: 4, minHeight: 16 }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, paddingBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="num" style={{ fontSize: 9.5, color: COLORS.faint, fontVariantNumeric: "tabular-nums" }}>{s.date.slice(5)}</span>
                      {s.manual && <span style={{ fontSize: 8.5, color: COLORS.faint, border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: "1px 5px", letterSpacing: "0.08em" }}>manual</span>}
                      <div style={{ flex: 1 }} />
                      <span className="num" style={{ color: COLORS.text, fontWeight: 700, fontSize: 11.5 }}>{fmtMin(s.minutes)}</span>
                      <button onClick={() => deleteSession(s.id)} aria-label="Delete session" title="Delete session"
                        className="lg-row-del" style={{ display: "flex", padding: 2, background: "transparent", border: "none", cursor: "pointer" }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div style={{ color: COLORS.text, fontSize: 12.5, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.subject}
                      {s.targetId && targetById[s.targetId] && <span style={{ color: COLORS.faint, fontSize: 11 }}> → {targetById[s.targetId].text}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
    </div>
  );
}

function FocusTimer({ sessions, setSessions, profile, timer, setMode, setSubject, setPomoMinutes, onStart, onPause, onStop, onSkipBreak, tasks, setTasks, selectedTargetId, setSelectedTargetId, pipOk = false, pipOpen = false, onOpenPip, onOpenImmersive, onShareStories, autoBreaks = true }) {
  const { mode, running, elapsed, subject, pomoMinutes, phase, phaseTarget, cycle, completedFlash } = timer;
  const isBreak = mode === "pomodoro" && phase !== "focus";
  const ringState = completedFlash ? "complete" : !running ? (elapsed > 0 ? "paused" : "ready") : "focusing";

  // The one global keyboard shortcut: Space starts/pauses the session. It
  // stands down while typing, when a listbox option is focused, or when a
  // button is focused (Space on a focused button is already its native
  // click — double-firing would toggle twice).
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== "Space") return;
      const ae = document.activeElement;
      if (ae && (["INPUT", "TEXTAREA", "SELECT"].includes(ae.tagName) || ae.isContentEditable || ae.getAttribute("role") === "option" || ae.getAttribute("role") === "listbox" || ae.tagName === "BUTTON")) return;
      e.preventDefault();
      if (!running) onStart(); else onPause();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, isBreak, onStart, onPause]);

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "26px 8px 64px", display: "flex", flexDirection: "column", gap: 22 }}>
      {/* TWO-COLUMN TOP — timer workspace (left) + task panel (right) */}
      <div className={`lg-focus-top${running ? " is-running" : ""}`}>
        <div className="lg-focus-in" style={{ animationDelay: "0ms", position: "relative" }}>
          {/* Ambient glow pool behind the hero — only felt while running */}
          <div className="lg-focus-glow" />
          {/* THE TIMER — the highest-elevation surface on this screen */}
          <div className={`lg-focus-hero state-${ringState}`} style={{ padding: "26px 26px 22px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <div style={{ position: "relative", display: "inline-flex", gap: 2, padding: 3, borderRadius: 9, background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <span aria-hidden style={{ position: "absolute", top: 3, bottom: 3, left: 3, width: "calc(50% - 5px)", borderRadius: 7,
            background: hexToRgba(COLORS.accentFocus, 0.14), border: `1px solid ${hexToRgba(COLORS.accentFocus, 0.4)}`,
            boxShadow: `0 4px 14px -6px ${hexToRgba(COLORS.accentFocus, 0.35)}`,
            transform: mode === "flow" ? "translateX(0)" : "translateX(calc(100% + 4px))",
            transition: "transform 0.22s cubic-bezier(0.2,0.8,0.2,1)", pointerEvents: "none" }} />
          {["flow", "pomodoro"].map(m => (
            <button key={m} type="button" onClick={() => setMode(m)}
              title={running ? "Stop the current session to change mode" : ""}
              style={{
                position: "relative", zIndex: 1, flex: 1, minWidth: 88, padding: "6px 16px", borderRadius: 7,
                fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600,
                fontFamily: FONTS.body, cursor: running ? "not-allowed" : "pointer",
                background: "transparent", border: "none",
                color: mode === m ? COLORS.accentFocus : COLORS.faint,
                opacity: running && mode !== m ? 0.4 : 1,
                transition: "color 0.18s ease-out",
              }}>{m}</button>
          ))}
        </div>

        <RingTimer mode={mode} phase={phase} elapsed={elapsed} phaseTarget={phaseTarget} running={running} state={ringState} />

        {completedFlash && (
          <div style={{ fontSize: 11.5, color: completedFlash.kind === "break" ? COLORS.warn : COLORS.done, letterSpacing: "0.04em" }}>
            {completedFlash.message}
          </div>
        )}

        {mode === "pomodoro" && !isBreak && (
          <div style={{ display: "flex", gap: 6 }}>
            {[15, 25, 45, 60].map(m => (
              <div key={m} onClick={() => !running && setPomoMinutes(m)}
                style={{
                  padding: "5px 12px", borderRadius: 7, fontSize: 10.5, fontFamily: FONTS.mono,
                  cursor: running ? "default" : "pointer",
                  background: pomoMinutes === m ? hexToRgba(COLORS.accentFocus, 0.1) : "transparent",
                  border: `1px solid ${pomoMinutes === m ? hexToRgba(COLORS.accentFocus, 0.4) : COLORS.border}`,
                  color: pomoMinutes === m ? COLORS.text : COLORS.faint, opacity: running ? 0.6 : 1,
                }}>{m}m</div>
            ))}
          </div>
        )}
        {mode === "pomodoro" && (
          <div className="sys" style={{ fontSize: 9, letterSpacing: "0.16em", color: COLORS.faint }}>
            {isBreak ? "Break — next focus session waiting" : autoBreaks ? `Cycle ${cycle + 1}/4 · long break after 4` : "Focus session — auto breaks off"}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
          <span className="sys" style={{ fontSize: 9, letterSpacing: "0.2em", color: COLORS.faint }}>WORKING ON</span>
          <SelectBox value={subject || ""} onChange={setSubject} disabled={running} ariaLabel="Focus subject"
            options={subjOpts(profile.subjects)} style={{ minWidth: 180 }} />
          {running && <span className="sys" style={{ fontSize: 8.5, letterSpacing: "0.16em", color: COLORS.faint }}>LOCKED</span>}
        </div>

        <TargetPicker tasks={tasks} setTasks={setTasks} profile={profile} focusSubject={subject || ""} running={running}
          selectedTargetId={selectedTargetId} setSelectedTargetId={setSelectedTargetId} />

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
          {!running ? (
            <button onClick={onStart} className="lg-focus-btn lg-focus-btn-primary" style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 26px", borderRadius: 9,
              fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700,
              fontFamily: FONTS.mono, cursor: "pointer",
            }}><Play size={13} /> {isBreak ? "Start break" : elapsed > 0 ? "Resume" : "Start focus"}</button>
          ) : (
            <button onClick={onPause} className="lg-focus-btn lg-focus-btn-ghost" style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 26px", borderRadius: 9,
              fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700,
              fontFamily: FONTS.mono, cursor: "pointer",
            }}>
              <Pause size={13} /> Pause
            </button>
          )}
          {isBreak ? (
            <button onClick={onSkipBreak} className="lg-focus-btn lg-focus-btn-ghost" style={{
              padding: "11px 18px", borderRadius: 9, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: FONTS.mono, cursor: "pointer",
            }}>Skip break</button>
          ) : (
            <button onClick={onStop} disabled={elapsed === 0 && !running} className="lg-focus-btn lg-focus-btn-danger" style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: 9,
              border: `1px solid ${elapsed > 0 || running ? hexToRgba(COLORS.danger, 0.4) : COLORS.border}`,
              color: elapsed > 0 || running ? hexToRgba(COLORS.danger, 0.9) : COLORS.faint,
              fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: FONTS.mono, cursor: elapsed === 0 && !running ? "default" : "pointer",
            }}>
              <Square size={11} /> End & log
            </button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <kbd style={{ padding: "2px 7px", borderRadius: 5, border: `1px solid ${COLORS.borderStrong}`, background: COLORS.glassFill, color: COLORS.dim, fontSize: 9.5, fontFamily: FONTS.mono, boxShadow: `0 1px 0 ${COLORS.borderStrong}` }}>Space</kbd>
          <span style={{ fontSize: 9.5, letterSpacing: "0.12em", color: COLORS.faint, textTransform: "uppercase", fontFamily: FONTS.mono }}>starts / pauses the session</span>
        </div>
        <div className="sys" style={{ fontSize: 8.5, letterSpacing: "0.14em", color: COLORS.faint }}>Keeps running between sections — watch the floating badge</div>

        {/* Alternate ways to see the SAME timer — float it above other apps,
            or take over the whole screen. No second timer exists anywhere. */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={onOpenPip} disabled={!pipOk || pipOpen} className="lg-focus-btn lg-focus-btn-util"
            title={pipOk
              ? (pipOpen ? "Floating window is open — look for it on your screen" : "Open a small floating window above other apps (Chromium/Edge only)")
              : "Floating above other apps needs the Document Picture-in-Picture API — Chromium/Edge only. The rest of the app still works."}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 8,
              background: pipOpen ? hexToRgba(COLORS.accentFocus, 0.12) : "transparent",
              border: `1px solid ${pipOpen ? hexToRgba(COLORS.accentFocus, 0.45) : COLORS.border}`,
              color: pipOk ? (pipOpen ? COLORS.accentFocus : COLORS.dim) : COLORS.faint,
              fontSize: 9.5, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700,
              fontFamily: FONTS.mono, cursor: pipOk && !pipOpen ? "pointer" : "default",
              opacity: pipOk ? 1 : 0.55,
            }}>
            <PictureInPicture2 size={12} /> {pipOpen ? "Floating" : "Float"}
          </button>
          <button onClick={onOpenImmersive} className="lg-focus-btn lg-focus-btn-util"
            style={{
              display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 8,
              fontSize: 9.5, letterSpacing: "0.16em", textTransform: "uppercase",
              fontWeight: 700, fontFamily: FONTS.mono, cursor: "pointer",
            }}>
            <Maximize2 size={12} /> Immerse
          </button>
        </div>
      </div>
          </div>
      </div>

      {/* RIGHT COLUMN — the day's task panel */}
      <div className="lg-focus-in" style={{ animationDelay: "60ms" }}>
        <div className="lg-focus-side">
          <TaskPanel tasks={tasks} setTasks={setTasks} profile={profile} selectedTargetId={selectedTargetId} setSelectedTargetId={setSelectedTargetId} />
        </div>
      </div>
      </div>

      {/* BELOW BOTH COLUMNS — stats, charts, history */}
      <div className="lg-focus-side">
        <FocusAnalytics sessions={sessions} setSessions={setSessions} tasks={tasks} profile={profile} onShareStories={onShareStories} />
      </div>
    </div>
  );
}// ---------------- FLOATING TIMER ----------------
// Persists across tab switches (state lives in App) and can be dragged
// anywhere within the app shell so it stays out of the way of whatever
// you're actually looking at while a session runs.
function FloatingTimer({ timer, appRef, activeTab, setTab, onPause, onResume, onStop, resetKey }) {
  const [dragPos, setDragPos] = useState(null); // null = anchored to bottom-right via CSS; set once user drags
  const [collapsed, setCollapsed] = useState(false);
  const nodeRef = useRef(null);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });

  // Settings tab exposes a "reset position" action for whoever drags this
  // somewhere awkward (e.g. on top of a page header) and can't find it again.
  useEffect(() => { if (resetKey) setDragPos(null); }, [resetKey]);

  const clientXY = (e) => e.touches ? [e.touches[0].clientX, e.touches[0].clientY] : [e.clientX, e.clientY];

  const onDown = (e) => {
    if (!nodeRef.current) return;
    draggingRef.current = true; movedRef.current = false;
    const [cx, cy] = clientXY(e);
    const rect = nodeRef.current.getBoundingClientRect();
    offsetRef.current = { x: cx - rect.left, y: cy - rect.top };
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!draggingRef.current || !appRef.current) return;
      movedRef.current = true;
      const [cx, cy] = clientXY(e);
      const containerRect = appRef.current.getBoundingClientRect();
      const w = nodeRef.current ? nodeRef.current.offsetWidth : 220;
      const h = nodeRef.current ? nodeRef.current.offsetHeight : 60;
      let x = cx - containerRect.left - offsetRef.current.x;
      let y = cy - containerRect.top - offsetRef.current.y;
      x = Math.max(4, Math.min(x, containerRect.width - w - 4));
      y = Math.max(4, Math.min(y, containerRect.height - h - 4));
      setDragPos({ x, y });
      if (e.cancelable) e.preventDefault();
    };
    const onUp = () => { draggingRef.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [appRef]);

  if (!timer.running && timer.elapsed === 0) return null;
  if (activeTab === "timer") return null; // full timer view already visible, no need to float over itself

  const remaining = timer.mode === "pomodoro" ? Math.max(0, timer.phaseTarget - timer.elapsed) : timer.elapsed;
  const label = timer.mode === "pomodoro" && timer.phase !== "focus" ? (timer.phase === "long_break" ? "Long break" : "Short break") : timer.subject;
  // Default position is pure CSS (bottom-right corner) so the widget is
  // guaranteed visible the instant it mounts — no getBoundingClientRect
  // measurement to race against layout/paint timing. Once dragged, it
  // switches to explicit left/top pixels tracked relative to the app shell.
  const posStyle = dragPos
    ? { left: dragPos.x, top: dragPos.y }
    : { right: 16, bottom: 16 };

  return (
    <div ref={nodeRef} onMouseDown={onDown} onTouchStart={onDown}
      onClick={() => { if (!movedRef.current) setCollapsed(c => !c); }}
      title="Drag to reposition · click to expand or collapse"
      style={{
        position: "absolute", ...posStyle, zIndex: 60, cursor: draggingRef.current ? "grabbing" : "grab",
        userSelect: "none", background: COLORS.glassFillStrong,
        WebkitBackdropFilter: `blur(${COLORS.glassBlur}) saturate(1.4)`,
        backdropFilter: `blur(${COLORS.glassBlur}) saturate(1.4)`,
        border: `1.5px solid ${COLORS.accentFocus}66`, borderRadius: collapsed ? 999 : 999,
        boxShadow: `0 14px 40px -14px ${COLORS.inkGlow}, inset 0 1px 0 rgba(255,255,255,0.12)`,
        display: "flex", alignItems: "center", gap: collapsed ? 0 : 10,
        padding: collapsed ? "10px" : "8px 14px 8px 16px", transition: "border-radius 0.2s, transform 0.2s cubic-bezier(0.22,1,0.36,1)",
      }}>
      <div style={{ width: 9, height: 9, borderRadius: "50%", background: timer.running ? COLORS.done : COLORS.warn, flexShrink: 0 }} />
      {!collapsed && (
        <>
          <div style={{ fontFamily: FONTS.mono, fontSize: 15, fontWeight: 600, minWidth: 62 }}>{fmtClock(remaining)}</div>
          <div style={{ fontSize: 10, color: COLORS.faint, maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
          <div style={{ display: "flex", gap: 4 }} onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
            {timer.running ? (
              <button onClick={onPause} style={iconBtnStyle()}><Pause size={12} /></button>
            ) : (
              <button onClick={onResume} style={iconBtnStyle()}><Play size={12} /></button>
            )}
            <button onClick={onStop} style={iconBtnStyle(true)}><Square size={11} /></button>
            <button onClick={() => setTab("timer")} title="Open full timer" style={iconBtnStyle()}><TimerIcon size={12} /></button>
          </div>
        </>
      )}
    </div>
  );
}
// ---------------- IMMERSIVE TIMER ----------------
// The whole screen *is* the timer. Esc exits, Space toggles pause/resume
// (ignored while typing in an input). Controls stay hidden until the cursor
// moves — nothing else shares this surface.
function ImmersiveTimer({ timer, onClose, onPause, onResume, onStop, onSkipBreak }) {
  const [hover, setHover] = useState(false);

  const remaining = timer.mode === "pomodoro" ? Math.max(0, timer.phaseTarget - timer.elapsed) : timer.elapsed;
  const frac = timer.mode === "pomodoro"
    ? Math.min(1, timer.elapsed / Math.max(1, timer.phaseTarget))
    : (timer.elapsed % 5400) / 5400;
  const isBreak = timer.mode === "pomodoro" && timer.phase !== "focus";

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === " ") {
        const t = e.target;
        if (t && t.tagName && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
        e.preventDefault();
        if (timer.running) onPause(); else onResume();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [timer.running, onClose, onPause, onResume]);

  const chip = (extra = {}) => ({
    display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 9,
    background: "rgba(255,255,255,0.05)", border: `1px solid ${COLORS.border}`,
    color: COLORS.text, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
    fontWeight: 700, fontFamily: FONTS.mono, cursor: "pointer",
    ...extra,
  });

  const stateColor = timer.running ? COLORS.done : COLORS.accentWarm;

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ position: "fixed", inset: 0, zIndex: 1000, overflow: "hidden",
        background: `${COLORS.bg}`, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 30 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: stateColor,
          boxShadow: `0 0 14px ${hexToRgba(stateColor, 0.6)}`, transition: "background 0.2s" }} />
        <span className="sys" style={{ fontSize: 11, letterSpacing: "0.3em", color: COLORS.dim }}>
          {timer.mode.toUpperCase()}{isBreak ? ` · ${timer.phase === "long_break" ? "LONG BREAK" : "SHORT BREAK"}` : ""}
        </span>
      </div>

      <div className="num" style={{
        fontSize: "clamp(88px, 17vw, 212px)", fontWeight: 800, lineHeight: 1,
        letterSpacing: "-0.045em", color: COLORS.text,
        textShadow: `0 0 90px ${hexToRgba(COLORS.accentFocus, 0.25)}`,
      }}>{fmtClock(remaining)}</div>

      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span style={{ width: 7, height: 7, borderRadius: 2, background: subjectColor(timer.subject) }} />
        <span style={{ fontSize: 13, letterSpacing: "0.3em", textTransform: "uppercase", fontWeight: 600, color: COLORS.faint }}>
          {timer.subject || "FOCUS"}
        </span>
      </div>

      {/* hairline progress along the bottom edge */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: "rgba(255,255,255,0.05)" }}>
        <div style={{ width: `${frac * 100}%`, height: "100%", background: `linear-gradient(90deg, ${COLORS.accentFocus}, ${COLORS.accentProgress})`, transition: "width 1s linear" }} />
      </div>

      {/* quiet controls — only when the cursor is around */}
      <div style={{ position: "absolute", bottom: 28, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 8,
        opacity: hover ? 1 : 0, pointerEvents: hover ? "auto" : "none", transition: "opacity 0.22s ease-out" }}>
        {timer.running ? (
          <button onClick={onPause} style={chip()}><Pause size={12} /> Pause</button>
        ) : (
          <button onClick={onResume} style={chip({ background: hexToRgba(COLORS.accentFocus, 0.14), borderColor: hexToRgba(COLORS.accentFocus, 0.45), color: COLORS.accentFocus })}><Play size={12} /> {isBreak ? "Resume break" : "Resume"}</button>
        )}
        {isBreak ? (
          <button onClick={onSkipBreak} style={chip()}>Skip break</button>
        ) : (
          <button onClick={onStop} style={chip({ color: hexToRgba(COLORS.danger, 0.9), borderColor: hexToRgba(COLORS.danger, 0.4) })}><Square size={11} /> End & log</button>
        )}
        <button onClick={onClose} style={chip()}>Exit</button>
      </div>

      <div className="sys" style={{ position: "absolute", top: 24, right: 28, fontSize: 9, letterSpacing: "0.2em", color: COLORS.faint }}>
        ESC EXIT · SPACE {timer.running ? "PAUSE" : "RESUME"}
      </div>
    </div>
  );
}

function iconBtnStyle(danger) {
  return { width: 24, height: 24, borderRadius: 999, border: `1px solid ${danger ? COLORS.danger + "66" : "rgba(255,255,255,0.12)"}`, background: danger ? `${COLORS.danger}1f` : "rgba(255,255,255,0.08)", color: danger ? COLORS.danger : COLORS.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.15s ease-out, transform 0.15s ease-out" };
}

// ---------------- SHARED WIDGETS ----------------
// DAILY QUESTION PRACTICE — one control unit, shared by the dashboard strip
// and the tasks tab so the practice controls never fork. -1/+1/+5 stay quiet
// ghost steppers, Add is the single filled-ink commit, Target is a compact
// setting element beside the row.
function PracticeCard({ record, dppStreak = 0, bumpSolved, updateTarget }) {
  const [customAdd, setCustomAdd] = useState("");
  const dppPct = record.target ? Math.min(100, Math.round((record.solved / record.target) * 100)) : 0;
  return (
    <div style={{ borderRadius: RADIUS.card, border: `1px solid ${COLORS.border}`, padding: `${SPACE.lg}px ${SPACE.xl}px` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: SPACE.md }}>
        <div className="sys" style={{ fontSize: 9.5, letterSpacing: "0.24em", color: COLORS.dim }}>DAILY QUESTION PRACTICE</div>
        <div style={{ fontSize: 11, color: COLORS.dim, display: "flex", alignItems: "center", gap: 4 }}><Flame size={12} color={dppStreak > 0 ? COLORS.warn : COLORS.faint} /> {dppStreak}d streak</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: COLORS.dim, marginBottom: 6 }}>
            <span style={{ fontFamily: FONTS.mono, fontVariantNumeric: "tabular-nums" }}>{record.solved} / {record.target} questions</span>
            <span style={{ color: COLORS.ink, fontFamily: FONTS.mono }}>{dppPct}%</span>
          </div>
          <div className="lg-progress" style={{ height: 8 }}>
            <div className="lg-progress-fill" style={{ width: `${dppPct}%`, "--lg-w": `${dppPct}%`, height: "100%", background: dppPct >= 100 ? `linear-gradient(90deg, ${darken(COLORS.done, 25)}, ${COLORS.done})` : undefined }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Btn variant="ghost" onClick={() => bumpSolved(-1)}>-1</Btn>
          <Btn variant="ghost" onClick={() => bumpSolved(1)}>+1</Btn>
          <Btn variant="ghost" onClick={() => bumpSolved(5)}>+5</Btn>
          <Input value={customAdd} onChange={e => setCustomAdd(e.target.value)} placeholder="custom" type="number" style={{ width: 64 }} />
          <Btn variant="ink" onClick={() => { const n = parseInt(customAdd); if (!isNaN(n)) bumpSolved(n); setCustomAdd(""); }}><Plus size={13} /></Btn>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label htmlFor="dpp-target" style={{ fontSize: 11, color: COLORS.faint }}>Target</label>
          <Input id="dpp-target" type="number" value={record.target} onChange={e => updateTarget({ target: Math.max(1, parseInt(e.target.value) || 1) })} style={{ width: 64 }} />
        </div>
      </div>
    </div>
  );
}

// ---------------- RECALL DECK (spaced-repetition flashcards) ----------------
function scheduleCard(card, grade) {
  // grade: 0 = Again, 1 = Hard, 2 = Good, 3 = Easy — simplified SM-2
  let ease = card.ease ?? 2.5;
  let reps = card.reps ?? 0;
  let interval = card.interval ?? 0;
  if (grade === 0) {
    reps = 0; interval = 1; ease = Math.max(1.3, ease - 0.2);
  } else {
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 3;
    else interval = Math.round(interval * ease);
    if (grade === 1) { ease = Math.max(1.3, ease - 0.15); interval = Math.max(1, Math.round(interval * 0.8)); }
    if (grade === 3) { ease = Math.min(5, ease + 0.15); interval = Math.round(interval * 1.3); }
  }
  return { ease, reps, interval, due: addDays(todayStr(), interval), lastReviewed: todayStr() };
}

function FlashSplit({ k, v, tint }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: COLORS.faint }}>{k}</div>
      <div className="num" style={{ fontSize: 15, fontWeight: 700, color: tint || COLORS.text, marginTop: 2 }}>{v}</div>
    </div>
  );
}

// Recall — a quiet spaced-repetition instrument. Every number rolls up from
// the stored card schedule (due dates, intervals, lastReviewed) and nothing
// is invented. The queue is the heart: overdue first, then today's due.
function RecallDeck({ cards, setCards, profile, settings = {} }) {
  const [subject, setSubject] = useState(profile.subjects[0] || "");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [reviewSubject, setReviewSubject] = useState("all");
  const [dueFilter, setDueFilter] = useState("all");
  const [deckQuery, setDeckQuery] = useState("");
  const [queue, setQueue] = useState(null);
  const [qi, setQi] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionStats, setSessionStats] = useState(null);
  const [sessStart, setSessStart] = useState(null);
  const [tick, setTick] = useState(0);
  const [focus, setFocus] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");

  const today = todayStr();
  const extraSubjects = [...new Set([...profile.subjects, ...cards.map(c => c.subject)])];
  const overdue = cards.filter(c => c.due < today && (reviewSubject === "all" || c.subject === reviewSubject));
  const dueToday = cards.filter(c => c.due === today && (reviewSubject === "all" || c.subject === reviewSubject));
  const upcoming = cards.filter(c => c.due > today && daysBetween(parseLocalDate(today), parseLocalDate(c.due)) <= 7 && (reviewSubject === "all" || c.subject === reviewSubject));
  const dueCards = [...overdue, ...dueToday];
  const masteredN = cards.filter(c => (c.interval || 0) >= 30).length;
  // per-card review count: the grade log holds the last 15 reviews, so once
  // it fills, totalReviews must keep counting from reps (which only grows).
  const rc = c => Math.max(c.reps || 0, (c.log && c.log.length) || 0);
  const reviewed = cards.filter(c => rc(c) > 0);
  const retained = reviewed.filter(c => (c.interval || 0) >= 21).length;
  const retention = reviewed.length ? Math.round((retained / reviewed.length) * 100) : 0;
  const totalReviews = cards.reduce((a, c) => a + rc(c), 0);
  const avgEase = cards.length ? (cards.reduce((a, c) => a + (c.ease || 2.5), 0) / cards.length).toFixed(2) : "—";
  const missedTotal = cards.reduce((a, c) => a + (c.missed || 0), 0);

  // review streak = consecutive days ending today with at least one review
  const reviewDays = new Set(cards.map(c => c.lastReviewed).filter(Boolean));
  let streak = 0;
  { const d = new Date(); while (reviewDays.has(todayStr(d))) { streak++; d.setDate(d.getDate() - 1); } }

  // recent recall activity — all-time for the deck, grouped by reviewed date
  const activity = useMemo(() => {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = todayStr(d);
      out.push({ ds, n: cards.filter(c => c.lastReviewed === ds).length, label: d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase().slice(0, 2) });
    }
    return out;
  }, [cards]);

  // 12-week review heatmap (Mon-first weeks). Each cell = reviews that day,
  // drawn from the per-card grade log, with legacy cards counted via lastReviewed.
  const heat = useMemo(() => {
    const logCount = new Map();
    cards.forEach(c => (c.log || []).forEach(e => logCount.set(e.d, (logCount.get(e.d) || 0) + 1)));
    const anchor = new Date(); anchor.setDate(anchor.getDate() - 77 - ((anchor.getDay() + 6) % 7));
    const cols = [];
    for (let w = 0; w < 12; w++) {
      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(anchor); d.setDate(anchor.getDate() + w * 7 + i);
        const ds = todayStr(d);
        if (ds > today) { days.push(0); continue; }
        const n = logCount.get(ds) || (cards.some(c => c.lastReviewed === ds) ? 1 : 0);
        days.push(n);
      }
      cols.push(days);
    }
    return cols;
  }, [cards, today]);

  // 12-week forecast: cards due per week if every upcoming review goes "Good".
  const forecast = useMemo(() => {
    const weeks = Array(12).fill(0);
    cards.forEach(c => {
      let iv = c.interval || 0;
      let off = Math.max(0, daysBetween(parseLocalDate(today), parseLocalDate(c.due || today)));
      while (off < 12 * 7) {
        weeks[Math.floor(off / 7)]++;
        iv = iv === 0 ? 1 : iv < 3 ? 3 : Math.round(iv * 2.2);
        off += iv;
      }
    });
    return weeks;
  }, [cards, today]);

  const heatMax = Math.max(1, ...heat.flat());
  const heatColor = n => n === 0 ? "rgba(255,255,255,0.055)" : hexToRgba(COLORS.accentFocus, 0.16 + 0.84 * Math.min(1, n / heatMax));

  const bySubject = extraSubjects.map(s => ({ subject: s, count: cards.filter(c => c.subject === s).length })).filter(x => x.count > 0);
  const missedCards = cards.filter(c => (c.missed || 0) > 0).sort((a, b) => (b.missed || 0) - (a.missed || 0)).slice(0, 8);
  const lastMissOf = c => { const fails = (c.log || []).filter(e => e.g === 0); return fails.length ? fails[fails.length - 1].d : null; };

  const addCard = () => {
    if (!front.trim() || !back.trim()) return;
    const sub = subject.trim() || profile.subjects[0] || "General";
    setCards(prev => [...prev, { id: uid(), subject: sub, front: front.trim(), back: back.trim(), ease: 2.5, reps: 0, interval: 0, due: today, added: today, lastReviewed: null, missed: 0, log: [] }]);
    setFront(""); setBack("");
  };
  const removeCard = (id) => {
    if (!window.confirm("Delete this card?")) return;
    setCards(prev => prev.filter(c => c.id !== id));
    // If the deleted card is mid-session, drop it from the queue too so the
    // session doesn't stall on a ghost card.
    setQueue(prev => prev ? prev.filter(qid => qid !== id) : prev);
  };
  const makeDueNow = (id) => setCards(prev => prev.map(c => c.id === id ? { ...c, due: today } : c));

  const scheduleSecs = (c, g) => {
    const r = scheduleCard(c, g);
    return daysBetween(parseLocalDate(today), parseLocalDate(r.due));
  };

  const orderCards = (list) => {
    const order = settings.order === "newest" ? "newest" : settings.order === "shuffle" ? "shuffle" : "due";
    const arr = [...list];
    if (order === "due") arr.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : (b.reps || 0) - (a.reps || 0)));
    else if (order === "newest") arr.reverse();
    else arr.sort(() => Math.random() - 0.5);
    return arr;
  };

  const startReview = () => {
    if (dueCards.length === 0) return;
    const newPerDay = Number(settings.newPerDay) || 12;
    // New cards count toward the daily budget from the day they were added
    // (addCard stamps `added`). Legacy cards without `added` fall back to
    // their due date, so imported/old decks aren't mis-budgeted.
    const newToday = cards.filter(c => (c.reps || 0) === 0 && ((c.added || c.due) === today)).length;
    let ordered = orderCards(dueCards);
    const newUn = ordered.filter(c => (c.reps || 0) === 0);
    const rest = ordered.filter(c => (c.reps || 0) > 0);
    const permit = Math.max(0, newPerDay - newToday);
    ordered = [...rest, ...newUn.slice(0, permit)];
    if (ordered.length === 0) return;
    setQueue(ordered.map(c => c.id));
    setQi(0); setRevealed(false); setSessionStats(null);
    setSessStart(Date.now()); setTick(0);
  };

  const grade = (g) => {
    const id = queue[qi];
    const updated = scheduleCard(cards.find(c => c.id === id), g);
    setCards(prev => prev.map(c => {
      if (c.id !== id) return c;
      const log = [...(c.log || []), { d: updated.lastReviewed, g, e: updated.ease, iv: updated.interval }].slice(-15);
      return { ...c, ...updated, log, missed: (c.missed || 0) + (g === 0 ? 1 : 0) };
    }));
    if (qi + 1 < queue.length) { setQi(qi + 1); setRevealed(false); }
    else {
      const seconds = sessStart ? Math.round((Date.now() - sessStart) / 1000) : 0;
      setQueue(null); setSessStart(null); setRevealed(false); setFocus(false);
      setSessionStats({ graded: queue.length, seconds });
    }
  };

  // session clock
  useEffect(() => {
    if (!queue) return;
    const t = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(t);
  }, [queue]);
  const elapsed = sessStart ? Math.floor((Date.now() - sessStart) / 1000) : 0;

  // keyboard: space/enter reveals, 1-4 grade, escape quits/focus
  useEffect(() => {
    if (!queue) return;
    const h = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target && e.target.tagName) || "";
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (e.repeat) return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); setRevealed(true); }
      else if (e.key === "Escape") { setQueue(null); setRevealed(false); setFocus(false); setSessStart(null); }
      else if (revealed && ["1", "2", "3", "4"].includes(e.key) && queue) grade(Number(e.key) - 1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [queue, qi, revealed, focus]);

  const currentCard = queue ? cards.find(c => c.id === queue[qi]) : null;
  const sessionTotal = queue ? queue.length : 0;

  // Lock the page scroll while the fullscreen focus overlay is up so the
  // deck under it can't be nudged mid-session.
  useEffect(() => {
    if (!focus || !queue) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, [focus, queue]);
  const fmtClock = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const deckList = cards
    .filter(c => !deckQuery.trim() || c.front.toLowerCase().includes(deckQuery.trim().toLowerCase()) || (c.back || "").toLowerCase().includes(deckQuery.trim().toLowerCase()))
    .filter(c => reviewSubject === "all" || c.subject === reviewSubject)
    .filter(c => dueFilter === "all" ? true : dueFilter === "overdue" ? c.due < today : dueFilter === "today" ? c.due === today : c.due > today)
    .slice().reverse();

  const exportDeck = () => {
    const blob = new Blob([JSON.stringify(cards, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "recall-deck.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  const importCards = () => {
    const text = importText.trim();
    if (!text) return;
    let items = [];
    if (text.startsWith("[")) {
      try { items = JSON.parse(text).filter(x => x && x.front).map(x => ({ front: String(x.front), back: String(x.back || ""), subject: String(x.subject || "General") })); } catch (e) { items = []; }
    }
    if (!items.length) {
      // CSV lines: front, back [, subject]. Fields may be quoted so commas
      // and escaped quotes inside a field survive the split.
      text.split("\n").forEach(line => {
        if (!line.trim()) return;
        const cells = [];
        let cur = "", inQ = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
            else inQ = !inQ;
          } else if (ch === "," && !inQ) { cells.push(cur); cur = ""; }
          else cur += ch;
        }
        cells.push(cur);
        const cleaned = cells.map(s => s.trim());
        if (cleaned.length < 2 || !cleaned[0]) return;
        items.push({ front: cleaned[0], back: cleaned[1], subject: cleaned.length > 2 && cleaned[2] ? cleaned[2] : "General" });
      });
    }
    const clean = items.filter(i => i.front && i.back);
    if (!clean.length) return;
    setCards(prev => {
      const have = new Set(prev.map(c => `${c.subject}::${c.front}`));
      const fresh = clean.filter(i => !have.has(`${i.subject}::${i.front}`)).map(i => ({ id: uid(), ease: 2.5, reps: 0, interval: 0, due: today, lastReviewed: null, missed: 0, log: [], ...i }));
      return [...prev, ...fresh];
    });
    setImportText(""); setImportOpen(false);
  };

  const flipCard = (sub, repLabel, frontText, backText) => (
    <div style={{ perspective: 1100, width: "100%" }}>
      <div style={{ position: "relative", width: "100%", minHeight: 210, transformStyle: "preserve-3d", transform: revealed ? "rotateY(180deg)" : "rotateY(0deg)", transition: "transform 0.45s cubic-bezier(0.4,0,0.2,1)" }}>
        <div style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 210, textAlign: "center", padding: "26px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={subjectDot(sub)} />
            <span className="sys" style={{ fontSize: 8.5, letterSpacing: "0.2em", color: COLORS.dim }}>{sub}</span>
            <span className="sys" style={{ fontSize: 8, letterSpacing: "0.12em", color: currentCard && currentCard.reps > 0 ? COLORS.faint : COLORS.done }}>{currentCard && currentCard.reps > 0 ? `REVIEW ${currentCard.reps + 1}` : "NEW"}</span>
          </div>
          <div style={{ fontSize: 17, color: COLORS.text, maxWidth: 560, lineHeight: 1.5 }}>{frontText}</div>
          <div style={{ fontSize: 10.5, color: COLORS.faint, marginTop: 10 }}>Recall the answer from memory first.</div>
        </div>
        <div style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", position: "absolute", inset: 0, transform: "rotateY(180deg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "26px 18px" }}>
          <div style={{ fontSize: 11, color: COLORS.faint, maxWidth: 560, lineHeight: 1.55, marginBottom: 10 }}>{frontText}</div>
          <div style={{ fontSize: 13.5, color: COLORS.ink, borderTop: `1px dashed ${COLORS.border}`, paddingTop: 14, maxWidth: 560, lineHeight: 1.6 }}>{backText}</div>
        </div>
      </div>
    </div>
  );

  const gradeRail = () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
      <GradeBtn label="Again" hot="1" tint={COLORS.danger} next={scheduleSecs(currentCard, 0)} onGrade={() => grade(0)} />
      <GradeBtn label="Hard" hot="2" tint={COLORS.warn} next={scheduleSecs(currentCard, 1)} onGrade={() => grade(1)} />
      <GradeBtn label="Good" hot="3" tint={COLORS.done} next={scheduleSecs(currentCard, 2)} onGrade={() => grade(2)} />
      <GradeBtn label="Easy" hot="4" tint={COLORS.accentFocus} next={scheduleSecs(currentCard, 3)} onGrade={() => grade(3)} />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHead
        title="Recall"
        lead="Your memory queue, optimized for what needs attention. Cards schedule themselves — you just grade honestly. Keys: space to flip, 1–4 to grade, esc to quit."
        right={(
          <div className="num" style={{ fontSize: 11, letterSpacing: "0.06em", color: COLORS.faint, marginTop: 26 }}>
            {totalReviews} REVIEW{totalReviews === 1 ? "" : "S"} DONE · {streak}d STREAK
          </div>
        )}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <MiniStat k="Due today" v={dueToday.length + overdue.length} sub="Ready to review now" tint={dueToday.length + overdue.length > 0 ? COLORS.warn : undefined} />
        <MiniStat k="Overdue" v={overdue.length} sub={overdue.length ? "Past their due date" : "Nothing behind"} tint={overdue.length > 0 ? COLORS.danger : undefined} />
        <MiniStat k="Upcoming 7d" v={upcoming.length} sub="Scheduled ahead" />
        <MiniStat k="Mastery" v={masteredN} sub="Interval 30d +" tint={masteredN > 0 ? COLORS.done : undefined} />
      </div>

      {/* Signals strip — retention, streak, subject mix, heat + forecast */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
        <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.card, padding: "14px 16px", background: "transparent" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <span className="sys" style={{ fontSize: 8.5, letterSpacing: "0.22em", color: COLORS.dim }}>DECK HEALTH</span>
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <FlashSplit k="Retention" v={`${retention}%`} />
            <FlashSplit k="Review streak" v={`${streak}d`} />
            <FlashSplit k="Avg ease" v={avgEase} />
            <FlashSplit k="Forgotten" v={missedTotal} />
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 3, alignItems: "flex-end" }}>
            {activity.map((a, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ height: `${Math.max(4, a.n * 9)}px`, background: a.n > 0 ? COLORS.accentFocus : "rgba(255,255,255,0.055)", borderRadius: 2, maxHeight: 44 }} />
                <div className="sys" style={{ fontSize: 7, color: COLORS.faint, marginTop: 3 }}>{a.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.card, padding: "14px 16px", background: "transparent" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <span className="sys" style={{ fontSize: 8.5, letterSpacing: "0.22em", color: COLORS.dim }}>SUBJECT MIX</span>
            <span className="num" style={{ fontSize: 9, color: COLORS.faint }}>{cards.length} CARDS</span>
          </div>
          {bySubject.length === 0 ? (
            <div style={{ fontSize: 11.5, color: COLORS.faint, lineHeight: 1.6 }}>No cards yet — add your first below and the spread will appear here.</div>
          ) : bySubject.map(s => (
            <div key={s.subject} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${COLORS.border}` }}>
              <span style={subjectDot(s.subject)} />
              <span style={{ flex: 1, fontSize: 12, color: COLORS.text }}>{s.subject}</span>
              <div className="lg-progress" style={{ width: 90, height: 3 }}>
                <div style={{ width: `${Math.round((s.count / cards.length) * 100)}%`, height: "100%", background: subjectColor(s.subject), borderRadius: 2 }} />
              </div>
              <span className="num" style={{ fontSize: 10, color: COLORS.dim, width: 22, textAlign: "right" }}>{s.count}</span>
            </div>
          ))}
        </div>
        <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.card, padding: "14px 16px", background: "transparent" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <span className="sys" style={{ fontSize: 8.5, letterSpacing: "0.22em", color: COLORS.dim }}>HEATMAP · LAST 12 WEEKS</span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {heat.map((wk, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                {wk.map((n, j) => <div key={j} style={{ width: "100%", aspectRatio: "1", borderRadius: 2, background: heatColor(n) }} />)}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 14, marginBottom: 8 }}>
            <span className="sys" style={{ fontSize: 8.5, letterSpacing: "0.22em", color: COLORS.dim }}>FORECAST · DUE PER WEEK</span>
            <span className="num" style={{ fontSize: 8.5, color: COLORS.faint }}>IF EVERY REVIEW GOES "GOOD"</span>
          </div>
          <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 42 }}>
            {forecast.map((n, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div style={{ width: "100%", maxWidth: 16, height: `${Math.max(2, Math.round((n / Math.max(1, ...forecast)) * 38))}px`, background: n > 0 ? hexToRgba(COLORS.accentFocus, 0.45 + 0.55 * (n / Math.max(1, ...forecast))) : "rgba(255,255,255,0.055)", borderRadius: 2 }} />
                <div className="sys" style={{ fontSize: 6.5, color: COLORS.faint }}>w{i + 1}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Forgotten cards — the regrade shelf */}
      {missedCards.length > 0 && (
        <div style={{ border: `1px solid ${hexToRgba(COLORS.danger, 0.35)}`, borderRadius: RADIUS.card, padding: "14px 16px", background: "transparent" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <span className="sys" style={{ fontSize: 8.5, letterSpacing: "0.22em", color: COLORS.danger }}>FORGOTTEN — REGRADE SHELF</span>
            <span className="num" style={{ fontSize: 9, color: COLORS.faint }}>{missedCards.length} CARDS</span>
          </div>
          {missedCards.map(c => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 4px", borderBottom: `1px solid ${COLORS.border}` }}>
              <span style={subjectDot(c.subject)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.front}</div>
                <div style={{ fontSize: 10, color: COLORS.faint, marginTop: 2 }}>{c.subject} · missed {c.missed}{lastMissOf(c) ? ` · last forgotten ${lastMissOf(c)}` : ""} · interval {(c.interval || 0)}d</div>
              </div>
              <button onClick={() => makeDueNow(c.id)} style={{ padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 9, letterSpacing: "0.1em", fontFamily: FONTS.mono, background: `${COLORS.danger}14`, border: `1px solid ${hexToRgba(COLORS.danger, 0.4)}`, color: COLORS.danger }}>RE-STUDY NOW</button>
            </div>
          ))}
        </div>
      )}

      {/* Review stage */}
      {queue ? (
        <div style={{ border: `1px solid ${hexToRgba(COLORS.accentFocus, 0.35)}`, borderRadius: RADIUS.card, overflow: "hidden", background: `linear-gradient(168deg, ${COLORS.glassFillStrong}, ${COLORS.glassFill})` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
            <span className="sys" style={{ fontSize: 9, letterSpacing: "0.24em", color: COLORS.accentFocus }}>REVIEW SESSION</span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="num" style={{ fontSize: 10.5, color: COLORS.faint }}>{fmtClock(elapsed)}</span>
              <span className="num" style={{ fontSize: 10.5, color: COLORS.faint }}>{qi + 1} / {queue.length}</span>
              <button onClick={() => setFocus(!focus)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 6, cursor: "pointer", fontSize: 8.5, letterSpacing: "0.12em", fontFamily: FONTS.mono, background: focus ? hexToRgba(COLORS.accentFocus, 0.16) : "transparent", border: `1px solid ${focus ? hexToRgba(COLORS.accentFocus, 0.5) : COLORS.border}`, color: focus ? COLORS.accentFocus : COLORS.faint }}>
                <Maximize2 size={10} /> FOCUS
              </button>
            </div>
          </div>
          {flipCard(currentCard?.subject, currentCard?.reps, currentCard?.front, currentCard?.back)}
          <div style={{ padding: "0 16px 14px" }}>
            {!revealed ? (
              <button onClick={() => setRevealed(true)} style={{ width: "100%", padding: "11px 0", borderRadius: RADIUS.control, cursor: "pointer", background: `linear-gradient(150deg, ${COLORS.ink}, ${darken(COLORS.ink, 26)})`, border: "none", color: "#fff", fontFamily: FONTS.mono, fontSize: 11, letterSpacing: "0.18em", fontWeight: 700, textTransform: "uppercase" }}>
                Show answer <span style={{ opacity: 0.6 }}>(space)</span>
              </button>
            ) : (
              gradeRail()
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className="sys" style={{ fontSize: 8.5, letterSpacing: "0.2em", color: COLORS.dim }}>QUEUE</span>
              <div style={{ display: "flex", gap: 5 }}>
                {[["all", "All"], ["overdue", "Overdue"], ["today", "Today"], ["next", "Upcoming"]].map(([k, label]) => (
                  <button key={k} onClick={() => setDueFilter(k)} style={{ padding: "3px 9px", borderRadius: 5, cursor: "pointer", fontSize: 9, letterSpacing: "0.08em", fontFamily: FONTS.mono, background: dueFilter === k ? hexToRgba(COLORS.accentFocus, 0.14) : "transparent", border: `1px solid ${dueFilter === k ? hexToRgba(COLORS.accentFocus, 0.5) : COLORS.border}`, color: dueFilter === k ? COLORS.accentFocus : COLORS.faint }}>{label}</button>
                ))}
              </div>
            </div>
            <SelectBox value={reviewSubject} onChange={setReviewSubject} ariaLabel="Review subject"
              options={[{ value: "all", label: "All subjects" }].concat(subjOpts(extraSubjects))} style={{ width: 150 }} />
          </div>

          <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.card, padding: "14px 16px", background: "transparent" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 13.5, color: COLORS.text, fontWeight: 600 }}>{dueCards.length} card{dueCards.length === 1 ? "" : "s"} ready now</div>
                <div style={{ fontSize: 11, color: COLORS.faint, marginTop: 2 }}>
                  {overdue.length > 0 ? `${overdue.length} overdue — these come first. ` : ""}{upcoming.length > 0 ? `${upcoming.length} scheduled inside the week.` : "Next review slot is free until you add a card."}
                </div>
              </div>
              <Btn variant="ink" onClick={startReview} disabled={dueCards.length === 0} style={{ justifyContent: "center", opacity: dueCards.length === 0 ? 0.5 : 1 }}>
                <Layers size={14} /> {dueCards.length ? `Review ${dueCards.length} now` : "Queue empty"}
              </Btn>
            </div>
            {dueCards.length > 0 && (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column" }}>
                {dueCards.slice(0, 7).map(c => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", borderBottom: `1px solid ${COLORS.border}` }}>
                    <span style={subjectDot(c.subject)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.front}</div>
                      <div style={{ fontSize: 10, color: COLORS.faint, marginTop: 2 }}>{c.subject} · due {c.due}</div>
                    </div>
                    <span className="num" style={{ fontSize: 9.5, color: COLORS.dim }}>{c.interval}d{rc(c) ? ` · r${rc(c)}` : ""}</span>
                    <Trash2 size={12} color={COLORS.faint} style={{ cursor: "pointer" }} onClick={() => removeCard(c.id)} />
                  </div>
                ))}
                {dueCards.length > 7 && <div style={{ fontSize: 10.5, color: COLORS.faint, padding: "8px 4px 2px" }}>…and {dueCards.length - 7} more in the queue.</div>}
              </div>
            )}
            {dueCards.length === 0 && (
              <div style={{ fontSize: 12, color: COLORS.faint, lineHeight: 1.6, marginTop: 8 }}>
                {sessionStats ? `Session done — ${sessionStats.graded} review${sessionStats.graded === 1 ? "" : "s"} graded in ${fmtClock(sessionStats.seconds)}. ` : ""}
                No reviews due right now. {cards.length === 0 ? "Add your first card below — it enters the queue immediately." : "Every card is ahead of its schedule."}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Focus overlay */}
      {focus && queue && currentCard && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(7,9,14,0.97)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ width: "min(680px, 100%)", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="sys" style={{ fontSize: 9, letterSpacing: "0.24em", color: COLORS.accentFocus }}>FOCUS · REVIEW {qi + 1} / {queue.length}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="num" style={{ fontSize: 11, color: COLORS.faint }}>{fmtClock(elapsed)}</span>
                <button onClick={() => setFocus(false)} title="Exit focus (Esc)" style={{ padding: "5px 9px", borderRadius: 6, cursor: "pointer", background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.faint }}><X size={14} /></button>
              </div>
            </div>
            <div style={{ border: `1px solid ${hexToRgba(COLORS.accentFocus, 0.35)}`, borderRadius: RADIUS.card, padding: "26px 22px", background: `linear-gradient(168deg, ${COLORS.glassFillStrong}, ${COLORS.glassFill})` }}>
              {flipCard(currentCard.subject, currentCard.reps, currentCard.front, currentCard.back)}
              <div style={{ marginTop: 14 }}>
                {!revealed ? (
                  <button onClick={() => setRevealed(true)} style={{ width: "100%", padding: "13px 0", borderRadius: RADIUS.control, cursor: "pointer", background: `linear-gradient(150deg, ${COLORS.ink}, ${darken(COLORS.ink, 26)})`, border: "none", color: "#fff", fontFamily: FONTS.mono, fontSize: 12, letterSpacing: "0.18em", fontWeight: 700, textTransform: "uppercase" }}>
                    Show answer <span style={{ opacity: 0.6 }}>(space)</span>
                  </button>
                ) : gradeRail()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import / export */}
      {importOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(7,9,14,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ width: "min(560px, 100%)", border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.card, padding: "18px 20px", background: "rgba(12,15,22,0.98)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span className="sys" style={{ fontSize: 9, letterSpacing: "0.22em", color: COLORS.accentFocus }}>IMPORT CARDS</span>
              <button onClick={() => setImportOpen(false)} style={{ padding: 4, borderRadius: 5, cursor: "pointer", background: "transparent", border: "none", color: COLORS.faint }}><X size={14} /></button>
            </div>
            <textarea value={importText} onChange={e => setImportText(e.target.value)} rows={8} placeholder={"One card per line:\nfront, back, subject\nfront, back\n\nOr paste a JSON array of {front, back, subject}."} style={{ width: "100%", boxSizing: "border-box", background: COLORS.glassFill, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 12px", color: COLORS.text, fontSize: 12, fontFamily: FONTS.mono, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={exportDeck}><Download size={13} /> Export JSON</Btn>
              <Btn variant="ink" onClick={importCards} style={{ justifyContent: "center" }}>Import cards</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Add card */}
      <Card id="recall-add" title="Add a card">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input list="recall-subjects" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject — pick one or type a new one…" style={{ background: COLORS.glassFill, border: `1px solid ${COLORS.border}`, borderRadius: 7, padding: "9px 11px", color: COLORS.text, fontSize: 13, fontFamily: FONTS.body }} />
          <datalist id="recall-subjects">{extraSubjects.map(s => <option key={s} value={s} />)}</datalist>
          <textarea placeholder="Front — question or prompt" value={front} onChange={e => setFront(e.target.value)} rows={2} style={{ background: COLORS.glassFill, border: `1px solid ${COLORS.border}`, borderRadius: 7, padding: "9px 11px", color: COLORS.text, fontSize: 13, fontFamily: FONTS.body, resize: "vertical" }} />
          <textarea placeholder="Back — answer" value={back} onChange={e => setBack(e.target.value)} rows={2} style={{ background: COLORS.glassFill, border: `1px solid ${COLORS.border}`, borderRadius: 7, padding: "9px 11px", color: COLORS.text, fontSize: 13, fontFamily: FONTS.body, resize: "vertical" }} />
          <Btn variant="ink" onClick={addCard} style={{ justifyContent: "center" }}><Plus size={14} /> Add card</Btn>
        </div>
      </Card>

      {/* Deck */}
      <Card title={`Deck (${cards.length})`} right={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Input value={deckQuery} onChange={e => setDeckQuery(e.target.value)} placeholder="Search deck…" style={{ width: 150 }} />
          <button onClick={() => setImportOpen(true)} title="Import / export" style={{ padding: "5px 8px", borderRadius: 6, cursor: "pointer", background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.faint }}><Download size={13} /></button>
        </div>
      }>
        {deckList.length === 0 && <div style={{ fontSize: 12, color: COLORS.faint }}>No cards match.{cards.length > 0 ? "" : " Add your first card above."}</div>}
        {deckList.map(c => {
          const state = c.due < today ? { label: "OVERDUE", tint: COLORS.danger } : c.due === today ? { label: "DUE TODAY", tint: COLORS.warn } : (c.reps || 0) === 0 && !(c.log && c.log.length) ? { label: "NEW", tint: COLORS.done } : { label: "SCHEDULED", tint: COLORS.faint };
          const open = openId === c.id;
          return (
            <div key={c.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", borderBottom: `1px solid ${COLORS.border}` }}>
                <span style={subjectDot(c.subject)} />
                <div style={{ flex: 1, fontSize: 12, minWidth: 0, cursor: "pointer" }} onClick={() => setOpenId(open ? null : c.id)}>
                  <div style={{ color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.front}</div>
                  <div style={{ color: COLORS.faint, fontSize: 10, marginTop: 2 }}>
                    {c.subject} · interval {(c.interval || 0)}d · ease {(c.ease || 2.5).toFixed(2)}{rc(c) ? ` · ${rc(c)} reviews` : ""}{c.missed ? ` · ${c.missed} missed` : ""}{c.lastReviewed ? ` · reviewed ${c.lastReviewed}` : ""}
                  </div>
                </div>
                <span className="sys" style={{ fontSize: 7.5, letterSpacing: "0.12em", color: state.tint, padding: "2px 6px", borderRadius: 4, border: `1px solid ${state.tint}44`, background: `${state.tint}10` }}>{state.label}</span>
                <span className="num" style={{ fontSize: 9, color: COLORS.faint }}>next {c.due}</span>
                <button onClick={() => setOpenId(open ? null : c.id)} style={{ padding: "2px 4px", borderRadius: 5, cursor: "pointer", background: "transparent", border: "none", color: COLORS.faint, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s ease-out" }}><ChevronRight size={13} /></button>
                <Trash2 size={13} color={COLORS.faint} style={{ cursor: "pointer" }} onClick={() => removeCard(c.id)} />
              </div>
              {open && (
                <div style={{ padding: "10px 4px 12px 21px", borderBottom: `1px dashed ${COLORS.border}` }}>
                  <div className="sys" style={{ fontSize: 7.5, letterSpacing: "0.2em", color: COLORS.dim, marginBottom: 8 }}>REVIEW LOG — LAST {Math.min(14, (c.log || []).length) || 0} GRADES</div>
                  <div style={{ display: "flex", gap: 4, alignItems: "flex-end", minHeight: 26 }}>
                    {(c.log || []).slice(-14).map((e, i) => (
                      <div key={i} title={`${e.d} · grade ${["fail", "hard", "good", "easy"][e.g] || e.g}`} style={{ flex: 1, maxWidth: 22, height: `${Math.max(4, (e.iv || 1) * 1.6)}px`, maxHeight: 26, borderRadius: 2, background: [COLORS.danger, COLORS.warn, COLORS.done, COLORS.accentFocus][e.g] || COLORS.faint, opacity: 0.85 }} />
                    ))}
                    {!(c.log && c.log.length) && <span style={{ fontSize: 11, color: COLORS.faint }}>No grades yet — this card is waiting for its first review.</span>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", fontSize: 10, color: COLORS.faint, marginTop: 8, lineHeight: 1.8 }}>
                    <span>Current ease {(c.ease || 2.5).toFixed(2)} · interval {(c.interval || 0)}d · reps {(c.reps || 0)} · last reviewed {c.lastReviewed || "never"}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function GradeBtn({ label, hot, tint, next, onGrade }) {
  return (
    <button onClick={onGrade} style={{
      padding: "9px 6px", borderRadius: RADIUS.control, cursor: "pointer", border: `1px solid ${tint}44`,
      background: `${tint}12`, color: tint, fontFamily: FONTS.mono, textAlign: "center", transition: "filter 0.14s ease-out",
    }}>
      <div className="sys" style={{ fontSize: 7, opacity: 0.6, letterSpacing: "0.14em", marginBottom: 3 }}>{hot}</div>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 9.5, opacity: 0.75, marginTop: 2, letterSpacing: "0.06em" }}>{next == null ? "—" : next >= 30 ? `${Math.round(next / 30)} mo` : `${next} d`}</div>
    </button>
  );
}

// ---------------- TESTS / ANALYZE ----------------
// Every number on this panel is derived from the logged mocks array at
// render time — nothing is stored as a cached stat, nothing is decorative.
function Mocks({ mocks, setMocks, profile }) {
  const [name, setName] = useState("");
  const [max, setMax] = useState(300);
  const [total, setTotal] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [subjectScores, setSubjectScores] = useState(profile.subjects.map(s => ({ subject: s, obtained: "", max: "" })));

  // Numeric fields reject non-numeric keystrokes at the source.
  const cleanNum = (v) => String(v).replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1").slice(0, 12);

  // Chronological series = log order, defensively sorted by date so old
  // exports or hand-edited JSON can't scramble the trajectory.
  const chrono = mocks
    .map((m, i) => ({ m, i }))
    .sort((a, b) => (a.m.date < b.m.date ? -1 : a.m.date > b.m.date ? 1 : a.i - b.i))
    .map(x => x.m);

  const pctOf = (m) => (Number(m.max) > 0 && isFinite(Number(m.total)) ? Math.min(100, (Number(m.total) / Number(m.max)) * 100) : null);

  const pcts = chrono.map(pctOf);

  const tests = mocks.length;
  const validPcts = pcts.filter(p => p !== null);
  const avg = validPcts.length ? Math.round(validPcts.reduce((a, b) => a + b, 0) / validPcts.length) : 0;
  const best = validPcts.length ? Math.round(Math.max(...validPcts)) : 0;
  const trend = tests >= 2 && pcts[pcts.length - 1] !== null && pcts[pcts.length - 2] !== null
    ? Math.round(pcts[pcts.length - 1]) - Math.round(pcts[pcts.length - 2]) : null;
  const trendTint = trend === null ? COLORS.faint : trend > 0 ? COLORS.done : trend < 0 ? hexToRgba(COLORS.danger, 0.85) : COLORS.faint;

  // Subject averages use ONLY the tests where that subject was logged, so a
  // mock without subject marks never drags the average down as a 0.
  const subjectAvg = profile.subjects.map(sub => {
    // Both fields must be real numbers — a legacy mock with a max but no
    // obtained score must not count as a 0%.
    const rows = mocks.map(m => (m.subjectScores || []).find(s => s.subject === sub))
      .filter(s => s && s.obtained !== "" && s.obtained != null && Number(s.obtained) > 0 && Number(s.max) > 0);
    const pct = rows.length
      ? Math.round(rows.reduce((a, s) => a + (Number(s.obtained) / Number(s.max)) * 100, 0) / rows.length)
      : null;
    return { subject: sub, pct };
  });

  // Trajectory = actual scored percentages, in log order.
  const trajectory = chrono.map((m, i) => ({
    label: (m.name || "Mock").replace(/^(.*?)\s.*$/, "$1"),
    fullName: m.name || `Mock ${i + 1}`,
    score: pctOf(m) === null ? 0 : Math.round(pctOf(m)),
  }));

  // ---- form validation (computed live so the state machine can't lie) ----
  const totalNum = total.trim() !== "" ? parseFloat(total) : NaN;
  const maxNum = max !== "" ? parseFloat(max) : NaN;
  const subErrors = subjectScores.map(s => {
    const o = s.obtained.trim() !== "" ? parseFloat(s.obtained) : null;
    const mx = s.max.trim() !== "" ? parseFloat(s.max) : null;
    if (o !== null && mx === null) return "Max required";
    if (o !== null && mx !== null && o > mx) return "Can't exceed max";
    return null;
  });
  const subjectWarning = (() => {
    const filled = subjectScores.filter(s => s.max.trim() !== "");
    if (filled.length !== profile.subjects.length) return null;
    const sum = filled.reduce((a, s) => a + Number(s.max), 0);
    if (filled.length > 0 && !isNaN(maxNum) && Math.round(sum) !== Math.round(maxNum)) {
      return `Subject max totals ${Math.round(sum)}, doesn't match Total max ${Math.round(maxNum)}`;
    }
    return null;
  })();

  const addMock = () => {
    setAttempted(true);
    const nameErr = !name.trim();
    const totalErr = total.trim() === "" || !isFinite(totalNum);
    const maxErr = max === "" || !isFinite(maxNum) || maxNum <= 0;
    const totalVsMax = isFinite(totalNum) && isFinite(maxNum) && totalNum > maxNum;
    const subErr = subErrors.some(Boolean);
    if (nameErr || totalErr || maxErr || totalVsMax || subErr) return;

    setMocks(prev => [...prev, {
      id: uid(),
      date: todayStr(),
      name: name.trim(),
      total: totalNum,
      max: maxNum,
      // only subjects with both fields filled are stored — a blank subject
      // slot stays out of subjectScores so averages never see a phantom 0
      subjectScores: subjectScores
        .filter(s => s.obtained.trim() !== "" && s.max.trim() !== "")
        .map(s => ({ subject: s.subject, obtained: Number(s.obtained) || 0, max: Number(s.max) || 0 })),
    }]);
    setName(""); setTotal(""); setMax(300);
    setSubjectScores(profile.subjects.map(s => ({ subject: s, obtained: "", max: "" })));
    setAttempted(false);
    setTimeout(() => document.getElementById("mock-name")?.focus(), 0);
  };
  const removeMock = (id) => {
    if (window.confirm("Delete this mock test record? The stats on this page recompute instantly.")) {
      setMocks(prev => prev.filter(m => m.id !== id));
    }
  };

  const historyRows = chrono.map((m, i) => {
    const p = pcts[i];
    const prev = i > 0 ? pcts[i - 1] : null;
    return {
      m,
      pct: p === null ? null : Math.round(p),
      delta: p !== null && prev !== null ? Math.round(p) - Math.round(prev) : null,
    };
  }).reverse();
  const visibleRows = showAll ? historyRows : historyRows.slice(0, 10);

  const accentBtn = { background: hexToRgba(COLORS.accentFocus, 0.14), border: `1px solid ${hexToRgba(COLORS.accentFocus, 0.45)}`, color: COLORS.accentFocus };

  const TrendTip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const p = payload[0].payload;
    return (
      <div style={{ background: COLORS.glassFillStrong, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "6px 10px", boxShadow: elev("e2") }}>
        <div style={{ fontSize: 11, color: COLORS.dim }}>{p.fullName}</div>
        <div className="num" style={{ fontSize: 13, color: COLORS.text, marginTop: 2 }}>{p.score}%</div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHead
        title="Tests"
        lead="Your mock-test record — scores, subject breakdown and the trajectory they're carving. Every number here is from a test you actually logged."
        right={(
          <div className="num" style={{ fontSize: 11, letterSpacing: "0.06em", color: COLORS.faint, marginTop: 26 }}>
            {mocks.length} LOGGED · AVG {avg}%
          </div>
        )}
      />

      <div className="lg-tests-hero">
        <div className="lg-tests-score"><div className="sys">AVERAGE SCORE</div><div className="lg-tests-score-number">{avg}<span>%</span></div><div className="lg-tests-track"><span style={{ width: `${avg}%` }} /></div><div className="t-caption">{mocks.length ? `${mocks.length} recorded test${mocks.length === 1 ? "" : "s"}` : "Your first score starts the line."}</div></div>
        <div className="lg-tests-stat"><span className="sys">BEST SCORE</span><strong className="num">{best}%</strong><span>{best ? "personal ceiling" : "waiting for a result"}</span></div>
        <div className="lg-tests-stat"><span className="sys">RECENT TREND</span><strong className="num" style={{ color: trend === null ? COLORS.faint : trendTint }}>{trend === null ? "—" : `${trend >= 0 ? "+" : ""}${trend}%`}</strong><span>{trend === null ? "needs 2 tests" : trend > 0 ? "vs previous test" : trend < 0 ? "vs previous test" : "no change"}</span></div>
        <div className="lg-tests-stat"><span className="sys">TESTS TAKEN</span><strong className="num">{mocks.length}</strong><span>logged attempts</span></div>
      </div>

      <Card title="Performance trajectory">
        {mocks.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 4px 6px", flexWrap: "wrap" }}>
            <EmptyArt variant="track" width={150} height={72} />
            <div style={{ fontSize: 12, color: COLORS.faint, lineHeight: 1.6, maxWidth: 340 }}>
              No test history yet.
              <div style={{ color: COLORS.dim, fontSize: 11.5, marginTop: 3 }}>Log your first mock to start building your performance trajectory — every score after that plots here.</div>
              <div style={{ marginTop: 10 }}>
                <Btn variant="ghost" style={accentBtn} onClick={() => document.getElementById("mock-log")?.scrollIntoView({ behavior: "smooth", block: "center" })}><Plus size={14} /> Log your first test</Btn>
              </div>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={trajectory} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fill: COLORS.faint, fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={28} />
              <YAxis tick={{ fill: COLORS.faint, fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} width={42} />
              <Tooltip content={<TrendTip />} />
              <Line type="monotone" dataKey="score" stroke={COLORS.ink} strokeWidth={2} dot={{ r: 3, fill: COLORS.ink, strokeWidth: 0 }} activeDot={{ r: 5, fill: COLORS.ink, stroke: COLORS.glassFillStrong, strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card title="Subject-wise average">
        {mocks.length === 0 ? (
          <div style={{ fontSize: 12, color: COLORS.faint, padding: "10px 4px 14px", lineHeight: 1.6 }}>
            No subject data yet — once tests are logged, each subject's average will show here as its own bar.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {subjectAvg.map(s => (
              <div key={s.subject}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: COLORS.text }}>{s.subject}</span>
                  <span className="num" style={{ fontSize: 13, color: s.pct === null ? COLORS.faint : COLORS.text }}>{s.pct === null ? "—" : `${s.pct}%`}</span>
                </div>
                <div className="lg-progress" style={{ height: 6 }}>
                  <div className="lg-progress-fill" style={{ width: s.pct === null ? "0%" : `${Math.min(100, s.pct)}%`, "--lg-w": `${s.pct === null ? 0 : Math.min(100, s.pct)}%`, height: "100%", borderRadius: 3 }} />
                </div>
              </div>
            ))}
            {subjectAvg.every(s => s.pct === null) && (
              <div style={{ fontSize: 11.5, color: COLORS.faint, lineHeight: 1.6 }}>
                None of your tests logged subject marks yet — log marks next to any subject to see its average here.
              </div>
            )}
          </div>
        )}
      </Card>

      <Card id="mock-log" title="Log a mock test">
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, marginBottom: 4 }}>
          <div>
            <Input id="mock-name" placeholder="Test name (e.g. FT-12)" value={name} onChange={e => setName(e.target.value)} />
            {attempted && !name.trim() && <div style={{ fontSize: 11, color: hexToRgba(COLORS.danger, 0.85), marginTop: 4 }}>Enter a test name</div>}
          </div>
          <div>
            <Input placeholder="Total scored" type="number" inputMode="decimal" value={total} onChange={e => setTotal(cleanNum(e.target.value))} />
            {attempted && (total.trim() === "" || !isFinite(totalNum)) && <div style={{ fontSize: 11, color: hexToRgba(COLORS.danger, 0.85), marginTop: 4 }}>Required</div>}
            {attempted && isFinite(totalNum) && isFinite(maxNum) && totalNum > maxNum && <div style={{ fontSize: 11, color: hexToRgba(COLORS.danger, 0.85), marginTop: 4 }}>Can't exceed max</div>}
          </div>
          <div>
            <Input placeholder="Max marks" type="number" inputMode="decimal" value={max} onChange={e => setMax(cleanNum(e.target.value))} />
            {attempted && (max === "" || !isFinite(maxNum) || maxNum <= 0) && <div style={{ fontSize: 11, color: hexToRgba(COLORS.danger, 0.85), marginTop: 4 }}>Required</div>}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${profile.subjects.length}, 1fr)`, gap: 8, margin: "10px 0 2px" }}>
          {subjectScores.map((s, i) => (
            <div key={s.subject} style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: COLORS.faint, margin: "0 2px 3px" }}>{s.subject}</div>
              <div style={{ display: "flex", gap: 4, width: "100%" }}>
                <Input placeholder="obtained" type="number" inputMode="decimal" value={s.obtained} onChange={e => setSubjectScores(prev => prev.map((p, j) => j === i ? { ...p, obtained: cleanNum(e.target.value) } : p))} />
                <Input placeholder="max" type="number" inputMode="decimal" value={s.max} onChange={e => setSubjectScores(prev => prev.map((p, j) => j === i ? { ...p, max: cleanNum(e.target.value) } : p))} />
              </div>
              {attempted && subErrors[i] && <div style={{ fontSize: 11, color: hexToRgba(COLORS.danger, 0.85), marginTop: 4 }}>{subErrors[i]}</div>}
            </div>
          ))}
        </div>

        {subjectWarning && <div style={{ fontSize: 11, color: COLORS.warn, marginTop: 10, lineHeight: 1.5 }}>{subjectWarning} — logging anyway.</div>}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 14 }}>
          <Btn variant="ghost" style={accentBtn} onClick={addMock}><Plus size={14} /> Log mock</Btn>
          <div style={{ fontSize: 11, color: COLORS.faint }}>Optional subject rows: fill both obtained + max to track a subject.</div>
        </div>
      </Card>

      <Card title="Test history">
        {mocks.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: SPACE.sm, padding: "8px 0 4px" }}>
            <EmptyArt variant="ring" width={116} height={64} />
            <div style={{ fontSize: 12, color: COLORS.faint }}>No mocks logged yet — log your first test above.</div>
          </div>
        ) : (
          <>
            {visibleRows.map(r => (
              <div key={r.m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 4px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13 }}>
                <div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.m.name} <span style={{ color: COLORS.faint, fontSize: 11 }}>· {r.m.date}</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <div className="num" style={{ fontSize: 12, color: COLORS.text }}>{r.pct}%</div>
                  {r.delta !== null && r.delta !== 0 && (
                    <div className="num" style={{ fontSize: 11, color: r.delta > 0 ? COLORS.done : hexToRgba(COLORS.danger, 0.85) }}>{r.delta > 0 ? "+" : ""}{r.delta}%</div>
                  )}
                  <Trash2 size={13} color={COLORS.faint} style={{ cursor: "pointer" }} onClick={() => removeMock(r.m.id)} />
                </div>
              </div>
            ))}
          </>
        )}
      </Card>
    </div>
  );
}

// ---------------- ERROR LOG ----------------
const ERROR_TYPES = ["Conceptual", "Calculative", "Silly mistake", "Formula", "Misread question"];
const ERROR_COLORS = { Conceptual: "#FF6B6B", Calculative: "#FF8A65", "Silly mistake": "#FFB26B", Formula: "#5BE6A8", "Misread question": "#7C9BFF" };

function ErrorLog({ errors, setErrors, mocks }) {
  const [topic, setTopic] = useState("");
  const [type, setType] = useState(ERROR_TYPES[0]);
  const [desc, setDesc] = useState("");
  const [linkedMock, setLinkedMock] = useState("");

  const add = () => {
    if (!topic.trim()) return;
    setErrors(prev => [...prev, { id: uid(), date: todayStr(), topic: topic.trim(), type, description: desc.trim(), mockId: linkedMock || null }]);
    setTopic(""); setDesc("");
  };
  const remove = (id) => { if (window.confirm("Delete this logged mistake?")) setErrors(prev => prev.filter(e => e.id !== id)); };

  const profileData = ERROR_TYPES.map(t => ({ name: t, value: errors.filter(e => e.type === t).length })).filter(d => d.value > 0);

  // Ledger rollups — counts, kinds and recurrences derived from the stored
  // mistake rows themselves, nothing invented.
  const typeCounts = {};
  errors.forEach(e => { typeCounts[e.type] = (typeCounts[e.type] || 0) + 1; });
  const leadingType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
  const topicCounts = {};
  errors.forEach(e => { if (e.topic) topicCounts[e.topic] = (topicCounts[e.topic] || 0) + 1; });
  const recurring = Object.entries(topicCounts).filter(([, c]) => c >= 2);
  const linkedN = errors.filter(e => e.mockId).length;
  const mockName = (id) => { const m = mocks.find(x => x.id === id); return m ? m.name : null; };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHead
        title="Mistakes"
        lead="The mistake ledger — every mark you dropped, typed and dated, so the pattern becomes visible. Review what you log, don't bury it."
        right={(
          <div className="num" style={{ fontSize: 11, letterSpacing: "0.06em", color: COLORS.faint, marginTop: 26 }}>
            {errors.length} LOGGED{leadingType ? ` · MOSTLY ${leadingType[0].toUpperCase()}` : ""}
          </div>
        )}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <MiniStat k="Total logged" v={errors.length} sub={errors.length ? "Across all sessions" : "Nothing recorded yet"} tint={errors.length > 0 ? COLORS.danger : undefined} />
        <MiniStat k="Recurring topics" v={recurring.length} sub={recurring.length ? recurring.slice(0, 2).map(([t]) => t).join(" · ") : "No repeats yet"} tint={recurring.length > 0 ? COLORS.warn : undefined} />
        <MiniStat k="Linked to mocks" v={linkedN} sub={mocks.length ? `${mocks.length} mock${mocks.length === 1 ? "" : "s"} to link against` : "No mocks logged yet"} />
        <MiniStat k="Most common kind" v={leadingType ? leadingType[0] : "—"} sub={leadingType ? `${leadingType[1]} instance${leadingType[1] === 1 ? "" : "s"}` : "Log one to find out"} />
      </div>

      <div className="lg-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card id="mistake-log" title="Log a mistake">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Input placeholder="Topic / chapter" value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
            <SelectBox value={type} onChange={setType} ariaLabel="Mistake type" options={ERROR_TYPES.map(t => ({ value: t, label: t }))} style={{ width: "100%" }} />
            <SelectBox value={linkedMock} onChange={setLinkedMock} ariaLabel="Linked mock"
              options={[{ value: "", label: "No linked mock" }].concat(mocks.map(m => ({ value: m.id, label: m.name })))} style={{ width: "100%" }} />
            <textarea placeholder="What went wrong, and how to fix it next time…" value={desc} onChange={e => setDesc(e.target.value)} rows={3} style={{ background: COLORS.glassFill, border: `1px solid ${COLORS.border}`, borderRadius: 7, padding: "9px 11px", color: COLORS.text, fontSize: 13, fontFamily: FONTS.body, resize: "vertical" }} />
            <Btn variant="ink" onClick={add} style={{ justifyContent: "center" }}><Plus size={14} /> Log mistake</Btn>
          </div>
        </Card>

        <Card title="Mistake profile">
          {profileData.length === 0 ? (
            <div style={{ fontSize: 12, color: COLORS.faint, lineHeight: 1.6 }}>
              Log your first mistake to see your profile — the chart breaks down which kind of mark drops the most.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={profileData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                  {profileData.map((d, i) => <Cell key={i} fill={hexToRgba(ERROR_COLORS[d.name], 0.3)} stroke={ERROR_COLORS[d.name]} strokeWidth={1.2} />)}
                </Pie>
                <Tooltip contentStyle={{ background: COLORS.glassFillStrong, border: `1px solid ${COLORS.border}`, fontSize: 12, borderRadius: 6 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card title={`Mistake ledger${errors.length ? ` — ${errors.length}` : ""}`} right={<span className="sys" style={{ fontSize: 8.5, letterSpacing: "0.16em" }}>TOPIC · KIND · DATE · SOURCE</span>}>
        {errors.length === 0 ? (
          <EmptyState icon={AlertTriangle} message="No mistakes logged yet. Log mistakes from your tests and study sessions to identify patterns — the ledger stays quiet until you feed it." action={
            <Btn variant="ink" onClick={() => document.getElementById("mistake-log")?.scrollIntoView({ behavior: "smooth", block: "center" })}><Plus size={14} /> Log your first mistake</Btn>
          } />
        ) : (
          errors.slice().reverse().map(e => {
            const src = mockName(e.mockId);
            return (
              <div key={e.id} className="lg-row" style={{ padding: "11px 4px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: `${ERROR_COLORS[e.type]}22`, color: ERROR_COLORS[e.type], flexShrink: 0, marginTop: 2, fontWeight: 600 }}>{e.type}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, color: COLORS.text }}>{e.topic}</span>
                    {recurring.some(([t]) => t === e.topic) && (
                      <span title={`Shown ${topicCounts[e.topic]} times in the ledger`} style={{ fontSize: 9.5, letterSpacing: "0.1em", color: COLORS.warn, background: `${COLORS.warn}1c`, border: `1px solid ${COLORS.warn}44`, borderRadius: 4, padding: "1px 6px" }}>
                        ×{topicCounts[e.topic]} RECURRING
                      </span>
                    )}
                    <span className="num" style={{ fontSize: 9, color: COLORS.faint, letterSpacing: "0.08em" }}>{e.date}</span>
                    {src && (
                      <span style={{ fontSize: 9.5, color: COLORS.ink, background: `${COLORS.ink}14`, border: `1px solid ${COLORS.ink}33`, borderRadius: 4, padding: "1px 6px" }}>
                        {src}
                      </span>
                    )}
                  </div>
                  {e.description && <div style={{ fontSize: 11.5, color: COLORS.dim, marginTop: 4, lineHeight: 1.5 }}>{e.description}</div>}
                </div>
                <Trash2 size={13} color={COLORS.faint} style={{ cursor: "pointer", flexShrink: 0, marginTop: 4 }} onClick={() => remove(e.id)} />
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}

// ---------------- PEERS ----------------
function Peers({ profile, peers, setPeers, peerData, sessions, groupDefs, groupRoster, onCreateGroup, onJoinGroup, onLeaveGroup }) {
  const [codeInput, setCodeInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [copiedGroup, setCopiedGroup] = useState("");
  const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [joiningGroup, setJoiningGroup] = useState(false);

  const handleCreateGroup = async () => {
    if (!groupName.trim() || creatingGroup) return;
    setCreatingGroup(true);
    const code = genCode();
    const result = await onCreateGroup(code, groupName.trim());
    setCreatingGroup(false);
    if (result) setGroupName("");
  };

  const handleJoinGroup = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code || joiningGroup) return;
    setJoiningGroup(true);
    setJoinError("");
    const result = await onJoinGroup(code);
    setJoiningGroup(false);
    if (result) setJoinCode("");
    else setJoinError("demo mode has no database account");
  };

  const addPeer = () => {
    const c = codeInput.trim().toUpperCase();
    if (!c || c === profile.code || peers.includes(c)) return;
    setPeers(prev => [...prev, c]);
    setCodeInput("");
  };
  const removePeer = (c) => setPeers(prev => prev.filter(p => p !== c));

  const copyText = (text, done) => { navigator.clipboard?.writeText(text); done(true); setTimeout(() => done(false), 1500); };

  const todayMin = sessions.filter(s => s.date === todayStr()).reduce((a, s) => a + s.minutes, 0);
  const board = [
    { code: profile.code, name: `${profile.name} (you)`, minutes: Math.round(todayMin), streak: computeStreak(sessions), stale: false },
    ...peers.map(c => {
      const d = peerData[c];
      if (!d) return { code: c, name: "Pending sync…", minutes: 0, streak: 0, stale: false };
      // Entries are published at most when the peer opens the app; after
      // midnight their row still holds yesterday's numbers. Report 0 for
      // a peer who hasn't synced today rather than showing yesterday's
      // minutes as if they were today's, and flag it so the board reads
      // honestly.
      const stale = d.date !== todayStr();
      return { code: c, name: d.name, minutes: stale ? 0 : (d.minutes || 0), streak: d.streak || 0, stale };
    }),
  ].sort((a, b) => b.minutes - a.minutes);

  // Ink-fill bars read relative to today's leader, not a fabricated "goal" —
  // there's no target-minutes field in the data model, so the honest
  // denominator is board[0].minutes (0 when nobody's logged anything yet).
  const leaderMinutes = board[0]?.minutes || 0;

  // Derives a two-letter stamp from a display name for the rank avatar.
  // Names can carry a "(you)" suffix or be the placeholder "Pending sync…" —
  // stripped/first-two-words logic keeps both cases readable instead of
  // producing junk like "A(" from the paren.
  const initialsOf = (name) => {
    const clean = name.replace(/\(.*?\)/g, "").trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
  };

  const seatName = (name) => name.replace(/\s*\(you\)\s*$/, "");
  const isSelf = (p) => p.code === profile.code;
  const myStreak = computeStreak(sessions);
  const myRank = board.findIndex(p => isSelf(p)) + 1;
  const syncedPeers = peers.filter(c => peerData[c] && peerData[c].date === todayStr()).length;
  const combinedToday = board.reduce((a, p) => a + p.minutes, 0);
  const podium = board.filter(p => p.minutes > 0).slice(0, 3);
  const streakLeaders = board.filter(p => p.streak > 0).sort((a, b) => b.streak - a.streak).slice(0, 6);
  const shareLine = `Focused ${fmtMin(todayMin)} today${myStreak > 0 ? ` · ${myStreak}-day streak` : ""} in Ledger${combinedToday > 0 ? ` — our circle logged ${fmtMin(combinedToday)} combined.` : ". Join me."}`;
  const groups = Object.values(groupDefs);

  const heroLabel = {
    fontSize: 9,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: COLORS.faint,
    fontWeight: 600,
  };

  return (
    <div style={stack(SPACE.xl)}>
      {groups.length === 0 && <div><h2 className="t-heading-md" style={{ margin: 0, color: COLORS.text }}>Welcome to study circles</h2><p style={{ color: COLORS.faint }}>You haven't joined a study circle yet.</p><p style={{ color: COLORS.faint }}>You're in demo mode — sign in to create or join study circles.</p><div style={{ display: "flex", gap: 8 }}><Btn variant="ink" onClick={() => document.getElementById("circle-create-name")?.focus()}>Create study circle</Btn><Btn variant="ghost" onClick={() => document.getElementById("circle-join-code")?.focus()}>Join with code</Btn></div></div>}
      {/* HERO — your identity + today's live standing, all real numbers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <div style={{ borderRadius: RADIUS.modal, position: "relative", overflow: "hidden", padding: "24px 26px", border: `1px solid ${COLORS.border}`, background: `radial-gradient(620px 200px at 10% -10%, ${hexToRgba(COLORS.ink, 0.1)}, transparent 66%), linear-gradient(170deg, ${hexToRgba(COLORS.panel, 0.82)}, ${hexToRgba(COLORS.panel2, 0.66)})`, backdropFilter: `blur(${COLORS.glassBlur}) saturate(1.16)`, WebkitBackdropFilter: `blur(${COLORS.glassBlur}) saturate(1.16)`, boxShadow: elev("e3") }}>
          <div style={{ position: "absolute", right: -42, top: -46, width: 210, height: 210, borderRadius: "50%", background: hexToRgba(COLORS.ink, 0.05) }} />
          <div style={{ position: "absolute", right: 34, bottom: -64, width: 150, height: 150, borderRadius: "50%", background: hexToRgba(COLORS.ink, 0.04) }} />
          <div style={{ ...row(6), marginBottom: 14 }}>
            <Radio size={13} color={COLORS.ink} />
            <span style={{ ...heroLabel, color: COLORS.ink }}>Your circle · live</span>
            <span style={{ marginLeft: "auto", ...row(5) }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS.done, boxShadow: `0 0 8px ${COLORS.done}` }} />
              <span style={{ fontSize: 10, color: COLORS.dim }}>{syncedPeers} of {peers.length} peers synced</span>
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...heroLabel, marginBottom: 3 }}>Your identity code</div>
              <div style={{ ...row(8), marginTop: 2, flexWrap: "wrap" }}>
                <span style={{ fontFamily: FONTS.mono, fontSize: 23, letterSpacing: "0.16em", color: COLORS.text, fontWeight: 600 }}>{profile.code}</span>
                <Btn variant="ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => copyText(profile.code, setCopied)}><Copy size={11} /> {copied ? "Copied" : "Copy"}</Btn>
              </div>
              <div style={{ fontSize: 11, color: COLORS.faint, marginTop: 8, lineHeight: 1.5, maxWidth: 300 }}>
                Share it with a study partner. Your name, today's focus minutes and streak live in a shared table anyone with the code can read — nothing else.
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={heroLabel}>Focused today</div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 32, fontWeight: 700, color: COLORS.ink, lineHeight: 1.05, letterSpacing: "-0.02em", textShadow: `0 4px 18px ${hexToRgba(COLORS.ink, 0.35)}` }}>{fmtMin(todayMin)}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 18, paddingTop: 14, borderTop: `1px solid ${COLORS.border}` }}>
            {[
              { label: "Streak", value: myStreak > 0 ? `${myStreak}d` : "Start today" },
              { label: "Your rank", value: myRank > 0 ? `#${myRank}` : "—" },
              { label: "Circle total", value: fmtMin(combinedToday) },
            ].map(s => (
              <div key={s.label} style={{ minWidth: 0 }}>
                <div style={heroLabel}>{s.label}</div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 15, fontWeight: 600, color: COLORS.text, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg-card" style={{ borderRadius: RADIUS.modal, border: `1px solid ${COLORS.border}`, padding: "24px 26px", ...stack(14), justifyContent: "center" }}>
          <div style={{ ...row(8) }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: COLORS.panel2, border: `1px solid ${COLORS.border}`, ...center() }}>
              <ShieldCheck size={16} color={COLORS.done} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>Your code is your room key</div>
              <div style={{ fontSize: 11, color: COLORS.faint, marginTop: 1 }}>No friend requests, no strangers — only codes you hand out.</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: COLORS.dim, lineHeight: 1.65 }}>
            Everything in this section is built from real records: your focus sessions, peers' published leaderboard rows (name, today's minutes, streak), and the study groups you're actually in. If a peer hasn't opened Ledger today, the board says so instead of guessing.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", ...row(8) }}>
            <Btn variant="ghost" onClick={() => copyText(shareLine, setCopiedShare)}><Send size={12} /> {copiedShare ? "Copied!" : "Copy a status to share"}</Btn>
            <div style={{ flex: 1, minWidth: 180, fontSize: 10.5, color: COLORS.faint, fontFamily: FONTS.mono, background: COLORS.panel2, border: `1px dashed ${COLORS.border}`, borderRadius: RADIUS.control, padding: "6px 9px", alignSelf: "stretch", display: "flex", alignItems: "center" }}>{shareLine}</div>
          </div>
        </div>
      </div>

      {/* STAT STRIP — derived only from real sessions + shared rows */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
        <Stat label="Focused today" value={fmtMin(todayMin)} sub="your minutes logged" />
        <Stat label="Streak" value={myStreak > 0 ? `${myStreak}d` : "0d"} sub={myStreak > 0 ? "consecutive days" : "log today to start one"} />
        <Stat label="Circle" value={peers.length} sub={syncedPeers > 0 ? `${syncedPeers} synced today` : "no peers added yet"} />
        <Stat label="Together today" value={fmtMin(combinedToday)} sub={combinedToday > 0 ? "you + peers combined" : "be the first to log"} accent={combinedToday > 0 ? COLORS.ink : undefined} />
      </div>

      {/* LEADERBOARD — your circle's today's real numbers, podium + full standings */}
      <Card title="Your circle's today leaderboard" right={<div style={{ fontSize: 10, color: COLORS.faint, ...row(5) }}><TrendingUp size={11} color={COLORS.ink} /> Resets at midnight</div>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 16 }}>
          {[0, 1, 2].map(i => {
            const p = podium[i];
            if (!p) {
              return (
                <div key={i} style={{ borderRadius: RADIUS.card, border: `1.5px dashed ${COLORS.border}`, padding: "14px", ...center(), flexDirection: "column", gap: 6, textAlign: "center", minHeight: 132 }}>
                  <div style={{ ...center(), width: 30, height: 30, borderRadius: "50%", border: `1.5px dashed ${COLORS.faint}`, color: COLORS.faint, fontFamily: FONTS.mono, fontSize: 11 }}>{i + 1}</div>
                  <div style={{ fontSize: 11, color: COLORS.faint, maxWidth: 170, lineHeight: 1.5 }}>{i === 0 ? "Nobody has logged focus today — take the crown." : "Open slot — invite a peer to race for it."}</div>
                </div>
              );
            }
            const isTop = i === 0;
            const medal = RANK_COLORS[i];
            return (
              <div key={p.code} style={{ borderRadius: RADIUS.card, border: `1px solid ${hexToRgba(medal, 0.55)}`, background: `linear-gradient(160deg, ${hexToRgba(medal, 0.14)}, transparent 55%)`, padding: "14px", position: "relative", minHeight: 132 }}>
                {i === 0 && <div style={{ position: "absolute", top: 10, right: 10 }}><Crown size={15} color={medal} /></div>}
                <div style={{ ...row(8) }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", ...center(), fontFamily: FONTS.display, fontWeight: 700, fontSize: 13, color: medal, border: `1.5px solid ${medal}`, boxShadow: `0 0 0 3px ${hexToRgba(medal, 0.14)}` }}>{i + 1}</div>
                  <div style={{ width: 30, height: 30, borderRadius: 8, ...center(), fontFamily: FONTS.display, fontWeight: 600, fontSize: 12, color: COLORS.bg, background: isSelf(p) ? `linear-gradient(150deg, ${COLORS.ink}, ${darken(COLORS.ink, 22)})` : `linear-gradient(150deg, ${medal}, ${darken(medal, 22)})` }}>{initialsOf(p.name)}</div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {seatName(p.name)}
                    {isSelf(p) && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: COLORS.ink, marginLeft: 6 }}>YOU</span>}
                  </div>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 10.5, color: COLORS.faint, marginTop: 2, ...row(5) }}>
                    {p.streak > 0 && <><Flame size={10} color={COLORS.warn} /> {p.streak}d streak</>}
                    {p.stale && <span>{p.streak > 0 ? " · " : ""}not synced today</span>}
                  </div>
                </div>
                <div style={{ position: "absolute", bottom: 12, right: 14, textAlign: "right" }}>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 17, fontWeight: 700, color: isTop ? medal : COLORS.text }}>{fmtMin(p.minutes)}</div>
                  <div style={{ fontSize: 8.5, letterSpacing: "0.1em", color: COLORS.faint }}>MIN</div>
                </div>
                <div style={{ position: "absolute", left: 14, right: 14, bottom: 18 }}>
                  <div style={{ height: 4, background: hexToRgba(COLORS.text, 0.1), borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, Math.round((p.minutes / Math.max(1, leaderMinutes)) * 100))}%`, background: `linear-gradient(90deg, ${darken(medal, 25)}, ${medal})`, borderRadius: 3 }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg-card" style={{ borderRadius: RADIUS.card, overflow: "hidden", border: `1px solid ${COLORS.border}` }}>
          {board.map((p, i) => {
            const rank = i + 1;
            const isTop3 = rank <= 3;
            const stampColor = isTop3 ? RANK_COLORS[i] : COLORS.faint;
            const self = isSelf(p);
            const pct = leaderMinutes > 0 ? Math.min(100, Math.round((p.minutes / leaderMinutes) * 100)) : 0;
            return (
              <div
                key={p.code}
                className="lg-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "34px 1fr auto 70px 24px",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderBottom: i < board.length - 1 ? `1px solid ${COLORS.border}` : "none",
                  position: "relative",
                  background: self ? hexToRgba(COLORS.ink, 0.08) : "transparent",
                }}
              >
                {self && (
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: COLORS.ink }} />
                )}
                <div
                  style={{
                    width: 30, height: 30, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: isTop3 ? FONTS.display : FONTS.mono,
                    fontWeight: isTop3 ? 700 : 500,
                    fontSize: isTop3 ? 13 : 11,
                    color: stampColor,
                    border: `1.5px solid ${stampColor}`,
                    boxShadow: isTop3 ? `0 0 0 3px ${hexToRgba(stampColor, 0.12)}` : "none",
                  }}
                >
                  {isTop3 ? rank : `#${rank}`}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div
                    style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: FONTS.display, fontWeight: 600, fontSize: 12, color: COLORS.bg,
                      background: self
                        ? `linear-gradient(150deg, ${COLORS.ink}, ${darken(COLORS.ink, 22)})`
                        : `linear-gradient(150deg, ${COLORS.faint}, ${darken(COLORS.faint, 20)})`,
                    }}
                  >
                    {initialsOf(p.name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {seatName(p.name)}
                    </div>
                    <div style={{ fontFamily: FONTS.mono, fontSize: 10.5, color: COLORS.faint, display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
                      {p.streak > 0 && <><Flame size={10} color={COLORS.warn} /> {p.streak}d</>}
                      {p.stale && <span style={{ marginLeft: p.streak > 0 ? 6 : 0 }}>not synced today</span>}
                    </div>
                  </div>
                </div>
                <div style={{ width: 96, display: leaderMinutes > 0 ? "block" : "none" }}>
                  <div style={{ height: 4, background: COLORS.border, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${darken(COLORS.ink, 30)}, ${COLORS.ink})`, borderRadius: 3 }} />
                  </div>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 9, color: COLORS.faint, marginTop: 3 }}>{pct}% of leader</div>
                </div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 14, fontWeight: 600, color: COLORS.text, textAlign: "right" }}>
                  {fmtMin(p.minutes)}
                </div>
                {!self ? (
                  <Trash2 size={13} color={COLORS.faint} style={{ cursor: "pointer" }} onClick={() => removePeer(p.code)} />
                ) : <span />}
              </div>
            );
          })}
        </div>
      </Card>

      {/* STUDY GROUPS — real rooms/group_members tables, each with its own
          mini leaderboard derived from the members' published rows. The
          board is the hub: your circle is one of the rooms you race in. */}
      <Card title="Study groups" right={<div style={{ fontSize: 10, color: COLORS.faint, ...row(5) }}><Users size={11} color={COLORS.ink} /> {groups.length} {groups.length === 1 ? "group" : "groups"}</div>}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <Input id="circle-create-name" placeholder="e.g. JEE Grind" value={groupName} onChange={e => setGroupName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreateGroup()} style={{ flex: 1, minWidth: 170 }} />
          <Btn variant="ink" disabled={creatingGroup} onClick={handleCreateGroup}><Plus size={14} /> Create circle</Btn><Btn variant="ghost" onClick={() => setGroupName("")}>Cancel</Btn>
          <Input id="circle-join-code" placeholder="Join with a 6-character code" value={joinCode} onChange={e => setJoinCode(e.target.value)} onKeyDown={e => e.key === "Enter" && handleJoinGroup()} style={{ flex: 1, minWidth: 190 }} />
          <Btn variant="ghost" disabled={joiningGroup} onClick={handleJoinGroup}>Check</Btn>
        </div>
        {joinError && <div style={{ fontSize: 11, color: COLORS.danger, marginBottom: 10 }}>{joinError}</div>}
        {groups.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: `0 0 ${SPACE.xs}px`, textAlign: "center" }}>
            <EmptyArt variant="grid" width={128} height={72} />
            <div style={{ fontSize: 12, color: COLORS.faint, maxWidth: 340, lineHeight: 1.6 }}>
              No study groups yet. Create one and hand the code to your batchmates — every group gets its own leaderboard.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {groups.map(g => {
              const roster = groupRoster[g.code] || { memberCodes: [], rows: [] };
              const gRows = roster.rows.map(r => {
                const stale = r.date !== todayStr();
                return { code: r.code, name: r.name, minutes: stale ? 0 : (r.minutes || 0), streak: r.streak || 0, stale };
              });
              if (!gRows.some(r => r.code === profile.code)) {
                gRows.push({ code: profile.code, name: profile.name, minutes: todayMin, streak: myStreak, stale: false });
              }
              gRows.sort((a, b) => b.minutes - a.minutes);
              const gTop = gRows.slice(0, 3);
              const youInTop = gTop.some(r => r.code === profile.code);
              const gLeaderMin = gRows[0]?.minutes || 0;
              const avatars = gRows.slice(0, 4);
              return (
                <div key={g.code} className="lg-card" style={{ borderRadius: RADIUS.card, border: `1px solid ${COLORS.border}`, padding: 18, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: COLORS.ink }} />
                  <div style={{ ...between(), marginBottom: 12 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: `radial-gradient(80px 40px at 50% -20%, ${COLORS.inkGlow}, transparent 70%), ${COLORS.panel2}`, border: `1px solid ${hexToRgba(COLORS.ink, 0.4)}`, ...center() }}>
                      <Award size={15} color={COLORS.ink} />
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: COLORS.done, background: hexToRgba(COLORS.done, 0.12), border: `1px solid ${hexToRgba(COLORS.done, 0.3)}`, padding: "3px 7px", borderRadius: RADIUS.badge }}>JOINED</div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, fontFamily: FONTS.display, color: COLORS.text }}>{g.name}</div>
                  <div style={{ ...row(8), marginTop: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.faint, letterSpacing: "0.08em", background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.badge, padding: "3px 8px" }}>{g.code}</span>
                    <button onClick={() => copyText(g.code, (v) => setCopiedGroup(v ? g.code : ""))} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 600, color: COLORS.dim, background: "transparent", border: "none", cursor: "pointer", padding: 3 }}>
                      <Copy size={11} /> {copiedGroup === g.code ? "Copied" : "Copy code"}
                    </button>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${COLORS.border}` }}>
                    <div style={{ ...row(5), fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: COLORS.faint, fontWeight: 600 }}>
                      <TrendingUp size={11} color={COLORS.ink} /> Today's focus
                    </div>
                    <div style={{ ...row(2), alignItems: "center" }}>
                      {avatars.map((m, i) => (
                        <div key={m.code + i} title={seatName(m.name)} style={{ width: 22, height: 22, borderRadius: "50%", ...center(), fontFamily: FONTS.mono, fontSize: 9, fontWeight: 600, color: COLORS.bg, background: m.code === profile.code ? `linear-gradient(150deg, ${COLORS.ink}, ${darken(COLORS.ink, 22)})` : `linear-gradient(150deg, ${COLORS.faint}, ${darken(COLORS.faint, 20)})`, border: `2px solid ${COLORS.panel2}`, boxSizing: "border-box" }}>
                          {initialsOf(m.name)}
                        </div>
                      ))}
                      <span style={{ fontSize: 10.5, color: COLORS.dim, fontWeight: 600, marginLeft: 3 }}>{roster.memberCodes.length}</span>
                    </div>
                  </div>

                  {gRows.some(r => r.minutes > 0) ? (
                    <div style={{ marginTop: 8 }}>
                      {gTop.map((m, i) => {
                        const medal = RANK_COLORS[i];
                        const self = m.code === profile.code;
                        return (
                          <div key={m.code} className="lg-row" style={{ ...row(8), padding: "6px 8px", borderRadius: 6 }}>
                            <span style={{ fontFamily: FONTS.mono, fontSize: 10, fontWeight: i === 0 ? 700 : 600, color: medal, width: 13, textAlign: "center" }}>{i + 1}</span>
                            <span style={{ width: 22, height: 22, borderRadius: 7, ...center(), fontFamily: FONTS.display, fontWeight: 600, fontSize: 10, color: COLORS.bg, background: self ? `linear-gradient(150deg, ${COLORS.ink}, ${darken(COLORS.ink, 22)})` : `linear-gradient(150deg, ${medal}, ${darken(medal, 22)})` }}>{initialsOf(m.name)}</span>
                            <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, color: self ? COLORS.ink : COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {seatName(m.name)}
                            </span>
                            <span style={{ fontFamily: FONTS.mono, fontSize: 11.5, fontWeight: 600, color: COLORS.text }}>{fmtMin(m.minutes)}</span>
                          </div>
                        );
                      })}
                      {!youInTop && (
                        <div className="lg-row" style={{ ...row(8), padding: "6px 8px", borderTop: `1px dashed ${COLORS.border}` }}>
                          <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.faint, width: 13, textAlign: "center" }}>…</span>
                          <span style={{ width: 22, height: 22, borderRadius: 7, ...center(), fontFamily: FONTS.mono, fontWeight: 600, fontSize: 10, color: COLORS.bg, background: `linear-gradient(150deg, ${COLORS.ink}, ${darken(COLORS.ink, 22)})` }}>{initialsOf(profile.name)}</span>
                          <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, color: COLORS.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>you</span>
                          <span style={{ fontFamily: FONTS.mono, fontSize: 11.5, fontWeight: 600, color: COLORS.text }}>{fmtMin(todayMin)}</span>
                        </div>
                      )}
                      <div style={{ height: 3, background: hexToRgba(COLORS.text, 0.1), borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${gLeaderMin > 0 ? 100 : 0}%`, background: `linear-gradient(90deg, ${darken(COLORS.ink, 25)}, ${COLORS.ink})` }} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 0 4px", textAlign: "center" }}>
                      <EmptyArt variant="ring" width={104} height={56} />
                      <div style={{ fontSize: 11, color: COLORS.faint, lineHeight: 1.5 }}>No focus logged in this group today yet.</div>
                    </div>
                  )}

                  <div style={{ ...row(8), marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COLORS.border}` }}>
                    <Btn variant="danger" style={{ padding: "5px 10px", fontSize: 11.5 }} onClick={() => onLeaveGroup(g.code)}>Leave</Btn>
                    <div style={{ fontSize: 10.5, color: COLORS.faint }}>Codes are real room keys — anyone with it can join.</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ fontSize: 11, color: COLORS.faint, marginTop: 14 }}>
          Group boards read only the members' published rows — name, today's focus minutes, and streak. Nothing else about accounts is exposed.
        </div>
      </Card>

      {/* STREAK RAIL — longest real streaks in your circle */}
      <Card title="Streak leaders" right={<div style={{ fontSize: 10, color: COLORS.faint, ...row(5) }}><Flame size={11} color={COLORS.warn} /> longest burns in your circle</div>}>
        {streakLeaders.length === 0 ? (
          <div style={{ fontSize: 12, color: COLORS.faint }}>No streaks yet in your circle — your own run starts the moment you log a second consecutive day.</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {streakLeaders.map((p, i) => (
              <div key={p.code} style={{ ...row(8), padding: "8px 12px", borderRadius: RADIUS.control, background: COLORS.glassFill, border: `1px solid ${COLORS.border}` }}>
                <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: i === 0 ? COLORS.warn : COLORS.faint, fontWeight: 600 }}>#{i + 1}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text }}>{seatName(p.name)}</span>
                <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.warn, fontWeight: 600 }}>{p.streak}d</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* INVITE A PEER — add real codes from the shared table */}
      <Card title="Grow your circle" right={<div style={{ fontSize: 10, color: COLORS.faint }}>peer codes, not friend requests</div>}>
        <div style={{ display: "flex", gap: 8 }}>
           <Input placeholder="Enter a peer code" value={codeInput} onChange={e => setCodeInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addPeer()} />
          <Btn variant="ink" onClick={addPeer}><Plus size={14} /> Add</Btn>
        </div>
        {peers.length > 0 && (
          <div className="lg-card" style={{ marginTop: 12, borderRadius: RADIUS.control, overflow: "hidden", border: `1px solid ${COLORS.border}` }}>
            {peers.map((c, i, arr) => {
              const d = peerData[c];
              return (
                <div key={c} className="lg-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: i < arr.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
                  <Users size={13} color={COLORS.ink} />
                  <span style={{ fontFamily: FONTS.mono, fontSize: 12.5, color: COLORS.text, letterSpacing: "0.06em" }}>{c}</span>
                  <span style={{ flex: 1, fontSize: 11, color: d ? COLORS.dim : COLORS.faint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {d ? `${d.name} · synced ${d.date === todayStr() ? "today" : d.date}` : "pending first sync…"}
                  </span>
                  <Trash2 size={12} color={COLORS.faint} style={{ cursor: "pointer" }} onClick={() => removePeer(c)} />
                </div>
              );
            })}
          </div>
        )}
        <div style={{ fontSize: 11, color: COLORS.faint, marginTop: 10 }}>
          Peers see only what's published to the shared table — name, today's focus minutes, and streak. Nothing else about your account is exposed.
        </div>
      </Card>
    </div>
  );
}

// ---------------- SETTINGS ----------------
const SETTINGS_CATS = [
  { id: "profile", label: "Profile" },
  { id: "study", label: "Study Preferences" },
  { id: "notify", label: "Notifications" },
  { id: "appearance", label: "Appearance" },
  { id: "wallpaper", label: "Wallpaper" },
  { id: "clock", label: "Clock" },
  { id: "sound", label: "Sound" },
  { id: "sync", label: "Data & Sync" },
  { id: "account", label: "Account" },
  { id: "danger", label: "Danger Zone" },
];

function SettingsTab({ profile, setProfile, data, setters, settings, setSettings, onResetFloatPosition, email, onSignOut, onSync, onWipeNow }) {
  const [cat, setCat] = useState("profile");
  const [importError, setImportError] = useState("");
  const [importOk, setImportOk] = useState(false);
  const [copied, setCopied] = useState(false);
  const [syncedFlash, setSyncedFlash] = useState(false);
  const [confirm, setConfirm] = useState(null); // "reset" | "delete" | null
  const [subjMsg, setSubjMsg] = useState("");
  const [doneMsg, setDoneMsg] = useState("");
  const [newSubj, setNewSubj] = useState("");
  const [wpBusy, setWpBusy] = useState(false);

  const copyText = (text, done) => { navigator.clipboard?.writeText(text); done(true); setTimeout(() => done(false), 1500); };
  const handleWallpaperUpload = async (e) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file || validateUpload(file)) return;
    setWpBusy(true);
    try { const dataUrl = await fileToDataUrl(file); saveWallpaperImage(dataUrl); const swatches = await extractPalette(dataUrl); setSettings(s => ({ ...s, wallpaper: "custom", wallpaperSwatches: swatches, autoAccent: true, wallpaperAccent: null })); }
    finally { setWpBusy(false); }
  };
  const removeWallpaper = () => { clearWallpaperImage(); setSettings(s => ({ ...s, wallpaper: "nebula", wallpaperSwatches: [], autoAccent: false, wallpaperAccent: null })); };

  const daysLeft = profile.targetDate ? daysBetween(new Date(), profile.targetDate) : null;
  const initials = (profile.name || "")
    .replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0]).join("").toUpperCase() || "?";

  const exportData = () => {
    const payload = { ...data, peers: data.peers || [], settings };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ledger-export-${todayStr()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setImportError(""); setImportOk(false);
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try { parsed = JSON.parse(reader.result); } catch (err) { setImportError("That file isn't valid JSON."); return; }
      if (!parsed || typeof parsed !== "object") { setImportError("Unrecognized file format."); return; }
      if (!window.confirm("Importing will overwrite your current data with the contents of this file. Continue?")) return;
      // Normalize what the app itself normalizes on load — an old theme id or
      // missing subjects array must not render a broken state.
      if (parsed.settings && typeof parsed.settings === "object") {
        setSettings({ ...parsed.settings, theme: normalizeTheme(parsed.settings.theme) });
      }
      if (parsed.profile) {
        setProfile(Array.isArray(parsed.profile.subjects) ? parsed.profile : { ...parsed.profile, subjects: Array.isArray(parsed.profile.subjects) ? parsed.profile.subjects : [] });
      }
      if (parsed.syllabus && typeof parsed.syllabus === "object" && !Array.isArray(parsed.syllabus)) setters.setSyllabus(parsed.syllabus);
      if (Array.isArray(parsed.tasks)) setters.setTasks(parsed.tasks);
      if (Array.isArray(parsed.sessions)) setters.setSessions(parsed.sessions);
      if (Array.isArray(parsed.mocks)) setters.setMocks(parsed.mocks);
      if (Array.isArray(parsed.errors)) setters.setErrors(parsed.errors);
      if (Array.isArray(parsed.dpp)) setters.setDpp(parsed.dpp);
      if (Array.isArray(parsed.cards)) setters.setCards(parsed.cards);
      if (Array.isArray(parsed.peers)) setters.setPeers(parsed.peers);
      if (Array.isArray(parsed.unlockedBadges) && setters.setUnlockedBadges) setters.setUnlockedBadges(parsed.unlockedBadges);
      setImportOk(true);
      setTimeout(() => setImportOk(false), 4000);
    };
    reader.onerror = () => setImportError("Couldn't read that file.");
    reader.readAsText(file);
  };

  // Single compact switch, reused by every settings toggle.
  const Toggle = ({ checked, onChange }) => (
    <label className="lg-switch" style={{ position: "relative", display: "inline-block", width: 40, height: 22, flexShrink: 0, cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
      <span style={{ position: "absolute", inset: 0, borderRadius: 999, background: checked ? COLORS.ink : COLORS.panel2, border: checked ? "1px solid transparent" : `1px solid ${COLORS.border}`, boxShadow: checked ? "inset 0 1px 0 rgba(255,255,255,0.2)" : "inset 0 1px 2px rgba(0,0,0,0.3)", transition: "background 0.16s ease-out, border-color 0.16s ease-out" }} />
      <span style={{ position: "absolute", top: 3, left: checked ? 23 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.35)", transition: "left 0.18s cubic-bezier(0.2,0.8,0.2,1)" }} />
    </label>
  );

  // Row + panel primitives — same language as the rest of the app.
  const Row = ({ title, sub, children, warn, first, style }) => (
    <div className="lg-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", flexWrap: "wrap", borderTop: first ? "none" : `1px solid ${COLORS.border}`, ...style }}>
      <div style={{ flex: "1 1 200px", minWidth: 200 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: warn ? hexToRgba(COLORS.danger, 0.9) : COLORS.text }}>{title}</div>
        {sub && <div style={{ fontSize: 10.5, color: COLORS.faint, marginTop: 2, lineHeight: 1.5, maxWidth: 440 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );

  const Panel = ({ title, sub, children, danger }) => (
    <div className="lg-card" style={{ borderRadius: RADIUS.card, border: `1px solid ${danger ? hexToRgba(COLORS.danger, 0.24) : COLORS.border}`, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderBottom: `1px solid ${COLORS.border}` }}>
        <span className="sys" style={{ fontSize: 9.5, letterSpacing: "0.22em", color: danger ? hexToRgba(COLORS.danger, 0.9) : COLORS.dim }}>{title}</span>
        {sub && <span style={{ marginLeft: "auto", fontSize: 10, color: COLORS.faint }}>{sub}</span>}
      </div>
      {children}
    </div>
  );

  // Subject list — same chip language as the Coverage tabs, plus reorder.
  const moveSubject = (i, dir) => {
    const next = [...profile.subjects];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setProfile({ ...profile, subjects: next });
  };
  const removeSubject = (i) => {
    if (!profile.subjects || profile.subjects.length <= 1) return;
    const gone = profile.subjects[i];
    setProfile({ ...profile, subjects: profile.subjects.filter((_, k) => k !== i) });
    // Drop that subject's chapters too — otherwise the orphaned syllabus
    // chapters keep inflating overall coverage and XP with rows the user
    // can no longer see or edit.
    setters.setSyllabus(prev => {
      const next = { ...prev };
      delete next[gone];
      return next;
    });
  };
  const addSubject = () => {
    const s = newSubj.trim();
    if (!s) { return; }
    if ((profile.subjects || []).some(x => x.toLowerCase() === s.toLowerCase())) { setSubjMsg("That subject is already on the list."); return; }
    setProfile({ ...profile, subjects: [...(profile.subjects || []), s] });
    setNewSubj("");
    setSubjMsg("");
  };

  const syncNow = async () => {
    try { if (onSync) await onSync(); setSyncedFlash(true); setTimeout(() => setSyncedFlash(false), 2600); }
    catch (e) { setSyncedFlash(false); setDoneMsg("Sync failed — check your connection and try again."); }
  };

  const wipeStudyData = () => {
    setters.setSyllabus({});
    setters.setTasks([]);
    setters.setSessions([]);
    setters.setMocks([]);
    setters.setErrors([]);
    setters.setDpp([]);
    setters.setCards([]);
    setters.setPeers([]);
    if (setters.setUnlockedBadges) setters.setUnlockedBadges([]);
  };
  const resetAll = () => { wipeStudyData(); setConfirm(null); setDoneMsg("Progress reset — Ledger is back to a clean workspace."); };
  const deleteEverything = () => { wipeStudyData(); if (onWipeNow) onWipeNow(); setConfirm(null); onSignOut(); };

  return (
    <div>
      <PageHead
        title="Settings"
        lead="Tune Ledger for the way you study — goals, subjects, reminders, sync and your account. Every change saves the moment you make it."
      />

      <div style={{ display: "flex", alignItems: "flex-start", gap: 22, flexWrap: "wrap" }}>

        {/* In-page category nav — compact vertical list, 2px accent bar */}
        <nav className="lg-settings-nav" style={{ width: 196, flexShrink: 0 }} aria-label="Settings sections">
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {SETTINGS_CATS.map(c => {
              const active = cat === c.id;
              return (
                <button key={c.id} className="lg-settings-item lg-row" onClick={() => { setCat(c.id); setDoneMsg(""); }}
                  aria-current={active ? "true" : undefined}
                  style={{
                    position: "relative", display: "flex", alignItems: "center",
                    width: "100%", padding: "9px 10px 9px 16px", borderRadius: 7,
                    border: "none", background: "transparent", cursor: "pointer",
                    fontFamily: FONTS.body, fontSize: 12.5, textAlign: "left",
                    color: active ? COLORS.text : COLORS.faint, fontWeight: active ? 600 : 500,
                  }}>
                  {active && <span style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 2, height: 16, borderRadius: 999, background: `linear-gradient(180deg, ${COLORS.accentFocus}, ${darken(COLORS.accentFocus, 32)})` }} />}
                  {c.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Category panels */}
        <div style={{ flex: "1 1 440px", maxWidth: 720, minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>

          {cat === "profile" && (
            <Panel title="Identity" sub="Shown across your app">
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", flexWrap: "wrap" }}>
                <div style={{ ...center(), width: 46, height: 46, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(150deg, ${hexToRgba(COLORS.ink, 0.22)}, ${COLORS.panel2})`, border: `1px solid ${hexToRgba(COLORS.ink, 0.45)}`, boxShadow: `0 2px 10px ${hexToRgba(COLORS.ink, 0.18)}` }}>
                  <span style={{ fontFamily: FONTS.mono, fontSize: 15, fontWeight: 700, color: COLORS.text }}>{initials}</span>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 700, color: COLORS.text, lineHeight: 1.2 }}>{profile.name || "Study partner"}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 3, fontSize: 11, color: COLORS.faint }}>
                    <span>{profile.exam || "Prep campaign"}</span>
                    {profile.exam && (
                      <>
                        <span style={{ width: 3, height: 3, borderRadius: "50%", background: COLORS.border }} />
                        <span className="num" style={{ fontWeight: 600, color: daysLeft !== null && daysLeft <= 0 ? COLORS.ink : COLORS.dim }}>
                          {daysLeft === null ? "no date yet" : daysLeft > 0 ? `D-${daysLeft}` : daysLeft === 0 ? "D-day" : `D+${-daysLeft}`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 8.5, letterSpacing: "0.16em", textTransform: "uppercase", color: COLORS.faint, fontWeight: 600 }}>Your code</div>
                    <div style={{ fontFamily: FONTS.mono, fontSize: 14, letterSpacing: "0.14em", fontWeight: 600, color: COLORS.text, marginTop: 2 }}>{profile.code}</div>
                  </div>
                  <Btn variant="ghost" style={{ padding: "5px 9px", fontSize: 11 }} onClick={() => copyText(profile.code, setCopied)}>
                    <Copy size={11} /> {copied ? "Copied" : "Copy"}
                  </Btn>
                </div>
              </div>
              <Row title="Display name" sub="How you appear in your circle.">
                <Input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} style={{ flex: "1 1 200px", minWidth: 150, maxWidth: 280 }} />
              </Row>
              <Row title="Target exam" sub="The plan your syllabus starts from.">
                <SelectBox value={profile.exam || "JEE Main"} onChange={(v) => setProfile({ ...profile, exam: v })} ariaLabel="Target exam"
                  options={Object.keys(EXAM_SUBJECTS).map(k => ({ value: k, label: k === "Both" ? "JEE + NEET" : k }))}
                  style={{ flex: "1 1 200px", minWidth: 150, maxWidth: 280 }} />
              </Row>
              <Row title="Target date" sub={daysLeft === null ? "Set a date and the countdown runs from there." : daysLeft === 0 ? "Exam day is today." : daysLeft > 0 ? `${daysLeft} ${daysLeft === 1 ? "day" : "days"} to go.` : `${-daysLeft} days since — revise your goals?`}>
                <Input type="date" value={profile.targetDate} onChange={e => setProfile({ ...profile, targetDate: e.target.value })} style={{ flex: "1 1 200px", minWidth: 150, maxWidth: 280 }} />
              </Row>
            </Panel>
          )}

          {cat === "study" && (
            <>
              <Panel title="Study plan" sub="Drives the studied bar on Home">
                <Row title="Daily study goal" sub="How many hours a day you're committing to." first>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 200px", maxWidth: 280 }}>
                    <Input type="number" min={0} max={24} step={0.5} value={settings.goalMin / 60}
                      onChange={e => { const n = parseFloat(e.target.value); if (!isNaN(n) && n >= 0 && n <= 24) setSettings(s => ({ ...s, goalMin: Math.round(n * 60) })); }}
                      style={{ width: 84, textAlign: "center", flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: COLORS.faint }}>hours / day</span>
                  </div>
                </Row>
                <Row title="Default focus session" sub="Preselects the timer length in Deep Work.">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 200px", maxWidth: 150 }}>
                    <Input type="number" min={1} max={240} step={5} value={settings.defaultFocusMin}
                      onChange={e => { const n = parseInt(e.target.value, 10); if (!isNaN(n) && n >= 1 && n <= 240) setSettings(s => ({ ...s, defaultFocusMin: n })); }}
                      style={{ width: 84, textAlign: "center", flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: COLORS.faint }}>min / session</span>
                  </div>
                </Row>
              </Panel>

              <Panel title="Subjects" sub="Reordered, renamed, pruned">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "14px 18px 8px" }}>
                  {(profile.subjects || []).map((s, i) => (
                    <div key={s} style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 30, padding: "0 5px 0 11px", borderRadius: 7, background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.border}` }}>
                      <span style={subjectDot(s)} />
                      <span style={{ fontSize: 12, color: COLORS.text }}>{s}</span>
                      <span style={{ display: "inline-flex", gap: 2 }}>
                        <button aria-label={`Move ${s} up`} title="Move up" disabled={i === 0} onClick={() => moveSubject(i, -1)} style={{ ...iconBtnStyle(false), opacity: i === 0 ? 0.35 : 1, cursor: i === 0 ? "default" : "pointer", width: 22, height: 22 }}>
                          <ChevronUp size={11} strokeWidth={2} />
                        </button>
                        <button aria-label={`Move ${s} down`} title="Move down" disabled={i === profile.subjects.length - 1} onClick={() => moveSubject(i, 1)} style={{ ...iconBtnStyle(false), opacity: i === profile.subjects.length - 1 ? 0.35 : 1, cursor: i === profile.subjects.length - 1 ? "default" : "pointer", width: 22, height: 22 }}>
                          <ChevronDown size={11} strokeWidth={2} />
                        </button>
                        <button aria-label={`Remove ${s}`} title="Remove" disabled={!profile.subjects || profile.subjects.length <= 1} onClick={() => removeSubject(i)} style={{ ...iconBtnStyle(true), opacity: !profile.subjects || profile.subjects.length <= 1 ? 0.35 : 1, cursor: !profile.subjects || profile.subjects.length <= 1 ? "default" : "pointer", width: 22, height: 22 }}>
                          <X size={11} strokeWidth={2} />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 18px 14px" }}>
                  <Input value={newSubj} onChange={e => { setNewSubj(e.target.value); setSubjMsg(""); }} placeholder="Add a subject…" onKeyDown={e => e.key === "Enter" && addSubject()} style={{ flex: 1 }} />
                  <Btn variant="ghost" onClick={addSubject}><Plus size={13} /> Add</Btn>
                </div>
                {subjMsg && <div style={{ fontSize: 11, color: COLORS.dim, padding: "0 18px 12px" }}>{subjMsg}</div>}
              </Panel>

              <Panel title="Focus timer" sub="Optional floating badge">
                <Row title="Floating timer badge" sub="Shows a small draggable badge with the running time when you leave Deep Work for another section of Ledger." first>
                  <Toggle checked={settings.floatingTimer !== false} onChange={v => setSettings(s => ({ ...s, floatingTimer: v }))} />
                </Row>
                <Row title="Badge position" sub="Dragged the badge somewhere awkward? Snap it back to the bottom-right corner.">
                  <Btn variant="ghost" onClick={onResetFloatPosition}>Reset position</Btn>
                </Row>
                <div style={{ fontSize: 11, color: COLORS.faint, padding: "12px 18px", borderTop: `1px solid ${COLORS.border}`, lineHeight: 1.6 }}>
                  Ledger runs inside a sandboxed panel in your browser, so the badge only floats within Ledger itself — never over other apps or tabs. Leave and come back and it still shows the correct elapsed time.
                </div>
              </Panel>
            </>
          )}

          {cat === "notify" && (
            <Panel title="Notifications" sub="Quiet nudges, no alerts">
              <Row title="Focus session reminders" sub="Lets you know when a focus session ends." first>
                <Toggle checked={settings.reminders.study} onChange={v => setSettings(s => ({ ...s, reminders: { ...s.reminders, study: v } }))} />
              </Row>
              <Row title="Review due alerts" sub="A nudge when spaced-repetition cards come due.">
                <Toggle checked={settings.reminders.review} onChange={v => setSettings(s => ({ ...s, reminders: { ...s.reminders, review: v } }))} />
              </Row>
              <Row title="Daily target check-in" sub="One quiet chime if the day's target still isn't met by the hour below.">
                <Toggle checked={settings.reminders.targets} onChange={v => setSettings(s => ({ ...s, reminders: { ...s.reminders, targets: v } }))} />
              </Row>
              <Row title="Check time" sub="The hour when a missed target counts as missed.">
                <Input type="time" value={settings.reminders.time} onChange={e => setSettings(s => ({ ...s, reminders: { ...s.reminders, time: e.target.value } }))} style={{ flex: "1 1 160px", maxWidth: 180 }} />
              </Row>
            </Panel>
          )}

          {cat === "appearance" && (
            <>
              <Panel title="Appearance" sub="One system, kept calm">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, padding: "14px 18px" }}>
                  {Object.entries(THEME_PRESETS).map(([id, preset]) => {
                    const active = normalizeTheme(settings.theme) === id;
                    return <button key={id} aria-label={`Switch to ${preset.label}`} aria-pressed={active} onClick={() => setSettings(s => ({ ...s, theme: id }))} style={{ padding: 10, textAlign: "left", borderRadius: 8, cursor: "pointer", color: COLORS.text, background: active ? hexToRgba(COLORS.accentFocus, 0.12) : "transparent", border: `1px solid ${active ? COLORS.accentFocus : COLORS.border}` }}><span style={{ display: "block", width: 18, height: 18, borderRadius: 5, background: preset.focus, marginBottom: 6 }} /><span style={{ fontSize: 11 }}>{preset.label}</span></button>;
                  })}
                </div>
                <div style={{ fontSize: 11.5, color: COLORS.faint, lineHeight: 1.6, padding: "13px 18px", borderBottom: `1px solid ${COLORS.border}` }}>
                  Ledger ships with a restrained surface system tuned for long study sessions. Typography below changes the character without changing the data.
                </div>
                {settings.wallpaperSwatches?.length > 0 && <div style={{ display: "flex", gap: 8, padding: "12px 18px" }}>{settings.wallpaperSwatches.map(hex => <button key={hex} aria-label={`Pin accent ${hex}`} aria-pressed={settings.wallpaperAccent === hex} onClick={() => setSettings(s => ({ ...s, wallpaperAccent: hex, autoAccent: false }))} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${settings.wallpaperAccent === hex ? COLORS.text : COLORS.border}`, background: hex }} />)}</div>}
                <Row title="Reduced motion" sub="Disables entrance, shimmer and pulse animations." first>
                  <Toggle checked={settings.reducedMotion} onChange={v => setSettings(s => ({ ...s, reducedMotion: v }))} />
                </Row>
                <Row title="Density" sub="Tighter rows and spacing, or a roomier desktop.">
                  <div className="lg-seg">
                    {[{ v: 1, label: "Comfortable" }, { v: 0.92, label: "Compact" }].map(o => (
                      <button key={o.label} className={settings.density === o.v ? "lg-seg-item active" : "lg-seg-item"} onClick={() => setSettings(s => ({ ...s, density: o.v }))}>{o.label}</button>
                    ))}
                  </div>
                </Row>
              </Panel>
              <Panel title="Typography" sub="The voice of your study OS">
                <div style={{ padding: "16px 18px", borderBottom: `1px solid ${COLORS.border}` }}>
<div className="sys" style={{ color: COLORS.accentFocus }}>TYPOGRAPHY PREVIEW</div>
                  <div className="t-display" style={{ color: COLORS.text, marginTop: 12 }}>Aa</div>
                  <div className="t-headline" style={{ color: COLORS.text, marginTop: 3 }}>Build consistency.</div>
                  <div className="t-body" style={{ color: COLORS.dim, marginTop: 5 }}>Study with intent.</div>
                  <div className="t-meta" style={{ color: COLORS.accentFocus, marginTop: 13 }}>PBCEL3&nbsp;&nbsp; 01:42:18&nbsp;&nbsp; 98%</div>
                </div>
                <Row title="Preset" sub="Each preset changes display, body and mono roles.">
                  <div className="lg-seg" role="radiogroup" aria-label="Typography preset">
                    {Object.entries(TYPOGRAPHY_PRESETS).map(([id, preset]) => <button key={id} className={settings.typography?.preset === id ? "lg-seg-item active" : "lg-seg-item"} aria-pressed={settings.typography?.preset === id} onClick={() => setSettings(s => ({ ...s, typography: { ...s.typography, preset: id, display: "", body: "", mono: "" } }))}>{preset.label}</button>)}
                  </div>
                </Row>
                <Row title="Display font" sub="Used for page titles and editorial headings.">
                  <SelectBox value={settings.typography?.display || TYPOGRAPHY_PRESETS[settings.typography?.preset || "ledger"].display} onChange={v => setSettings(s => ({ ...s, typography: { ...s.typography, display: v } }))} ariaLabel="Display font" options={Object.keys(FONT_CATALOG).map(name => ({ value: name, label: name }))} style={{ minWidth: 190 }} />
                </Row>
                <Row title="Body font" sub="Used for readable copy and controls.">
                  <SelectBox value={settings.typography?.body || TYPOGRAPHY_PRESETS[settings.typography?.preset || "ledger"].body} onChange={v => setSettings(s => ({ ...s, typography: { ...s.typography, body: v } }))} ariaLabel="Body font" options={Object.keys(FONT_CATALOG).filter(name => FONT_CATALOG[name].fallback === "sans-serif").map(name => ({ value: name, label: name }))} style={{ minWidth: 190 }} />
                </Row>
                <Row title="Monospace font" sub="Used for codes, metrics and technical readouts.">
                  <SelectBox value={settings.typography?.mono || TYPOGRAPHY_PRESETS[settings.typography?.preset || "ledger"].mono} onChange={v => setSettings(s => ({ ...s, typography: { ...s.typography, mono: v } }))} ariaLabel="Monospace font" options={Object.keys(FONT_CATALOG).filter(name => FONT_CATALOG[name].fallback === "monospace").map(name => ({ value: name, label: name }))} style={{ minWidth: 190 }} />
                </Row>
              </Panel>
            </>
          )}

          {cat === "wallpaper" && (
            <Panel title="Wallpaper" sub="The backdrop behind everything">
              <input id="ledger-wallpaper-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleWallpaperUpload} style={{ display: "none" }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, padding: 14 }}>
                {[{ id: "nebula", label: "Nebula" }, { id: "black", label: "Black" }, { id: "custom", label: "Custom" }].map(w => <button key={w.id} aria-pressed={settings.wallpaper === w.id} onClick={() => setSettings(s => ({ ...s, wallpaper: w.id }))} style={{ padding: 10, borderRadius: 8, cursor: "pointer", color: COLORS.text, background: settings.wallpaper === w.id ? hexToRgba(COLORS.accentFocus, 0.12) : "transparent", border: `1px solid ${settings.wallpaper === w.id ? COLORS.accentFocus : COLORS.border}` }}>{w.label}</button>)}
              </div>
              <div style={{ display: "flex", gap: 8, padding: "0 14px 14px" }}><Btn variant="ghost" disabled={wpBusy} onClick={() => document.getElementById("ledger-wallpaper-input").click()}>Upload wallpaper</Btn>{settings.wallpaper === "custom" && <Btn variant="danger" onClick={removeWallpaper}>Remove</Btn>}</div>
            </Panel>
          )}

          {cat === "clock" && (
            <Panel title="Clock" sub="The big time on Home">
              <Row title="Style" sub="Digital, analog, flip or minimal." first>
                <div className="lg-seg">{["digital", "analog", "flip", "minimal"].map(v => <button key={v} className={settings.clockStyle === v ? "lg-seg-item active" : "lg-seg-item"} onClick={() => setSettings(s => ({ ...s, clockStyle: v }))}>{v[0].toUpperCase() + v.slice(1)}</button>)}</div>
              </Row>
              <Row title="24-hour time"><Toggle checked={!!settings.clock24h} onChange={v => setSettings(s => ({ ...s, clock24h: v }))} /></Row>
            </Panel>
          )}

          {cat === "sound" && <Panel title="Sound" sub="Quiet feedback"><Row title="Session-logged pulse" sub="A short tick when a session is recorded." first><Toggle checked={settings.sound?.ringPulse !== false} onChange={v => setSettings(s => ({ ...s, sound: { ...s.sound, ringPulse: v } }))} /></Row></Panel>}

          {cat === "sync" && (
            <>
              <Panel title="Sync" sub="Supabase, in real time">
                <Row title="Sync status" sub="Every change is written to your account automatically. This pulls the latest state back down." first>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
                    <span className="lg-statusdot" style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.done, boxShadow: `0 0 0 3px ${hexToRgba(COLORS.done, 0.12)}` }} />
                    <span className="sys" style={{ fontSize: 10, color: syncedFlash ? COLORS.done : COLORS.faint }}>{syncedFlash ? "Synced just now" : "Synced"}</span>
                    <Btn variant="ghost" onClick={syncNow}><RefreshCw size={12} /> Sync now</Btn>
                  </div>
                </Row>
              </Panel>
              <Panel title="Export & restore" sub="JSON, scoped to your account">
                <div className="lg-row" style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "13px 18px" }}>
                  <Btn variant="ghost" onClick={exportData}><Download size={14} /> Export all data (JSON)</Btn>
                  <input id="ledger-import-input" type="file" accept="application/json" onChange={handleImportFile} style={{ display: "none" }} />
                  <Btn variant="ghost" onClick={() => document.getElementById("ledger-import-input").click()}><ClipboardList size={14} /> Import from JSON</Btn>
                </div>
                {importError && <div style={{ fontSize: 11, color: COLORS.danger, padding: "0 18px 12px" }}>{importError}</div>}
                {importOk && <div style={{ fontSize: 11, color: COLORS.done, padding: "0 18px 12px" }}>Import complete — your data has been restored.</div>}
                <div style={{ fontSize: 11, color: COLORS.faint, padding: "12px 18px", borderTop: `1px solid ${COLORS.border}`, lineHeight: 1.6 }}>
                  Your data lives in Supabase, scoped to your account. Export regularly for an offline backup; import that same file to restore it.
                </div>
              </Panel>
            </>
          )}

          {cat === "account" && (
            <>
              <Panel title="Signed in">
                <Row title="Email" sub="The address your magic link is sent to." first>
                  <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.dim }}>{email || "—"}</span>
                </Row>
                <Row title="Sign-in method" sub="Magic links and Discord — no password to forget.">
                  <span className="sys" style={{ fontSize: 9 }}>Magic link · Discord</span>
                </Row>
                <Row title="Sign out" sub="Ends this session on this device.">
                  <Btn variant="danger" onClick={onSignOut}><LogOut size={13} /> Sign out</Btn>
                </Row>
              </Panel>
              <div style={{ fontSize: 12, color: COLORS.faint, lineHeight: 1.7, padding: "2px 2px" }}>
                Ledger — real syllabus tracking, real timers, real accounts and persistent storage. No invented numbers: every surface is built from your own data.
              </div>
            </>
          )}

          {cat === "danger" && (
            <>
              <Panel title="Danger zone" sub="Irreversible" danger>
                <div style={{ fontSize: 11, color: COLORS.faint, padding: "13px 18px", borderBottom: `1px solid ${COLORS.border}`, lineHeight: 1.6 }}>
                  Both of these wipe tracked study data. Your identity, subject list, appearance and email are kept.
                </div>
                <Row title="Reset all progress" sub="Clears the syllabus, focus sessions, tasks, tests, mistakes, practice and recall cards." warn>
                  {confirm === "reset" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11.5, color: COLORS.faint }}>This is final.</span>
                      <Btn variant="danger" onClick={resetAll} style={{ padding: "6px 10px", fontSize: 11.5 }}>Reset everything</Btn>
                      <Btn variant="ghost" onClick={() => setConfirm(null)} style={{ padding: "6px 10px", fontSize: 11.5 }}>Cancel</Btn>
                    </div>
                  ) : (
                    <Btn variant="danger" onClick={() => setConfirm("reset")} style={{ flexShrink: 0 }}>Reset progress</Btn>
                  )}
                </Row>
                <Row title="Delete account & data" sub="The same clear as reset, then signs you out of this device." warn>
                  {confirm === "delete" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11.5, color: COLORS.faint }}>Last chance.</span>
                      <Btn variant="danger" onClick={deleteEverything} style={{ padding: "6px 10px", fontSize: 11.5 }}>Delete everything</Btn>
                      <Btn variant="ghost" onClick={() => setConfirm(null)} style={{ padding: "6px 10px", fontSize: 11.5 }}>Cancel</Btn>
                    </div>
                  ) : (
                    <Btn variant="danger" onClick={() => setConfirm("delete")} style={{ flexShrink: 0 }}>Delete</Btn>
                  )}
                </Row>
                {doneMsg && <div style={{ fontSize: 11, color: COLORS.done, padding: "0 18px 13px", borderTop: `1px solid ${COLORS.border}` }}>{doneMsg}</div>}
              </Panel>
              <div style={{ fontSize: 12, color: COLORS.faint, lineHeight: 1.7, padding: "2px 2px" }}>
                Ledger — real syllabus tracking, real timers, real accounts and persistent storage. No invented numbers: every surface here is built from your own data.
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

// ---------------- AUTH ----------------
// A brand mark in the app's restraint idiom: no solid plate, just a quiet
// accent-tinted tile with a mono "L" — the sidebar's mark, de-hearted.
function LedgerMark({ size = 30 }) {
  return (
    <div
      aria-hidden
      style={{
        width: size, height: size, flexShrink: 0, borderRadius: Math.max(7, Math.round(size * 0.26)),
        display: "flex", alignItems: "center", justifyContent: "center",
        background: `linear-gradient(150deg, ${hexToRgba(COLORS.ink, 0.17)}, ${hexToRgba(COLORS.ink, 0.05)})`,
        border: `1px solid ${hexToRgba(COLORS.ink, 0.3)}`,
        boxShadow: `inset 0 1px 0 ${hexToRgba(COLORS.ink, 0.14)}`,
        fontFamily: FONTS.mono, fontWeight: 800, fontSize: Math.round(size * 0.44),
        lineHeight: 1, color: COLORS.ink, letterSpacing: "-0.04em",
        paddingTop: Math.round(size * 0.03), // optical centering, letters sit high
      }}
    >
      L
    </div>
  );
}

// Gate the whole Workspace behind a Supabase session. Two paths: email
// magic-link, or Discord OAuth. The post-auth redirect is configurable via
// VITE_REDIRECT_URL (set it to your deployed URL so magic links and OAuth
// return to the live site, not localhost). Falls back to the current origin.
function AuthScreen({ onDemo }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);

  const redirectTo = import.meta.env.VITE_REDIRECT_URL || window.location.origin;

  const sendLink = async () => {
    if (loading || sent) return;
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Enter a valid email address."); return; }
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  const signInWithDiscord = async () => {
    setDiscordLoading(true); setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo },
    });
    setDiscordLoading(false);
    // A successful OAuth call navigates away — an error only returns here.
    if (error) setError(error.message);
  };

return (
    <div style={{ background: "transparent", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONTS.body, color: COLORS.text, padding: 20 }}>
      <style>{globalCss()}</style>
      <div className="lg-auth lg-page">
        {/* The mark half — what Ledger is, before the form asks for anything */}
        <div className="lg-auth-mark lg-page" style={{ animationDelay: "0.06s" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <LedgerMark size={34} />
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 17, lineHeight: 1.1, letterSpacing: "-0.01em" }}>Ledger</div>
                <div className="sys" style={{ color: COLORS.dim }}>Study OS</div>
              </div>
            </div>
            <div style={{ marginTop: 44, maxWidth: 420 }}>
              <div className="sys" style={{ color: COLORS.accentFocus, fontSize: 9, letterSpacing: "0.28em" }}>A STUDY LEDGER FOR JEE / NEET PREP</div>
              <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: "clamp(24px, 3.2vw, 36px)", lineHeight: 1.14, letterSpacing: "-0.02em", marginTop: 14 }}>
                Every hour accounted.<br />Every chapter a line in the book.
              </div>
              <div style={{ fontSize: 13, color: COLORS.dim, lineHeight: 1.65, marginTop: 14 }}>
                Syllabus coverage, spaced recall, a focus timer and a mistake ledger — one instrument, day by day, until the exam.
              </div>
            </div>
          </div>
          <div className="sys" style={{ fontSize: 8.5, letterSpacing: "0.2em", color: COLORS.faint, marginTop: 40 }}>
            FOCUS · COVERAGE · RECALL · TESTS · MISTAKES · CIRCLES
          </div>
        </div>

        {/* The form half — one quiet surface, nothing decorative */}
        <div className="lg-auth-form lg-page" style={{ animationDelay: "0.12s" }}>
          {sent ? (
            <div className="lg-pop" style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
              <CheckCircle2 size={17} color={COLORS.done} style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 13, color: COLORS.dim, lineHeight: 1.6 }}>
                Check <b style={{ color: COLORS.text }}>{email}</b> for a sign-in link. You can close this tab.
              </div>
            </div>
          ) : (
            <>
              <button onClick={signInWithDiscord} disabled={discordLoading} className="lg-page lg-btn lg-btn-ghost" style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                padding: "10px 14px", border: `1px solid ${COLORS.border}`,
                background: "transparent", color: COLORS.text, fontFamily: FONTS.body, fontSize: 13.5, fontWeight: 500,
                cursor: discordLoading ? "not-allowed" : "pointer", opacity: discordLoading ? 0.6 : 1,
                animationDelay: "0.18s",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.87-.61 1.25a18.27 18.27 0 0 0-5.49 0 12.64 12.64 0 0 0-.62-1.25.08.08 0 0 0-.08-.04 19.74 19.74 0 0 0-4.88 1.52.07.07 0 0 0-.04.05C1.72 8.13 1.06 11.8 1.38 15.43a.08.08 0 0 0 .03.05 19.9 19.9 0 0 0 6 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.22-2a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.89.08.08 0 0 1-.01-.13c.13-.09.25-.19.37-.29a.07.07 0 0 1 .08-.01c3.92 1.8 8.16 1.8 12.04 0a.07.07 0 0 1 .08.01c.12.1.25.2.38.29a.08.08 0 0 1 0 .13c-.6.35-1.22.64-1.87.89a.08.08 0 0 0-.04.11c.36.7.77 1.37 1.22 2a.08.08 0 0 0 .08.03 19.83 19.83 0 0 0 6.01-3.03.08.08 0 0 0 .03-.05c.38-4.21-.63-7.85-2.67-11.01a.06.06 0 0 0-.03-.05ZM8.99 13.28c-1.18 0-2.15-1.08-2.15-2.4s.95-2.4 2.15-2.4c1.21 0 2.17 1.09 2.15 2.4 0 1.32-.95 2.4-2.15 2.4Zm6.02 0c-1.18 0-2.15-1.08-2.15-2.4s.95-2.4 2.15-2.4c1.21 0 2.17 1.09 2.15 2.4 0 1.32-.94 2.4-2.15 2.4Z" />
                </svg>
                {discordLoading ? "Redirecting to Discord…" : "Continue with Discord"}
              </button>
              <div className="lg-page" style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0", animationDelay: "0.22s" }}>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${COLORS.border})` }} />
                <div className="sys">or</div>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${COLORS.border}, transparent)` }} />
              </div>
              <div className="lg-page" style={{ fontSize: 12.5, color: COLORS.dim, lineHeight: 1.55, marginBottom: 14, animationDelay: "0.26s" }}>Sign in with your email — we'll send a one-click link, no password needed.</div>
              <Input className="lg-page" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && sendLink()} style={{ animationDelay: "0.3s" }} />
              {error && <div style={{ fontSize: 11, color: COLORS.danger, marginTop: 8 }}>{error}</div>}
              <Btn variant="ink" className={`lg-page${loading ? " lg-btn-shimmer" : ""}`} style={{ width: "100%", justifyContent: "center", marginTop: 14, animationDelay: "0.34s" }} disabled={loading} onClick={sendLink}>
                <span className="lg-btn-label">
                  <span style={{ opacity: loading ? 0 : 1 }}>Send sign-in link</span>
                  <span style={{ opacity: loading ? 1 : 0 }}>Sending…</span>
                </span>
              </Btn>
              {onDemo && (
                <button
                  onClick={onDemo}
                  className="lg-page lg-link-btn"
                  style={{
                    width: "100%", marginTop: 16, padding: "8px 12px",
                    background: "transparent", border: "1px solid transparent",
                    fontSize: 12.5, cursor: "pointer", fontFamily: FONTS.body,
                    animationDelay: "0.38s",
                  }}
                >
                  Continue as Guest / Demo Mode
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthGate() {
  const [session, setSession] = useState(undefined); // undefined = still checking, null = signed out

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <div style={{ background: COLORS.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.dim, fontFamily: FONTS.body }}>
      <style>{globalCss()}</style>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <LedgerMark size={36} />
        <div className="lg-skeleton" style={{ height: 14, width: 220 }} />
      </div>
    </div>;
  }
  if (!session) return <AuthScreen onDemo={() => setSession({ user: { id: "demo-user", email: "demo@ledger.app" } })} />;
  return <Workspace session={session} />;
}
