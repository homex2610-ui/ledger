import { Router, type IRouter } from "express";
import { and, desc, eq, gt, lte, or, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { announcementDismissalsTable, announcementsTable } from "@workspace/db/schema";
import { DismissAnnouncementParams, DismissAnnouncementResponse, GetActiveAnnouncementResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();
router.use(requireAuth);

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
    .limit(1);
  const announcement = rows[0];
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
  await db
    .insert(announcementDismissalsTable)
    .values({ userId: req.userId, announcementId })
    .onConflictDoNothing();
  res.status(204).json(DismissAnnouncementResponse.parse(undefined));
});

export default router;