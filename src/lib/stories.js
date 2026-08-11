import { addDays, todayStr, parseLocalDate, computeStreak, longestStreak } from "./utils.js";

const MOTIVATION = [
  "Small sessions become big results.",
  "Quiet work. Visible progress.",
  "The streak is built one day at a time.",
  "A focused hour compounds.",
];

const dateKey = d => todayStr(d);
const inRange = (date, start, end) => date >= start && date <= end;
const sum = (rows, key = "minutes") => rows.reduce((n, row) => n + (Number(row?.[key]) || 0), 0);
const pctOf = mock => {
  const max = Number(mock?.max), total = Number(mock?.total);
  return max > 0 && Number.isFinite(total) ? Math.min(100, (total / max) * 100) : null;
};
const round = n => Math.round(Number(n) || 0);

function periodBounds(mode, now) {
  const today = dateKey(now);
  if (mode === "week") return { start: addDays(today, -6), end: today };
  if (mode === "month") {
    const d = parseLocalDate(today);
    const start = dateKey(new Date(d.getFullYear(), d.getMonth(), 1));
    const end = dateKey(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    return { start, end };
  }
  return { start: today, end: today };
}

function dailyRows(sessions, start, end) {
  const rows = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const day = sessions.filter(s => s.date === d);
    rows.push({ date: d, label: parseLocalDate(d).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2), minutes: sum(day) });
  }
  return rows;
}

function subjectDistribution(sessions, profile, start, end) {
  const totals = {};
  (profile?.subjects || []).forEach(subject => { totals[subject] = 0; });
  sessions.filter(s => inRange(s.date, start, end)).forEach(s => {
    if (s.subject) totals[s.subject] = (totals[s.subject] || 0) + (Number(s.minutes) || 0);
  });
  const total = Object.values(totals).reduce((a, b) => a + b, 0);
  return Object.entries(totals).filter(([, minutes]) => minutes > 0).sort((a, b) => b[1] - a[1]).map(([name, minutes]) => ({ name, minutes, percentage: Math.round((minutes / total) * 100) }));
}

function mockStats(mocks, start, end) {
  const rows = mocks.filter(m => inRange(m.date, start, end));
  const scores = rows.map(pctOf).filter(v => v !== null);
  return { rows, tests: rows.length, accuracy: scores.length ? round(scores.reduce((a, b) => a + b, 0) / scores.length) : undefined };
}

function delta(current, previous) {
  if (!(current > 0 && previous > 0)) return undefined;
  const value = round(((current - previous) / previous) * 100);
  return value || undefined;
}

function motivation(seed) { return MOTIVATION[Math.abs(String(seed).split("").reduce((n, c) => n + c.charCodeAt(0), 0)) % MOTIVATION.length]; }

export function buildStoryData({ mode = "today", sessions = [], dpp = [], mocks = [], profile = {}, now = new Date() }) {
  const today = dateKey(now);
  const { start, end } = periodBounds(mode, now);
  const periodSessions = sessions.filter(s => inRange(s.date, start, end));
  const periodDpp = dpp.filter(d => inRange(d.date, start, end));
  const periodMocks = mockStats(mocks, start, end);
  const questions = sum(periodDpp, "solved");
  const subjects = subjectDistribution(sessions, profile, start, end);
  const days = dailyRows(sessions, start, end);
  const activeDays = days.filter(d => d.minutes > 0).length;
  const base = { mode, periodLabel: mode === "today" ? "TODAY IN LEDGER" : mode === "week" ? "THIS WEEK IN LEDGER" : parseLocalDate(start).toLocaleDateString(undefined, { month: "long", year: "numeric" }).toUpperCase(), motivationalLine: motivation(start) };

  if (mode === "today") {
    const longest = Math.max(...periodSessions.map(s => Number(s.minutes) || 0), 0);
    const bestMock = periodMocks.rows.map(m => ({ m, score: pctOf(m) })).filter(x => x.score !== null).sort((a, b) => b.score - a.score)[0];
    return { ...base, studyMinutes: sum(periodSessions), sessions: periodSessions.length || undefined, questions: questions || undefined, accuracy: periodMocks.accuracy, subjects: subjects.length ? subjects : undefined, streak: computeStreak(sessions, today) || undefined, biggestWin: bestMock ? `${round(bestMock.score)}% on ${bestMock.m.name || "a mock"}` : longest > 0 ? `${round(longest)} focused minutes` : undefined };
  }

  const previousStart = mode === "week" ? addDays(start, -7) : dateKey(new Date(parseLocalDate(start).getFullYear(), parseLocalDate(start).getMonth() - 1, 1));
  const previousEnd = addDays(start, -1);
  const previousSessions = sessions.filter(s => inRange(s.date, previousStart, previousEnd));
  const previousMocks = mockStats(mocks, previousStart, previousEnd);
  const bestDay = days.slice().sort((a, b) => b.minutes - a.minutes)[0];
  const highlight = mode === "month" && (longestStreak(sessions) || 0) > 1 ? { label: "Longest streak", value: `${longestStreak(sessions)} days` } : subjects[0] ? { label: "Strongest subject", value: subjects[0].name } : bestDay?.minutes > 0 ? { label: "Best day", value: `${bestDay.label} · ${round(bestDay.minutes)}m` } : undefined;
  return {
    ...base,
    studyMinutes: sum(periodSessions) || undefined,
    questions: questions || undefined,
    tests: periodMocks.tests || undefined,
    accuracy: periodMocks.accuracy,
    subjects: subjects.length ? subjects : undefined,
    dailyActivity: days,
    streak: computeStreak(sessions, today) || undefined,
    strongestSubject: subjects[0]?.name,
    bestDay: bestDay?.minutes > 0 ? { label: bestDay.label, minutes: bestDay.minutes } : undefined,
    accuracyDelta: delta(periodMocks.accuracy, previousMocks.accuracy),
    studyMinutesDelta: delta(sum(periodSessions), sum(previousSessions)),
    activeDays,
    daysInPeriod: days.length,
    highlight,
  };
}

export function getStoryShareUrl() {
  const base = import.meta.env.VITE_REDIRECT_URL || window.location.origin;
  return `${base.replace(/\/$/, "")}/?ref=story`;
}

export { pctOf };
