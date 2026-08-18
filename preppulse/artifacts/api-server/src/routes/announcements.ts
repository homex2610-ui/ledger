import { Router, type IRouter } from "express";
import { and, desc, eq, gt, lte, or, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { announcementDismissalsTable, announcementsTable, cohortMembersTable, groupMembersTable } from "@workspace/db/schema";
import { DismissAnnouncementParams, DismissAnnouncementResponse, GetActiveAnnouncementResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth.js";
import { isUuid } from "../lib/utils.js";

const router: IRouter = Router();
router.use(requireAuth);

async function matchesAudience(announcement: { audienceType: string | null; audienceId: string | null }, userId: string): Promise<boolean> {
  switch (announcement.audienceType) {
    case "cohort":
      if (!announcement.audienceId) return false;
      const cohort = await db
        .select({ userId: cohortMembersTable.userId })
        .from(cohortMembersTable)
        .where(and(eq(cohortMembersTable.cohortId, announcement.audienceId), eq(cohortMembersTable.userId, userId)))
        .limit(1);
      return Boolean(cohort[0]);
    case "group":
      if (!announcement.audienceId) return false;
      const group = await db
        .select({ userId: groupMembersTable.userId })
        .from(groupMembersTable)
        .where(and(eq(groupMembersTable.groupId, announcement.audienceId), eq(groupMembersTable.userId, userId)))
        .limit(1);
      return Boolean(group[0]);
    default:
      return true;
  }
}

router.get("/announcements/active", async (req, res) => {
  const userId = req.userId;
  const now = new Date();
  const rows = await db
    .select()
    .from(announcementsTable)
    .where(
      and(
        eq(announcementsTable.isEnabled, true),
        or(sql`${announcementsTable.startsAt} is null`, lte(announcementsTable.startsAt, now)),
        or(sql`${announcementsTable.expiresAt} is null`, gt(announcementsTable.expiresAt, now)),
      ),
    )
    .orderBy(desc(announcementsTable.updatedAt))
    .limit(5);
  let announcement = null;
  for (const candidate of rows) {
    if (await matchesAudience(candidate, userId)) {
      announcement = candidate;
      break;
    }
  }
  if (!announcement) {
    res.json(GetActiveAnnouncementResponse.parse({ announcement: null }));
    return;
  }
  const dismissed = await db
    .select()
    .from(announcementDismissalsTable)
    .where(and(eq(announcementDismissalsTable.userId, userId), eq(announcementDismissalsTable.announcementId, announcement.id)))
    .limit(1);
  if (dismissed[0]) {
    res.json(GetActiveAnnouncementResponse.parse({ announcement: null }));
    return;
  }
  res.json(
    GetActiveAnnouncementResponse.parse({
      announcement: {
        id: announcement.id,
        title: announcement.title,
        body: announcement.body,
        link: announcement.link,
        icon: announcement.icon,
      },
    }),
  );
});

router.post("/announcements/:announcementId/dismiss", async (req, res) => {
  const { announcementId } = DismissAnnouncementParams.parse(req.params);
  if (!isUuid(announcementId)) {
    res.status(404).json({ error: "Announcement not found" });
    return;
  }
  const exists = await db
    .select({ id: announcementsTable.id })
    .from(announcementsTable)
    .where(eq(announcementsTable.id, announcementId))
    .limit(1);
  if (!exists[0]) {
    res.status(404).json({ error: "Announcement not found" });
    return;
  }
  await db
    .insert(announcementDismissalsTable)
    .values({ userId: req.userId, announcementId })
    .onConflictDoNothing();
  res.status(204).json(DismissAnnouncementResponse.parse(undefined));
});

export default router;