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

// Circle invite codes are compared case-insensitively and whitespace-free.
// Shared by the join flow and (later) invite management so both normalize
// exactly the same way.
export const normalizeInviteCode = (s) => String(s || "").trim().toUpperCase();

// Leaderboard assembly: sort by minutes (ties broken by name), standard
// competition ranking (1, 2, 2, 4), and flag the caller's own row so the
// UI can highlight it. Pure — the dashboard feeds it RPC output directly.
export function buildLeaderboard(rows, myUserId) {
  const list = (rows || []).slice().sort(
    (a, b) => (b.minutes || 0) - (a.minutes || 0) || String(a.display_name || "").localeCompare(String(b.display_name || ""))
  );
  let prev = null;
  let rank = 0;
  return list.map((r, i) => {
    const mins = r.minutes || 0;
    if (mins !== prev) { rank = i + 1; prev = mins; }
    return { ...r, rank, me: !!myUserId && r.user_id === myUserId };
  });
}

// Compact relative timestamp for the circle activity feed ("2m ago",
// "3d ago", then falls back to a short calendar date).
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const timeAgo = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const then = d.getTime();
  if (isNaN(then)) return "";
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  // Manual month/day formatting — locale-independent (toLocaleDateString
  // orders the parts differently per locale).
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
};

export const fmtMin = (m) => m >= 60 ? `${Math.floor(m / 60)}h ${Math.round(m % 60)}m` : `${Math.round(m)}m`;

export const addDays = (dateStr, n) => {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + n);
  return todayStr(d);
};

// Canonical streak definitions — every surface (App, Header, Sidebar,
// Community, Stories) consumes these so the metric can never drift between
// copies. Both use local-date math: session `date` strings are compared
// against local calendar days (todayStr/parseLocalDate), never UTC slices.

// Consecutive study days ending at `end` (defaults to today, local). A day
// counts if a session was logged at all — minutes are irrelevant.
export const computeStreak = (sessions = [], end = new Date()) => {
  const days = new Set(sessions.map(s => s.date));
  let streak = 0;
  const d = parseLocalDate(end);
  while (days.has(todayStr(d))) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
};

// Longest uninterrupted run of active days, from all-time session history.
export const longestStreak = (sessions = []) => {
  const days = Array.from(new Set(sessions.map(s => s.date))).sort();
  let best = 0, run = 0, prev = null;
  for (const d of days) {
    run = prev !== null && daysBetween(prev, d) === 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }
  return best;
};

export const initials = (name) =>
  String(name || "Ledger member")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join("")
    .toUpperCase() || "LM";
