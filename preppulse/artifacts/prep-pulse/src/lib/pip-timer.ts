export interface PipState {
  running: boolean;
  mode: 'pomodoro' | 'flow';
  phase: 'focus' | 'short_break' | 'long_break';
  seconds: number;
  subject: string;
}

interface PipCallbacks {
  getState: () => PipState | null;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onClose?: () => void;
}

let currentWindow: { close: () => void } | null = null;

export function pipSupported() {
  if (typeof window === 'undefined') return false;
  const dpid = (window as unknown as { documentPictureInPicture?: { requestWindow: unknown } }).documentPictureInPicture;
  return !!dpid && typeof dpid.requestWindow === 'function';
}

function fmtClock(totalSeconds: number) {
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function phaseLabel(phase: PipState['phase']) {
  return phase === 'focus' ? 'Focus' : phase === 'short_break' ? 'Short break' : 'Long break';
}

function buildDom(win: Window) {
  const doc = win.document;
  const root = doc.createElement('div');
  root.className = 'pip';
  root.innerHTML = `
    <style>
      body { margin: 0; background: #0b0e14; color: #f2f0eb;
        font-family: 'Plus Jakarta Sans', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
      .pip { box-sizing: border-box; height: 100vh; padding: 14px 16px 12px;
        display: flex; flex-direction: column; gap: 8px;
        background: radial-gradient(420px 200px at 15% -10%, rgba(47,191,158,0.16), transparent 70%), #0b0e14;
        border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; }
      .pip-top { display: flex; align-items: center; gap: 8px; }
      .pip-dot { width: 8px; height: 8px; border-radius: 50%; background: #e5a13a; flex-shrink: 0; }
      .pip-dot.running { background: #3ec98a; }
      .pip-status { font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: #6c7891; font-family: 'DM Mono', monospace; }
      .pip-time { font-family: 'DM Mono', monospace; font-variant-numeric: tabular-nums;
        font-size: 42px; font-weight: 700; letter-spacing: -0.03em; color: #f2f0eb; line-height: 1.05; margin: auto 0; }
      .pip-sub { font-size: 11px; color: #9aa6b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .pip-ctl { display: flex; gap: 6px; }
      .pip-ctl button { flex: 1; height: 30px; border-radius: 8px; cursor: pointer;
        border: 1px solid rgba(255,255,255,0.16); background: rgba(255,255,255,0.06); color: #f2f0eb;
        font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.06em; }
      .pip-ctl button:hover { background: rgba(255,255,255,0.12); }
      .pip-ctl button.pip-stop { color: #ff6b5e; border-color: rgba(255,95,86,0.4); }
    </style>
    <div class="pip-top">
      <span class="pip-dot"></span>
      <span class="pip-status">Focus &middot; PrepPulse</span>
    </div>
    <div class="pip-time">00:00:00</div>
    <div class="pip-sub">&mdash;</div>
    <div class="pip-ctl">
      <button class="pip-pause">Pause</button>
      <button class="pip-stop">Stop</button>
    </div>
  `;
  doc.head.innerHTML = `
    <meta charset="utf-8" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;600;700&display=swap" />
  `;
  return root;
}

export async function openPipWindow({ getState, onPause, onResume, onStop, onClose }: PipCallbacks) {
  if (!pipSupported()) return null;
  if (currentWindow) return currentWindow;
  const dpid = (window as unknown as { documentPictureInPicture: { requestWindow: (opts: { width: number; height: number }) => Promise<Window> } }).documentPictureInPicture;

  let win: Window;
  try {
    win = await dpid.requestWindow({ width: 340, height: 196 });
  } catch {
    return null;
  }

  const root = buildDom(win);
  win.document.body.appendChild(root);

  const q = <T extends HTMLElement>(selector: string) => win.document.querySelector(selector) as T | null;
  const timeEl = q<HTMLElement>('.pip-time');
  const subEl = q<HTMLElement>('.pip-sub');
  const dotEl = q<HTMLElement>('.pip-dot');
  const pauseBtn = q<HTMLButtonElement>('.pip-pause');
  const stopBtn = q<HTMLButtonElement>('.pip-stop');
  const statusEl = q<HTMLElement>('.pip-status');

  const sync = () => {
    const state = getState();
    if (!state || !timeEl || !subEl || !dotEl || !pauseBtn || !statusEl) return;
    timeEl.textContent = fmtClock(Math.max(0, state.seconds));
    const running = !!state.running;
    dotEl.className = `pip-dot ${running ? 'running' : 'paused'}`;
    pauseBtn.textContent = running ? 'Pause' : 'Resume';
    const label = state.mode === 'pomodoro' ? phaseLabel(state.phase) : 'Flow';
    subEl.textContent = state.subject ? `${state.subject} · ${label}` : label;
    statusEl.textContent = `${running ? 'RUNNING' : 'PAUSED'} · ${state.mode.toUpperCase()} · PREPPULSE`;
  };
  const interval = win.setInterval(sync, 1000);
  sync();

  pauseBtn?.addEventListener('click', () => {
    const state = getState();
    if (!state) return;
    if (state.running) {
      try { onPause(); } catch { return; }
    } else {
      try { onResume(); } catch { return; }
    }
  });
  stopBtn?.addEventListener('click', () => {
    try { onStop(); } catch { return; }
  });

  const closed = () => {
    win.clearInterval(interval);
    currentWindow = null;
    try { onClose?.(); } catch { return; }
  };
  win.addEventListener('pagehide', closed);

  currentWindow = {
    close() {
      try { win.close(); } catch { return; }
      if (currentWindow === this) {
        currentWindow = null;
        closed();
      }
    },
  };
  return currentWindow;
}

export function closePipWindow() {
  if (currentWindow) {
    try { currentWindow.close(); } catch { return; }
  }
  currentWindow = null;
}
