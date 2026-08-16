import { asc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { studySessionsTable } from "@workspace/db/schema";
import { computeStreak } from "./prep-stats.js";
import { dayKeyIn, parseISODate, startOfWeek } from "./utils.js";

type SessionRow = { createdAt: Date; minutes: number; subject: string };

export interface StatsQuery {
  timeZone?: string;
  weekStart?: string;
  month?: string;
  subjectsPeriod: "week" | "all";
}

const CHRONOTYPE_BUCKETS: Array<{ key: string; label: string; startHour: number; endHour: number }> = [
  { key: "morning", label: "Early riser", startHour: 5, endHour: 11 },
  { key: "afternoon", label: "Afternoon focuser", startHour: 12, endHour: 16 },
  { key: "evening", label: "Evening focuser", startHour: 17, endHour: 21 },
  { key: "night", label: "Night owl", startHour: 22, endHour: 4 },
];

function hourIn(date: Date, timeZone?: string): number {
  if (!timeZone) return date.getHours();
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", hour12: false }).formatToParts(date);
  return (Number(parts.find((part) => part.type === "hour")?.value ?? "0") % 24) as number;
}

function bucketForHour(hour: number): { key: string; label: string } {
  const bucket = CHRONOTYPE_BUCKETS.find((b) => (b.startHour <= b.endHour ? hour >= b.startHour && hour <= b.endHour : hour >= b.startHour || hour <= b.endHour));
  return bucket ? { key: bucket.key, label: bucket.label } : { key: "morning", label: "Early riser" };
}

function dayOfWeekForKey(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

function fmtHourWindow(startHour: number): string {
  const fmt = (h: number) => {
    const normalized = ((h % 24) + 24) % 24;
    const period = normalized < 12 ? "AM" : "PM";
    const hour12 = normalized % 12 === 0 ? 12 : normalized % 12;
    return `${hour12} ${period}`;
  };
  return `${fmt(startHour)} - ${fmt(startHour + 2)}`;
}

function weekdayLabelForKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "long" });
}

function monthLabelFor(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function daysOfWeek(weekStartDate: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStartDate);
    d.setDate(weekStartDate.getDate() + i);
    return dayKeyIn(d);
  });
}

function lastNDayKeys(n: number, timeZone?: string): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(dayKeyIn(d, timeZone));
  }
  return out;
}


export async function computeStats(userId: string, query: StatsQuery) {  const { timeZone, subjectsPeriod } = query;

  const rows = await db
    .select({ createdAt: studySessionsTable.createdAt, minutes: studySessionsTable.minutes, subject: studySessionsTable.subject })
    .from(studySessionsTable)
    .where(eq(studySessionsTable.userId, userId))
    .orderBy(asc(studySessionsTable.createdAt));

  const sessions: SessionRow[] = rows;

  const minutesByDay = new Map<string, number>();
  const sessionsByDay = new Map<string, SessionRow[]>();
  for (const row of sessions) {
    const key = dayKeyIn(row.createdAt, timeZone);
    minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + row.minutes);
    const list = sessionsByDay.get(key) ?? [];
    list.push(row);
    sessionsByDay.set(key, list);
  }

  const todayKey = dayKeyIn(new Date(), timeZone);
  const last7 = lastNDayKeys(7, timeZone);
  const last30 = lastNDayKeys(30, timeZone);

  const todayMinutes = minutesByDay.get(todayKey) ?? 0;
  const last7Minutes = last7.map((key) => minutesByDay.get(key) ?? 0);
  const avg7 = last7Minutes.length ? Math.round((last7Minutes.reduce((sum, m) => sum + m, 0) / last7Minutes.length) * 10) / 10 : 0;
  const peak7 = last7Minutes.length ? Math.max(...last7Minutes) : 0;

  let activeDays30 = 0;
  for (const key of last30) {
    if ((minutesByDay.get(key) ?? 0) > 0) activeDays30 += 1;
  }
  const consistency30 = Math.round((activeDays30 / 30) * 100);

  const last30Sessions = last30.flatMap((key) => sessionsByDay.get(key) ?? []);
  const avgSessionMinutes30 = last30Sessions.length ? Math.round(last30Sessions.reduce((sum, row) => sum + row.minutes, 0) / last30Sessions.length) : 0;

  let chronotype: { label: string; bucket: string } | null = null;
  if (last30Sessions.length > 0) {
    const minutesByBucket = new Map<string, { key: string; label: string; minutes: number }>();
    for (const row of last30Sessions) {
      const bucket = bucketForHour(hourIn(row.createdAt, timeZone));
      const entry = minutesByBucket.get(bucket.key) ?? { key: bucket.key, label: bucket.label, minutes: 0 };
      entry.minutes += row.minutes;
      minutesByBucket.set(bucket.key, entry);
    }
    const top = Array.from(minutesByBucket.values()).sort((a, b) => b.minutes - a.minutes)[0];
    if (top && top.minutes > 0) chronotype = { label: top.label, bucket: top.key };
  }

  let weekendMinutes30 = 0;
  let weekdayMinutes30 = 0;
  const minutesByHour30 = new Map<number, number>();
  const minutesByWeekday30 = new Map<string, number>();
  for (const key of last30) {
    const minutes = minutesByDay.get(key) ?? 0;
    const weekday = dayOfWeekForKey(key);
    if (weekday === 0 || weekday === 6) weekendMinutes30 += minutes;
    else weekdayMinutes30 += minutes;
  }
  for (const row of last30Sessions) {
    const hour = hourIn(row.createdAt, timeZone);
    minutesByHour30.set(hour, (minutesByHour30.get(hour) ?? 0) + row.minutes);
    const weekday = weekdayLabelForKey(dayKeyIn(row.createdAt, timeZone));
    minutesByWeekday30.set(weekday, (minutesByWeekday30.get(weekday) ?? 0) + row.minutes);
  }

  let peakFocus: string | null = null;
  if (minutesByHour30.size > 0) {
    const topHour = Array.from(minutesByHour30.entries()).sort((a, b) => b[1] - a[1])[0][0];
    peakFocus = fmtHourWindow(Math.floor(topHour / 2) * 2);
  }

  let mostProductiveDay: string | null = null;
  if (minutesByWeekday30.size > 0) {
    mostProductiveDay = Array.from(minutesByWeekday30.entries()).sort((a, b) => b[1] - a[1])[0][0];
  }

  const weekStartDate = query.weekStart ? parseISODate(query.weekStart) : startOfWeek();
  const weekDays = daysOfWeek(weekStartDate);
  const week = {
    weekStart: weekDays[0],
    weekLabel: `${new Date(weekDays[0] + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${new Date(weekDays[6] + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
    days: weekDays.map((key) => ({ date: key, minutes: minutesByDay.get(key) ?? 0 })),
  };

  const subjects = new Map<string, number>();
  if (subjectsPeriod === "week") {
    for (const key of weekDays) {
      for (const row of sessionsByDay.get(key) ?? []) {
        subjects.set(row.subject, (subjects.get(row.subject) ?? 0) + row.minutes);
      }
    }
  } else {
    for (const row of sessions) {
      subjects.set(row.subject, (subjects.get(row.subject) ?? 0) + row.minutes);
    }
  }
  const subjectItems = Array.from(subjects.entries())
    .filter(([, minutes]) => minutes > 0)
    .map(([subject, minutes]) => ({ subject, minutes }))
    .sort((a, b) => b.minutes - a.minutes);

  const momentum = last30.map((key) => ({ date: key, minutes: minutesByDay.get(key) ?? 0 }));

  const month = query.month ?? `${todayKey.slice(0, 4)}-${todayKey.slice(5, 7)}`;
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const heatmapDays = Array.from({ length: lastDay }, (_, i) => {
    const key = `${month}-${String(i + 1).padStart(2, "0")}`;
    return { date: key, minutes: minutesByDay.get(key) ?? 0 };
  });
  const heatmap = { month, monthLabel: monthLabelFor(month), days: heatmapDays };

  return {
    streak: await computeStreak(userId, timeZone),
    todayMinutes,
    avg7,
    peak7,
    consistency30,
    avgSessionMinutes30,
    chronotype,
    weekendMinutes30,
    weekdayMinutes30,
    peakFocus,
    mostProductiveDay,
    week,
    subjects: { period: subjectsPeriod, items: subjectItems },
    momentum,
    heatmap,
  };
}