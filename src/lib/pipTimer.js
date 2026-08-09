// Document Picture-in-Picture mini timer.
//
// The ONLY way a web page can genuinely float above other OS windows is the
// Chromium Document PiP API — a normal <div> cannot escape the browser. This
// module owns the thin wrapper around it; the timer state itself stays in
// Workspace (App.jsx), and this module just renders snapshots of it and
// pushes button presses back through callbacks. One floating window at a
// time; closing it (X button) or the app unmounting cleans it up.
//
// Unsupported browsers (Firefox/Safari/webkit, non-Chromium): pipSupported()
// returns false so the FLOAT button can disable itself honestly.

import { COLORS, FONTS } from "./theme";

let currentWindow = null; // { close } — the one open PiP window, if any

export function pipSupported() {
  if (typeof window === "undefined") return false;
  const dpid = window.documentPictureInPicture;
  return !!dpid && typeof dpid.requestWindow === "function";
}

function fmtClock(s) {
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${ss}`;
}

function buildDom(win) {
  const doc = win.document;
  const root = doc.createElement("div");
  root.className = "pip";
  root.innerHTML = `
    <style>
      body { margin: 0; background: #0A0C12; color: ${COLORS.text};
        font-family: ${FONTS.body}; -webkit-font-smoothing: antialiased; }
      .pip { box-sizing: border-box; height: 100vh; padding: 14px 16px 12px;
        display: flex; flex-direction: column; gap: 8px;
        background: radial-gradient(420px 200px at 15% -10%, rgba(139,124,255,0.14), transparent 70%), #0A0C12;
        border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; }
      .pip-top { display: flex; align-items: center; gap: 8px; }
      .pip-dot { width: 8px; height: 8px; border-radius: 50%;
        background: ${COLORS.accentWarm}; flex-shrink: 0; transition: background 0.2s; }
      .pip-dot.paused { background: ${COLORS.accentWarm}; }
      .pip-dot.running { background: ${COLORS.accentSuccess}; }
      .pip-status { font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase;
        color: ${COLORS.faint}; font-family: ${FONTS.mono}; }
      .pip-time { font-family: ${FONTS.mono}; font-variant-numeric: tabular-nums;
        font-size: 44px; font-weight: 700; letter-spacing: -0.03em; color: ${COLORS.text};
        line-height: 1.05; margin: auto 0; }
      .pip-sub { font-size: 11px; color: ${COLORS.dim}; overflow: hidden;
        text-overflow: ellipsis; white-space: nowrap; }
      .pip-ctl { display: flex; gap: 6px; }
      .pip-ctl button { flex: 1; height: 30px; border-radius: 8px; cursor: pointer;
        border: 1px solid rgba(255,255,255,0.16); background: rgba(255,255,255,0.06); color: ${COLORS.text};
        font-family: ${FONTS.mono}; font-size: 11px; letter-spacing: 0.06em; }
      .pip-ctl button:hover { background: rgba(255,255,255,0.12); }
      .pip-ctl button.pip-stop { color: ${COLORS.danger}; border-color: rgba(255,95,86,0.4); }
    </style>
    <div class="pip-top">
      <span class="pip-dot paused"></span>
      <span class="pip-status">Study · Ledger</span>
    </div>
    <div class="pip-time">00:00:00</div>
    <div class="pip-sub">—</div>
    <div class="pip-ctl">
      <button class="pip-pause">Pause</button>
      <button class="pip-stop">Stop</button>
    </div>
  `;
  doc.head.innerHTML = `
    <meta charset="utf-8" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap" />
  `;
  return root;
}

// getState() must return a live snapshot: { running, elapsed, mode, phase,
// phaseTarget, subject }. onPause/onResume/onStop/onClose are the same
// handlers Workspace uses for the in-app timers — there is never a second
// timer running here, only a mirror of the real one.
export async function openPipWindow({ getState, onPause, onResume, onStop, onClose }) {
  if (!pipSupported()) return null;
  if (currentWindow) return currentWindow;
  const dpid = window.documentPictureInPicture;

  let win;
  try {
    win = await dpid.requestWindow({ width: 340, height: 196 });
  } catch (e) {
    console.warn("[pip] open failed", e);
    return null;
  }

  const root = buildDom(win);
  win.document.body.appendChild(root);

  const q = (sel) => win.document.querySelector(sel);
  const timeEl = q(".pip-time");
  const subEl = q(".pip-sub");
  const dotEl = q(".pip-dot");
  const pauseBtn = q(".pip-pause");
  const stopBtn = q(".pip-stop");
  const statusEl = q(".pip-status");

  const sync = () => {
    const st = getState();
    if (!st) return;
    const remaining = st.mode === "pomodoro"
      ? Math.max(0, st.phaseTarget - st.elapsed)
      : st.elapsed;
    timeEl.textContent = fmtClock(remaining);
    const running = !!st.running;
    dotEl.className = `pip-dot ${running ? "running" : "paused"}`;
    pauseBtn.textContent = running ? "Pause" : "Resume";
    const phaseLabel = st.mode === "pomodoro"
      ? (st.phase === "long_break" ? "Long break" : st.phase === "short_break" ? "Short break" : "Focus")
      : "Flow";
    subEl.textContent = st.subject ? `${st.subject} · ${phaseLabel}` : phaseLabel;
    statusEl.textContent = `${running ? "RUNNING" : "PAUSED"} · ${st.mode.toUpperCase()} · LEDGER`;
  };
  const iv = win.setInterval(sync, 1000);
  sync();

  pauseBtn.addEventListener("click", () => {
    const st = getState();
    if (!st) return;
    if (st.running) { try { onPause(); } catch (e) { } } else { try { onResume(); } catch (e) { } }
  });
  stopBtn.addEventListener("click", () => {
    try { onStop(); } catch (e) { }
  });

  const closed = () => {
    win.clearInterval(iv);
    currentWindow = null;
    try { onClose && onClose(); } catch (e) { /* Component already gone */ }
  };
  win.addEventListener("pagehide", closed);

  currentWindow = {
    close() {
      try { win.close(); } catch (e) { /* already closed */ }
      if (currentWindow === this) { currentWindow = null; closed(); }
    },
  };
  return currentWindow;
}

export function closePipWindow() {
  if (currentWindow) {
    try { currentWindow.close(); } catch (e) { /* ignore */ }
  }
  currentWindow = null;
}