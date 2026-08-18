import { and, eq, inArray, lte, ne, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  cohortMembersTable,
  groupMembersTable,
  groupsTable,
  profilesTable,
  weeklyPeriodsTable,
  weeklyRankSnapshotsTable,
  type WeeklyPeriod,
} from "@workspace/db/schema";
import { rankPeriodEntries } from "./periods-core.js";
import { weeklyPulseForUsers } from "./prep-stats.js";
import { startOfWeek } from "./utils.js";

export const WEEK_MS = 7 * 86_400_000;
export const PERIOD_TIMEZONE = "UTC";

export type PeriodScopeType = "cohort" | "group";
export type PeriodStatus = "open" | "closing" | "closed";

export const PERIOD_SCOPE_TYPES: readonly PeriodScopeType[] = ["cohort", "group"];

export { rankPeriodEntries };
export type { PeriodEntry, RankedPeriodEntry } from "./periods-core.js";

/** Members of a leaderboard scope, in member-joined order. */
async function scopeMemberIds(scopeType: PeriodScopeType, scopeId: string): Promise<string[]> {
  if (scopeType === "cohort") {
    const rows = await db
      .select({ userId: cohortMembersTable.userId })
      .from(cohortMembersTable)
      .where(eq(cohortMembersTable.cohortId, scopeId));
    return rows.map((row) => row.userId);
  }
  const rows = await db
    .select({ userId: groupMembersTable.userId })
    .from(groupMembersTable)
    .where(eq(groupMembersTable.groupId, scopeId));
  return rows.map((row) => row.userId);
}

/** Every cohort and group id, used by the cron sweep to close due periods. */
export async function allLeaderboardScopeIds(): Promise<Array<{ scopeType: PeriodScopeType; scopeId: string }>> {
  const [cohortRows, groupRows] = await Promise.all([
    db.select({ scopeId: cohortMembersTable.cohortId }).from(cohortMembersTable).where(sql`true`),
    db.select({ scopeId: groupsTable.id }).from(groupsTable),
  ]);
  const cohortIds = new Set(cohortRows.map((row) => row.scopeId));
  const groupIds = new Set(groupRows.map((row) => row.scopeId));
  return [
    ...[...cohortIds].map((scopeId) => ({ scopeType: "cohort" as const, scopeId })),
    ...[...groupIds].map((scopeId) => ({ scopeType: "group" as const, scopeId })),
  ];
}

/**
 * The single source of truth for "which period is open for a scope right now."
 * Creates a period on first access if none exists for the current week
 * (new cohort, first-ever close, backfilled scopes).
 */
export async function ensureOpenPeriod(
  scopeType: PeriodScopeType,
  scopeId: string,
  now: Date = new Date(),
): Promise<WeeklyPeriod> {
  const weekStart = startOfWeek(now);
  const existing = await db
    .select()
    .from(weeklyPeriodsTable)
    .where(and(eq(weeklyPeriodsTable.scopeType, scopeType), eq(weeklyPeriodsTable.scopeId, scopeId), eq(weeklyPeriodsTable.weekStart, weekStart)))
    .limit(1);
  if (existing[0]) return existing[0];

  const inserted = await db
    .insert(weeklyPeriodsTable)
    .values({
      scopeType,
      scopeId,
      weekStart,
      weekEnd: new Date(weekStart.getTime() + WEEK_MS),
      status: "open",
      timezone: PERIOD_TIMEZONE,
    })
    .onConflictDoNothing()
    .returning();
  if (inserted[0]) return inserted[0];

  const afterRace = await db
    .select()
    .from(weeklyPeriodsTable)
    .where(and(eq(weeklyPeriodsTable.scopeType, scopeType), eq(weeklyPeriodsTable.scopeId, scopeId), eq(weeklyPeriodsTable.weekStart, weekStart)))
    .limit(1);
  return afterRace[0];
}

export async function loadPeriod(periodId: string): Promise<WeeklyPeriod | null> {
  const rows = await db.select().from(weeklyPeriodsTable).where(eq(weeklyPeriodsTable.id, periodId)).limit(1);
  return rows[0] ?? null;
}

export type ClosePeriodResult = { status: "closed" } | { status: "already_closed" };

/**
 * Closes a weekly period and opens the next one. Idempotent: safe to retry
 * mid-pipeline (snapshot inserts are guarded by the period+user unique
 * constraint), and safe to invoke concurrently (period row is locked with
 * SELECT ... FOR UPDATE inside the snapshot transaction).
 *
 * Failure isolation: the snapshot is committed before recap generation runs;
 * a recap failure is caught, logged, and never blocks the close.
 */
export async function closeWeeklyPeriod(periodId: string): Promise<ClosePeriodResult> {
  const period = await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(weeklyPeriodsTable)
      .where(eq(weeklyPeriodsTable.id, periodId))
      .for("update");
    const current = rows[0];
    if (!current) return null;
    if (current.status === "closed") return current;

    if (current.status === "open") {
      await tx
        .update(weeklyPeriodsTable)
        .set({ status: "closing" })
        .where(eq(weeklyPeriodsTable.id, periodId));
    }
    return current;
  });

  if (period === null) return { status: "already_closed" };
  if (period.status === "closed") return { status: "already_closed" };

  const scopeType = period.scopeType as PeriodScopeType;
  const memberIds = await scopeMemberIds(scopeType, period.scopeId);
  const visibleRows = await db
    .select({ userId: profilesTable.userId })
    .from(profilesTable)
    .where(and(inArray(profilesTable.userId, memberIds), ne(profilesTable.showOnLeaderboard, false)));

  const { minutesByUser, topicsByUser } = await weeklyPulseForUsers(
    visibleRows.map((row) => row.userId),
    { from: period.weekStart, to: period.weekEnd },
  );

  const ranked = rankPeriodEntries(
    visibleRows.map((row) => ({
      userId: row.userId,
      minutes: minutesByUser.get(row.userId) ?? 0,
      topicsMoved: topicsByUser.get(row.userId) ?? 0,
    })),
  );

  await db.transaction(async (tx) => {
    for (const entry of ranked) {
      await tx
        .insert(weeklyRankSnapshotsTable)
        .values({
          periodId,
          scopeType,
          scopeId: period.scopeId,
          userId: entry.userId,
          weekStart: period.weekStart,
          rank: entry.rank,
          pulse: entry.pulse,
          minutes: entry.minutes,
          topicsMoved: entry.topicsMoved,
          excluded: false,
        })
        .onConflictDoNothing();
    }
  });

  await tryGenerateWeeklyRecap(periodId);

  await db.transaction(async (tx) => {
    await tx
      .update(weeklyPeriodsTable)
      .set({ status: "closed" })
      .where(eq(weeklyPeriodsTable.id, periodId));
    await tx
      .insert(weeklyPeriodsTable)
      .values({
        scopeType: period.scopeType,
        scopeId: period.scopeId,
        weekStart: period.weekEnd,
        weekEnd: new Date(period.weekEnd.getTime() + WEEK_MS),
        status: "open",
        timezone: period.timezone,
      })
      .onConflictDoNothing();
  });

  return { status: "closed" };
}

/**
 * All periods whose close is due, in a retryable state. The cron sweep and the
 * admin "Run weekly reset" both consume this.
 */
export async function duePeriods(now: Date = new Date()): Promise<WeeklyPeriod[]> {
  return db
    .select()
    .from(weeklyPeriodsTable)
    .where(and(lte(weeklyPeriodsTable.weekEnd, now), ne(weeklyPeriodsTable.status, "closed")));
}

let recapFailureCounter = 0;

/**
 * Recap generation hook. Deliberately isolated from the close pipeline: a
 * thrown error here is logged and swallowed so the snapshot close always
 * completes. The weekly recap artifact is built in a later slice.
 */
async function tryGenerateWeeklyRecap(periodId: string): Promise<void> {
  try {
    await generateWeeklyRecap(periodId);
  } catch (error) {
    recapFailureCounter += 1;
    console.error(`[periods] recap generation failed for period ${periodId}`, error);
  }
}

export { recapFailureCounter };

/** Placeholder until the weekly recap artifact slice lands. */
export async function generateWeeklyRecap(_periodId: string): Promise<void> {
  return;
}