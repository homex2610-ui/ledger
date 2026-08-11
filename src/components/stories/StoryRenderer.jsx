import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { COLORS, FONTS } from "../../lib/theme";

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

const esc = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtHours = minutes => minutes >= 60 ? `${(minutes / 60).toFixed(minutes % 60 ? 1 : 0)}h` : `${minutes}m`;

function Metric({ x, y, value, label, accent = COLORS.text, size = 58 }) {
  return <g><text x={x} y={y} fill={accent} fontFamily={FONTS.display} fontSize={size} fontWeight="800" letterSpacing="-1">{esc(value)}</text><text x={x} y={y + 32} fill={COLORS.faint} fontFamily={FONTS.mono} fontSize="17" letterSpacing="2">{esc(label.toUpperCase())}</text></g>;
}

function EmptyToday({ minimal }) {
  const ghost = { opacity: 0.38 };
  return <g>
    <text x="84" y="540" fill={COLORS.accentFocus} opacity="0.72" fontFamily={FONTS.mono} fontSize="17" letterSpacing="3">YOUR FIRST RECEIPT</text>
    <text x="84" y="640" fill={COLORS.text} opacity="0.9" fontFamily={FONTS.display} fontSize={minimal ? 74 : 68} fontWeight="800" letterSpacing="-1">Your first session</text>
    <text x="84" y="710" fill={COLORS.text} opacity="0.9" fontFamily={FONTS.display} fontSize={minimal ? 74 : 68} fontWeight="800" letterSpacing="-1">writes this card.</text>
    <text x="84" y="758" fill={COLORS.dim} opacity="0.86" fontFamily={FONTS.body} fontSize="23">Complete one focused session to turn the outline into proof.</text>
    <g opacity={ghost.opacity}>
      <Metric x="84" y="900" value="0m" label="focused time" accent={COLORS.text} size={52} />
      <Metric x="474" y="900" value="0" label="sessions" accent={COLORS.text} size={52} />
      <Metric x="84" y="1050" value="0" label="questions" accent={COLORS.text} size={52} />
      <Metric x="474" y="1050" value="0d" label="streak" accent={COLORS.text} size={52} />
      <circle cx="830" cy="1070" r="104" fill="none" stroke={COLORS.accentFocus} strokeOpacity="0.72" strokeWidth="4" strokeDasharray="8 12" />
      <circle cx="830" cy="1070" r="78" fill="none" stroke={COLORS.border} strokeWidth="1" />
      <text x="830" y="1065" textAnchor="middle" fill={COLORS.faint} fontFamily={FONTS.mono} fontSize="14" letterSpacing="2">FOCUS</text>
      <text x="830" y="1095" textAnchor="middle" fill={COLORS.text} fontFamily={FONTS.display} fontSize="28" fontWeight="700">OPEN</text>
      <text x="84" y="1225" fill={COLORS.faint} fontFamily={FONTS.mono} fontSize="15" letterSpacing="2">SUBJECT ENERGY</text>
      {[0, 1, 2].map(i => <g key={i}><rect x="84" y={1260 + i * 48} width="610" height="10" rx="5" fill="none" stroke={COLORS.border} strokeWidth="2" strokeDasharray="7 9" /><text x="730" y={1270 + i * 48} fill={COLORS.faint} fontFamily={FONTS.mono} fontSize="15">—</text></g>)}
    </g>
  </g>;
}

function Header({ data, template }) {
  return <g>
    <text x="84" y="246" fill={COLORS.accentFocus} fontFamily={FONTS.mono} fontSize="20" fontWeight="700" letterSpacing="5">LEDGER STORIES</text>
    <text x="84" y="326" fill={COLORS.text} fontFamily={FONTS.display} fontSize="52" fontWeight="700">{esc(data.periodLabel)}</text>
    <text x="996" y="246" textAnchor="end" fill={COLORS.text} fontFamily={FONTS.display} fontSize="30" fontWeight="800">LEDGER</text>
    <rect x="84" y="356" width="912" height="1" fill={COLORS.border} opacity="0.8" />
    {template === "minimal" && <rect x="84" y="240" width="8" height="82" rx="4" fill={COLORS.accentFocus} />}
  </g>;
}

function Activity({ data, y }) {
  const rows = data.dailyActivity || [];
  const max = Math.max(...rows.map(d => d.minutes), 1);
  return <g>
    <text x="84" y={y} fill={COLORS.text} fontFamily={FONTS.display} fontSize="25" fontWeight="700">Daily rhythm</text>
    <line x1="84" y1={y + 184} x2="996" y2={y + 184} stroke={COLORS.border} />
    {rows.map((day, i) => {
      const x = 94 + i * 128;
      const h = Math.max(4, (day.minutes / max) * 145);
      const top = y + 184 - h;
      return <g key={day.date}><rect x={x} y={top} width="62" height={h} rx="9" fill={day.minutes === max && max > 0 ? COLORS.accentFocus : COLORS.accentFocus} opacity={day.minutes === max && max > 0 ? 1 : 0.34} /><text x={x + 31} y={y + 214} textAnchor="middle" fill={COLORS.faint} fontFamily={FONTS.mono} fontSize="15">{esc(day.label)}</text></g>;
    })}
  </g>;
}

function Subjects({ subjects, y }) {
  return <g>
    <text x="84" y={y} fill={COLORS.text} fontFamily={FONTS.display} fontSize="25" fontWeight="700">Subject energy</text>
    {subjects.slice(0, 4).map((s, i) => { const yy = y + 54 + i * 42; return <g key={s.name}><text x="84" y={yy} fill={COLORS.dim} fontFamily={FONTS.body} fontSize="19">{esc(s.name)}</text><rect x="300" y={yy - 16} width="470" height="12" rx="6" fill={COLORS.border} /><rect x="300" y={yy - 16} width={470 * s.percentage / 100} height="12" rx="6" fill={COLORS.accentFocus} opacity={0.9 - i * 0.12} /><text x="820" y={yy} fill={COLORS.faint} fontFamily={FONTS.mono} fontSize="17">{s.percentage}%</text></g>; })}
  </g>;
}

function Footer({ qrSrc, shareUrl }) {
  return <g>
    <text x="84" y="1655" fill={COLORS.text} fontFamily={FONTS.display} fontSize="26" fontWeight="700">Made with Ledger</text>
    <text x="84" y="1692" fill={COLORS.faint} fontFamily={FONTS.mono} fontSize="16">{esc(shareUrl.replace(/^https?:\/\//, ""))}</text>
    {qrSrc ? <image href={qrSrc} x="850" y="1570" width="146" height="146" preserveAspectRatio="none" /> : <rect x="850" y="1570" width="146" height="146" fill={COLORS.text} opacity="0.08" />}
  </g>;
}

export function StorySvg({ data, template = "glass", qrSrc, shareUrl }) {
  const minimal = template === "minimal";
  const total = data.studyMinutes ? fmtHours(data.studyMinutes) : null;
  const metrics = [
    total && [total, "focused time"], data.questions && [data.questions, "questions"], data.tests && [data.tests, "tests"], data.accuracy && [`${data.accuracy}%`, "accuracy"], data.streak && [`${data.streak}d`, "streak"],
  ].filter(Boolean);
  return <svg xmlns="http://www.w3.org/2000/svg" width={STORY_WIDTH} height={STORY_HEIGHT} viewBox={`0 0 ${STORY_WIDTH} ${STORY_HEIGHT}`} role="img" aria-label={`${data.periodLabel} Ledger Story`}>
    <defs>
      <linearGradient id="story-bg" x1="0" y1="0" x2="1" y2="1"><stop stopColor={COLORS.bg} /><stop offset="0.55" stopColor={minimal ? COLORS.bg : COLORS.panel2} /><stop offset="1" stopColor={COLORS.bg1} /></linearGradient>
      <radialGradient id="story-glow" cx="75%" cy="12%"><stop stopColor={COLORS.accentFocus} stopOpacity="0.28" /><stop offset="1" stopColor={COLORS.accentFocus} stopOpacity="0" /></radialGradient>
    </defs>
    <rect width={STORY_WIDTH} height={STORY_HEIGHT} fill="url(#story-bg)" />
    {!minimal && <rect width={STORY_WIDTH} height={STORY_HEIGHT} fill="url(#story-glow)" />}
    <circle cx="930" cy="390" r="230" fill="none" stroke={COLORS.accentFocus} strokeOpacity="0.08" strokeWidth="2" />
    <Header data={data} template={template} />
    {metrics.length > 0 ? <g>
      <text x="84" y="540" fill={COLORS.faint} fontFamily={FONTS.mono} fontSize="17" letterSpacing="3">THE RECEIPT</text>
      <Metric x="84" y="650" value={metrics[0][0]} label={metrics[0][1]} accent={COLORS.accentFocus} size={minimal ? 132 : 120} />
      {metrics.slice(1, 4).map((m, i) => <Metric key={m[1]} x={84 + (i % 2) * 390} y={820 + Math.floor(i / 2) * 120} value={m[0]} label={m[1]} size={44} />)}
    </g> : <EmptyToday minimal={minimal} />}
    {data.dailyActivity && <Activity data={data} y={minimal ? 1010 : 1080} />}
    {data.subjects?.length > 0 && <Subjects subjects={data.subjects} y={data.dailyActivity ? 1370 : 1050} />}
    {data.highlight && <g><text x="84" y="1510" fill={COLORS.accentFocus} fontFamily={FONTS.mono} fontSize="16" letterSpacing="3">HIGHLIGHT</text><text x="84" y="1558" fill={COLORS.text} fontFamily={FONTS.display} fontSize="31" fontWeight="700">{esc(data.highlight.label)} · {esc(data.highlight.value)}</text></g>}
    {data.biggestWin && <g><text x="84" y="1120" fill={COLORS.accentFocus} fontFamily={FONTS.mono} fontSize="16" letterSpacing="3">BIGGEST WIN</text><text x="84" y="1168" fill={COLORS.text} fontFamily={FONTS.display} fontSize="31" fontWeight="700">{esc(data.biggestWin)}</text></g>}
    {data.motivationalLine && <text x="84" y="1490" fill={COLORS.dim} fontFamily={FONTS.body} fontSize="23" fontStyle="italic">{esc(data.motivationalLine)}</text>}
    <Footer qrSrc={qrSrc} shareUrl={shareUrl} />
  </svg>;
}

export async function svgToPng({ data, template, qrSrc, shareUrl }) {
  const markup = renderToStaticMarkup(<StorySvg data={data} template={template} qrSrc={qrSrc} shareUrl={shareUrl} />);
  const blob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = url; });
    const canvas = document.createElement("canvas"); canvas.width = STORY_WIDTH; canvas.height = STORY_HEIGHT;
    canvas.getContext("2d").drawImage(image, 0, 0, STORY_WIDTH, STORY_HEIGHT);
    return await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
  } finally { URL.revokeObjectURL(url); }
}
