import React, { useState, useEffect, useRef } from "react";
import { Check, ChevronDown } from "lucide-react";
import { COLORS, FONTS, hexToRgba, darken, SPACE, RADIUS, center } from "../../lib/theme";

// Shared panel primitives — the "Home language" used by every screen so each
// route reads as part of the same instrument. Single source of truth for the
// app's cards, section headers, page heads and form controls; feature code
// imports from here instead of hand-rolling one-off surfaces.

// Elevated surface. Base card: rounded border + padding, optional t-label
// title row. Add "interactive" (Stat) or "flush" (settings panels) variants
// at the call site via the className/style of the surface itself.
export function Card({ title, right, children, style, id, n }) {
  return (
    <div id={id} className="lg-card" style={{ borderRadius: RADIUS.card, border: `1px solid ${COLORS.border}`, padding: `${SPACE.lg}px ${SPACE.xl}px`, ...style }}>
      {n ? (
        <SectionHeader n={n} label={String(title || "").toUpperCase()} right={right} style={{ marginBottom: SPACE.md }} />
      ) : (title || right) ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: SPACE.md }}>
          {title && <div className="t-label" style={{ color: COLORS.dim }}>{title}</div>}
          {right}
        </div>
      ) : null}
      {children}
    </div>
  );
}

// Stat cell — a compact card with a label, a big numeral and optional
// sub-line / trend indicator.
export function Stat({ label, value, sub, accent, trend }) {
  return (
    <div
      className="lg-card"
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

// Page header. Default: thin accent bar + uppercase title + one-line lead
// (the primary workspaces). variant="hero": eyebrow + display title + lead
// + optional signature numeral (the countdown idiom) — for pages whose hero
// carries the one number that matters (Community).
export function PageHead({ title, lead, right, variant, eyebrow, num, numLabel, numTint, numSub }) {
  if (variant === "hero") {
    return (
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "30px 44px", flexWrap: "wrap", marginBottom: "clamp(24px, 3.5vh, 38px)" }}>
        <div style={{ minWidth: 0 }}>
          <div className="sys" style={{ fontSize: 9.5, letterSpacing: "0.32em", color: COLORS.accentFocus, marginBottom: 10 }}>{(eyebrow || title || "").toUpperCase()}</div>
          <div style={{ fontFamily: FONTS.body, fontSize: "clamp(30px, 4.2vw, 46px)", fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.04, color: COLORS.text }}>{title}</div>
          {lead && <div style={{ fontSize: 13, color: COLORS.dim, marginTop: 12, maxWidth: 620, lineHeight: 1.65, fontFamily: FONTS.body }}>{lead}</div>}
        </div>
        {num !== undefined ? (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div className="sys" style={{ fontSize: 9.5, letterSpacing: "0.26em", color: COLORS.faint }}>{numLabel || ""}</div>
            <div className="num" style={{ fontSize: "clamp(46px, 6.5vw, 80px)", fontWeight: 800, lineHeight: 0.85, letterSpacing: "-0.05em", fontVariantNumeric: "tabular-nums", color: numTint || COLORS.text, marginTop: 10 }}>{num}</div>
            {numSub && <div className="sys" style={{ fontSize: 9, letterSpacing: "0.3em", color: COLORS.faint, marginTop: 12 }}>{numSub}</div>}
          </div>
        ) : right}
      </div>
    );
  }
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
export function MiniStat({ k, v, sub, pct, tint }) {
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

// Section header — the signature index mark. A mono numeral, a micro label
// and a hairline that fades rightward; every major section of a page
// composes as a numbered entry in the book instead of an anonymous block.
// The structural contract (span.num numeral + span.sys label) is pinned by
// the "dashboard: section headers render 01..08 sequential" e2e test.
export function SectionHeader({ n, label, right, style, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, ...style }}>
      <span className="num" style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: "0.12em", color: COLORS.faint, flexShrink: 0 }}>{n}</span>
      <span className="sys" style={{ fontSize: 8.5, letterSpacing: "0.24em", color: COLORS.dim }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${COLORS.borderStrong}, transparent)` }} />
      {right}
      {children}
    </div>
  );
}

// Replaces bare "no data yet" gray text with an icon + copy + optional
// action, per the empty-state guidance: contextual icon, explanatory copy,
// explicit next step rather than a dead end.
export function EmptyState({ icon: Icon, message, action, art }) {
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
export function EmptyArt({ variant = "grid", width = 128, height = 76 }) {
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

export function Btn({ children, onClick, variant = "ghost", style, disabled, title, className, ariaLabel, type }) {
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

export const Input = React.forwardRef((props, ref) =>
  <input ref={ref} {...props} className={`lg-input ${props.className || ""}`} style={{ background: COLORS.glassFill, border: `1px solid ${COLORS.border}`, borderRadius: 7, padding: "9px 11px", color: COLORS.text, fontSize: 13, fontFamily: FONTS.body, width: "100%", boxSizing: "border-box", ...props.style }} />
);

// Custom select — native dropdowns are unstylable and visually break the
// system chrome, so every <select> renders as a custom listbox instead. The
// contract mirrors a native select: value + onChange(newValue) + options
// [{ value, label, color? }] with full keyboard support and ARIA wiring.
export function SelectBox({ value, onChange, options, disabled = false, ariaLabel, style, listWidth }) {
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

// Single compact switch, reused by every settings toggle.
export function Toggle({ checked, onChange }) {
  return (
    <label className="lg-switch" style={{ position: "relative", display: "inline-block", width: 40, height: 22, flexShrink: 0, cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
      <span style={{ position: "absolute", inset: 0, borderRadius: 999, background: checked ? COLORS.ink : COLORS.panel2, border: checked ? "1px solid transparent" : `1px solid ${COLORS.border}`, boxShadow: checked ? "inset 0 1px 0 rgba(255,255,255,0.2)" : "inset 0 1px 2px rgba(0,0,0,0.3)", transition: "background 0.16s ease-out, border-color 0.16s ease-out" }} />
      <span style={{ position: "absolute", top: 3, left: checked ? 23 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.35)", transition: "left 0.18s cubic-bezier(0.2,0.8,0.2,1)" }} />
    </label>
  );
}

// Settings row — label column + control, hairline-separated from its peers.
export function Row({ title, sub, children, warn, first, style }) {
  return (
    <div className="lg-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", flexWrap: "wrap", borderTop: first ? "none" : `1px solid ${COLORS.border}`, ...style }}>
      <div style={{ flex: "1 1 200px", minWidth: 200 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: warn ? hexToRgba(COLORS.danger, 0.9) : COLORS.text }}>{title}</div>
        {sub && <div style={{ fontSize: 10.5, color: COLORS.faint, marginTop: 2, lineHeight: 1.5, maxWidth: 440 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

// Settings panel — flush card with a numbered SectionHeader-style title strip.
export function Panel({ title, sub, children, danger, n }) {
  return (
    <div className="lg-card" style={{ borderRadius: RADIUS.card, border: `1px solid ${danger ? hexToRgba(COLORS.danger, 0.24) : COLORS.border}`, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderBottom: `1px solid ${COLORS.border}` }}>
        {n && <span className="num" style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: "0.12em", color: COLORS.faint, flexShrink: 0 }}>{n}</span>}
        <span className="sys" style={{ fontSize: 9.5, letterSpacing: "0.22em", color: danger ? hexToRgba(COLORS.danger, 0.9) : COLORS.dim }}>{String(title).toUpperCase()}</span>
        {sub && <span style={{ marginLeft: "auto", fontSize: 10, color: COLORS.faint }}>{sub}</span>}
      </div>
      {children}
    </div>
  );
}
