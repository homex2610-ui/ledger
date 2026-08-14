let ctx: AudioContext | null = null;
let unlocked = false;

export function unlockAudio() {
  try {
    if (!ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      ctx = new Ctx();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    unlocked = true;
  } catch {
    unlocked = false;
  }
}

export function playTick() {
  if (!unlocked || !ctx || ctx.state !== 'running') return;
  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.05);
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  } catch {
    return;
  }
}

export function playReward() {
  if (!unlocked || !ctx || ctx.state !== 'running') return;
  try {
    const t = ctx.currentTime;
    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweep.type = 'sine';
    sweep.frequency.setValueAtTime(880, t);
    sweep.frequency.exponentialRampToValueAtTime(440, t + 0.09);
    sweepGain.gain.setValueAtTime(0.001, t);
    sweepGain.gain.linearRampToValueAtTime(0.22, t + 0.01);
    sweepGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    sweep.connect(sweepGain);
    sweepGain.connect(ctx.destination);
    sweep.start(t);
    sweep.stop(t + 0.12);
    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(220, t);
    bodyGain.gain.setValueAtTime(0.001, t);
    bodyGain.gain.linearRampToValueAtTime(0.08, t + 0.005);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    body.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    body.start(t);
    body.stop(t + 0.1);
  } catch {
    return;
  }
}
