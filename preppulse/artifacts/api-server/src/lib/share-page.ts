import type { DailyFocusPayload } from "./shares-core.js";

const BG = "#0B3D33";
const PANEL = "#11483C";
const CREAM = "#F5F1E6";
const CORAL = "#F0645A";
const EMERALD = "#6CCBC0";

export interface SharePageOptions {
  appOrigin: string;
  artifactId: string;
  variant: "A" | "B";
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildSharePageHtml(payload: DailyFocusPayload, options: SharePageOptions): string {
  const name = esc(clampName(payload.displayName));
  const title = `${payload.displayName} studied ${payload.minutesLabel} today on Ledger`;
  const description =
    payload.subjects.length > 0
      ? `${payload.subjects[0].subject} · ${payload.subjects[1] ? payload.subjects[1].subject + " · " : ""}every minute counted. Join Ledger and turn focus into momentum.`
      : "Every minute counted. Join Ledger and turn focus into momentum.";
  const ogImage = `${options.appOrigin}/api/og/share?id=${options.artifactId}`;
  const shareUrl = `${options.appOrigin}/api/share-page/focus/${options.artifactId}`;
  const joinUrl = `${options.appOrigin}/signin`;
  const cardUrl = `${options.appOrigin}/signin`;

  const streakHtml =
    options.variant === "B" && payload.streak > 0
      ? `<div style="display:flex;align-items:center;gap:10px;margin-top:14px;"><span style="font-size:22px;">🔥</span><span style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:20px;color:${CORAL};">${payload.streak} day streak</span></div>`
      : "";

  const bars = (payload.subjects.length ? payload.subjects : [{ subject: "Focus time", minutes: payload.minutes, percent: 100 }])
    .slice(0, 4)
    .map(
      (s) =>
        `<div style="margin-bottom:16px;"><div style="display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:12px;color:rgba(245,241,230,0.62);margin-bottom:6px;"><span>${esc(s.subject.length > 22 ? s.subject.slice(0, 21) + "…" : s.subject)}</span><span>${s.minutes}m</span></div><div style="height:11px;border-radius:6px;background:rgba(108,203,192,0.18);overflow:hidden;"><div style="height:100%;width:${Math.max(2, Math.min(100, s.percent))}%;border-radius:6px;background:${EMERALD};"></div></div></div>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}"/>
<meta name="robots" content="index, follow"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(description)}"/>
<meta property="og:image" content="${esc(ogImage)}"/>
<meta property="og:url" content="${esc(shareUrl)}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(description)}"/>
<meta name="twitter:image" content="${esc(ogImage)}"/>
<meta name="theme-color" content="${BG}"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400&family=Plus+Jakarta+Sans:wght@400;600;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:${BG}; color:${CREAM}; font-family:'Plus Jakarta Sans',system-ui,sans-serif; min-height:100dvh; }
  .shell { max-width:1080px; margin:0 auto; padding:48px 24px 64px; }
  .brand { display:flex; align-items:center; gap:12px; margin-bottom:44px; }
  .mark { width:44px; height:44px; border-radius:14px; border:2px solid ${EMERALD}; position:relative; }
  .mark svg { position:absolute; inset:10px; }
  .brand-name { font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:22px; }
  .brand-tag { font-family:'DM Mono',monospace; font-size:10px; letter-spacing:2.5px; color:rgba(245,241,230,0.62); }
  .hero { font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:clamp(34px,6vw,58px); line-height:1.05; letter-spacing:-0.02em; max-width:760px; }
  .hero .coral { color:${CORAL}; }
  .sub { margin-top:14px; font-size:16px; color:rgba(245,241,230,0.62); max-width:560px; }
  .grid { display:grid; grid-template-columns:1.15fr .85fr; gap:28px; margin-top:44px; }
  @media (max-width:820px){ .grid { grid-template-columns:1fr; } }
  .card { background:${PANEL}; border-radius:24px; padding:34px 30px; }
  .card-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:26px; }
  .card-label { font-family:'DM Mono',monospace; font-size:11px; letter-spacing:2.5px; color:${EMERALD}; }
  .big { font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:clamp(64px,9vw,110px); letter-spacing:-0.04em; line-height:1; margin:6px 0 4px; }
  .card-note { font-family:'DM Mono',monospace; font-size:12px; color:rgba(245,241,230,0.62); }
  .cta { display:inline-flex; align-items:center; gap:10px; margin-top:30px; background:${CORAL}; color:${BG}; font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:17px; padding:14px 24px; border-radius:999px; text-decoration:none; }
  .cta.ghost { background:transparent; color:${CREAM}; border:1.5px solid rgba(245,241,230,0.28); margin-left:12px; }
  .explain { margin-top:52px; }
  .explain h2 { font-family:'Space Grotesk',sans-serif; font-size:22px; }
  .explain p { margin-top:10px; color:rgba(245,241,230,0.62); font-size:14px; line-height:1.6; max-width:640px; }
  .points { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px; margin-top:22px; }
  .point { background:rgba(245,241,230,0.05); border:1px solid rgba(245,241,230,0.10); border-radius:16px; padding:18px; }
  .point b { display:block; font-size:14px; margin-bottom:6px; }
  .point span { font-size:12.5px; color:rgba(245,241,230,0.62); line-height:1.5; }
  .foot { margin-top:56px; padding-top:22px; border-top:1px solid rgba(245,241,230,0.12); display:flex; justify-content:space-between; font-family:'DM Mono',monospace; font-size:11px; letter-spacing:1.5px; color:rgba(245,241,230,0.45); }
</style>
</head>
<body>
<div class="shell">
  <div class="brand">
    <div class="mark"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><polyline points="2,14 8,8 12,14 22,8" stroke="${CORAL}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div><div class="brand-name">Ledger</div><div class="brand-tag">KEEP MOVING</div></div>
  </div>

  <h1 class="hero">${name} studied <span class="coral">${esc(payload.minutesLabel)}</span> today</h1>
  <p class="sub">Focused, counted, and on the record. Here's how a focused day looks in Ledger — the study companion for JEE and NEET prep.</p>

  <div class="grid">
    <div class="card">
      <div class="card-head"><span class="card-label">DAILY FOCUS CARD</span><span class="card-note">${esc(payload.dayLabel)}</span></div>
      <div class="big">${esc(payload.minutesLabel)}</div>
      <div class="card-note">focused today · ${name}</div>
      ${streakHtml}
      <div style="margin-top:34px;">
        <a class="cta" href="${joinUrl}" rel="nofollow">Join Ledger <span>→</span></a>
        <a class="cta ghost" href="${cardUrl}" rel="nofollow">See how Ledger works</a>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><span class="card-label">TODAY'S SUBJECTS</span></div>
      ${bars}
    </div>
  </div>

  <div class="explain">
    <h2>What is Ledger?</h2>
    <p>Ledger is a study companion for serious JEE and NEET prep. Log your focus sessions, keep your syllabus moving, test with evidence, and stay consistent — one honest session at a time.</p>
    <div class="points">
      <div class="point"><b>Focus timers</b><span>Pomodoro and flow blocks that log minutes automatically. No guessing, no gaps.</span></div>
      <div class="point"><b>Syllabus map</b><span>Every topic tracked from not-started to mastered, weighted by exam importance.</span></div>
      <div class="point"><b>Evidence, not ego</b><span>Test log, weak-area analysis, and a weekly rhythm that shows momentum.</span></div>
    </div>
  </div>

  <div class="foot"><span>LEDGER · KEEP MOVING</span><span>${esc(shareUrl)}</span></div>
</div>
<script>
  (function () {
    try { sessionStorage.setItem('pp-share-ref', '${esc(options.artifactId)}'); } catch (e) {}
    fetch('/api/shares/${esc(options.artifactId)}/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'share_link_opened' })
    }).catch(function () {});
  })();
</script>
</body>
</html>`;
}

function clampName(value: string): string {
  const cleaned = value.trim();
  if (cleaned.length <= 22) return cleaned;
  return `${cleaned.slice(0, 21).trim()}…`;
}