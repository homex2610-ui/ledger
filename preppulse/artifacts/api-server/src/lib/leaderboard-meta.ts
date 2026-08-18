import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { weeklyRankSnapshotsTable, type WeeklyRankSnapshot } from "@workspace/db/schema";
import type { PeriodScopeType } from "./periods.js";

const SPARKLINE_WEEKS = 8;

/**
 * Every snapshot for a scope, newest first, restricted to the given members.
 * Rank comparisons against the previous week and streak walks both read from
 * this (snapshots are the only source of truth for movement).
 */
export async function scopeSnapshotRows(
  scopeType: PeriodScopeType,
  scopeId: string,
  userIds: string[],
): Promise<WeeklyRankSnapshot[]> {
  if (userIds.length === 0) return [];
  return db
    .select()
    .from(weeklyRankSnapshotsTable)
    .where(and(eq(weeklyRankSnapshotsTable.scopeType, scopeType), eq(weeklyRankSnapshotsTable.scopeId, scopeId), inArray(weeklyRankSnapshotsTable.userId, userIds)))
    .orderBy(desc(weeklyRankSnapshotsTable.weekStart));
}

export interface UserRankHistory {
  /** Snapshots newest-first. */
  points: Array<{ weekStart: Date; rank: number }>;
}

export async function rankHistoryForScope(
  scopeType: PeriodScopeType,
  scopeId: string,
  userIds: string[],
): Promise<Map<string, UserRankHistory>> {
  const rows = await scopeSnapshotRows(scopeType, scopeId, userIds);
  const byUser = new Map<string, UserRankHistory>();
  for (const row of rows) {
    let history = byUser.get(row.userId);
    if (!history) {
      history = { points: [] };
      byUser.set(row.userId, history);
    }
    history.points.push({ weekStart: row.weekStart, rank: row.rank });
  }
  return byUser;
}

/**
 * Last N completed weeks of snapshot ranks per member, oldest-first — the raw
 * sparkline data for a whole leaderboard in one query.
 */
export async function sparklineRanksForScope(
  scopeType: PeriodScopeType,
  scopeId: string,
  userIds: string[],
): Promise<Map<string, number[]>> {
  if (userIds.length === 0) return new Map();
  const rows = await db
    .select({ userId: weeklyRankSnapshotsTable.userId, weekStart: weeklyRankSnapshotsTable.weekStart, rank: weeklyRankSnapshotsTable.rank })
    .from(weeklyRankSnapshotsTable)
    .where(and(eq(weeklyRankSnapshotsTable.scopeType, scopeType), eq(weeklyRankSnapshotsTable.scopeId, scopeId), inArray(weeklyRankSnapshotsTable.userId, userIds)))
    .orderBy(desc(weeklyRankSnapshotsTable.weekStart));

  const byUser = new Map<string, Array<{ weekStart: Date; rank: number }>>();
  for (const row of rows) {
    let points = byUser.get(row.userId);
    if (!points) {
      points = [];
      byUser.set(row.userId, points);
    }
    points.push({ weekStart: row.weekStart, rank: row.rank });
  }

  const result = new Map<string, number[]>();
  for (const [userId, points] of byUser) {
    result.set(userId, points.slice(0, SPARKLINE_WEEKS).reverse().map((point) => point.rank));
  }
  return result;
}