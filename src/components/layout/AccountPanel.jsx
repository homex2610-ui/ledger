// The profile command center — opened from the sidebar's account cell.
// Desktop: a viewport-clamped popover anchored to the trigger (portaled to
// <body> so no sidebar stacking context can clip or bury it). Mobile: a
// bottom sheet with backdrop. Everything shown is real product data — no
// fabricated statistics, no fake badges, no invented statuses.
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Flame, LogOut, Palette, Settings as SettingsIcon, User, X, ExternalLink } from "lucide-react";
import { COLORS, FONTS, THEME_PRESETS, normalizeTheme, hexToRgba } from "../../lib/theme";
import { fmtMin, daysBetween, parseLocalDate } from "../../lib/utils";
import { DiscordIcon } from "../ui/DiscordIcon";
import { discordInviteUrl, hasDiscordInvite, DISCORD_CTA_LABEL } from "../../lib/discord";

const PANEL_W = 360;
const GAP = 12;
const EDGE = 12;
const MOBILE_QUERY = "(max-width: 820px)";

function nameHue(name) {
  const n = String(name || "Ledger");
  return (n.split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 7) % 360;
}

function initialsOf(name) {
  return String(name || "?")
    .replace(/\(.*?\)/g, "")
    .trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0]).join("").toUpperCase() || "?";
}

function PanelAvatar({ name, avatarUrl, hue }) {
  const [broken, setBroken] = useState(false);
  const initials = initialsOf(name);
  if (avatarUrl && !broken) {
    return (
      <img src={avatarUrl} alt="" onError={() => setBroken(true)}
        style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0,
          border: `1px solid rgba(255,255,255,0.14)`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), 0 0 0 1px ${hexToRgba(COLORS.bg, 0.55)}` }} />
    );
  }
  return (
    <div aria-hidden="true"
      style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: `linear-gradient(155deg, hsl(${hue}, 52%, 44%), hsl(${(hue + 40) % 360}, 55%, 30%))`,
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), 0 0 0 1px ${hexToRgba(COLORS.bg, 0.55)}` }}>
      <span className="num" style={{ fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>{initials}</span>
    </div>
  );
}

function Chip({ color = COLORS.faint, children }) {
  return (
    <span className="sys" style={{ fontSize: 9, color, letterSpacing: "0.08em",
      border: `1px solid ${hexToRgba(color, 0.35)}`, background: hexToRgba(color, 0.08),
      borderRadius: 999, padding: "3px 8px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 5 }}>
      {children}
    </span>
  );
}

export default function AccountPanel({ open, onClose, anchorRef, onPanelRef, profile, stats, settings, email, avatarUrl, onSignOut, onNavigate }) {
  const panelRef = useRef(null);
  const wasOpenRef = useRef(false);
  const [closing, setClosing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [pos, setPos] = useState(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Desktop anchoring: fixed position clamped to the viewport, flipped to the
  // trigger's left / above it when the right / bottom side lacks room.
  useEffect(() => {
    if (!open || isMobile) return;
    const place = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const w = Math.min(PANEL_W, window.innerWidth - EDGE * 2);
      let left = r.right + GAP;
      if (left + w > window.innerWidth - EDGE) left = Math.max(EDGE, r.left - w - GAP);
      left = Math.max(EDGE, Math.min(left, window.innerWidth - w - EDGE));
      let top = r.bottom + GAP;
      const maxH = Math.min(560, window.innerHeight - EDGE - 8);
      if (top + maxH > window.innerHeight - EDGE) top = Math.max(EDGE, r.top - maxH - GAP);
      setPos({ left, top, maxH });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, isMobile, anchorRef]);

  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => { setClosing(false); onClose(); }, 130);
  };

  // Outside click + Escape while open. The panel is portaled to <body>, so the
  // sidebar's own outside-click handler must be told to ignore it (onPanelRef).
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      if (anchorRef.current && anchorRef.current.contains(e.target)) return;
      requestClose();
    };
    const onEsc = (e) => { if (e.key === "Escape") requestClose(); };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, closing]);

  // Move focus into the panel when it opens; hand it back to the trigger
  // when it closes.
  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => panelRef.current?.focus({ preventScroll: true }), 0);
      return () => window.clearTimeout(t);
    }
  }, [open]);
  useEffect(() => {
    if (wasOpenRef.current && !open) anchorRef.current?.querySelector("button")?.focus();
    wasOpenRef.current = open;
  }, [open, anchorRef]);

  const onKeyDown = (e) => {
    if (e.key !== "Tab") return;
    const nodes = panelRef.current?.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])') || [];
    if (nodes.length === 0) return;
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  if (!open || !profile) return null;
  if (!isMobile && !pos) return null;

  const hue = nameHue(profile.name);
  const themeId = normalizeTheme(settings?.theme);
  const themeLabel = THEME_PRESETS[themeId]?.label || themeId;
  const daysLeft = profile.targetDate ? daysBetween(new Date(), profile.targetDate) : null;
  const memberSince = profile.createdAt ? parseLocalDate(profile.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : null;
  const s = stats || {};
  const xp = s.xp || { level: 1, title: "Starter", intoLevel: 0, levelPct: 0 };
  const xpCap = s.xpCap || 500;

  const act = (tabId) => { if (!signingOut) onNavigate(tabId); };
  const doSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try { await onSignOut(); }
    catch { setSigningOut(false); }
  };

  const panel = (
    <div
      ref={(el) => { panelRef.current = el; if (onPanelRef) onPanelRef(el); }}
      role="dialog"
      aria-modal={isMobile}
      aria-label="Profile"
      tabIndex={-1}
      className={`lg-ap-anchor lg-ap-panel${closing ? " lg-ap-closing" : ""}`}
      onKeyDown={onKeyDown}
      style={{
        position: "fixed", zIndex: 90,
        width: isMobile ? undefined : PANEL_W, maxWidth: "calc(100vw - 24px)",
        maxHeight: isMobile ? undefined : (pos ? pos.maxH : 560),
        left: isMobile ? 10 : (pos ? pos.left : 0),
        top: isMobile ? undefined : (pos ? pos.top : 0),
        overflowY: "auto", overscrollBehavior: "contain",
        background: COLORS.glassFillStrong,
        WebkitBackdropFilter: "blur(16px)", backdropFilter: "blur(16px)",
        border: `1px solid ${COLORS.border}`,
        borderRadius: 18,
        boxShadow: COLORS.shadowFloating,
        outline: "none",
        color: COLORS.text, fontFamily: FONTS.body,
      }}
    >
      {/* Identity */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "16px 16px 11px" }}>
        <PanelAvatar name={profile.name} avatarUrl={avatarUrl} hue={hue} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="t-heading-md" style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {profile.name || "Student"}
          </div>
          <div className="t-meta" style={{ color: COLORS.accentFocus, marginTop: 1 }}>{profile.code || "—"}</div>
        </div>
        {isMobile && (
          <button aria-label="Close profile menu" title="Close" onClick={requestClose}
            style={{ flexShrink: 0, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, cursor: "pointer", color: COLORS.faint }}>
            <X size={14} />
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 16px 13px" }}>
        {s.streak > 0
          ? <Chip color={COLORS.accentWarm}><Flame size={9} strokeWidth={2.5} />{s.streak === 1 ? "1 day streak" : `${s.streak}-day streak`}</Chip>
          : <Chip>No streak yet</Chip>}
        {profile.exam && <Chip color={COLORS.accentFocus}>{String(profile.exam).toUpperCase()}</Chip>}
        {daysLeft != null && <Chip>{daysLeft >= 0 ? `D-${daysLeft}` : `D+${Math.abs(daysLeft)}`}</Chip>}
      </div>

      {/* Signature metric — the streak */}
      <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: "13px 16px" }}>
        <div className="sys" style={{ color: COLORS.faint }}>CURRENT STREAK</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 3 }}>
          <span className="t-data-xl" style={{ fontSize: 34, color: s.streak > 0 ? COLORS.accentWarm : COLORS.dim }}>
            {String(s.streak || 0).padStart(2, "0")}
          </span>
          <span className="t-caption">days</span>
          <span className="t-caption" style={{ marginLeft: "auto", color: COLORS.faint }}>
            {s.best > 0 ? `Best: ${s.best}d` : "First day counts"}
          </span>
        </div>
      </div>

      {/* Real-data snapshot */}
      <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: "13px 16px 14px" }}>
        <div className="sys" style={{ color: COLORS.faint }}>THIS WEEK</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 8 }}>
          {[
            { v: String(s.weekSessions || 0), l: "sessions" },
            { v: fmtMin(s.weekMin || 0), l: "focus" },
            { v: `${s.donePct || 0}%`, l: "covered" },
          ].map(m => (
            <div key={m.l}>
              <div className="t-data-md" style={{ margin: 0 }}>{m.v}</div>
              <div className="t-caption" style={{ color: COLORS.faint, marginTop: 1 }}>{m.l}</div>
            </div>
          ))}
        </div>
        {s.weekSessions === 0 && (
          <div className="t-caption" style={{ color: COLORS.faint, marginTop: 8 }}>No sessions logged yet this week.</div>
        )}
      </div>

      {/* Level — one quiet progress visualization */}
      <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span className="t-data-md" style={{ margin: 0 }}>Lv {xp.level}</span>
          <span className="t-caption" style={{ color: COLORS.faint }}>{xp.title}</span>
          <span className="t-caption" style={{ marginLeft: "auto", color: COLORS.faint }}>{xp.intoLevel} / {xpCap} XP</span>
        </div>
        <div style={{ height: 3, borderRadius: 2, background: COLORS.border, marginTop: 8, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.max(2, xp.levelPct || 0)}%`,
            background: `linear-gradient(90deg, ${COLORS.accentFocus}, ${COLORS.accentProgress})`, borderRadius: 2 }} />
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: 6 }}>
        <button className="lg-ap-item" role="menuitem" onClick={() => act("settings")}>
          <User size={13} color={COLORS.faint} />Edit profile
        </button>
        <button className="lg-ap-item" role="menuitem" onClick={() => act("settings")}>
          <SettingsIcon size={13} color={COLORS.faint} />Settings
        </button>
        <button className="lg-ap-item" role="menuitem" onClick={() => act("settings")}>
          <Palette size={13} color={COLORS.faint} />Appearance<span className="lg-ap-value">{themeLabel}</span>
        </button>
      </div>

      {/* Community — Discord invite, configured per deployment */}
      {hasDiscordInvite && (
        <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: "12px 16px 13px" }}>
          <div className="sys" style={{ color: COLORS.faint }}>COMMUNITY</div>
          <a href={discordInviteUrl} target="_blank" rel="noopener noreferrer" aria-label={DISCORD_CTA_LABEL}
            className="lg-ap-item lg-focus-ring" style={{ marginTop: 7, textDecoration: "none" }}>
            <DiscordIcon size={13} color={COLORS.faint} />
            Ledger Discord
            <span className="lg-ap-value" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              Join <ExternalLink size={11} />
            </span>
          </a>
        </div>
      )}

      {/* Account info */}
      <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: "12px 16px 13px" }}>
        <div className="sys" style={{ color: COLORS.faint }}>ACCOUNT</div>
        {email && (
          <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.dim, marginTop: 6, overflowWrap: "anywhere" }}>{email}</div>
        )}
        {memberSince && (
          <div className="t-caption" style={{ color: COLORS.faint, marginTop: 4 }}>Member since {memberSince}</div>
        )}
      </div>

      {/* Sign out — separate from the primary controls */}
      <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: 6 }}>
        <button className="lg-ap-item danger" role="menuitem" disabled={signingOut} onClick={doSignOut}>
          {signingOut ? (
            <span aria-hidden="true" style={{ width: 13, height: 13, borderRadius: "50%", flexShrink: 0, display: "inline-block",
              border: `2px solid ${hexToRgba(COLORS.danger, 0.3)}`, borderTopColor: COLORS.danger, animation: "lg-apSpin 0.8s linear infinite" }} />
          ) : <LogOut size={13} />}
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );

  return createPortal(
    <>
      {isMobile && (
        <div className="lg-ap-backdrop" style={{ zIndex: 88 }} onClick={requestClose} aria-hidden="true" />
      )}
      {panel}
    </>,
    document.body
  );
}
