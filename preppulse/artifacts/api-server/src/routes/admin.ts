import { Router, type IRouter } from "express";
import { and, asc, desc, eq, gte, gt, ilike, lt, or, sql } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { db } from "@workspace/db";
import {
  adminAuditLogTable,
  announcementsTable,
  authSessionsTable,
  cohortMembersTable,
  cohortsTable,
  featureFlagsTable,
  focusSessionsTable,
  leaderboardExclusionsTable,
  profilesTable,
  pulseAdjustmentsTable,
  studySessionsTable,
  topicProgressTable,
  usersTable,
} from "@workspace/db/schema";
import {
  CreateAnnouncementBody,
  CreateAnnouncementResponse,
  CreateLeaderboardExclusionBody,
  CreatePulseAdjustmentBody,
  CreatePulseAdjustmentResponse,
  GetAdminAnalyticsResponse,
  GetAdminAuditResponse,
  GetAdminCohortParams,
  GetAdminCohortResponse,
  GetAdminHealthResponse,
  GetAdminStatsResponse,
  GetAdminUserParams,
  GetAdminUserResponse,
  ListAdminAnnouncementsResponse,
  ListAdminCohortsResponse,
  ListAdminUsersExportResponse,
  ListAdminUsersResponse,
  ListFeatureFlagsResponse,
  ListLeaderboardExclusionsResponse,
  ListPulseAdjustmentsResponse,
  MoveCohortMemberBody,
  MoveCohortMemberParams,
  RemoveAdminUserParams,
  RemoveLeaderboardExclusionParams,
  SetAdminBody,
  SetAdminParams,
  ToggleAnnouncementBody,
  ToggleAnnouncementParams,
  ToggleFeatureFlagBody,
  ToggleFeatureFlagParams,
  ToggleFeatureFlagResponse,
  UpdateAdminCohortBody,
  UpdateAdminCohortParams,
  UpdateAdminCohortResponse,
  UpdateAnnouncementBody,
  UpdateAnnouncementParams,
  UpdateAnnouncementResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth.js";
import { COHORT_CAPACITY } from "../lib/cohorts.js";
import { invalidateFeatureFlag } from "../lib/feature-flags.js";
import { getLastHealthz, recentDbErrors, recordDbProbeFailure } from "../lib/health-stats.js";
import { runWeeklyReset } from "../lib/periods.js";
import { isUuid } from "../lib/utils.js";

const router: IRouter = Router();
router.use(requireAuth);

/** Responds 400 and returns true when the value is not a well-formed UUID. */
function rejectInvalidUuid(res: Response, value: unknown): boolean {
  if (isUuid(value)) return false;
  res.status(400).json({ error: "Invalid id" });
  return true;
}

async function isAdmin(userId: string): Promise<boolean> {
  const rows = await db.select({ isAdmin: profilesTable.isAdmin }).from(profilesTable).where(eq(profilesTable.userId, userId)).limit(1);
  return rows[0]?.isAdmin ?? false;
}

async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!(await isAdmin(req.userId))) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  next();
}

router.use(requireAdmin);

function rpcError(error: unknown): { status: number; message: string } | null {
  let current: unknown = error;
  const seen = new Set<Error>();
  while (current instanceof Error && !seen.has(current)) {
    seen.add(current);
    const message = current.message;
    if (message.includes("not_admin")) return { status: 404, message: "Not found" };
    if (message.includes("user_not_found")) return { status: 404, message: "User not found" };
    if (message.includes("announcement_not_found")) return { status: 404, message: "Announcement not found" };
    if (message.includes("cohort_not_found")) return { status: 404, message: "Cohort not found" };
    if (message.includes("user_not_in_cohort")) return { status: 404, message: "User is not in a cohort" };
    if (message.includes("already_in_cohort")) return { status: 409, message: "That user is already in that cohort" };
    if (message.includes("cohort_full")) return { status: 409, message: "That cohort is full" };
    if (message.includes("last_admin")) return { status: 409, message: "Can't remove the last admin" };
    if (message.includes("one_active_announcement")) return { status: 409, message: "Someone else just changed this - refresh and retry" };
    current = current.cause;
  }
  return null;
}

router.get("/admin/stats", async (_req, res) => {
  const [userAgg] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
  const [cohortAgg] = await db.select({ count: sql<number>`count(*)::int` }).from(cohortsTable);
  const nearRows = await db
    .select({ id: cohortsTable.id })
    .from(cohortsTable)
    .leftJoin(cohortMembersTable, eq(cohortMembersTable.cohortId, cohortsTable.id))
    .groupBy(cohortsTable.id)
    .having(sql`count(${cohortMembersTable.userId}) >= ${cohortsTable.capacity} - 2`);
  const activeRows = await db
    .select({ id: announcementsTable.id, title: announcementsTable.title, icon: announcementsTable.icon })
    .from(announcementsTable)
    .where(eq(announcementsTable.isEnabled, true))
    .limit(1);
  const auditRows = await db.select().from(adminAuditLogTable).orderBy(desc(adminAuditLogTable.createdAt)).limit(10);
  res.json(
    GetAdminStatsResponse.parse({
      totalUsers: userAgg?.count ?? 0,
      totalCohorts: cohortAgg?.count ?? 0,
      nearCapacityCohorts: nearRows.length,
      activeAnnouncement: activeRows[0]
        ? { id: activeRows[0].id, title: activeRows[0].title, icon: activeRows[0].icon }
        : null,
      recentAudit: auditRows.map((row) => ({
        id: row.id,
        adminId: row.adminId,
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId,
        beforeState: row.beforeState,
        afterState: row.afterState,
        createdAt: row.createdAt,
      })),
    }),
  );
});

// ---------------------------------------------------------------------------
// Analytics — SQL-on-read aggregates: actives, cohort heatmap, retention
// ---------------------------------------------------------------------------

async function distinctActives(days: number, now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - days * 86_400_000);
  const [sessionRows, topicRows] = await Promise.all([
    db.select({ userId: studySessionsTable.userId }).from(studySessionsTable).where(gte(studySessionsTable.createdAt, cutoff)),
    db.select({ userId: topicProgressTable.userId }).from(topicProgressTable).where(gte(topicProgressTable.updatedAt, cutoff)),
  ]);
  return new Set([...sessionRows.map((row) => row.userId), ...topicRows.map((row) => row.userId)]).size;
}

router.get("/admin/analytics", async (_req, res) => {
  const now = new Date();
  const [d1, d7, d30] = await Promise.all([distinctActives(1, now), distinctActives(7, now), distinctActives(30, now)]);

  const heatmapStart = new Date(now.getTime() - 13 * 86_400_000);
  const heatmapRows = await db
    .select({
      cohortId: cohortMembersTable.cohortId,
      day: sql<string>`to_char(${studySessionsTable.createdAt}, 'YYYY-MM-DD')`,
      minutes: sql<number>`coalesce(sum(${studySessionsTable.minutes}), 0)::int`,
    })
    .from(cohortMembersTable)
    .innerJoin(studySessionsTable, eq(studySessionsTable.userId, cohortMembersTable.userId))
    .where(gte(studySessionsTable.createdAt, heatmapStart))
    .groupBy(cohortMembersTable.cohortId, sql`to_char(${studySessionsTable.createdAt}, 'YYYY-MM-DD')`);

  const [sessionActivity, topicActivity] = await Promise.all([
    db
      .select({
        userId: studySessionsTable.userId,
        week: sql<string>`to_char(date_trunc('week', ${studySessionsTable.createdAt}), 'YYYY-MM-DD')`,
      })
      .from(studySessionsTable)
      .where(gte(studySessionsTable.createdAt, new Date(now.getTime() - 56 * 86_400_000))),
    db
      .select({
        userId: topicProgressTable.userId,
        week: sql<string>`to_char(date_trunc('week', ${topicProgressTable.updatedAt}), 'YYYY-MM-DD')`,
      })
      .from(topicProgressTable)
      .where(gte(topicProgressTable.updatedAt, new Date(now.getTime() - 56 * 86_400_000))),
  ]);

  const activesByWeek = new Map<string, Set<string>>();
  for (const row of [...sessionActivity, ...topicActivity]) {
    let set = activesByWeek.get(row.week);
    if (!set) {
      set = new Set();
      activesByWeek.set(row.week, set);
    }
    set.add(row.userId);
  }

  const retention: Array<{ weekStart: string; activeUsers: number; retainedFromPrevious: number | null }> = [];
  const weekKeys = [...activesByWeek.keys()].sort();
  for (let i = 0; i < weekKeys.length; i++) {
    const current = activesByWeek.get(weekKeys[i]) ?? new Set<string>();
    let retained: number | null = null;
    if (i > 0) {
      const previous = activesByWeek.get(weekKeys[i - 1]) ?? new Set<string>();
      retained = [...previous].filter((id) => current.has(id)).length;
    }
    retention.push({ weekStart: weekKeys[i], activeUsers: current.size, retainedFromPrevious: retained });
  }

  res.json(
    GetAdminAnalyticsResponse.parse({
      activeUsers: { d1, d7, d30 },
      cohortHeatmap: heatmapRows.map((row) => ({ cohortId: row.cohortId, date: row.day, minutes: row.minutes })),
      retention,
    }),
  );
});

// ---------------------------------------------------------------------------
// Health — per-metric degradation instead of a hard failure
// ---------------------------------------------------------------------------

router.get("/admin/health", async (_req, res) => {
  let pgOk = true;
  try {
    await db.execute(sql`select 1`);
  } catch (error) {
    pgOk = false;
    recordDbProbeFailure();
  }

  let sessionsOk = false;
  let sessionCount = 0;
  try {
    const [sessionAgg] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(authSessionsTable)
      .where(gt(authSessionsTable.expiresAt, new Date()));
    sessionsOk = true;
    sessionCount = sessionAgg?.count ?? 0;
  } catch {
    sessionsOk = false;
  }

  const deploySha = process.env["VERCEL_GIT_COMMIT_SHA"] ?? process.env["GIT_SHA"] ?? null;

  res.json(
    GetAdminHealthResponse.parse({
      pgErrors: { ok: pgOk, value: recentDbErrors(15 * 60_000) },
      activeSessions: { ok: sessionsOk, value: sessionCount },
      lastHealthz: { ok: getLastHealthz() !== null, value: getLastHealthz() },
      lastDeploy: { ok: deploySha !== null, value: deploySha },
    }),
  );
});

router.get("/admin/announcements", async (_req, res) => {
  const rows = await db.select().from(announcementsTable).orderBy(desc(announcementsTable.createdAt));
  res.json(ListAdminAnnouncementsResponse.parse(rows));
});

router.post("/admin/announcements", async (req, res) => {
  const body = CreateAnnouncementBody.parse(req.body);
  if (!body.title.trim() || !body.body.trim()) {
    res.status(400).json({ error: "Title and body are required" });
    return;
  }
  const startsAt = body.startsAt ? new Date(body.startsAt) : null;
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (startsAt && expiresAt && expiresAt <= startsAt) {
    res.status(400).json({ error: "expiresAt must be after startsAt" });
    return;
  }
  if (body.audienceId && !isUuid(body.audienceId)) {
    res.status(400).json({ error: "Invalid audience id" });
    return;
  }
  const inserted = await db
    .insert(announcementsTable)
    .values({
      title: body.title,
      body: body.body,
      link: body.link ?? null,
      icon: body.icon ?? "megaphone",
      audienceType: body.audienceType ?? "all",
      audienceId: body.audienceId ?? null,
      startsAt,
      expiresAt,
    })
    .returning();
  res.status(201).json(CreateAnnouncementResponse.parse(inserted[0]));
});

router.patch("/admin/announcements/:announcementId", async (req, res) => {
  const { announcementId } = UpdateAnnouncementParams.parse(req.params);
  if (rejectInvalidUuid(res, announcementId)) return;
  const body = UpdateAnnouncementBody.parse(req.body);
  if (body.title !== undefined && !body.title.trim()) {
    res.status(400).json({ error: "Title cannot be empty" });
    return;
  }
  if (body.body !== undefined && !body.body.trim()) {
    res.status(400).json({ error: "Body cannot be empty" });
    return;
  }
  const startsAt = body.startsAt === undefined ? undefined : body.startsAt ? new Date(body.startsAt) : null;
  const expiresAt = body.expiresAt === undefined ? undefined : body.expiresAt ? new Date(body.expiresAt) : null;
  if (startsAt && expiresAt && expiresAt <= startsAt) {
    res.status(400).json({ error: "expiresAt must be after startsAt" });
    return;
  }
  const updated = await db
    .update(announcementsTable)
    .set({
      title: body.title,
      body: body.body,
      link: body.link ?? null,
      icon: body.icon,
      audienceType: body.audienceType,
      audienceId: body.audienceId === undefined ? undefined : body.audienceId,
      startsAt,
      expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(announcementsTable.id, announcementId))
    .returning();
  if (!updated[0]) {
    res.status(404).json({ error: "Announcement not found" });
    return;
  }
  res.json(UpdateAnnouncementResponse.parse(updated[0]));
});

router.post("/admin/announcements/:announcementId/toggle", async (req, res) => {
  const { announcementId } = ToggleAnnouncementParams.parse(req.params);
  if (rejectInvalidUuid(res, announcementId)) return;
  const body = ToggleAnnouncementBody.parse(req.body);
  try {
    await db.execute(sql`select admin_toggle_announcement(${req.userId}::uuid, ${announcementId}::uuid, ${body.enabled})`);
    res.status(204).end();
  } catch (error) {
    const mapped = rpcError(error);
    if (mapped) {
      res.status(mapped.status).json({ error: mapped.message });
      return;
    }
    throw error;
  }
});

router.get("/admin/cohorts", async (_req, res) => {
  const rows = await db
    .select({
      id: cohortsTable.id,
      capacity: cohortsTable.capacity,
      leaderboardTopN: cohortsTable.leaderboardTopN,
      name: cohortsTable.name,
      createdAt: cohortsTable.createdAt,
      memberCount: sql<number>`count(distinct ${cohortMembersTable.userId})::int`,
      weeklyMinutes: sql<number>`coalesce(sum(case when ${studySessionsTable.createdAt} >= date_trunc('week', now()) then ${studySessionsTable.minutes} else 0 end), 0)::int`,
    })
    .from(cohortsTable)
    .leftJoin(cohortMembersTable, eq(cohortMembersTable.cohortId, cohortsTable.id))
    .leftJoin(studySessionsTable, eq(studySessionsTable.userId, cohortMembersTable.userId))
    .groupBy(cohortsTable.id)
    .orderBy(asc(cohortsTable.createdAt));
  res.json(ListAdminCohortsResponse.parse(rows.map((row) => ({ ...row, capacity: row.capacity ?? COHORT_CAPACITY }))));
});

router.get("/admin/cohorts/:cohortId", async (req, res) => {
  const { cohortId } = GetAdminCohortParams.parse(req.params);
  if (rejectInvalidUuid(res, cohortId)) return;
  const cohortRows = await db.select().from(cohortsTable).where(eq(cohortsTable.id, cohortId)).limit(1);
  if (!cohortRows[0]) {
    res.status(404).json({ error: "Cohort not found" });
    return;
  }
  const members = await db
    .select({
      userId: cohortMembersTable.userId,
      handle: usersTable.handle,
      email: usersTable.email,
      joinedAt: cohortMembersTable.joinedAt,
    })
    .from(cohortMembersTable)
    .innerJoin(usersTable, eq(usersTable.id, cohortMembersTable.userId))
    .where(eq(cohortMembersTable.cohortId, cohortId))
    .orderBy(asc(cohortMembersTable.joinedAt));
  res.json(
    GetAdminCohortResponse.parse({
      id: cohortRows[0].id,
      capacity: cohortRows[0].capacity,
      leaderboardTopN: cohortRows[0].leaderboardTopN,
      name: cohortRows[0].name,
      createdAt: cohortRows[0].createdAt,
      memberCount: members.length,
      members,
    }),
  );
});

router.patch("/admin/cohorts/:cohortId", async (req, res) => {
  const { cohortId } = UpdateAdminCohortParams.parse(req.params);
  if (rejectInvalidUuid(res, cohortId)) return;
  const body = UpdateAdminCohortBody.parse(req.body);
  const existing = await db.select().from(cohortsTable).where(eq(cohortsTable.id, cohortId)).limit(1);
  if (!existing[0]) {
    res.status(404).json({ error: "Cohort not found" });
    return;
  }
  const before = existing[0];
  const updated = (
    await db
      .update(cohortsTable)
      .set({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.capacity !== undefined ? { capacity: body.capacity } : {}),
        ...(body.leaderboardTopN !== undefined ? { leaderboardTopN: body.leaderboardTopN } : {}),
      })
      .where(eq(cohortsTable.id, cohortId))
      .returning()
  )[0];

  await db.insert(adminAuditLogTable).values({
    adminId: req.userId,
    action: "cohort_update",
    targetType: "cohort",
    targetId: cohortId,
    beforeState: {
      name: before.name,
      capacity: before.capacity,
      leaderboardTopN: before.leaderboardTopN,
    },
    afterState: {
      name: updated.name,
      capacity: updated.capacity,
      leaderboardTopN: updated.leaderboardTopN,
      reason: body.reason ?? null,
    },
  });

  res.json(UpdateAdminCohortResponse.parse(updated));
});

router.post("/admin/cohorts/members/:userId/move", async (req, res) => {
  const { userId } = MoveCohortMemberParams.parse(req.params);
  if (rejectInvalidUuid(res, userId)) return;
  const body = MoveCohortMemberBody.parse(req.body);
  if (rejectInvalidUuid(res, body.toCohortId)) return;
  try {
    await db.execute(sql`select admin_move_cohort_member(${req.userId}::uuid, ${userId}::uuid, ${body.toCohortId}::uuid)`);
    res.status(204).end();
  } catch (error) {
    const mapped = rpcError(error);
    if (mapped) {
      res.status(mapped.status).json({ error: mapped.message });
      return;
    }
    throw error;
  }
});

router.get("/admin/users", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const rows = await db
    .select({
      id: usersTable.id,
      handle: usersTable.handle,
      email: usersTable.email,
      isAdmin: profilesTable.isAdmin,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .leftJoin(profilesTable, eq(profilesTable.userId, usersTable.id))
    .where(q ? or(ilike(usersTable.handle, `%${q}%`), ilike(usersTable.email, `%${q}%`)) : undefined)
    .orderBy(asc(usersTable.createdAt))
    .limit(100);
  res.json(ListAdminUsersResponse.parse(rows.map((row) => ({ ...row, isAdmin: row.isAdmin ?? false }))));
});

router.get("/admin/users/export", async (_req, res) => {
  // Per-user aggregates via correlated scalar subqueries. A single LEFT JOIN
  // against both session tables would cross-multiply rows (studySessions x
  // focusSessions per user), inflating counts and sums.
  const rows = await db
    .select({
      id: usersTable.id,
      handle: usersTable.handle,
      email: usersTable.email,
      isAdmin: profilesTable.isAdmin,
      createdAt: usersTable.createdAt,
      cohortId: cohortMembersTable.cohortId,
      sessionCount: sql<number>`(select count(*)::int from ${studySessionsTable} where ${studySessionsTable.userId} = ${usersTable.id})`,
      totalMinutes: sql<number>`coalesce((select sum(${studySessionsTable.minutes}) from ${studySessionsTable} where ${studySessionsTable.userId} = ${usersTable.id}), 0)::int`,
      focusSessionsCompleted: sql<number>`(select count(*)::int from ${focusSessionsTable} where ${focusSessionsTable.userId} = ${usersTable.id} and ${focusSessionsTable.status} = 'completed')`,
    })
    .from(usersTable)
    .leftJoin(profilesTable, eq(profilesTable.userId, usersTable.id))
    .leftJoin(cohortMembersTable, eq(cohortMembersTable.userId, usersTable.id))
    .groupBy(usersTable.id, profilesTable.isAdmin, cohortMembersTable.cohortId)
    .orderBy(asc(usersTable.createdAt));
  res.json(ListAdminUsersExportResponse.parse(rows.map((row) => ({ ...row, isAdmin: row.isAdmin ?? false }))));
});

router.get("/admin/users/:userId", async (req, res) => {
  const { userId } = GetAdminUserParams.parse(req.params);
  if (rejectInvalidUuid(res, userId)) return;
  const userRows = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const profileRows = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId)).limit(1);
  if (!userRows[0]) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const membership = await db.select().from(cohortMembersTable).where(eq(cohortMembersTable.userId, userId)).limit(1);
  const [sessionAgg] = await db
    .select({
      sessionCount: sql<number>`count(*)::int`,
      totalMinutes: sql<number>`coalesce(sum(${studySessionsTable.minutes}), 0)::int`,
    })
    .from(studySessionsTable)
    .where(eq(studySessionsTable.userId, userId));
  const [focusAgg] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(focusSessionsTable)
    .where(and(eq(focusSessionsTable.userId, userId), eq(focusSessionsTable.status, "completed")));
  res.json(
    GetAdminUserResponse.parse({
      id: userRows[0].id,
      handle: userRows[0].handle,
      email: userRows[0].email,
      isAdmin: profileRows[0]?.isAdmin ?? false,
      createdAt: userRows[0].createdAt,
      cohortId: membership[0]?.cohortId ?? null,
      cohortJoinedAt: membership[0]?.joinedAt ?? null,
      sessionCount: sessionAgg?.sessionCount ?? 0,
      totalMinutes: sessionAgg?.totalMinutes ?? 0,
      focusSessionsCompleted: focusAgg?.count ?? 0,
    }),
  );
});

router.post("/admin/users/:userId/set-admin", async (req, res) => {
  const { userId } = SetAdminParams.parse(req.params);
  if (rejectInvalidUuid(res, userId)) return;
  const body = SetAdminBody.parse(req.body);
  try {
    await db.execute(sql`select admin_set_admin(${req.userId}::uuid, ${userId}::uuid, ${body.isAdmin})`);
    res.status(204).end();
  } catch (error) {
    const mapped = rpcError(error);
    if (mapped) {
      res.status(mapped.status).json({ error: mapped.message });
      return;
    }
    throw error;
  }
});

router.post("/admin/users/:userId/remove", async (req, res) => {
  const { userId } = RemoveAdminUserParams.parse(req.params);
  if (rejectInvalidUuid(res, userId)) return;
  if (userId === req.userId) {
    res.status(409).json({ error: "You can't remove your own account." });
    return;
  }
  const targetRows = await db
    .select({ id: usersTable.id, handle: usersTable.handle, email: usersTable.email, isAdmin: profilesTable.isAdmin })
    .from(usersTable)
    .leftJoin(profilesTable, eq(profilesTable.userId, usersTable.id))
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!targetRows[0]) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const target = targetRows[0];
  // The count check and the delete share one transaction; all admin profile
  // rows are locked first so concurrent removals/demotions serialize and the
  // last-admin guard cannot be raced past.
  await db.transaction(async (tx) => {
    if (target.isAdmin) {
      await tx.select().from(profilesTable).where(eq(profilesTable.isAdmin, true)).for("update");
      const [adminRows] = await tx.select({ count: sql<number>`count(*)::int` }).from(profilesTable).where(eq(profilesTable.isAdmin, true));
      if ((adminRows?.count ?? 0) <= 1) {
        res.status(409).json({ error: "Can't remove the last admin" });
        return;
      }
    }
    await tx.delete(usersTable).where(eq(usersTable.id, userId));
    await tx.insert(adminAuditLogTable).values({
      adminId: req.userId,
      action: "user_remove",
      targetType: "user",
      targetId: userId,
      beforeState: { handle: target.handle, email: target.email, isAdmin: target.isAdmin ?? false },
    });
  });
  if (res.headersSent) return;
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Leaderboard moderation — pulse adjustments + exclusions, audited
// ---------------------------------------------------------------------------

router.get("/admin/pulse-adjustments", async (_req, res) => {
  const rows = await db
    .select({
      id: pulseAdjustmentsTable.id,
      userId: pulseAdjustmentsTable.userId,
      handle: usersTable.handle,
      amount: pulseAdjustmentsTable.amount,
      reason: pulseAdjustmentsTable.reason,
      adminId: pulseAdjustmentsTable.adminId,
      createdAt: pulseAdjustmentsTable.createdAt,
    })
    .from(pulseAdjustmentsTable)
    .leftJoin(usersTable, eq(usersTable.id, pulseAdjustmentsTable.userId))
    .orderBy(desc(pulseAdjustmentsTable.createdAt))
    .limit(100);
  res.json(ListPulseAdjustmentsResponse.parse(rows));
});

router.post("/admin/pulse-adjustments", async (req, res) => {
  const body = CreatePulseAdjustmentBody.parse(req.body);
  if (!body.reason?.trim()) {
    res.status(400).json({ error: "A reason is required for pulse adjustments" });
    return;
  }
  if (rejectInvalidUuid(res, body.userId)) return;
  if (!Number.isInteger(body.amount) || body.amount < -1000 || body.amount > 1000) {
    res.status(400).json({ error: "Adjustment must be a whole number between -1000 and 1000 minutes" });
    return;
  }
  const targetRows = await db.select({ id: usersTable.id, handle: usersTable.handle }).from(usersTable).where(eq(usersTable.id, body.userId)).limit(1);
  if (!targetRows[0]) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const inserted = (
    await db
      .insert(pulseAdjustmentsTable)
      .values({ userId: body.userId, amount: body.amount, reason: body.reason, adminId: req.userId })
      .returning()
  )[0];

  await db.insert(adminAuditLogTable).values({
    adminId: req.userId,
    action: "pulse_adjustment_create",
    targetType: "user",
    targetId: body.userId,
    afterState: { amount: body.amount, reason: body.reason, handle: targetRows[0].handle },
  });

  res.status(201).json(
    CreatePulseAdjustmentResponse.parse({
      id: inserted.id,
      userId: inserted.userId,
      handle: targetRows[0].handle,
      amount: inserted.amount,
      reason: inserted.reason,
      adminId: inserted.adminId,
      createdAt: inserted.createdAt,
    }),
  );
});

router.get("/admin/exclusions", async (_req, res) => {
  const rows = await db
    .select({
      userId: leaderboardExclusionsTable.userId,
      handle: usersTable.handle,
      email: usersTable.email,
      reason: leaderboardExclusionsTable.reason,
      adminId: leaderboardExclusionsTable.adminId,
      createdAt: leaderboardExclusionsTable.createdAt,
    })
    .from(leaderboardExclusionsTable)
    .leftJoin(usersTable, eq(usersTable.id, leaderboardExclusionsTable.userId))
    .orderBy(desc(leaderboardExclusionsTable.createdAt));
  res.json(ListLeaderboardExclusionsResponse.parse(rows));
});

router.post("/admin/exclusions", async (req, res) => {
  const body = CreateLeaderboardExclusionBody.parse(req.body);
  if (!body.reason?.trim()) {
    res.status(400).json({ error: "A reason is required for exclusions" });
    return;
  }
  const targetRows = await db.select({ id: usersTable.id, handle: usersTable.handle }).from(usersTable).where(eq(usersTable.id, body.userId)).limit(1);
  if (!targetRows[0]) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  await db
    .insert(leaderboardExclusionsTable)
    .values({ userId: body.userId, reason: body.reason, adminId: req.userId })
    .onConflictDoUpdate({ target: leaderboardExclusionsTable.userId, set: { reason: body.reason, adminId: req.userId } });

  await db.insert(adminAuditLogTable).values({
    adminId: req.userId,
    action: "leaderboard_exclusion_add",
    targetType: "user",
    targetId: body.userId,
    afterState: { reason: body.reason, handle: targetRows[0].handle },
  });

  res.status(204).end();
});

router.delete("/admin/exclusions/:userId", async (req, res) => {
  const { userId } = RemoveLeaderboardExclusionParams.parse(req.params);
  if (rejectInvalidUuid(res, userId)) return;
  const existing = await db
    .select({ reason: leaderboardExclusionsTable.reason })
    .from(leaderboardExclusionsTable)
    .where(eq(leaderboardExclusionsTable.userId, userId))
    .limit(1);
  if (!existing[0]) {
    res.status(404).json({ error: "Exclusion not found" });
    return;
  }
  await db.delete(leaderboardExclusionsTable).where(eq(leaderboardExclusionsTable.userId, userId));

  await db.insert(adminAuditLogTable).values({
    adminId: req.userId,
    action: "leaderboard_exclusion_remove",
    targetType: "user",
    targetId: userId,
    beforeState: { reason: existing[0].reason },
  });

  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Weekly reset — manual admin trigger of the same pipeline the cron runs
// ---------------------------------------------------------------------------

router.post("/admin/periods/reset", async (req, res) => {
  const result = await runWeeklyReset();
  await db.insert(adminAuditLogTable).values({
    adminId: req.userId,
    action: "weekly_reset_run",
    targetType: "period",
    targetId: null,
    afterState: { scopesChecked: result.scopesChecked, closed: result.closed },
  });
  res.json(result);
});

// ---------------------------------------------------------------------------
// Audit trail viewer
// ---------------------------------------------------------------------------

router.get("/admin/audit", async (req, res) => {
  const rawLimit = Number(req.query.limit);
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 50;
  const beforeValue = req.query.before;
  const before = typeof beforeValue === "string" && beforeValue.length > 0 && !Number.isNaN(Date.parse(beforeValue))
    ? new Date(beforeValue)
    : undefined;
  if (typeof beforeValue === "string" && beforeValue.length > 0 && !before) {
    res.status(400).json({ error: "before must be a valid ISO date" });
    return;
  }
  const rows = await db
    .select()
    .from(adminAuditLogTable)
    .where(before ? lt(adminAuditLogTable.createdAt, before) : undefined)
    .orderBy(desc(adminAuditLogTable.createdAt))
    .limit(limit);
  res.json(GetAdminAuditResponse.parse({ entries: rows }));
});

// ---------------------------------------------------------------------------
// Feature flags — server-enforced kill switches, audited
// ---------------------------------------------------------------------------

router.get("/feature-flags", async (_req, res) => {
  const rows = await db.select().from(featureFlagsTable).orderBy(featureFlagsTable.key);
  res.json(
    ListFeatureFlagsResponse.parse(
      rows.map((row) => ({ key: row.key, enabled: row.enabled, description: row.description, updatedAt: row.updatedAt })),
    ),
  );
});

router.post("/feature-flags/:key/toggle", async (req, res) => {
  const { key } = ToggleFeatureFlagParams.parse(req.params);
  const body = ToggleFeatureFlagBody.parse(req.body);
  if (!body.reason.trim()) {
    res.status(400).json({ error: "A reason is required for flag changes" });
    return;
  }

  const existing = await db.select().from(featureFlagsTable).where(eq(featureFlagsTable.key, key)).limit(1);
  if (!existing[0]) {
    res.status(404).json({ error: "Feature flag not found" });
    return;
  }

  const before = existing[0];
  await db
    .update(featureFlagsTable)
    .set({ enabled: body.enabled, updatedBy: req.userId, updatedAt: new Date() })
    .where(eq(featureFlagsTable.key, key));
  invalidateFeatureFlag(key);

  await db.insert(adminAuditLogTable).values({
    adminId: req.userId,
    action: "feature_flag_update",
    targetType: "feature_flag",
    targetId: key,
    beforeState: { enabled: before.enabled },
    afterState: { enabled: body.enabled, reason: body.reason.trim() },
  });

  res.json(ToggleFeatureFlagResponse.parse({ key, enabled: body.enabled }));
});

export default router;