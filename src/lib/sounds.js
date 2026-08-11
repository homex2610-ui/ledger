// Soft UI ticks — WebAudio, gated behind a real user gesture so browser
// autoplay policies never block or punish us. Everything is lazy: the
// AudioContext is created on the first gesture, not at import.

let ctx = null;
let unlocked = false;

// The app has exactly one AudioContext, created here on the first real
// gesture and parked on window.__ledgerAudioCtx — the timer chime (App.jsx)
// reads that same handle, so the tick and the chime always share one
// gesture-unlocked context instead of allocating their own.
export function unlockAudio() {
  try {
    if (!ctx) {
      ctx = window.__ledgerAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
      window.__ledgerAudioCtx = ctx;
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
    unlocked = true;
  } catch (e) { unlocked = false; }
}

// A short, quiet tick (~660Hz sine, 60ms, fast decay). A feedback blip,
// not a beep: gain stays at 0.04 so it reads as a physical tick.
export function playTick() {
  if (!unlocked || !ctx) return;
  try {
    if (ctx.state !== "running") return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.05);
    g.gain.setValueAtTime(0.04, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  } catch (e) { /* never let a sound fail crash the app */ }
}

// A satisfying two-stage pop (<150ms total): a bright 880->440Hz sine
// sweep plus a warm 220Hz body tone. Gain peaks at ~0.22 for audibility.
export function playReward() {
  if (!unlocked || !ctx) return;
  try {
    if (ctx.state !== "running") return;
    const t = ctx.currentTime;
    let played = false;

    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, t);
    osc1.frequency.exponentialRampToValueAtTime(440, t + 0.09);
    g1.gain.setValueAtTime(0.001, t);
    g1.gain.linearRampToValueAtTime(0.22, t + 0.01);
    g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    osc1.connect(g1);
    g1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.12);
    played = true;

    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(220, t);
    g2.gain.setValueAtTime(0.001, t);
    g2.gain.linearRampToValueAtTime(0.08, t + 0.005);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    osc2.connect(g2);
    g2.connect(ctx.destination);
    osc2.start(t);
    osc2.stop(t + 0.1);

    if (played) rewardTicks++;
  } catch (e) { /* never let a sound fail crash the app */ }
}

let rewardTicks = 0;

export function __ledgerAudioState() {
  return { unlocked, ctxState: ctx ? ctx.state : "none", ticks: rewardTicks };
}
