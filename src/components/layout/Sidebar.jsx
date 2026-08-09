import React, { useState, useEffect, useRef } from "react";
import {
  Target, Timer as TimerIcon, BookOpen, Layers, TrendingUp, AlertTriangle,
  CalendarDays, Users, Settings as SettingsIcon, LogOut, Flame, MoreHorizontal
} from "lucide-react";
import { COLORS, FONTS, hexToRgba } from "../../lib/theme";
import { todayStr, fmtMin } from "../../lib/utils";

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

// Secondary workspaces — kept behind the overflow, not on the dock.
const MORE_ITEMS = [
  { id: "calendar", label: "Month View", icon: CalendarDays },
  { id: "weak", label: "Weak Zones", icon: AlertTriangle },
  { id: "peers", label: "Community", icon: Users },
];

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
      onClick={onClick}
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
        <span style={{ position: "absolute", top: 5, right: 2, width: 7, height: 7, borderRadius: "50%", background: COLORS.accentFocus, boxShadow: `0 0 0 2px ${COLORS.bg}` }} />
      )}
      <span className="dock-label" style={{
        fontSize: 10, letterSpacing: "0.14em", fontWeight: 600, textTransform: "uppercase",
        color: active ? COLORS.accentFocus : COLORS.dim, whiteSpace: "nowrap",
      }}>{n.label}</span>
    </button>
  );
}

function ProfileBadge({ initials, streakOn, onClick, expanded }) {
  return (
    <button onClick={onClick} aria-label="Account" aria-expanded={expanded} aria-haspopup="menu" title="Account"
      style={{ position: "relative", width: 34, height: 34, borderRadius: "50%", background: expanded ? hexToRgba(COLORS.accentFocus, 0.14) : "rgba(255,255,255,0.06)", border: `1px solid ${expanded ? hexToRgba(COLORS.accentFocus, 0.55) : (streakOn ? "rgba(255,164,96,0.55)" : COLORS.border)}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0, transition: "background 0.18s ease-out, border-color 0.18s ease-out" }}>
      <span className="num" style={{ fontSize: 11, fontWeight: 800, color: streakOn ? COLORS.accentWarm : COLORS.faint, letterSpacing: "-0.01em" }}>{initials}</span>
      {streakOn && (
        <span style={{ position: "absolute", right: -2, bottom: -2, width: 12, height: 12, borderRadius: "50%", background: COLORS.accentWarm, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 0 2px ${COLORS.bg}` }}>
          <Flame size={8} color="#1a160f" />
        </span>
      )}
    </button>
  );
}

// The dock rail — a floating icon column. Labels appear on hover; the active
// tab gets a tiny left tick. Overflow + account live in quiet popovers.
export default function Sidebar({ tab, setTab, profile = {}, sessions = [], onSignOut, notifyRecall = false }) {
  const [open, setOpen] = useState(null); // null | "more" | "account"
  const rootRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(null); };
    const onEsc = (e) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("pointerdown", onDoc); document.removeEventListener("keydown", onEsc); };
  }, []);

  const streak = streakOf(sessions);
  const todayMin = sessions.filter(s => s.date === todayStr()).reduce((a, s) => a + s.minutes, 0);
  const initials = (profile?.name || "?")
    .replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0]).join("").toUpperCase() || "?";

  // normalize icon components for the popover list
  const moreItems = MORE_ITEMS;
  const accountItems = [
    { id: "settings", label: "Settings", icon: SettingsIcon },
    { type: "divider" },
    { id: "signout", label: "Sign out", icon: LogOut },
  ];

  return (
    <div className="lg-side-wrap">
      <nav className="sidebar lg-sidebar lg-side" aria-label="Primary" ref={rootRef}>

        <div className="lg-brand-cell" style={{ width: 44, height: 44, flexShrink: 0, alignSelf: "flex-start", display: "flex", alignItems: "center", justifyContent: "center" }} title="Ledger">
          <div className="lg-brand-plate" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="num" style={{ fontSize: 12.5, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>L</span>
          </div>
        </div>

        <div className="lg-sidebar-nav" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginTop: 12 }}>
          {DOCK.map(n => (
            <DockItem key={n.id} n={n} active={tab === n.id} dot={n.id === "cards" && notifyRecall && tab !== "cards"} onClick={() => { setTab(n.id); setOpen(null); }} />
          ))}
          <div className="lg-dock-divider" style={{ width: "72%", height: 1, background: `linear-gradient(90deg, transparent, ${COLORS.border} 30%, ${COLORS.border} 70%, transparent)`, margin: "12px 0 8px" }} />
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setOpen(open === "more" ? null : "more")}
              className={`lg-nav-item${open === "more" ? " active" : ""}`}
              aria-label="More"
              aria-haspopup="menu"
              aria-expanded={open === "more"}
              title="More workspaces"
              style={{
                flexShrink: 0,
                background: "transparent", border: "1px solid transparent",
                color: open === "more" ? COLORS.accentFocus : COLORS.faint,
                transition: "color 0.16s ease-out, background 0.16s ease-out",
              }}
            >
              <span className="lg-ic-anchor" style={{ flexShrink: 0 }}>
                <MoreHorizontal size={20} strokeWidth={1.7} />
              </span>
              <span className="dock-label" style={{ fontSize: 10, letterSpacing: "0.14em", fontWeight: 600, textTransform: "uppercase", color: open === "more" ? COLORS.accentFocus : COLORS.dim, whiteSpace: "nowrap" }}>More</span>
            </button>
            {open === "more" && (
              <div className="lg-pop" role="menu" onClick={(e) => e.stopPropagation()} style={{ position: "absolute", left: "calc(100% + 12px)", top: "50%", transform: "translateY(-50%)", zIndex: 80, minWidth: 168, maxHeight: "min(60vh, 420px)", overflowY: "auto", borderRadius: 12, padding: 6, background: COLORS.glassFillStrong, border: `1px solid ${COLORS.border}`, boxShadow: `0 18px 44px -18px ${COLORS.shadowStrong}` }}>
                <div className="sys" style={{ fontSize: 8, letterSpacing: "0.2em", color: COLORS.faint, padding: "6px 10px 4px" }}>MORE</div>
                {moreItems.map(it => {
                  const Icon = it.icon;
                  const isActive = tab === it.id;
                  return (
                    <button key={it.id} role="menuitem" className={isActive ? "lg-pop-item active" : "lg-pop-item"} onClick={() => { setTab(it.id); setOpen(null); }}
                      style={{ color: isActive ? COLORS.accentFocus : undefined }}>
                      <Icon size={13} color={isActive ? COLORS.accentFocus : COLORS.faint} />
                      <span style={{ letterSpacing: "0.06em" }}>{it.label}</span>
                      {isActive && <span style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: COLORS.accentFocus }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div title={streak > 0 ? `${streak}-day streak` : "No streak yet"} className="lg-account-cell" style={{ position: "relative", width: 44, height: 44, flexShrink: 0, alignSelf: "flex-start", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ProfileBadge initials={initials} streakOn={streak > 0} expanded={open === "account"} onClick={() => setOpen(open === "account" ? null : "account")} />
          <span className="dock-label" style={{ fontSize: 10, letterSpacing: "0.14em", fontWeight: 600, textTransform: "uppercase", color: COLORS.dim, whiteSpace: "nowrap" }}>Account</span>
          {open === "account" && (
            <div className="lg-pop" role="menu" onClick={(e) => e.stopPropagation()} style={{ position: "absolute", left: "calc(100% + 12px)", bottom: 0, zIndex: 80, minWidth: 196, maxHeight: "min(60vh, 420px)", overflowY: "auto", borderRadius: 12, padding: 6, background: COLORS.glassFillStrong, border: `1px solid ${COLORS.border}`, boxShadow: `0 18px 44px -18px ${COLORS.shadowStrong}` }}>
              <div style={{ padding: "8px 10px 7px", borderBottom: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 11.5, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile?.name || "Student"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                  <span style={{ fontFamily: FONTS.mono, fontSize: 9, letterSpacing: "0.12em", color: COLORS.ink }}>{profile?.code || "————"}</span>
                  <span style={{ height: 10, width: 1, background: COLORS.border }} />
                  <span className="num" style={{ fontSize: 9, color: COLORS.faint }}>{fmtMin(todayMin)} today · {streak}d streak</span>
                </div>
              </div>
              {accountItems.map(it => {
                const isActive = !it.type && it.id !== "signout" && tab === it.id;
                return it.type === "divider" ? (
                  <div key="d" style={{ height: 1, background: COLORS.border, margin: "6px 8px" }} />
                ) : (
                  <button key={it.id} role="menuitem" className={isActive ? "lg-pop-item active" : "lg-pop-item"}
                    onClick={() => { if (it.id === "signout") onSignOut(); else { setTab(it.id); setOpen(null); } }}
                    style={{ color: it.id === "signout" ? COLORS.danger : undefined }}>
                    <it.icon size={13} color={isActive ? COLORS.accentFocus : (it.id === "signout" ? COLORS.danger : COLORS.faint)} />
                    <span style={{ letterSpacing: "0.06em" }}>{it.label}</span>
                    {isActive && <span style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: COLORS.accentFocus }} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}