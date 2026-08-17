import { Router, type IRouter } from "express";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { db } from "@workspace/db";
import {
  adminAuditLogTable,
  announcementsTable,
  cohortMembersTable,
  cohortsTable,
  focusSessionsTable,
  profilesTable,
  studySessionsTable,
  usersTable,
} from "@workspace/db/schema";
import {
  CreateAnnouncementBody,
  CreateAnnouncementResponse,
  GetAdminCohortParams,
  GetAdminCohortResponse,
  GetAdminStatsResponse,
  GetAdminUserParams,
  GetAdminUserResponse,
  ListAdminAnnouncementsResponse,
  ListAdminCohortsResponse,
  ListAdminUsersExportResponse,
  ListAdminUsersResponse,
  MoveCohortMemberBody,
  MoveCohortMemberParams,
  RemoveAdminUserParams,
  SetAdminBody,
  SetAdminParams,
  ToggleAnnouncementBody,
  ToggleAnnouncementParams,
  UpdateAnnouncementBody,
  UpdateAnnouncementParams,
  UpdateAnnouncementResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth.js";
import { COHORT_CAPACITY } from "../lib/cohorts.js";

const router: IRouter = Router();
router.use(requireAuth);

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
    .having(sql`count(${cohortMembersTable.userId}) >= ${COHORT_CAPACITY - 2}`);
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

router.get("/admin/announcements", async (_req, res) => {
  const rows = await db.select().from(announcementsTable).orderBy(desc(announcementsTable.createdAt));
  res.json(ListAdminAnnouncementsResponse.parse(rows));
});

router.post("/admin/announcements", async (req, res) => {
  const body = CreateAnnouncementBody.parse(req.body);
  const inserted = await db
    .insert(announcementsTable)
    .values({
      title: body.title,
      body: body.body,
      link: body.link ?? null,
      icon: body.icon ?? "megaphone",
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    })
    .returning();
  res.status(201).json(CreateAnnouncementResponse.parse(inserted[0]));
});

router.patch("/admin/announcements/:announcementId", async (req, res) => {
  const { announcementId } = UpdateAnnouncementParams.parse(req.params);
  const body = UpdateAnnouncementBody.parse(req.body);
  const updated = await db
    .update(announcementsTable)
    .set({
      title: body.title,
      body: body.body,
      link: body.link ?? null,
      icon: body.icon,
      startsAt: body.startsAt === undefined ? undefined : body.startsAt ? new Date(body.startsAt) : null,
      expiresAt: body.expiresAt === undefined ? undefined : body.expiresAt ? new Date(body.expiresAt) : null,
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
      createdAt: cohortsTable.createdAt,
      memberCount: sql<number>`count(distinct ${cohortMembersTable.userId})::int`,
      weeklyMinutes: sql<number>`coalesce(sum(case when ${studySessionsTable.createdAt} >= date_trunc('week', now()) then ${studySessionsTable.minutes} else 0 end), 0)::int`,
    })
    .from(cohortsTable)
    .leftJoin(cohortMembersTable, eq(cohortMembersTable.cohortId, cohortsTable.id))
    .leftJoin(studySessionsTable, eq(studySessionsTable.userId, cohortMembersTable.userId))
    .groupBy(cohortsTable.id)
    .orderBy(asc(cohortsTable.createdAt));
  res.json(ListAdminCohortsResponse.parse(rows.map((row) => ({ ...row, capacity: COHORT_CAPACITY }))));
});

router.get("/admin/cohorts/:cohortId", async (req, res) => {
  const { cohortId } = GetAdminCohortParams.parse(req.params);
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
      createdAt: cohortRows[0].createdAt,
      memberCount: members.length,
      capacity: COHORT_CAPACITY,
      members,
    }),
  );
});

router.post("/admin/cohorts/members/:userId/move", async (req, res) => {
  const { userId } = MoveCohortMemberParams.parse(req.params);
  const body = MoveCohortMemberBody.parse(req.body);
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
  const rows = await db
    .select({
      id: usersTable.id,
      handle: usersTable.handle,
      email: usersTable.email,
      isAdmin: profilesTable.isAdmin,
      createdAt: usersTable.createdAt,
      cohortId: cohortMembersTable.cohortId,
      sessionCount: sql<number>`count(${studySessionsTable.id})::int`,
      totalMinutes: sql<number>`coalesce(sum(${studySessionsTable.minutes}), 0)::int`,
      focusSessionsCompleted: sql<number>`count(${focusSessionsTable.id}) filter (where ${focusSessionsTable.status} = 'completed')::int`,
    })
    .from(usersTable)
    .leftJoin(profilesTable, eq(profilesTable.userId, usersTable.id))
    .leftJoin(cohortMembersTable, eq(cohortMembersTable.userId, usersTable.id))
    .leftJoin(studySessionsTable, eq(studySessionsTable.userId, usersTable.id))
    .leftJoin(focusSessionsTable, eq(focusSessionsTable.userId, usersTable.id))
    .groupBy(usersTable.id, profilesTable.isAdmin, cohortMembersTable.cohortId)
    .orderBy(asc(usersTable.createdAt));
  res.json(ListAdminUsersExportResponse.parse(rows.map((row) => ({ ...row, isAdmin: row.isAdmin ?? false }))));
});

router.get("/admin/users/:userId", async (req, res) => {
  const { userId } = GetAdminUserParams.parse(req.params);
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
  if (target.isAdmin) {
    const [adminRows] = await db.select({ count: sql<number>`count(*)::int` }).from(profilesTable).where(eq(profilesTable.isAdmin, true));
    if ((adminRows?.count ?? 0) <= 1) {
      res.status(409).json({ error: "Can't remove the last admin" });
      return;
    }
  }
  await db.delete(usersTable).where(eq(usersTable.id, userId));
  await db.insert(adminAuditLogTable).values({
    adminId: req.userId,
    action: "user_remove",
    targetType: "user",
    targetId: userId,
    beforeState: { handle: target.handle, email: target.email, isAdmin: target.isAdmin ?? false },
  });
  res.status(204).end();
});

export default router;