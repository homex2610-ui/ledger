import React from "react";
import {
  Target, Timer as TimerIcon, BookOpen, ClipboardList, AlertTriangle, Users,
  Settings as SettingsIcon, CalendarDays, Layers, TrendingUp, X, BookMarked,
} from "lucide-react";
import { COLORS, FONTS } from "../../lib/theme";
import { daysBetween } from "../../lib/utils";

// Moved here verbatim from App.jsx (same NAV array, same JSX, same styles).
// This is the single place both App.jsx and Sidebar.jsx used to share — now
// Sidebar owns it since it's the only consumer.
const NAV = [
  { id: "dashboard", label: "Overview", icon: Target },
  { id: "calendar", label: "Month View", icon: CalendarDays },
  { id: "syllabus", label: "Coverage Map", icon: BookOpen },
  { id: "weak", label: "Weak Zones", icon: AlertTriangle },
  { id: "cards", label: "Recall Deck", icon: Layers },
  { id: "timer", label: "Deep Work", icon: TimerIcon },
  { id: "tasks", label: "Daily Targets", icon: ClipboardList },
  { id: "mocks", label: "Test Trends", icon: TrendingUp },
  { id: "errors", label: "Mistake Ledger", icon: AlertTriangle },
  { id: "peers", label: "Community", icon: Users },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

export default function Sidebar({ tab, setTab, profile, onSignOut }) {
  const days = daysBetween(new Date(), profile.targetDate);
  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        {/* Navigation */}
        <div className="sidebar-nav">
          {NAV.map(n => {
            const Icon = n.icon;
            const active = tab === n.id;
            return (
              <div
                key={n.id}
                className={`nav-item${active ? " active" : ""}`}
                onClick={() => setTab(n.id)}
              >
                <Icon size={15} />
                <span>{n.label}</span>
              </div>
            );
          })}
        </div>
      </div>
      <button className="signout-mobile" onClick={onSignOut} title="Sign out">
        <X size={14} />
      </button>
      <div className="sidebar-foot">
        <div style={{ marginBottom: "var(--space-2)" }}>Your code: <span style={{ fontFamily: FONTS.mono, color: COLORS.dim }}>{profile.code}</span></div>
        <div onClick={onSignOut} style={{ cursor: "pointer", color: COLORS.faint }}>Sign out</div>
      </div>
    </div>
  );
}
