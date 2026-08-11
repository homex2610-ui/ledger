import React, { useState, useEffect, useRef } from "react";
import {
  Target, Timer as TimerIcon, BookOpen, Layers, TrendingUp, AlertTriangle,
  Users, Flame, Pin, PinOff
} from "lucide-react";
import { COLORS, FONTS, hexToRgba } from "../../lib/theme";
import { todayStr, fmtMin } from "../../lib/utils";
import AccountPanel from "./AccountPanel";

// 6 hours/day default focus goal — the "focus ring" reference.
export const DAILY_GOAL_MIN = 360;

// Primary workspaces — the surfaces you actually live in.
const DOCK = [
  { id: "dashboard", label: "Home", icon: Target },
  { id: "timer", label: "Focus", icon: TimerIcon },
  { id: "syllabus", label: "Coverage", icon: BookOpen },
  { id: "cards", label: "Recall", icon: Layers },
  { id: "mocks", label: "Tests", icon: TrendingUp },
  { id: "errors", label: "Mistakes", icon: AlertTriangle },
];

// Community sits below a divider; the account popover carries Settings,
// Sign out and overflow actions only.
const COMMUNITY = { id: "community", label: "Community", icon: Users };

function streakOf(sessions = []) {
  const days = new Set(sessions.map(s => s.date));
  let streak = 0;
  const d = new Date();
  while (days.has(todayStr(d))) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

// The signature motif in miniature — today's focus minutes vs the daily goal.
export function FocusRing({ todayMin = 0, goal = DAILY_GOAL_MIN, size = 64, stroke = 6, gid = "lr-focus-grad", label }) {
  const r = size / 2 - stroke / 2;
  const c = 2 * Math.PI * r;
  const frac = goal > 0 ? Math.min(1, todayMin / goal) : 0;
  const dash = Math.max(2, Math.round(frac * c));
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ display: "block", transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={`url(#${gid})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ transition: "stroke-dasharray 0.7s cubic-bezier(0.2,0.8,0.2,1)" }}
        />
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={COLORS.accentFocus} />
            <stop offset="100%" stopColor={COLORS.accentProgress} />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="num" style={{ fontSize: size * 0.2, fontWeight: 700, color: COLORS.text }}>
          {todayMin > 0 ? fmtMin(todayMin) : "0"}
        </span>
      </div>
    </div>
  );
}

function DockItem({ n, active, onClick, dot }) {
  const Icon = n.icon;
  return (
    <button
      onClick={(e) => { onClick(); if (e.detail > 0) e.currentTarget.blur(); }}
      aria-current={active ? "page" : undefined}
      className={`lg-nav-item${active ? " active" : ""}`}
      title={n.label}
      style={{
        position: "relative", flexShrink: 0,
        background: "transparent", border: "1px solid transparent",
        color: active ? COLORS.accentFocus : COLORS.faint,
        transition: "color 0.16s ease-out, background 0.16s ease-out",
      }}
    >
      <span className="lg-ic-anchor" style={{ flexShrink: 0 }}>
        <Icon size={20} strokeWidth={1.7} />
      </span>
      {dot && (
        <span className="lg-notice-dot" style={{ position: "absolute", top: 5, right: 2, width: 7, height: 7, borderRadius: "50%", background: COLORS.accentFocus }} />
      )}
      <span className="dock-label" style={{
        fontSize: 12.5, letterSpacing: "0.01em", fontWeight: 500, fontFamily: FONTS.body,
        textTransform: "none", color: active ? COLORS.accentFocus : COLORS.dim, whiteSpace: "nowrap",
      }}>{n.label}</span>
    </button>
  );
}

// The account avatar — a hue derived from the user's name, so every account
// gets its own stable color patch (never clashes, never changes between runs).
function nameHue(name) {
  const n = String(name || "Ledger");
  return (n.split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 7) % 360;
}

function ProfileBadge({ initials, streakOn, onClick, expanded, hue = 260 }) {
  return (
    <button onClick={onClick} aria-label="Account" aria-expanded={expanded} aria-haspopup="menu" title="Account"
      style={{ position: "relative", width: 36, height: 36, borderRadius: "50%",
        background: `linear-gradient(155deg, hsl(${hue}, 52%, 44%), hsl(${(hue + 40) % 360}, 55%, 30%))`,
        border: `1px solid ${expanded ? hexToRgba(COLORS.accentFocus, 0.6) : (streakOn ? "rgba(255,164,96,0.6)" : "rgba(255,255,255,0.14)")}`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), 0 0 0 1px ${hexToRgba(COLORS.bg, 0.55)}`,
        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0,
        transition: "border-color 0.18s ease-out, transform 0.16s cubic-bezier(0.2,0.8,0.2,1)" }}>
      <span className="num" style={{ fontSize: 12, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em", textShadow: "0 1px 2px rgba(0,0,0,0.35)" }}>{initials}</span>
      {streakOn && (
        <span style={{ position: "absolute", right: -2, bottom: -2, width: 13, height: 13, borderRadius: "50%", background: COLORS.accentWarm, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 0 2px ${COLORS.bg}` }}>
          <Flame size={9} color="#1a160f" strokeWidth={2.5} />
        </span>
      )}
    </button>
  );
}

// The dock rail — a floating icon column. Labels appear on hover; the active
// tab gets a tiny left tick. Overflow + account live in quiet popovers.
export default function Sidebar({ tab, setTab, profile = {}, sessions = [], settings, stats, email, avatarUrl, onSignOut, notifyRecall = false }) {
  const [open, setOpen] = useState(null); // null | "more" | "account"
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const rootRef = useRef(null);
  const accountCellRef = useRef(null);
  const panelElRef = useRef(null);

  useEffect(() => {
    // The account panel renders in a portal (document.body), so clicks inside
    // it land outside the rail. While it's open it owns its dismissal (outside
    // click + Escape) so it can play its closing animation — the handlers
    // below stand down for it entirely.
    const onDoc = (e) => {
      if (panelElRef.current) return;
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(null);
    };
    const onEsc = (e) => { if (e.key === "Escape" && !panelElRef.current) setOpen(null); };
    // Safety net: pressing anywhere outside the rail clears focus from
    // anything inside it, so :focus-within-style expansion can never get
    // stuck (touch taps, pen, or clicking a non-focusable page area).
    const onDocDown = (e) => {
      const root = rootRef.current;
      if (!root || root.contains(e.target)) return;
      const ae = document.activeElement;
      if (ae && root.contains(ae) && ae !== document.body) ae.blur();
    };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("pointerdown", onDocDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("pointerdown", onDocDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const streak = streakOf(sessions);
  const todayMin = sessions.filter(s => s.date === todayStr()).reduce((a, s) => a + s.minutes, 0);
  const initials = (profile?.name || "?")
    .replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0]).join("").toUpperCase() || "?";
  const hue = nameHue(profile?.name);

  const accountOpen = open === "account";

  return (
    <div
      className={`lg-side-wrap${pinned || hovered || focused ? " lg-side-wrap-open" : ""}`}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}
    >
      <nav className={`sidebar lg-sidebar lg-side${pinned ? " lg-side-pinned" : ""}`} aria-label="Primary" ref={rootRef}>

        <div className="lg-brand-cell" style={{ width: 44, height: 44, flexShrink: 0, alignSelf: "flex-start", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }} title="Ledger">
          <div className="lg-brand-plate" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="num" style={{ fontSize: 12.5, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>L</span>
          </div>
          <span className="lg-brand-name">
            <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, letterSpacing: "-0.01em" }}>Ledger</span>
            <span className="sys" style={{ fontSize: 11, letterSpacing: "0.18em", fontWeight: 500 }}>Study OS</span>
          </span>
        </div>

        <div className="lg-sidebar-nav" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, marginTop: 8 }}>
          {DOCK.map(n => (
            <DockItem key={n.id} n={n} active={tab === n.id} dot={n.id === "cards" && notifyRecall && tab !== "cards"} onClick={() => { setTab(n.id); setOpen(null); }} />
          ))}
          <div className="lg-dock-divider" style={{ width: "72%", height: 1, background: `linear-gradient(90deg, transparent, ${hexToRgba(COLORS.borderStrong, 0.45)} 30%, ${hexToRgba(COLORS.borderStrong, 0.45)} 70%, transparent)`, margin: "8px 0 6px", alignSelf: "center" }} />
          <DockItem n={COMMUNITY} active={tab === COMMUNITY.id} onClick={() => { setTab(COMMUNITY.id); setOpen(null); }} />

          <div ref={accountCellRef} title={streak > 0 ? `${streak}-day streak` : "No streak yet"} className="lg-account-cell" style={{ height: 44, flexShrink: 0, display: "flex", alignItems: "center", cursor: "pointer", borderRadius: 10 }} onClick={() => { setOpen(open === "account" ? null : "account"); }}>
            <ProfileBadge initials={initials} streakOn={streak > 0} expanded={accountOpen} hue={hue} onClick={(e) => { e.stopPropagation(); setOpen(open === "account" ? null : "account"); if (e.detail > 0) e.currentTarget.blur(); }} />
            <span className="dock-label num" style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: FONTS.mono, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "none", color: streak > 0 ? COLORS.accentWarm : COLORS.dim, whiteSpace: "nowrap" }}>
              {streak > 0 && <Flame size={9} strokeWidth={2.5} />}
              {fmtMin(todayMin)}
              <span style={{ color: COLORS.faint, marginLeft: 1 }}>today</span>
            </span>
          </div>
        </div>

        <AccountPanel
          open={accountOpen}
          onClose={() => setOpen(null)}
          anchorRef={accountCellRef}
          onPanelRef={(el) => { panelElRef.current = el; }}
          profile={profile}
          stats={stats}
          settings={settings}
          email={email}
          avatarUrl={avatarUrl}
          onSignOut={onSignOut}
          onNavigate={(tabId) => { setTab(tabId); setOpen(null); }}
        />

        <button
          className="lg-pin-btn"
          onClick={(e) => { setPinned(p => !p); if (e.detail > 0) e.currentTarget.blur(); }}
          aria-pressed={pinned}
          aria-label={pinned ? "Unpin sidebar" : "Pin sidebar open"}
          title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
        >
          {pinned ? <PinOff size={11} strokeWidth={2} /> : <Pin size={11} strokeWidth={2} />}
        </button>
      </nav>
    </div>
  );
}