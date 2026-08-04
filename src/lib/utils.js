// Extracted from App.jsx, verbatim — pure functions, no dependency on theme
// or component state, so this is the lowest-risk possible extraction.

export const uid = () => Math.random().toString(36).slice(2, 10);

export const todayStr = (d = new Date()) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

// Both daysBetween and addDays previously mixed UTC-parsed dates
// (`new Date("2026-03-08")` parses as UTC midnight) with local-time mutation
// (`.setDate()`), which can shift results by a day for users far from UTC or
// right around a DST boundary. parseLocalDate always builds the date from
// local-time components so arithmetic stays consistent end to end.
export function parseLocalDate(v) {
  if (v instanceof Date) return new Date(v.getFullYear(), v.getMonth(), v.getDate());
  const [y, m, d] = String(v).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export const daysBetween = (a, b) => {
  const da = parseLocalDate(a), db = parseLocalDate(b);
  // Round rather than ceil: a same-calendar-day comparison across a DST
  // transition can produce a 23 or 25 hour gap instead of exactly 24; round
  // gets "0 days" right in that case instead of off-by-one.
  return Math.round((db - da) / 86400000);
};

export const genCode = () => Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");

export const fmtMin = (m) => m >= 60 ? `${Math.floor(m / 60)}h ${Math.round(m % 60)}m` : `${Math.round(m)}m`;

export const addDays = (dateStr, n) => {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + n);
  return todayStr(d);
};
