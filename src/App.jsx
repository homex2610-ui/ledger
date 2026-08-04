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
  CheckCircle2, Star, BookMarked, NotebookPen, Layers, Lock, Zap
} from "lucide-react";
import { COLORS, FONTS, FONT_IMPORT, THEME_PRESETS, applyTheme, globalCss, RANK_COLORS, hexToRgba, darken } from "./lib/theme";
import { uid, todayStr, daysBetween, genCode, fmtMin, addDays, parseLocalDate } from "./lib/utils";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import ActivePage from "./components/layout/ActivePage";
import WeakAreas from "./components/features/WeakAreas";

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
const PRIORITY_COLORS = { low: "#6FA287", medium: "#C98A3E", high: "#C1443D" };

const REVISION_INTERVALS = [1, 3, 7, 15, 30, 60];

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
  const userId = session?.user?.id || null;
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
function Bubble({ status, size = 20, onClick }) {
  const colorMap = { todo: COLORS.faint, doing: COLORS.warn, done: COLORS.done, mastered: COLORS.ink };
  const filled = status === "done" || status === "mastered";
  const interactive = !!onClick;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" onClick={onClick}
      role={interactive ? "button" : undefined} tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `Status: ${STATUS_LABEL[status] || status}` : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      style={{ cursor: onClick ? "pointer" : "default", flexShrink: 0 }}>
      <rect x="2" y="2" width="16" height="16" rx="4" fill={filled ? colorMap[status] : "transparent"} stroke={colorMap[status]} strokeWidth="1.5" />
      {status === "doing" && <rect x="2" y="10.5" width="16" height="7.5" rx="2" fill={COLORS.warn} opacity="0.85" />}
      {filled && <path d="M5.5 10.5l3 3 6-6.5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      {status === "mastered" && <rect x="0.5" y="0.5" width="19" height="19" rx="5.5" fill="none" stroke={COLORS.ink} strokeWidth="1" strokeDasharray="2,2" />}
    </svg>
  );
}

function Card({ title, right, children, style }) {
  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "16px 18px", ...style }}>
      {(title || right) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          {title && <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.dim, fontWeight: 600 }}>{title}</div>}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div style={{ background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "12px 14px" }}>
      <div style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: COLORS.faint, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: FONTS.mono, fontSize: 22, fontWeight: 600, color: COLORS.text }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: COLORS.dim, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// Lighter than Stat — a plain label/value pair with no border or background
// of its own, so several can sit together in one row without stacking up
// into a wall of boxes. Meant for secondary numbers worth knowing but not
// worth top billing.
function MiniFact({ label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
      <span style={{ fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: COLORS.faint }}>{label}</span>
      <span style={{ fontFamily: FONTS.mono, fontSize: 13, fontWeight: 600, color: COLORS.text }}>{value}</span>
    </div>
  );
}

function Btn({ children, onClick, variant = "ghost", style, disabled, title }) {
  const base = { fontFamily: FONTS.body, fontSize: 13, fontWeight: 500, padding: "8px 14px", borderRadius: 7, cursor: disabled ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid transparent", opacity: disabled ? 0.5 : 1 };
  const variants = {
    ink: { background: COLORS.ink, color: "#fff" },
    ghost: { background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.text },
    danger: { background: "transparent", border: `1px solid ${COLORS.danger}55`, color: COLORS.danger },
    subtle: { background: COLORS.panel2, color: COLORS.text },
  };
  return <button title={title} disabled={disabled} onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>{children}</button>;
}

function Input(props) {
  return <input {...props} style={{ background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: 7, padding: "9px 11px", color: COLORS.text, fontSize: 13, fontFamily: FONTS.body, width: "100%", boxSizing: "border-box", ...props.style }} />;
}
function Select(props) {
  return <select {...props} style={{ background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: 7, padding: "9px 11px", color: COLORS.text, fontSize: 13, fontFamily: FONTS.body, width: "100%", boxSizing: "border-box", ...props.style }} />;
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
  const [groupDefs, setGroupDefs] = useState({});
  const [dpp, setDpp] = useState([]);
  const [cards, setCards] = useState([]);
  const [unlockedBadges, setUnlockedBadges] = useState([]);
  const [settings, setSettings] = useState({ theme: "ledger", floatingTimer: true });
  const [floatResetKey, setFloatResetKey] = useState(0);
  const appRef = useRef(null);

  const userId = session?.user?.id || null;
  const createGroup = useCallback(async (code, name) => {
    if (!userId || !profile) return null;
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .insert({ code, name, owner_id: userId })
      .select("code,name,owner_id")
      .single();
    if (groupError || !group) return null;

    const { error: memberError } = await supabase
      .from("group_members")
      .insert({ group_code: code, user_id: userId, profile_code: profile.code });
    if (memberError) return null;

    setGroupDefs(prev => ({ ...prev, [code]: group }));
    return group;
  }, [userId, profile]);

  const joinGroup = useCallback(async (code) => {
    if (!userId || !profile) return null;
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("code,name,owner_id")
      .eq("code", code)
      .single();
    if (groupError || !group) return null;

    const { error: memberError } = await supabase
      .from("group_members")
      .insert({ group_code: code, user_id: userId, profile_code: profile.code });
    if (memberError) return null;

    setGroupDefs(prev => ({ ...prev, [code]: group }));
    return group;
  }, [userId, profile]);

  const leaveGroup = useCallback(async (code) => {
    if (!userId) return false;
    const { error } = await supabase
      .from("group_members")
      .delete()
      .match({ group_code: code, user_id: userId });
    if (!error) {
      setGroupDefs(prev => {
        const next = { ...prev };
        delete next[code];
        return next;
      });
    }
    return !error;
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: membership, error: memberError } = await supabase.from("group_members").select("group_code").eq("user_id", userId);
      if (memberError) return;
      const codes = (membership || []).map(entry => entry.group_code).filter(Boolean);
      if (codes.length === 0) {
        setGroupDefs({});
        return;
      }
      const { data: groups, error: groupsError } = await supabase.from("groups").select("code,name,owner_id").in("code", codes);
      if (groupsError) return;
      const nextDefs = {};
      (groups || []).forEach(g => { nextDefs[g.code] = g; });
      setGroupDefs(nextDefs);
    })();
  }, [userId]);

  applyTheme(settings.theme);

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

  // Pomodoro phase completion: focus -> auto-starts a break; break -> chimes
  // and hands control back for the next focus session.
  useEffect(() => {
    if (timerMode !== "pomodoro" || !timerRunning || timerElapsed < phaseTarget) return;
    if (pomoPhase === "focus") {
      setSessions(prev => [...prev, { id: uid(), date: todayStr(), subject: timerSubject, minutes: Math.round(pomoTarget / 60), startHour: new Date().getHours(), mode: timerMode }]);
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
  }, [timerElapsed, timerMode, timerRunning, phaseTarget, pomoPhase, pomoTarget, pomoCycle, timerSubject]);

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
    setTimerRunning(false);
    if (timerMode === "pomodoro" && pomoPhase !== "focus") {
      // Stopping mid-break just cancels the break, no session logged.
      setPomoPhase("focus");
      setTimerElapsed(0);
      return;
    }
    if (timerElapsed >= 60) {
      setSessions(prev => [...prev, { id: uid(), date: todayStr(), subject: timerSubject, minutes: Math.round(timerElapsed / 60), startHour: new Date().getHours(), mode: timerMode }]);
    }
    setTimerElapsed(0);
  };

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

  useEffect(() => {
    (async () => {
      const [p, s, t, se, m, er, pe, dq, cd, ub, st] = await Promise.all([
        load("profile", null), load("syllabus", {}), load("tasks", []),
        load("sessions", []), load("mocks", []), load("errors", []), load("peers", []),
        load("dpp", []), load("cards", []), load("unlockedBadges", []), load("settings", { theme: "ledger", floatingTimer: true }),
      ]);
      setProfile(p); setSyllabus(s); setTasks(t); setSessions(se); setMocks(m); setErrors(er); setPeers(pe); setDpp(dq); setCards(cd); setUnlockedBadges(ub); setSettings(st);
      setTimerSubject((p && p.subjects && p.subjects[0]) || null);
      setReady(true);
    })();
  }, [load]);

  // syllabus and cards get edited keystroke-by-keystroke (chapter notes
  // textarea, card front/back), so their autosaves are debounced — the rest
  // change at click granularity and still save immediately.
  const saveTimeoutRef = useRef(null);
  const debouncedSave = useCallback((key, value) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => save(key, value), 600);
  }, [save]);
  useEffect(() => () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); }, []);

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
        setPeerData(out);
      } catch (e) {
        console.error("[peers] failed to fetch leaderboard entries", e);
      }
    })();
  }, [peers, ready, userId, sessions]);

  if (!ready) {
    return <div style={{ background: COLORS.bg, minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.dim, fontFamily: FONTS.body }}>
      <style>{FONT_IMPORT}</style>
      Loading your workspace…
    </div>;
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

  return (
    <div ref={appRef} className="app-shell" style={{ border: `1px solid ${COLORS.border}` }}>
      <style>{globalCss()}</style>

      <Sidebar tab={tab} setTab={setTab} profile={profile} onSignOut={() => supabase.auth.signOut()} />

      <div className="app-main">
        <Header />
        <TopBar profile={profile} sessions={sessions} tasks={tasks} />
        {tab === "dashboard" && <Dashboard profile={profile} syllabus={syllabus} setSyllabus={setSyllabus} sessions={sessions} tasks={tasks} mocks={mocks} errors={errors} dpp={dpp} unlockedBadges={unlockedBadges} setTab={setTab} />}
        {tab === "calendar" && <MonthView profile={profile} tasks={tasks} setTasks={setTasks} syllabus={syllabus} mocks={mocks} sessions={sessions} setTab={setTab} />}
        {tab === "cards" && <RecallDeck cards={cards} setCards={setCards} profile={profile} />}
        {tab === "syllabus" && <Syllabus syllabus={syllabus} setSyllabus={setSyllabus} profile={profile} />}
        {tab === "timer" && <FocusTimer profile={profile} sessions={sessions} setSessions={setSessions} timer={timer}
          setMode={changeTimerMode} setSubject={setTimerSubject} setPomoMinutes={setPomoMinutes}
          onStart={() => { unlockAudio(); setTimerRunning(true); }} onPause={() => setTimerRunning(false)} onStop={stopTimer} onSkipBreak={skipBreak} />}
        {tab === "tasks" && <Tasks tasks={tasks} setTasks={setTasks} profile={profile} dpp={dpp} setDpp={setDpp} />}
        {tab === "mocks" && <Mocks mocks={mocks} setMocks={setMocks} profile={profile} />}
        {tab === "errors" && <ErrorLog errors={errors} setErrors={setErrors} mocks={mocks} />}
        {tab === "weak" && <WeakAreas syllabus={syllabus} mocks={mocks} errors={errors} setTab={setTab} />}
        {tab === "peers" && <Peers profile={profile} peers={peers} setPeers={setPeers} peerData={peerData} sessions={sessions}
          groupDefs={groupDefs} onCreateGroup={createGroup} onJoinGroup={joinGroup} onLeaveGroup={leaveGroup} />}
        {tab === "settings" && <SettingsTab
          profile={profile} setProfile={setProfile}
          data={{ profile, syllabus, tasks, sessions, mocks, errors, dpp, cards, peers }}
          setters={{ setSyllabus, setTasks, setSessions, setMocks, setErrors, setDpp, setCards, setPeers }}
          settings={settings} setSettings={setSettings}
          onResetFloatPosition={() => setFloatResetKey(k => k + 1)}
        />}
      </div>

      {settings.floatingTimer !== false && (
        <FloatingTimer timer={timer} appRef={appRef} activeTab={tab} setTab={setTab} resetKey={floatResetKey}
          onPause={() => setTimerRunning(false)} onResume={() => setTimerRunning(true)} onStop={stopTimer} />
      )}
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
  // Rule-based, not predictive: compares the last 3 days' average focus time
  // against the 7 days before that. Flags only when a sustained downward trend
  // appears, not when a single light day or one-off dip happens.
  const dailyTotals = Array.from({ length: 10 }, (_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - idx);
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
  return [
    { id: "first_session", label: "First Session", desc: "Logged your first focus session", unlocked: sessions.length >= 1 },
    { id: "week_streak", label: "7-Day Streak", desc: "Studied 7 days in a row", unlocked: streak >= 7 },
    { id: "month_streak", label: "30-Day Streak", desc: "Studied 30 days in a row", unlocked: streak >= 30 },
    { id: "century_hours", label: "100 Hours", desc: "100 hours of focused study logged", unlocked: focusHours >= 100 },
    { id: "first_mock", label: "First Mock", desc: "Logged your first mock test", unlocked: mocks.length >= 1 },
    { id: "five_mocks", label: "5 Mocks Logged", desc: "Tested yourself 5 times", unlocked: mocks.length >= 5 },
    { id: "mastered", label: "Chapter Master", desc: "Fully retained a chapter", unlocked: masteredAny },
    { id: "halfway", label: "Halfway There", desc: "50% of syllabus covered", unlocked: donePct >= 50 },
    { id: "question_century", label: "100 Questions", desc: "100+ practice questions solved", unlocked: totalQuestions >= 100 },
    { id: "error_hunter", label: "Error Hunter", desc: "Logged 10 mistakes to fix", unlocked: errors.length >= 10 },
  ];
}

function TopBar({ profile, sessions, tasks }) {
  const days = daysBetween(new Date(), profile.targetDate);
  const todayTasks = tasks.filter(t => t.date === todayStr());
  const doneToday = todayTasks.filter(t => t.done).length;
  const todayMin = sessions.filter(s => s.date === todayStr()).reduce((a, s) => a + s.minutes, 0);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, flexWrap: "wrap", gap: 10 }}>
      <div>
        <div style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 700 }}>
          {days >= 0 ? `${days} days to ${profile.exam}` : "Exam window is here"}
        </div>
        <div style={{ fontSize: 12, color: COLORS.dim, marginTop: 2 }}>Target: {parseLocalDate(profile.targetDate).toDateString()}</div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <MiniStat icon={Flame} label="Streak" value={`${computeStreak(sessions)}d`} />
        <MiniStat icon={TimerIcon} label="Today" value={fmtMin(todayMin)} />
        <MiniStat icon={CheckCircle2} label="Tasks" value={`${doneToday}/${todayTasks.length}`} />
      </div>
    </div>
  );
}
function MiniStat({ icon: Icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 12px" }}>
      <Icon size={14} color={COLORS.ink} />
      <div>
        <div style={{ fontSize: 9, color: COLORS.faint, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
        <div style={{ fontFamily: FONTS.mono, fontSize: 13, fontWeight: 600 }}>{value}</div>
      </div>
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
    <div style={{ background: COLORS.bg, borderRadius: 14, border: `1px solid ${COLORS.border}`, maxWidth: 560, margin: "0 auto", padding: "32px 34px", fontFamily: FONTS.body, color: COLORS.text }}>
      <style>{FONT_IMPORT}</style>
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
            <Select value={exam} onChange={e => setExam(e.target.value)}>
              {Object.keys(EXAM_SUBJECTS).map(k => <option key={k} value={k}>{k === "Both" ? "JEE + NEET" : k}</option>)}
            </Select>
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
  );
}

// ---------------- DASHBOARD ----------------
function Dashboard({ profile, syllabus, setSyllabus, sessions, tasks, mocks, errors, dpp, unlockedBadges, setTab }) {
  const allChapters = Object.values(syllabus).flat();
  const doneCount = allChapters.filter(c => c.status === "done" || c.status === "mastered").length;
  const pct = allChapters.length ? Math.round((doneCount / allChapters.length) * 100) : 0;
  const days = daysBetween(new Date(), profile.targetDate);
  const due = dueReviews(syllabus);
  const alert = consistencyAlert(sessions);
  const dppToday = todayDppRecord(dpp || []);

  const markReviewed = (subject, id) => {
    setSyllabus(prev => ({
      ...prev,
      [subject]: prev[subject].map(c => c.id === id
        ? { ...c, revisionStage: c.revisionStage + 1, nextRevision: addDays(todayStr(), REVISION_INTERVALS[Math.min(c.revisionStage + 1, REVISION_INTERVALS.length - 1)]) }
        : c)
    }));
  };

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
  const xpInfo = useMemo(() => computeXP({ sessions, tasks, mocks, syllabus, dpp: dpp || [] }), [sessions, tasks, mocks, syllabus, dpp]);
  const liveBadges = useMemo(() => computeBadges({ sessions, tasks, mocks, syllabus, errors, dpp: dpp || [] }), [sessions, tasks, mocks, syllabus, errors, dpp]);
  const badges = useMemo(() => liveBadges.map(b => ({ ...b, unlocked: b.unlocked || unlockedBadges.includes(b.id) })), [liveBadges, unlockedBadges]);
  const unlockedCount = badges.filter(b => b.unlocked).length;

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
  const subjectColors = ["#C98A3E", "#6FA287", "#5B8CFF", "#E88DA0", "#D9A441", "#8B7FE8"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="lg-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        <Stat label="Syllabus complete" value={`${pct}%`} sub={`${doneCount}/${allChapters.length} chapters`} />
        <Stat label="Backlog" value={backlog} sub="chapters untouched" />
        <Stat label="Mocks logged" value={mocks.length} sub={mocks.length ? `avg ${Math.round(mocks.reduce((a, m) => a + (m.max ? (m.total / m.max) * 100 : 0), 0) / mocks.length)}%` : "log your first"} />
        <Stat label="Errors catalogued" value={errors.length} sub="patch these before D-day" />
        <Stat label="Questions today" value={`${dppToday.solved}/${dppToday.target}`} sub="daily practice count" />
      </div>

      <Card title="Progress ledger" right={<div style={{ fontSize: 11, color: COLORS.faint }}>{unlockedCount}/{badges.length} badges</div>}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ width: 46, height: 46, borderRadius: 8, background: COLORS.inkSoft, border: `1px solid ${COLORS.ink}55`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Zap size={20} color={COLORS.ink} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Level {xpInfo.level} — {xpInfo.title}</div>
            <div style={{ height: 6, background: COLORS.panel2, borderRadius: 3, overflow: "hidden", marginTop: 6 }}>
              <div style={{ width: `${xpInfo.levelPct}%`, height: "100%", background: COLORS.ink }} />
            </div>
            <div style={{ fontSize: 10, color: COLORS.faint, marginTop: 3 }}>{xpInfo.intoLevel}/{XP_PER_LEVEL} XP to level {xpInfo.level + 1} · {xpInfo.xp} XP total</div>
          </div>
        </div>
        <div className="lg-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
          {badges.map(b => (
            <div key={b.id} title={b.desc} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "10px 6px", borderRadius: 8,
              background: b.unlocked ? COLORS.inkSoft : COLORS.panel2, border: `1px solid ${b.unlocked ? COLORS.ink + "55" : COLORS.border}`,
              opacity: b.unlocked ? 1 : 0.55,
            }}>
              {b.unlocked ? <Award size={16} color={COLORS.ink} /> : <Lock size={14} color={COLORS.faint} />}
              <div style={{ fontSize: 9.5, textAlign: "center", color: b.unlocked ? COLORS.text : COLORS.faint, lineHeight: 1.3 }}>{b.label}</div>
            </div>
          ))}
        </div>
      </Card>

      {alert && (
        <Card style={{ borderColor: `${COLORS.warn}55` }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <AlertTriangle size={16} color={COLORS.warn} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 12, color: COLORS.dim }}>
              <b style={{ color: COLORS.text }}>Consistency dropped {alert.drop}%</b> — your last 3 days averaged {fmtMin(alert.recent)}/day vs {fmtMin(alert.baseline)}/day the week before. This is a pattern flag, not a diagnosis — could be burnout, exams, or just a rough week. Worth a lighter day or checking in with yourself before it compounds.
            </div>
          </div>
        </Card>
      )}

      {due.length > 0 && (
        <Card title={`Reviews due today (${due.length})`}>
          {due.map(c => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 4px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13 }}>
              <div>{c.name} <span style={{ fontSize: 10, color: COLORS.faint }}>· {c.subject}</span></div>
              <Btn variant="ghost" onClick={() => markReviewed(c.subject, c.id)}>Mark reviewed</Btn>
            </div>
          ))}
        </Card>
      )}

      <Card title="30-day focus momentum">
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={last30}>
            <defs>
              <linearGradient id="momentum" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.ink} stopOpacity={0.35} />
                <stop offset="100%" stopColor={COLORS.ink} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fill: COLORS.faint, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ background: COLORS.panel2, border: `1px solid ${COLORS.border}`, fontSize: 12, borderRadius: 6 }} labelStyle={{ color: COLORS.dim }} />
            <Area type="monotone" dataKey="min" stroke={COLORS.ink} fill="url(#momentum)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Where your time went (last 7 days)">
        {subjectTime7.every(s => s.minutes === 0) ? (
          <div style={{ fontSize: 12, color: COLORS.faint }}>No focus sessions logged yet this week — start the timer or add a manual entry.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {subjectTime7.map((s, i) => (
              <div key={s.subject}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: COLORS.text }}>{s.subject}</span>
                  <span style={{ color: COLORS.dim, fontFamily: FONTS.mono }}>{fmtMin(s.minutes)} · {s.pct}%</span>
                </div>
                <div style={{ height: 7, background: COLORS.panel2, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${s.pct}%`, height: "100%", background: subjectColors[i % subjectColors.length], transition: "width 0.3s" }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="lg-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card title="Today's plan" right={<Btn variant="ghost" onClick={() => setTab("tasks")}>Open <ChevronRight size={13} /></Btn>}>
          {todayTasks.length === 0 ? (
            <div style={{ fontSize: 12, color: COLORS.faint }}>No targets set for today. Head to Task Planner.</div>
          ) : todayTasks.slice(0, 5).map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 13, borderBottom: `1px solid ${COLORS.border}` }}>
              {t.done ? <CheckCircle2 size={14} color={COLORS.done} /> : <Circle size={14} color={COLORS.faint} />}
              <span style={{ textDecoration: t.done ? "line-through" : "none", color: t.done ? COLORS.faint : COLORS.text }}>{t.text}</span>
            </div>
          ))}
        </Card>

        <Card title="Reality check">
          <RealityCheck days={days} />
        </Card>
      </div>
    </div>
  );
}

function RealityCheck({ days }) {
  const [waste, setWaste] = useState(2);
  const lostHours = Math.max(0, days) * waste;
  return (
    <div>
      <div style={{ fontSize: 12, color: COLORS.dim, marginBottom: 10 }}>If you waste <b style={{ color: COLORS.text }}>{waste}h/day</b> from here to exam day:</div>
      <input type="range" min="0" max="6" step="0.5" value={waste} onChange={e => setWaste(parseFloat(e.target.value))} style={{ width: "100%" }} />
      <div style={{ fontFamily: FONTS.mono, fontSize: 26, fontWeight: 600, color: COLORS.danger, marginTop: 10 }}>
        {Math.round(lostHours)} hours lost
      </div>
      <div style={{ fontSize: 11, color: COLORS.faint, marginTop: 4 }}>≈ {Math.round(lostHours / 8)} full study days, gone. {Math.max(0, days)} days remain either way — spend them or lose them.</div>
    </div>
  );
}

// ---------------- CALENDAR ----------------
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function MonthView({ profile, tasks, setTasks, syllabus, mocks, sessions, setTab }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selected, setSelected] = useState(todayStr());
  const [newText, setNewText] = useState("");
  const [newSubject, setNewSubject] = useState(profile.subjects[0]);

  const reviewMap = useMemo(() => reviewsByDate(syllabus), [syllabus]);
  const examDate = profile.targetDate;

  const monthStats = useMemo(() => {
    const year = cursor.getFullYear(), month = cursor.getMonth();
    // parseLocalDate (local midnight) instead of `new Date(ds)` (UTC
    // midnight) so month boundaries aren't shifted for users west of UTC.
    const inMonth = (ds) => { const d = parseLocalDate(ds); return d.getFullYear() === year && d.getMonth() === month; };
    const monthSessions = sessions.filter(s => inMonth(s.date));
    const totalMin = monthSessions.reduce((a, s) => a + s.minutes, 0);
    const activeDays = new Set(monthSessions.map(s => s.date)).size;
    const tasksDone = tasks.filter(t => inMonth(t.date) && t.done).length;
    const mocksTaken = mocks.filter(m => inMonth(m.date)).length;
    return { totalMin, activeDays, tasksDone, mocksTaken };
  }, [cursor, sessions, tasks, mocks]);

  const grid = useMemo(() => {
    const year = cursor.getFullYear(), month = cursor.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(todayStr(new Date(year, month, d)));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const dayInfo = (ds) => {
    if (!ds) return null;
    const t = tasks.filter(x => x.date === ds);
    const r = reviewMap[ds] || [];
    const mk = mocks.filter(x => x.date === ds);
    const studyMin = sessions.filter(x => x.date === ds).reduce((a, s) => a + s.minutes, 0);
    return { tasks: t, reviews: r, mocks: mk, studyMin };
  };

  const selInfo = dayInfo(selected) || { tasks: [], reviews: [], mocks: [], studyMin: 0 };
  const addTaskForSelected = () => {
    if (!newText.trim() || !selected) return;
    setTasks(prev => [...prev, { id: uid(), text: newText.trim(), subject: newSubject, done: false, date: selected }]);
    setNewText("");
  };
  const toggleTask = (id) => setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const removeTask = (id) => setTasks(prev => prev.filter(t => t.id !== id));

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="lg-2col" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "flex-start" }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontFamily: FONTS.display, fontSize: 17, fontWeight: 600 }}>{monthLabel}</div>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn variant="ghost" onClick={() => setCursor(c => { const n = new Date(c); n.setMonth(n.getMonth() - 1); return n; })}><ChevronLeft size={14} /></Btn>
            <Btn variant="ghost" onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); setSelected(todayStr()); }}>Today</Btn>
            <Btn variant="ghost" onClick={() => setCursor(c => { const n = new Date(c); n.setMonth(n.getMonth() + 1); return n; })}><ChevronRight size={14} /></Btn>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ fontSize: 11, color: COLORS.dim, background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "5px 10px" }}>Focused <b style={{ color: COLORS.text, fontFamily: FONTS.mono }}>{fmtMin(monthStats.totalMin)}</b> this month</div>
          <div style={{ fontSize: 11, color: COLORS.dim, background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "5px 10px" }}><b style={{ color: COLORS.text, fontFamily: FONTS.mono }}>{monthStats.activeDays}</b> active days</div>
          <div style={{ fontSize: 11, color: COLORS.dim, background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "5px 10px" }}><b style={{ color: COLORS.text, fontFamily: FONTS.mono }}>{monthStats.tasksDone}</b> targets completed</div>
          <div style={{ fontSize: 11, color: COLORS.dim, background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "5px 10px" }}><b style={{ color: COLORS.text, fontFamily: FONTS.mono }}>{monthStats.mocksTaken}</b> mocks taken</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
          {WEEKDAY_LABELS.map((w, i) => <div key={i} style={{ textAlign: "center", fontSize: 10, color: COLORS.faint, textTransform: "uppercase", padding: "2px 0" }}>{w}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {grid.map((ds, i) => {
            if (!ds) return <div key={i} />;
            const info = dayInfo(ds);
            const isToday = ds === todayStr();
            const isSelected = ds === selected;
            const isExam = ds === examDate;
            const dateNum = parseInt(ds.slice(-2), 10);
            const intensity = info.studyMin === 0 ? 0 : info.studyMin < 30 ? 0.3 : info.studyMin < 90 ? 0.6 : 1;
            return (
              <div key={ds} onClick={() => setSelected(ds)} style={{
                aspectRatio: "1", borderRadius: 6, cursor: "pointer", padding: "5px 6px", position: "relative",
                background: isSelected ? COLORS.inkSoft : intensity > 0 ? `${COLORS.ink}${Math.round(intensity * 30).toString(16).padStart(2, "0")}` : COLORS.panel2,
                border: `1px solid ${isSelected ? COLORS.ink : isExam ? COLORS.danger : COLORS.border}`,
                display: "flex", flexDirection: "column", justifyContent: "space-between",
              }}>
                <div style={{ fontSize: 11, fontFamily: FONTS.mono, color: isToday ? COLORS.ink : COLORS.dim, fontWeight: isToday ? 700 : 400 }}>
                  {dateNum}{isToday && <span style={{ marginLeft: 3, fontSize: 8 }}>•</span>}
                </div>
                <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  {info.tasks.length > 0 && <div title={`${info.tasks.length} task(s)`} style={{ width: 5, height: 5, borderRadius: 1, background: COLORS.ink }} />}
                  {info.reviews.length > 0 && <div title={`${info.reviews.length} review(s) due`} style={{ width: 5, height: 5, borderRadius: 1, background: COLORS.done }} />}
                  {info.mocks.length > 0 && <div title="Mock logged" style={{ width: 5, height: 5, borderRadius: 1, background: COLORS.warn }} />}
                  {isExam && <div title="Exam day" style={{ width: 5, height: 5, borderRadius: 1, background: COLORS.danger }} />}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 14, fontSize: 10, color: COLORS.faint, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 6, height: 6, borderRadius: 1, background: COLORS.ink }} /> Tasks</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 6, height: 6, borderRadius: 1, background: COLORS.done }} /> Reviews due</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 6, height: 6, borderRadius: 1, background: COLORS.warn }} /> Mock logged</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 6, height: 6, borderRadius: 1, background: COLORS.danger }} /> Exam day</div>
          <div>Cell shade = focus time logged that day</div>
        </div>
      </Card>

      <Card title={selected === todayStr() ? "Today" : selected}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: COLORS.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Plan for this day</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <Input value={newText} onChange={e => setNewText(e.target.value)} placeholder="Add a target…" onKeyDown={e => e.key === "Enter" && addTaskForSelected()} />
              <Btn variant="ink" onClick={addTaskForSelected}><Plus size={13} /></Btn>
            </div>
            <Select value={newSubject} onChange={e => setNewSubject(e.target.value)} style={{ marginBottom: 8 }}>
              {profile.subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            {selInfo.tasks.length === 0 ? (
              <div style={{ fontSize: 12, color: COLORS.faint }}>Nothing planned yet.</div>
            ) : selInfo.tasks.map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 12 }}>
                <Bubble status={t.done ? "done" : "todo"} size={16} onClick={() => toggleTask(t.id)} />
                <span style={{ flex: 1, textDecoration: t.done ? "line-through" : "none", color: t.done ? COLORS.faint : COLORS.text }}>{t.text}</span>
                <Trash2 size={12} color={COLORS.faint} style={{ cursor: "pointer" }} onClick={() => removeTask(t.id)} />
              </div>
            ))}
          </div>

          {selInfo.reviews.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: COLORS.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Reviews due</div>
              {selInfo.reviews.map(r => (
                <div key={r.id} style={{ fontSize: 12, color: COLORS.dim, padding: "3px 0" }}>{r.name} <span style={{ fontSize: 10, color: COLORS.faint }}>· {r.subject}</span></div>
              ))}
            </div>
          )}

          {selInfo.mocks.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: COLORS.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Mock tests logged</div>
              {selInfo.mocks.map(m => (
                <div key={m.id} style={{ fontSize: 12, color: COLORS.dim, padding: "3px 0" }}>{m.name} — <span style={{ color: COLORS.ink, fontFamily: FONTS.mono }}>{m.total}/{m.max}</span></div>
              ))}
            </div>
          )}

          {selInfo.studyMin > 0 && (
            <div style={{ fontSize: 12, color: COLORS.dim }}>Focused <b style={{ color: COLORS.text }}>{fmtMin(selInfo.studyMin)}</b> this day.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ---------------- SYLLABUS ----------------
function Syllabus({ syllabus, setSyllabus, profile }) {
  const [activeSubject, setActiveSubject] = useState(profile.subjects[0]);
  const [newChapter, setNewChapter] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [view, setView] = useState("list");
  const [query, setQuery] = useState("");
  const chapters = syllabus[activeSubject] || [];
  const byName = Object.fromEntries(chapters.map(c => [c.name, c]));
  const visibleChapters = query.trim() ? chapters.filter(c => c.name.toLowerCase().includes(query.trim().toLowerCase())) : chapters;

  const isUnlocked = (name) => {
    const deps = (DEPENDENCIES[activeSubject] || {})[name];
    if (!deps) return true;
    return deps.every(d => byName[d] && (byName[d].status === "done" || byName[d].status === "mastered"));
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
    if (!newChapter.trim()) return;
    setSyllabus(prev => ({ ...prev, [activeSubject]: [...(prev[activeSubject] || []), { id: uid(), name: newChapter.trim(), status: "todo", confidence: 0, pyq: 0, module: 0, theory: false, examples: false, doneDate: null, revisionStage: -1, nextRevision: null, notes: "" }] }));
    setNewChapter("");
  };
  const removeChapter = (id) => { if (window.confirm("Delete this chapter and its progress?")) setSyllabus(prev => ({ ...prev, [activeSubject]: prev[activeSubject].filter(c => c.id !== id) })); };

  const doneN = chapters.filter(c => c.status === "done" || c.status === "mastered").length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {profile.subjects.map(s => (
            <div key={s} onClick={() => { setActiveSubject(s); setExpanded(null); }} style={{
              padding: "8px 14px", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 500,
              background: activeSubject === s ? COLORS.ink : COLORS.panel2,
              color: activeSubject === s ? "#fff" : COLORS.dim, border: `1px solid ${activeSubject === s ? COLORS.ink : COLORS.border}`,
            }}>{s}</div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {view === "list" && (
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search chapters…" style={{ width: 180 }} />
          )}
          <div style={{ display: "flex", gap: 6 }}>
            {["list", "map"].map(v => (
              <div key={v} onClick={() => setView(v)} style={{ padding: "7px 12px", borderRadius: 7, cursor: "pointer", fontSize: 12, background: view === v ? COLORS.inkSoft : "transparent", border: `1px solid ${view === v ? COLORS.ink : COLORS.border}`, color: view === v ? COLORS.text : COLORS.faint }}>
                {v === "list" ? "List" : "Concept map"}
              </div>
            ))}
          </div>
        </div>
      </div>

      {view === "list" ? (
        <Card title={`${activeSubject} — ${doneN}/${chapters.length} covered`} right={
          <div style={{ display: "flex", gap: 10, fontSize: 11 }}>
            {STATUS_ORDER.map(s => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 4, color: COLORS.dim }}>
                <Bubble status={s} size={12} /> {STATUS_LABEL[s]}
              </div>
            ))}
          </div>
        }>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {query.trim() && visibleChapters.length === 0 && (
              <div style={{ fontSize: 12, color: COLORS.faint, padding: "12px 4px" }}>No chapters match "{query.trim()}".</div>
            )}
            {visibleChapters.map(c => {
              const unlocked = isUnlocked(c.name);
              const deps = (DEPENDENCIES[activeSubject] || {})[c.name];
              return (
                <div key={c.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 4px" }}>
                    <Bubble status={c.status} onClick={() => cycleStatus(c)} />
                    <div onClick={() => setExpanded(expanded === c.id ? null : c.id)} style={{ flex: 1, fontSize: 13, cursor: "pointer", color: c.status === "todo" ? COLORS.dim : COLORS.text, opacity: unlocked ? 1 : 0.55 }}>
                      {c.name}
                      {!unlocked && <span style={{ fontSize: 10, color: COLORS.warn, marginLeft: 8 }}>needs {deps.filter(d => !(byName[d] && (byName[d].status === "done" || byName[d].status === "mastered"))).join(", ")}</span>}
                    </div>
                    {c.notes && c.notes.trim() && <NotebookPen size={12} color={COLORS.faint} title="Has notes" />}
                    {c.confidence > 0 && <div style={{ display: "flex" }}>{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={11} color={i < c.confidence ? COLORS.warn : COLORS.border} fill={i < c.confidence ? COLORS.warn : "none"} />)}</div>}
                    <div style={{ fontSize: 10, color: COLORS.faint, textTransform: "uppercase", minWidth: 70, textAlign: "right" }}>{STATUS_LABEL[c.status]}</div>
                    <Trash2 size={13} color={COLORS.faint} style={{ cursor: "pointer" }} onClick={() => removeChapter(c.id)} />
                  </div>
                  {expanded === c.id && (
                    <div style={{ padding: "10px 4px 16px 32px", display: "flex", flexDirection: "column", gap: 10, background: COLORS.panel2, borderRadius: 8, marginBottom: 8 }}>
                      <div style={{ display: "flex", gap: 18 }}>
                        <label style={{ fontSize: 12, color: COLORS.dim, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                          <input type="checkbox" checked={c.theory} onChange={e => updateChapter(c.id, { theory: e.target.checked })} /> Theory
                        </label>
                        <label style={{ fontSize: 12, color: COLORS.dim, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                          <input type="checkbox" checked={c.examples} onChange={e => updateChapter(c.id, { examples: e.target.checked })} /> Worked examples
                        </label>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: COLORS.dim, marginBottom: 4 }}>PYQ accuracy — {c.pyq}%</div>
                        <input type="range" min="0" max="100" value={c.pyq} onChange={e => updateChapter(c.id, { pyq: parseInt(e.target.value) })} style={{ width: "100%" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: COLORS.dim, marginBottom: 4 }}>Module questions done — {c.module}%</div>
                        <input type="range" min="0" max="100" value={c.module} onChange={e => updateChapter(c.id, { module: parseInt(e.target.value) })} style={{ width: "100%" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: COLORS.dim, marginBottom: 4 }}>Confidence</div>
                        <div style={{ display: "flex", gap: 4 }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={18} style={{ cursor: "pointer" }} color={i < c.confidence ? COLORS.warn : COLORS.border} fill={i < c.confidence ? COLORS.warn : "none"} onClick={() => updateChapter(c.id, { confidence: i + 1 })} />
                          ))}
                        </div>
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
                      <div>
                        <div style={{ fontSize: 11, color: COLORS.dim, marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}><NotebookPen size={11} /> Quick notes</div>
                        <textarea value={c.notes || ""} onChange={e => updateChapter(c.id, { notes: e.target.value })} placeholder="Formula slips, doubts to ask, things to revisit…" rows={2} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 7, padding: "8px 10px", color: COLORS.text, fontSize: 12, fontFamily: FONTS.body, width: "100%", boxSizing: "border-box", resize: "vertical" }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {chapters.length === 0 && <div style={{ fontSize: 12, color: COLORS.faint, padding: "12px 4px" }}>No chapters yet — add your first one below.</div>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
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
  const maxPerLevel = Math.max(...levelKeys.map(l => levels[l].length));
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
                <rect x={p.x - 68} y={p.y - 20} width={136} height={40} rx={7} fill={COLORS.panel2} stroke={statusColor[c.status]} strokeWidth={1.6} />
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
function RingTimer({ mode, phase, elapsed, phaseTarget, running, size = 180 }) {
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const frac = mode === "pomodoro" ? Math.min(1, elapsed / phaseTarget) : (elapsed % 5400) / 5400;
  const dash = c * frac;
  const ringColor = mode === "pomodoro" && phase !== "focus" ? COLORS.done : COLORS.ink;
  const remaining = mode === "pomodoro" ? Math.max(0, phaseTarget - elapsed) : elapsed;
  const label = mode === "pomodoro"
    ? (phase === "focus" ? (running ? "FOCUS" : "PAUSED") : phase === "long_break" ? "LONG BREAK" : "SHORT BREAK")
    : (running ? "RUNNING" : "PAUSED");
  return (
    <svg width={size} height={size} style={{ display: "block", margin: "0 auto" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COLORS.panel2} strokeWidth="9" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ringColor} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 0.9s linear", opacity: running ? 1 : 0.55 }} />
      <text x="50%" y="47%" textAnchor="middle" fontFamily={FONTS.mono} fontSize={size * 0.15} fontWeight={600} fill={COLORS.text}>
        {fmtClock(remaining)}
      </text>
      <text x="50%" y="63%" textAnchor="middle" fontSize={11} fill={COLORS.faint} letterSpacing="0.08em">{label}</text>
    </svg>
  );
}

function FocusTimer({ sessions, setSessions, profile, timer, setMode, setSubject, setPomoMinutes, onStart, onPause, onStop, onSkipBreak }) {
  const { mode, running, elapsed, subject, pomoMinutes, phase, phaseTarget, cycle, completedFlash } = timer;
  const [logDate, setLogDate] = useState(todayStr());
  const [logSubject, setLogSubject] = useState(profile.subjects[0]);
  const [logHours, setLogHours] = useState("");
  const [logMinutes, setLogMinutes] = useState("");
  const [logSaved, setLogSaved] = useState(false);
  const isBreak = mode === "pomodoro" && phase !== "focus";

  const addManualLog = () => {
    const h = parseFloat(logHours) || 0, m = parseFloat(logMinutes) || 0;
    const totalMin = Math.round(h * 60 + m);
    if (totalMin <= 0 || !logDate) return;
    setSessions(prev => [...prev, { id: uid(), date: logDate, subject: logSubject, minutes: totalMin, startHour: 12, mode: "manual", manual: true }]);
    setLogHours(""); setLogMinutes("");
    setLogSaved(true);
    setTimeout(() => setLogSaved(false), 2500);
  };
  const deleteSession = (id) => { if (window.confirm("Remove this session from your log?")) setSessions(prev => prev.filter(s => s.id !== id)); };

  const recentSessions = useMemo(() => sessions.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 8), [sessions]);

  const stats = useMemo(() => {
    const todayMin = sessions.filter(s => s.date === todayStr()).reduce((a, s) => a + s.minutes, 0);
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = todayStr(d);
      last7.push({ date: ds.slice(5), min: Math.round(sessions.filter(s => s.date === ds).reduce((a, s) => a + s.minutes, 0)) });
    }
    const avg7 = last7.reduce((a, d) => a + d.min, 0) / 7;
    const peak7 = Math.max(0, ...last7.map(d => d.min));
    const last30days = new Set();
    for (let i = 0; i < 30; i++) { const d = new Date(); d.setDate(d.getDate() - i); if (sessions.some(s => s.date === todayStr(d))) last30days.add(todayStr(d)); }
    const consistency = Math.round((last30days.size / 30) * 100);
    const avgSession = sessions.length ? Math.round(sessions.reduce((a, s) => a + s.minutes, 0) / sessions.length) : 0;
    const hourBuckets = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
    sessions.forEach(s => {
      const h = s.startHour ?? 12;
      if (h >= 5 && h < 12) hourBuckets.Morning += s.minutes;
      else if (h >= 12 && h < 17) hourBuckets.Afternoon += s.minutes;
      else if (h >= 17 && h < 21) hourBuckets.Evening += s.minutes;
      else hourBuckets.Night += s.minutes;
    });
    const chronotype = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])[0];
    const chronoLabel = chronotype && chronotype[1] > 0 ? chronotype[0] : "—";
    let wkdSum = 0, wkdN = 0, wknSum = 0, wknN = 0;
    sessions.forEach(s => {
      // parseLocalDate, not `new Date(s.date)` (which parses as UTC and can
      // land on the wrong weekday for users west of UTC).
      const day = parseLocalDate(s.date).getDay();
      if (day === 0 || day === 6) { wknSum += s.minutes; wknN++; } else { wkdSum += s.minutes; wkdN++; }
    });
    const wknAvg = wknN ? Math.round(wknSum / wknN) : 0;
    const wkdAvg = wkdN ? Math.round(wkdSum / wkdN) : 0;
    return { todayMin, last7, avg7: Math.round(avg7), peak7, consistency, avgSession, chronoLabel, wknAvg, wkdAvg };
  }, [sessions]);

  const heatmap = useMemo(() => {
    const out = [];
    for (let i = 34; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = todayStr(d);
      const min = sessions.filter(s => s.date === ds).reduce((a, s) => a + s.minutes, 0);
      out.push({ date: ds, min: Math.round(min) });
    }
    return out;
  }, [sessions]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="lg-2col" style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
        <Card>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {["flow", "pomodoro"].map(m => (
              <div key={m} onClick={() => setMode(m)} title={running ? "Stop the current session to change mode" : ""} style={{ flex: 1, textAlign: "center", padding: "6px 0", borderRadius: 6, fontSize: 12, cursor: running ? "not-allowed" : "pointer", background: mode === m ? COLORS.inkSoft : "transparent", color: mode === m ? COLORS.text : COLORS.faint, border: `1px solid ${mode === m ? COLORS.ink : COLORS.border}`, textTransform: "capitalize", opacity: running && mode !== m ? 0.4 : 1 }}>{m}</div>
            ))}
          </div>
          {running && <div style={{ fontSize: 10, color: COLORS.faint, textAlign: "center", marginTop: -10, marginBottom: 10 }}>Mode locked while a session is running</div>}

          <RingTimer mode={mode} phase={phase} elapsed={elapsed} phaseTarget={phaseTarget} running={running} />

          {completedFlash && (
            <div style={{ textAlign: "center", fontSize: 12, color: completedFlash.kind === "break" ? COLORS.warn : COLORS.done, background: `${completedFlash.kind === "break" ? COLORS.warn : COLORS.done}22`, border: `1px solid ${completedFlash.kind === "break" ? COLORS.warn : COLORS.done}55`, borderRadius: 7, padding: "8px 10px", margin: "14px 0 0" }}>
              {completedFlash.message}
            </div>
          )}

          {mode === "pomodoro" && !isBreak && (
            <div style={{ display: "flex", gap: 6, margin: "16px 0 4px", justifyContent: "center" }}>
              {[15, 25, 45, 60].map(m => (
                <div key={m} onClick={() => !running && setPomoMinutes(m)} style={{
                  padding: "5px 10px", borderRadius: 6, fontSize: 11, cursor: running ? "default" : "pointer",
                  background: pomoMinutes === m ? COLORS.inkSoft : "transparent",
                  border: `1px solid ${pomoMinutes === m ? COLORS.ink : COLORS.border}`,
                  color: pomoMinutes === m ? COLORS.text : COLORS.faint, opacity: running ? 0.6 : 1,
                }}>{m}m</div>
              ))}
            </div>
          )}
          {mode === "pomodoro" && (
            <div style={{ textAlign: "center", fontSize: 10, color: COLORS.faint, margin: "8px 0 4px" }}>
              {isBreak ? "Break — next focus session waiting" : `Cycle ${cycle + 1}/4 · long break after 4 focus sessions`}
            </div>
          )}

          <div style={{ marginTop: 14, marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: COLORS.dim }}>Subject</label>
            <Select value={subject || ""} onChange={e => setSubject(e.target.value)} disabled={running}>
              {profile.subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!running ? (
              <Btn variant="ink" style={{ flex: 1, justifyContent: "center" }} onClick={onStart}><Play size={14} /> {isBreak ? "Start break" : elapsed > 0 ? "Resume" : "Start"}</Btn>
            ) : (
              <Btn variant="subtle" style={{ flex: 1, justifyContent: "center" }} onClick={onPause}><Pause size={14} /> Pause</Btn>
            )}
            {isBreak ? (
              <Btn variant="ghost" onClick={onSkipBreak}>Skip break</Btn>
            ) : (
              <Btn variant="danger" disabled={elapsed === 0 && !running} onClick={onStop}><Square size={14} /> Stop & log</Btn>
            )}
          </div>
          <div style={{ fontSize: 10, color: COLORS.faint, marginTop: 10, textAlign: "center" }}>Keeps running if you switch to another section of Ledger — look for the floating badge. (It can't follow you to other browser tabs — see Settings for details.)</div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            <Stat label="Study streak" value={`${computeStreak(sessions)}d`} />
            <Stat label="Focused today" value={fmtMin(stats.todayMin)} />
            <Stat label="7-day avg" value={fmtMin(stats.avg7)} />
            <Stat label="Consistency (30d)" value={`${stats.consistency}%`} />
          </div>
          <Card title="Patterns" style={{ padding: "12px 14px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 20px" }}>
              <MiniFact label="7-day peak" value={fmtMin(stats.peak7)} />
              <MiniFact label="Avg session" value={fmtMin(stats.avgSession)} />
              <MiniFact label="Chronotype" value={stats.chronoLabel} />
              <MiniFact label="Weekday avg" value={fmtMin(stats.wkdAvg)} />
              <MiniFact label="Weekend avg" value={fmtMin(stats.wknAvg)} />
            </div>
          </Card>
        </div>
      </div>

      <Card title="This week">
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={stats.last7}>
            <XAxis dataKey="date" tick={{ fill: COLORS.faint, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ background: COLORS.panel2, border: `1px solid ${COLORS.border}`, fontSize: 12, borderRadius: 6 }} />
            <Bar dataKey="min" fill={COLORS.ink} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="35-day focus heatmap">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
          {heatmap.map(h => {
            const intensity = h.min === 0 ? 0 : h.min < 30 ? 0.35 : h.min < 90 ? 0.65 : 1;
            return <div key={h.date} title={`${h.date}: ${fmtMin(h.min)}`} style={{ aspectRatio: "1", borderRadius: 4, background: intensity === 0 ? COLORS.panel2 : COLORS.ink, opacity: intensity === 0 ? 1 : 0.25 + intensity * 0.75, border: `1px solid ${COLORS.border}` }} />;
          })}
        </div>
      </Card>

      <div className="lg-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card title="Log a session you didn't time">
          <div style={{ fontSize: 11, color: COLORS.faint, marginBottom: 10 }}>Studied offline, with a physical clock, or forgot to start the timer? Add it here — it counts the same as a tracked session.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: COLORS.dim }}>Date</label>
              <Input type="date" value={logDate} max={todayStr()} onChange={e => setLogDate(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: COLORS.dim }}>Subject</label>
              <Select value={logSubject} onChange={e => setLogSubject(e.target.value)}>
                {profile.subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: COLORS.dim }}>Hours</label>
                <Input type="number" min="0" step="1" placeholder="0" value={logHours} onChange={e => setLogHours(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: COLORS.dim }}>Minutes</label>
                <Input type="number" min="0" max="59" step="1" placeholder="0" value={logMinutes} onChange={e => setLogMinutes(e.target.value)} />
              </div>
            </div>
            <Btn variant="ink" onClick={addManualLog} style={{ justifyContent: "center" }}><Plus size={14} /> Add to log</Btn>
            {logSaved && <div style={{ fontSize: 11, color: COLORS.done }}>Added — it's now counted in your stats and streak.</div>}
          </div>
        </Card>

        <Card title="Recent sessions">
          {recentSessions.length === 0 ? (
            <div style={{ fontSize: 12, color: COLORS.faint }}>Nothing logged yet.</div>
          ) : recentSessions.map(s => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 2px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12 }}>
              <div style={{ fontSize: 10, color: COLORS.faint, minWidth: 68 }}>{s.date}</div>
              <div style={{ flex: 1, color: COLORS.text }}>{s.subject}</div>
              {s.manual && <div style={{ fontSize: 9, color: COLORS.faint, border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: "1px 5px" }}>manual</div>}
              <div style={{ fontFamily: FONTS.mono, color: COLORS.ink, minWidth: 44, textAlign: "right" }}>{fmtMin(s.minutes)}</div>
              <Trash2 size={12} color={COLORS.faint} style={{ cursor: "pointer" }} onClick={() => deleteSession(s.id)} />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ---------------- FLOATING TIMER ----------------
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
        userSelect: "none", background: COLORS.panel, border: `1.5px solid ${COLORS.ink}`, borderRadius: collapsed ? 26 : 12,
        boxShadow: "0 10px 30px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", gap: collapsed ? 0 : 10,
        padding: collapsed ? "10px" : "10px 12px", transition: "border-radius 0.15s",
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
function iconBtnStyle(danger) {
  return { width: 22, height: 22, borderRadius: 5, border: `1px solid ${danger ? COLORS.danger + "66" : COLORS.border}`, background: COLORS.panel2, color: danger ? COLORS.danger : COLORS.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };
}

// ---------------- TASKS ----------------
function Tasks({ tasks, setTasks, profile, dpp, setDpp }) {
  const [text, setText] = useState("");
  const [subject, setSubject] = useState(profile.subjects[0]);
  const [priority, setPriority] = useState("medium");
  const [customAdd, setCustomAdd] = useState("");
  const today = todayStr();
  const priorityRank = { high: 0, medium: 1, low: 2 };
  const todayTasks = tasks.filter(t => t.date === today).slice().sort((a, b) => (priorityRank[a.priority || "medium"] ?? 1) - (priorityRank[b.priority || "medium"] ?? 1));
  const missed = tasks.filter(t => t.date < today && !t.done);

  const add = () => {
    if (!text.trim()) return;
    setTasks(prev => [...prev, { id: uid(), text: text.trim(), subject, priority, done: false, date: today }]);
    setText("");
  };
  const toggle = (id) => setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const remove = (id) => { if (window.confirm("Delete this task?")) setTasks(prev => prev.filter(t => t.id !== id)); };
  const rescheduleToday = (id) => setTasks(prev => prev.map(t => t.id === id ? { ...t, date: today } : t));
  const rescheduleAll = () => setTasks(prev => prev.map(t => (t.date < today && !t.done) ? { ...t, date: today } : t));

  const doneN = todayTasks.filter(t => t.done).length;
  const pct = todayTasks.length ? Math.round((doneN / todayTasks.length) * 100) : 0;

  const record = todayDppRecord(dpp);
  const dppPct = record.target ? Math.min(100, Math.round((record.solved / record.target) * 100)) : 0;
  const updateDpp = (patch) => {
    setDpp(prev => {
      const exists = prev.some(d => d.date === today);
      const next = exists ? prev.map(d => d.date === today ? { ...d, ...patch } : d) : [...prev, { ...record, ...patch }];
      return next;
    });
  };
  const bumpSolved = (n) => updateDpp({ solved: Math.max(0, record.solved + n) });
  const dppStreak = useMemo(() => {
    let streak = 0, d = new Date();
    while (true) {
      const ds = todayStr(d);
      const rec = dpp.find(x => x.date === ds);
      if (rec && rec.target > 0 && rec.solved >= rec.target) { streak++; d.setDate(d.getDate() - 1); } else break;
    }
    return streak;
  }, [dpp]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {missed.length > 0 && (
        <Card title={`Missed from earlier days (${missed.length})`} right={<Btn variant="ghost" onClick={rescheduleAll}>Move all to today</Btn>}>
          {missed.map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 4px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13 }}>
              <span style={{ fontSize: 10, color: COLORS.faint }}>{t.date}</span>
              <div style={{ flex: 1, color: COLORS.dim }}>{t.text}</div>
              <div style={{ fontSize: 10, color: COLORS.faint, background: COLORS.panel2, padding: "3px 8px", borderRadius: 5 }}>{t.subject}</div>
              <Btn variant="ghost" onClick={() => rescheduleToday(t.id)}>Move to today</Btn>
              <Trash2 size={13} color={COLORS.faint} style={{ cursor: "pointer" }} onClick={() => remove(t.id)} />
            </div>
          ))}
        </Card>
      )}
      <Card title="Daily question practice" right={<div style={{ fontSize: 11, color: COLORS.dim, display: "flex", alignItems: "center", gap: 4 }}><Flame size={12} color={COLORS.warn} /> {dppStreak}d streak</div>}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: COLORS.dim, marginBottom: 6 }}>
              <span>{record.solved} / {record.target} questions</span>
              <span style={{ color: COLORS.ink, fontFamily: FONTS.mono }}>{dppPct}%</span>
            </div>
            <div style={{ height: 8, background: COLORS.panel2, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${dppPct}%`, height: "100%", background: dppPct >= 100 ? COLORS.done : COLORS.ink, transition: "width 0.2s" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <Btn variant="subtle" onClick={() => bumpSolved(-1)}>-1</Btn>
            <Btn variant="ink" onClick={() => bumpSolved(1)}>+1</Btn>
            <Btn variant="ink" onClick={() => bumpSolved(5)}>+5</Btn>
            <Input value={customAdd} onChange={e => setCustomAdd(e.target.value)} placeholder="n" type="number" style={{ width: 56 }} />
            <Btn variant="ghost" onClick={() => { const n = parseInt(customAdd); if (!isNaN(n)) bumpSolved(n); setCustomAdd(""); }}>Add</Btn>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label style={{ fontSize: 11, color: COLORS.faint }}>Target</label>
            <Input type="number" value={record.target} onChange={e => updateDpp({ target: Math.max(1, parseInt(e.target.value) || 1) })} style={{ width: 64 }} />
          </div>
        </div>
      </Card>
      <Card title={`Today — ${doneN}/${todayTasks.length} complete`} right={<div style={{ fontFamily: FONTS.mono, fontSize: 13, color: COLORS.ink }}>{pct}%</div>}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <Input value={text} onChange={e => setText(e.target.value)} placeholder="What are you tackling today?" onKeyDown={e => e.key === "Enter" && add()} />
          <Select value={subject} onChange={e => setSubject(e.target.value)} style={{ width: 140 }}>
            {profile.subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={priority} onChange={e => setPriority(e.target.value)} style={{ width: 110 }}>
            {PRIORITY_ORDER.map(p => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
          </Select>
          <Btn variant="ink" onClick={add}><Plus size={14} /></Btn>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {todayTasks.length === 0 && <div style={{ fontSize: 12, color: COLORS.faint }}>No targets yet. Add one above.</div>}
          {todayTasks.map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 4px", borderBottom: `1px solid ${COLORS.border}` }}>
              <div onClick={() => toggle(t.id)} style={{ cursor: "pointer" }}>
                {t.done ? <CheckCircle2 size={16} color={COLORS.done} /> : <Circle size={16} color={COLORS.faint} />}
              </div>
              <div title={`${PRIORITY_LABEL[t.priority || "medium"]} priority`} style={{ width: 7, height: 7, borderRadius: "50%", background: PRIORITY_COLORS[t.priority || "medium"], flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 13, textDecoration: t.done ? "line-through" : "none", color: t.done ? COLORS.faint : COLORS.text }}>{t.text}</div>
              <div style={{ fontSize: 10, color: COLORS.faint, background: COLORS.panel2, padding: "3px 8px", borderRadius: 5 }}>{t.subject}</div>
              <Trash2 size={13} color={COLORS.faint} style={{ cursor: "pointer" }} onClick={() => remove(t.id)} />
            </div>
          ))}
        </div>
      </Card>
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
    if (grade === 3) { ease = ease + 0.15; interval = Math.round(interval * 1.3); }
  }
  return { ease, reps, interval, due: addDays(todayStr(), interval), lastReviewed: todayStr() };
}

function RecallDeck({ cards, setCards, profile }) {
  const [subject, setSubject] = useState(profile.subjects[0]);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [reviewSubject, setReviewSubject] = useState("all");
  const [queue, setQueue] = useState(null);
  const [qi, setQi] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const today = todayStr();
  const dueCards = cards.filter(c => c.due <= today && (reviewSubject === "all" || c.subject === reviewSubject));

  const addCard = () => {
    if (!front.trim() || !back.trim()) return;
    setCards(prev => [...prev, { id: uid(), subject, front: front.trim(), back: back.trim(), ease: 2.5, reps: 0, interval: 0, due: today, lastReviewed: null }]);
    setFront(""); setBack("");
  };
  const removeCard = (id) => { if (window.confirm("Delete this card?")) setCards(prev => prev.filter(c => c.id !== id)); };

  const startReview = () => {
    if (dueCards.length === 0) return;
    setQueue(dueCards.map(c => c.id));
    setQi(0); setRevealed(false);
  };
  const grade = (g) => {
    const id = queue[qi];
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...scheduleCard(c, g) } : c));
    if (qi + 1 < queue.length) { setQi(qi + 1); setRevealed(false); }
    else setQueue(null);
  };

  const currentCard = queue ? cards.find(c => c.id === queue[qi]) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="lg-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <Stat label="Cards in deck" value={cards.length} />
        <Stat label="Due today" value={dueCards.length} />
        <Stat label="Mastered (30d+ interval)" value={cards.filter(c => c.interval >= 30).length} />
      </div>

      {queue ? (
        <Card title={`Reviewing — ${qi + 1}/${queue.length}`}>
          <div style={{ minHeight: 140, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "20px 10px" }}>
            <div style={{ fontSize: 10, color: COLORS.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>{currentCard?.subject}</div>
            <div style={{ fontSize: 16, color: COLORS.text, marginBottom: revealed ? 16 : 0 }}>{currentCard?.front}</div>
            {revealed && <div style={{ fontSize: 14, color: COLORS.ink, borderTop: `1px dashed ${COLORS.border}`, paddingTop: 14, marginTop: 4 }}>{currentCard?.back}</div>}
          </div>
          {!revealed ? (
            <Btn variant="ink" style={{ width: "100%", justifyContent: "center" }} onClick={() => setRevealed(true)}>Show answer</Btn>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              <Btn variant="danger" style={{ justifyContent: "center" }} onClick={() => grade(0)}>Again</Btn>
              <Btn variant="subtle" style={{ justifyContent: "center" }} onClick={() => grade(1)}>Hard</Btn>
              <Btn variant="ink" style={{ justifyContent: "center" }} onClick={() => grade(2)}>Good</Btn>
              <Btn variant="ghost" style={{ justifyContent: "center" }} onClick={() => grade(3)}>Easy</Btn>
            </div>
          )}
        </Card>
      ) : (
        <Card title="Review session" right={
          <Select value={reviewSubject} onChange={e => setReviewSubject(e.target.value)} style={{ width: 160 }}>
            <option value="all">All subjects</option>
            {profile.subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        }>
          {dueCards.length === 0 ? (
            <div style={{ fontSize: 12, color: COLORS.faint }}>Nothing due right now — add cards below or come back later.</div>
          ) : (
            <Btn variant="ink" onClick={startReview}><Layers size={14} /> Review {dueCards.length} card{dueCards.length === 1 ? "" : "s"}</Btn>
          )}
        </Card>
      )}

      <Card title="Add a card">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Select value={subject} onChange={e => setSubject(e.target.value)}>
            {profile.subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <textarea placeholder="Front — question or prompt" value={front} onChange={e => setFront(e.target.value)} rows={2} style={{ background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: 7, padding: "9px 11px", color: COLORS.text, fontSize: 13, fontFamily: FONTS.body, resize: "vertical" }} />
          <textarea placeholder="Back — answer" value={back} onChange={e => setBack(e.target.value)} rows={2} style={{ background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: 7, padding: "9px 11px", color: COLORS.text, fontSize: 13, fontFamily: FONTS.body, resize: "vertical" }} />
          <Btn variant="ink" onClick={addCard} style={{ justifyContent: "center" }}><Plus size={14} /> Add card</Btn>
        </div>
      </Card>

      <Card title={`All cards (${cards.length})`}>
        {cards.length === 0 && <div style={{ fontSize: 12, color: COLORS.faint }}>No cards yet — add your first one above.</div>}
        {cards.slice().reverse().map(c => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ flex: 1, fontSize: 12 }}>
              <div style={{ color: COLORS.text }}>{c.front}</div>
              <div style={{ color: COLORS.faint, fontSize: 10, marginTop: 2 }}>{c.subject} · due {c.due} · interval {c.interval}d</div>
            </div>
            <Trash2 size={13} color={COLORS.faint} style={{ cursor: "pointer" }} onClick={() => removeCard(c.id)} />
          </div>
        ))}
      </Card>
    </div>
  );
}

// ---------------- MOCKS ----------------
function Mocks({ mocks, setMocks, profile }) {
  const [name, setName] = useState("");
  const [max, setMax] = useState(300);
  const [total, setTotal] = useState("");
  const [subjectScores, setSubjectScores] = useState(profile.subjects.map(s => ({ subject: s, obtained: "", max: "" })));

  const addMock = () => {
    if (!name.trim() || total === "") return;
    setMocks(prev => [...prev, { id: uid(), date: todayStr(), name: name.trim(), total: parseFloat(total), max: parseFloat(max), subjectScores: subjectScores.map(s => ({ ...s, obtained: parseFloat(s.obtained) || 0, max: parseFloat(s.max) || 0 })) }]);
    setName(""); setTotal("");
  };
  const removeMock = (id) => { if (window.confirm("Delete this mock test record?")) setMocks(prev => prev.filter(m => m.id !== id)); };

  const trend = mocks.map((m, i) => ({ name: `T${i + 1}`, score: m.max ? Math.round((m.total / m.max) * 100) : 0 }));
  const avg = mocks.length ? Math.round(mocks.reduce((a, m) => a + (m.max ? (m.total / m.max) * 100 : 0), 0) / mocks.length) : 0;
  const best = mocks.length ? Math.round(Math.max(...mocks.map(m => (m.max ? (m.total / m.max) * 100 : 0)))) : 0;
  const recentTrend = mocks.length >= 2 ? Math.round((mocks[mocks.length - 1].max ? (mocks[mocks.length - 1].total / mocks[mocks.length - 1].max) * 100 : 0)) - Math.round((mocks[mocks.length - 2].max ? (mocks[mocks.length - 2].total / mocks[mocks.length - 2].max) * 100 : 0)) : 0;

  const subjectAvg = profile.subjects.map(sub => {
    // Guard against mocks whose subjectScores is missing (older exports /
    // hand-edited JSON) — a bare `.find` on undefined would crash the tab.
    const scores = mocks.map(m => (m.subjectScores || []).find(s => s.subject === sub)).filter(Boolean);
    const pct = scores.length ? Math.round(scores.reduce((a, s) => a + (s.max ? (s.obtained / s.max) * 100 : 0), 0) / scores.length) : 0;
    return { subject: sub, pct };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="lg-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <Stat label="Tests taken" value={mocks.length} />
        <Stat label="Avg score" value={`${avg}%`} />
        <Stat label="Best score" value={`${best}%`} />
        <Stat label="Recent trend" value={`${recentTrend >= 0 ? "+" : ""}${recentTrend}%`} />
      </div>

      <Card title="Performance trajectory">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={trend}>
            <CartesianGrid stroke={COLORS.border} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: COLORS.faint, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: COLORS.faint, fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip contentStyle={{ background: COLORS.panel2, border: `1px solid ${COLORS.border}`, fontSize: 12, borderRadius: 6 }} />
            <Line type="monotone" dataKey="score" stroke={COLORS.ink} strokeWidth={2} dot={{ r: 3, fill: COLORS.ink }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Subject-wise average">
        <div className="lg-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${profile.subjects.length}, 1fr)`, gap: 10 }}>
          {subjectAvg.map(s => (
            <div key={s.subject} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: COLORS.dim, marginBottom: 6 }}>{s.subject}</div>
              <div style={{ height: 70, background: COLORS.panel2, borderRadius: 6, display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
                <div style={{ width: "100%", height: `${s.pct}%`, background: COLORS.ink }} />
              </div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 13, marginTop: 6 }}>{s.pct}%</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Log a mock test">
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
          <Input placeholder="Test name (e.g. FT-12)" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Total scored" type="number" value={total} onChange={e => setTotal(e.target.value)} />
          <Input placeholder="Max marks" type="number" value={max} onChange={e => setMax(e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${profile.subjects.length}, 1fr)`, gap: 8, marginBottom: 12 }}>
          {subjectScores.map((s, i) => (
            <div key={s.subject} style={{ display: "flex", gap: 4 }}>
              <Input placeholder={`${s.subject} obt.`} type="number" value={s.obtained} onChange={e => setSubjectScores(prev => prev.map((p, j) => j === i ? { ...p, obtained: e.target.value } : p))} />
              <Input placeholder="max" type="number" value={s.max} onChange={e => setSubjectScores(prev => prev.map((p, j) => j === i ? { ...p, max: e.target.value } : p))} />
            </div>
          ))}
        </div>
        <Btn variant="ink" onClick={addMock}><Plus size={14} /> Log mock</Btn>
      </Card>

      <Card title="Test history">
        {mocks.slice().reverse().map(m => (
          <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 4px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13 }}>
            <div>{m.name} <span style={{ color: COLORS.faint, fontSize: 11 }}>· {m.date}</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontFamily: FONTS.mono, color: COLORS.ink }}>{m.total}/{m.max}</div>
              <Trash2 size={13} color={COLORS.faint} style={{ cursor: "pointer" }} onClick={() => removeMock(m.id)} />
            </div>
          </div>
        ))}
        {mocks.length === 0 && <div style={{ fontSize: 12, color: COLORS.faint }}>No mocks logged yet.</div>}
      </Card>
    </div>
  );
}

// ---------------- ERROR LOG ----------------
const ERROR_TYPES = ["Conceptual", "Calculative", "Silly mistake", "Formula", "Misread question"];
const ERROR_COLORS = { Conceptual: "#C1443D", Calculative: "#C1592F", "Silly mistake": "#C98A3E", Formula: "#6FA287", "Misread question": "#6E8CA0" };

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="lg-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card title="Log a mistake">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Input placeholder="Topic / chapter" value={topic} onChange={e => setTopic(e.target.value)} />
            <Select value={type} onChange={e => setType(e.target.value)}>
              {ERROR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
            <Select value={linkedMock} onChange={e => setLinkedMock(e.target.value)}>
              <option value="">No linked mock</option>
              {mocks.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
            <textarea placeholder="What went wrong, and how to fix it next time…" value={desc} onChange={e => setDesc(e.target.value)} rows={3} style={{ background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: 7, padding: "9px 11px", color: COLORS.text, fontSize: 13, fontFamily: FONTS.body, resize: "vertical" }} />
            <Btn variant="ink" onClick={add} style={{ justifyContent: "center" }}><Plus size={14} /> Log mistake</Btn>
          </div>
        </Card>

        <Card title="Mistake profile">
          {profileData.length === 0 ? (
            <div style={{ fontSize: 12, color: COLORS.faint }}>Log your first mistake to see your profile.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={profileData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                  {profileData.map((d, i) => <Cell key={i} fill={ERROR_COLORS[d.name]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: COLORS.panel2, border: `1px solid ${COLORS.border}`, fontSize: 12, borderRadius: 6 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card title="Recent errors">
        {errors.slice().reverse().map(e => (
          <div key={e.id} style={{ padding: "10px 4px", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13 }}>{e.topic} <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: `${ERROR_COLORS[e.type]}22`, color: ERROR_COLORS[e.type], marginLeft: 6 }}>{e.type}</span></div>
              <Trash2 size={13} color={COLORS.faint} style={{ cursor: "pointer" }} onClick={() => remove(e.id)} />
            </div>
            {e.description && <div style={{ fontSize: 12, color: COLORS.dim, marginTop: 4 }}>{e.description}</div>}
          </div>
        ))}
        {errors.length === 0 && <div style={{ fontSize: 12, color: COLORS.faint }}>No errors logged yet — that's either great discipline or you haven't started reviewing mocks.</div>}
      </Card>
    </div>
  );
}

// ---------------- PEERS ----------------
function Peers({ profile, peers, setPeers, peerData, sessions, groupDefs, onCreateGroup, onJoinGroup, onLeaveGroup }) {
  const [codeInput, setCodeInput] = useState("");
  const [copied, setCopied] = useState(false);
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
    else setJoinError("No group found with that code, or you're already a member.");
  };

  const addPeer = () => {
    const c = codeInput.trim().toUpperCase();
    if (!c || c === profile.code || peers.includes(c)) return;
    setPeers(prev => [...prev, c]);
    setCodeInput("");
  };
  const removePeer = (c) => setPeers(prev => prev.filter(p => p !== c));

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card title="Your identity code">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: 20, letterSpacing: "0.15em", background: COLORS.panel2, padding: "8px 16px", borderRadius: 7, border: `1px solid ${COLORS.border}` }}>{profile.code}</div>
          <Btn variant="ghost" onClick={() => { navigator.clipboard?.writeText(profile.code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}><Copy size={13} /> {copied ? "Copied" : "Copy"}</Btn>
        </div>
        <div style={{ fontSize: 11, color: COLORS.faint, marginTop: 10 }}>
          Share this with a study partner. Their leaderboard entry — name, today's focus minutes, streak — is stored in a shared table anyone with the code can read; nothing else about your account is exposed.
        </div>
      </Card>

      <Card title="Add a peer">
        <div style={{ display: "flex", gap: 8 }}>
          <Input placeholder="Enter their 6-character code" value={codeInput} onChange={e => setCodeInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addPeer()} />
          <Btn variant="ink" onClick={addPeer}><Plus size={14} /> Add</Btn>
        </div>
      </Card>

      <Card title="Leaderboard — today's focus time" right={<div style={{ fontSize: 10, color: COLORS.faint }}>Resets at midnight</div>}>
        <div className="lg-card" style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${COLORS.border}` }}>
          {board.map((p, i) => {
            const rank = i + 1;
            const isTop3 = rank <= 3;
            const stampColor = isTop3 ? RANK_COLORS[i] : COLORS.faint;
            const isSelf = p.code === profile.code;
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
                  background: isSelf ? hexToRgba(COLORS.ink, 0.08) : "transparent",
                }}
              >
                {isSelf && (
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
                      background: isSelf
                        ? `linear-gradient(150deg, ${COLORS.ink}, ${darken(COLORS.ink, 22)})`
                        : `linear-gradient(150deg, ${COLORS.faint}, ${darken(COLORS.faint, 20)})`,
                    }}
                  >
                    {initialsOf(p.name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.name}
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
                {!isSelf ? (
                  <Trash2 size={13} color={COLORS.faint} style={{ cursor: "pointer" }} onClick={() => removePeer(p.code)} />
                ) : <span />}
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Study groups">
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <Input placeholder="New group name" value={groupName} onChange={e => setGroupName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreateGroup()} />
          <Btn variant="ink" disabled={creatingGroup} onClick={handleCreateGroup}><Plus size={14} /> Create</Btn>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <Input placeholder="Join with a group code" value={joinCode} onChange={e => setJoinCode(e.target.value)} onKeyDown={e => e.key === "Enter" && handleJoinGroup()} />
          <Btn variant="ghost" disabled={joiningGroup} onClick={handleJoinGroup}>Join</Btn>
        </div>
        {joinError && <div style={{ fontSize: 11, color: COLORS.danger }}>{joinError}</div>}
        {Object.keys(groupDefs).length === 0 ? (
          <div style={{ fontSize: 12, color: COLORS.faint }}>Not in any groups yet — create one or join with a code.</div>
        ) : (
          <div className="lg-card" style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${COLORS.border}` }}>
            {Object.values(groupDefs).map((g, i, arr) => (
              <div
                key={g.code}
                className="lg-row"
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: i < arr.length - 1 ? `1px solid ${COLORS.border}` : "none" }}
              >
                <div style={{ width: 30, height: 30, borderRadius: 8, background: COLORS.panel2, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Award size={14} color={COLORS.ink} />
                </div>
                <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>{g.name}</div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.faint, letterSpacing: "0.05em" }}>{g.code}</div>
                <Btn variant="danger" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => onLeaveGroup(g.code)}>Leave</Btn>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ---------------- SETTINGS ----------------
function SettingsTab({ profile, setProfile, data, setters, settings, setSettings, onResetFloatPosition }) {
  const [importError, setImportError] = useState("");
  const [importOk, setImportOk] = useState(false);

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
      if (parsed.profile) setProfile(parsed.profile);
      if (Array.isArray(parsed.syllabus) === false && parsed.syllabus) setters.setSyllabus(parsed.syllabus);
      if (Array.isArray(parsed.tasks)) setters.setTasks(parsed.tasks);
      if (Array.isArray(parsed.sessions)) setters.setSessions(parsed.sessions);
      if (Array.isArray(parsed.mocks)) setters.setMocks(parsed.mocks);
      if (Array.isArray(parsed.errors)) setters.setErrors(parsed.errors);
      if (Array.isArray(parsed.dpp)) setters.setDpp(parsed.dpp);
      if (Array.isArray(parsed.cards)) setters.setCards(parsed.cards);
      if (Array.isArray(parsed.peers)) setters.setPeers(parsed.peers);
      if (parsed.settings && typeof parsed.settings === "object") setSettings(parsed.settings);
      setImportOk(true);
      setTimeout(() => setImportOk(false), 4000);
    };
    reader.onerror = () => setImportError("Couldn't read that file.");
    reader.readAsText(file);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 500 }}>
      <Card title="Profile">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: COLORS.dim }}>Display name</label>
            <Input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: COLORS.dim }}>Target date</label>
            <Input type="date" value={profile.targetDate} onChange={e => setProfile({ ...profile, targetDate: e.target.value })} />
          </div>
        </div>
      </Card>

      <Card title="Theme">
        <div style={{ fontSize: 11, color: COLORS.dim, marginBottom: 10 }}>Each theme is a full palette — background, panels, and typeface all change together, not just an accent color.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {Object.entries(THEME_PRESETS).map(([id, t]) => (
            <div key={id} onClick={() => setSettings(s => ({ ...s, theme: id }))} style={{
              cursor: "pointer", borderRadius: 9, padding: "10px 10px 9px", border: `1.5px solid ${settings.theme === id ? t.accent : COLORS.border}`,
              background: t.panel,
            }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                <div style={{ flex: 1, height: 18, borderRadius: 4, background: t.bg, border: `1px solid ${t.border}` }} />
                <div style={{ width: 18, height: 18, borderRadius: 4, background: t.accent, flexShrink: 0 }} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{t.label}</div>
              {settings.theme === id && <div style={{ fontSize: 10, color: t.accent, marginTop: 2 }}>Active</div>}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Focus timer">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>Floating timer badge</div>
            <div style={{ fontSize: 11, color: COLORS.faint, marginTop: 2, maxWidth: 340 }}>Shows a small draggable badge with the running time when you leave Deep Work for another section of Ledger.</div>
          </div>
          <label style={{ position: "relative", display: "inline-block", width: 40, height: 22, flexShrink: 0, cursor: "pointer" }}>
            <input type="checkbox" checked={settings.floatingTimer !== false} onChange={e => setSettings(s => ({ ...s, floatingTimer: e.target.checked }))} style={{ opacity: 0, width: 0, height: 0 }} />
            <span style={{ position: "absolute", inset: 0, borderRadius: 22, background: settings.floatingTimer !== false ? COLORS.ink : COLORS.panel2, border: `1px solid ${COLORS.border}`, transition: "background 0.15s" }} />
            <span style={{ position: "absolute", top: 2, left: settings.floatingTimer !== false ? 20 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
          </label>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: 11, color: COLORS.faint, maxWidth: 340 }}>Dragged the badge somewhere awkward? Snap it back to the bottom-right corner.</div>
          <Btn variant="ghost" onClick={onResetFloatPosition}>Reset position</Btn>
        </div>
        <div style={{ fontSize: 11, color: COLORS.faint, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${COLORS.border}`, lineHeight: 1.6 }}>
          <b style={{ color: COLORS.dim }}>Heads up:</b> Ledger runs inside a sandboxed panel in your browser, so it can't render on top of other apps or other browser tabs (like a video call or YouTube). The badge only floats within Ledger itself. If you switch away entirely, the timer keeps its place — it'll show the correct elapsed time the moment you come back — but it won't be visible while you're elsewhere.
        </div>
      </Card>

      <Card title="Data">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn variant="ghost" onClick={exportData}><Download size={14} /> Export all data (JSON)</Btn>
          <input id="ledger-import-input" type="file" accept="application/json" onChange={handleImportFile} style={{ display: "none" }} />
          <Btn variant="ghost" onClick={() => document.getElementById("ledger-import-input").click()}><ClipboardList size={14} /> Import from JSON</Btn>
        </div>
        {importError && <div style={{ fontSize: 11, color: COLORS.danger, marginTop: 10 }}>{importError}</div>}
        {importOk && <div style={{ fontSize: 11, color: COLORS.done, marginTop: 10 }}>Import complete — your data has been restored.</div>}
        <div style={{ fontSize: 11, color: COLORS.faint, marginTop: 10 }}>
          Your data lives in Supabase, scoped to your account. Export regularly if you want an offline backup, and import that same file here to restore it.
        </div>
      </Card>

      <Card title="About this build">
        <div style={{ fontSize: 12, color: COLORS.dim, lineHeight: 1.7 }}>
          Ledger — real syllabus tracking, real timers, real accounts and persistent storage.
        </div>
      </Card>
    </div>
  );
}

// ---------------- AUTH ----------------
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
    if (!email.trim()) return;
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
    <div style={{ background: COLORS.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONTS.body, color: COLORS.text }}>
      <style>{FONT_IMPORT}</style>
      <div style={{ width: 360, background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "32px 30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: COLORS.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookMarked size={14} color="#fff" />
          </div>
          <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 17 }}>Ledger</div>
        </div>
        {sent ? (
          <div style={{ fontSize: 13, color: COLORS.dim, lineHeight: 1.6 }}>
            Check <b style={{ color: COLORS.text }}>{email}</b> for a sign-in link. You can close this tab.
          </div>
        ) : (
          <>
            <button onClick={signInWithDiscord} disabled={discordLoading} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              padding: "10px 14px", borderRadius: 7, cursor: discordLoading ? "not-allowed" : "pointer",
              background: COLORS.panel2, border: `1px solid ${COLORS.border}`, color: COLORS.text,
              fontFamily: FONTS.body, fontSize: 13, fontWeight: 500, opacity: discordLoading ? 0.6 : 1,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.87-.61 1.25a18.27 18.27 0 0 0-5.49 0 12.64 12.64 0 0 0-.62-1.25.08.08 0 0 0-.08-.04 19.74 19.74 0 0 0-4.88 1.52.07.07 0 0 0-.04.05C1.72 8.13 1.06 11.8 1.38 15.43a.08.08 0 0 0 .03.05 19.9 19.9 0 0 0 6 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.22-2a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.89.08.08 0 0 1-.01-.13c.13-.09.25-.19.37-.29a.07.07 0 0 1 .08-.01c3.92 1.8 8.16 1.8 12.04 0a.07.07 0 0 1 .08.01c.12.1.25.2.38.29a.08.08 0 0 1 0 .13c-.6.35-1.22.64-1.87.89a.08.08 0 0 0-.04.11c.36.7.77 1.37 1.22 2a.08.08 0 0 0 .08.03 19.83 19.83 0 0 0 6.01-3.03.08.08 0 0 0 .03-.05c.38-4.21-.63-7.85-2.67-11.01a.06.06 0 0 0-.03-.05ZM8.99 13.28c-1.18 0-2.15-1.08-2.15-2.4s.95-2.4 2.15-2.4c1.21 0 2.17 1.09 2.15 2.4 0 1.32-.95 2.4-2.15 2.4Zm6.02 0c-1.18 0-2.15-1.08-2.15-2.4s.95-2.4 2.15-2.4c1.21 0 2.17 1.09 2.15 2.4 0 1.32-.94 2.4-2.15 2.4Z" />
              </svg>
              {discordLoading ? "Redirecting to Discord…" : "Continue with Discord"}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0" }}>
              <div style={{ flex: 1, height: 1, background: COLORS.border }} />
              <div style={{ fontSize: 11, color: COLORS.faint }}>or</div>
              <div style={{ flex: 1, height: 1, background: COLORS.border }} />
            </div>
            <div style={{ fontSize: 13, color: COLORS.dim, marginBottom: 16 }}>Sign in with your email — we'll send a one-click link, no password needed.</div>
            <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && sendLink()} />
            {error && <div style={{ fontSize: 11, color: COLORS.danger, marginTop: 8 }}>{error}</div>}
            <Btn variant="ink" style={{ width: "100%", justifyContent: "center", marginTop: 14 }} disabled={loading} onClick={sendLink}>
              {loading ? "Sending…" : "Send sign-in link"}
            </Btn>
            {onDemo && (
              <button
                onClick={onDemo}
                style={{
                  width: "100%", marginTop: 12, padding: "8px 12px", background: "transparent",
                  border: `1px dashed ${COLORS.border}`, borderRadius: 7, color: COLORS.dim,
                  fontSize: 12, cursor: "pointer", fontFamily: FONTS.body,
                }}
              >
                Continue as Guest / Demo Mode
              </button>
            )}
          </>
        )}
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
    return <div style={{ background: COLORS.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.dim, fontFamily: FONTS.body }}>Loading…</div>;
  }
  if (!session) return <AuthScreen onDemo={() => setSession({ user: { id: "demo-user", email: "demo@ledger.app" } })} />;
  return <Workspace session={session} />;
}
