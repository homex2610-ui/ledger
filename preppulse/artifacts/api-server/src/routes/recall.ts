import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { cardsTable, profilesTable } from "@workspace/db/schema";
import {
  CreateCardBody,
  CreateCardResponse,
  DeleteCardParams,
  GetCardStatsResponse,
  ListCardsResponse,
  ReviewCardBody,
  ReviewCardParams,
  ReviewCardResponse,
  UpdateCardBody,
  UpdateCardParams,
  UpdateCardResponse,
} from "@workspace/api-zod";
import { subjectAllowedForTrack } from "@workspace/exam-config";
import { requireAuth } from "../lib/auth.js";
import { clamp, isUuid, parseISODate, toISODate } from "../lib/utils.js";

const router: IRouter = Router();
router.use(requireAuth);

const MIN_EASE = 1.3;
const MAX_EASE = 2.8;
const MAX_INTERVAL = 3650;

export type ReviewGrade = "again" | "hard" | "good" | "easy";

export function sm2Schedule(card: { ease: number; interval: number; reps: number }, grade: ReviewGrade, today: Date) {
  let ease = card.ease;
  let interval = card.interval;
  let reps = card.reps;

  switch (grade) {
    case "again":
      ease = Math.max(MIN_EASE, ease - 0.2);
      interval = 0;
      reps = 0;
      break;
    case "hard":
      ease = Math.max(MIN_EASE, ease - 0.15);
      interval = reps === 0 ? 1 : Math.max(1, Math.round(interval * 1.2));
      reps += 1;
      break;
    case "good":
      interval = reps === 0 ? 1 : reps === 1 ? 6 : Math.round(interval * ease);
      reps += 1;
      break;
    case "easy":
      ease = Math.min(MAX_EASE, ease + 0.15);
      interval = reps === 0 ? 4 : Math.round(interval * ease * 1.3);
      reps += 1;
      break;
  }

  ease = clamp(ease, MIN_EASE, MAX_EASE);
  interval = clamp(interval, 0, MAX_INTERVAL);

  const due = new Date(today);
  due.setDate(due.getDate() + Math.max(1, interval));
  return { ease, interval, reps, due };
}

function toCardShape(card: typeof cardsTable.$inferSelect) {
  return {
    id: card.id,
    subject: card.subject,
    front: card.front,
    back: card.back,
    ease: card.ease,
    interval: card.interval,
    reps: card.reps,
    due: parseISODate(card.due),
    lastReviewed: card.lastReviewed ? parseISODate(card.lastReviewed) : null,
    missed: card.missed,
    createdAt: card.createdAt,
  };
}

router.get("/cards", async (req, res) => {
  const rows = await db
    .select()
    .from(cardsTable)
    .where(eq(cardsTable.userId, req.userId))
    .orderBy(asc(cardsTable.due));
  res.json(ListCardsResponse.parse(rows.map(toCardShape)));
});

router.post("/cards", async (req, res) => {
  const body = CreateCardBody.parse(req.body);
  const profileRows = await db.select({ examTrack: profilesTable.examTrack }).from(profilesTable).where(eq(profilesTable.userId, req.userId)).limit(1);
  if (!subjectAllowedForTrack(profileRows[0]?.examTrack, body.subject ?? "General", ["General"])) {
    res.status(400).json({ error: "This subject is not part of your prep track", code: "subject_not_in_track" });
    return;
  }
  const today = new Date();
  const inserted = (
    await db
      .insert(cardsTable)
      .values({ userId: req.userId, subject: body.subject ?? "General", front: body.front, back: body.back, due: toISODate(today) })
      .returning()
  )[0];
  res.status(201).json(CreateCardResponse.parse(toCardShape(inserted)));
});

router.patch("/cards/:cardId", async (req, res) => {
  const params = UpdateCardParams.parse(req.params);
  if (!isUuid(params.cardId)) {
    res.status(404).json({ error: "Card not found" });
    return;
  }
  const body = UpdateCardBody.parse(req.body);

  const existing = await db
    .select()
    .from(cardsTable)
    .where(and(eq(cardsTable.id, params.cardId), eq(cardsTable.userId, req.userId)))
    .limit(1);
  if (!existing[0]) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  const next: Record<string, unknown> = {};
  if (body.front !== undefined) next.front = body.front;
  if (body.back !== undefined) next.back = body.back;
  if (body.subject !== undefined) {
    const profileRows = await db.select({ examTrack: profilesTable.examTrack }).from(profilesTable).where(eq(profilesTable.userId, req.userId)).limit(1);
    if (!subjectAllowedForTrack(profileRows[0]?.examTrack, body.subject, ["General"])) {
      res.status(400).json({ error: "This subject is not part of your prep track", code: "subject_not_in_track" });
      return;
    }
    next.subject = body.subject;
  }

  const updated = (
    await db.update(cardsTable).set(next).where(and(eq(cardsTable.id, params.cardId), eq(cardsTable.userId, req.userId))).returning()
  )[0];
  res.json(UpdateCardResponse.parse(toCardShape(updated)));
});

router.delete("/cards/:cardId", async (req, res) => {
  const params = DeleteCardParams.parse(req.params);
  if (!isUuid(params.cardId)) {
    res.status(404).json({ error: "Card not found" });
    return;
  }
  const existing = await db
    .select({ id: cardsTable.id })
    .from(cardsTable)
    .where(and(eq(cardsTable.id, params.cardId), eq(cardsTable.userId, req.userId)))
    .limit(1);
  if (!existing[0]) {
    res.status(404).json({ error: "Card not found" });
    return;
  }
  await db.delete(cardsTable).where(and(eq(cardsTable.id, params.cardId), eq(cardsTable.userId, req.userId)));
  res.status(204).end();
});

router.post("/cards/:cardId/review", async (req, res) => {
  const params = ReviewCardParams.parse(req.params);
  if (!isUuid(params.cardId)) {
    res.status(404).json({ error: "Card not found" });
    return;
  }
  const body = ReviewCardBody.parse(req.body);

  const existing = await db
    .select()
    .from(cardsTable)
    .where(and(eq(cardsTable.id, params.cardId), eq(cardsTable.userId, req.userId)))
    .limit(1);
  if (!existing[0]) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  const card = existing[0];
  const today = new Date();
  const next = sm2Schedule(card, body.grade, today);

  const log = Array.isArray(card.log) ? card.log : [];
  log.push({ d: toISODate(today), g: body.grade, i: next.interval });
  if (log.length > 100) log.splice(0, log.length - 100);

  const updated = (
    await db
      .update(cardsTable)
      .set({
        ease: next.ease,
        interval: next.interval,
        reps: next.reps,
        due: toISODate(next.due),
        lastReviewed: toISODate(today),
        missed: card.missed + (body.grade === "again" ? 1 : 0),
        log,
      })
      .where(and(eq(cardsTable.id, params.cardId), eq(cardsTable.userId, req.userId)))
      .returning()
  )[0];

  res.json(ReviewCardResponse.parse(toCardShape(updated)));
});

router.get("/cards/stats", async (req, res) => {
  const rows = await db
    .select()
    .from(cardsTable)
    .where(eq(cardsTable.userId, req.userId));

  const today = new Date();
  const todayStr = toISODate(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toISODate(yesterday);

  const dueStr = toISODate(today);
  let due = 0;
  let overdue = 0;
  let learning = 0;
  let mastered = 0;
  let reviewedToday = 0;
  let newToday = 0;
  const reviewedDates = new Set<string>();
  let reviewedTotal = 0;
  let retainedTotal = 0;
  let easeSum = 0;

  for (const card of rows) {
    const dueDay = card.due;
    if (dueDay <= dueStr) due += 1;
    if (dueDay < dueStr) overdue += 1;
    if (card.interval >= 30) mastered += 1;
    else if (card.reps < 3) learning += 1;
    if (card.lastReviewed && card.lastReviewed === todayStr) reviewedToday += 1;
    if (card.createdAt && toISODate(card.createdAt) === todayStr) newToday += 1;
    if (card.lastReviewed) reviewedDates.add(card.lastReviewed);
    if (card.reps > 0) {
      reviewedTotal += 1;
      if (card.interval >= 21) retainedTotal += 1;
    }
    easeSum += card.ease;
  }

  let reviewStreak = 0;
  if (reviewedDates.has(todayStr) || reviewedDates.has(yesterdayStr)) {
    const cursor = new Date(today);
    if (!reviewedDates.has(todayStr)) cursor.setDate(cursor.getDate() - 1);
    while (reviewedDates.has(toISODate(cursor))) {
      reviewStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  res.json(
    GetCardStatsResponse.parse({
      total: rows.length,
      due,
      overdue,
      learning,
      mastered,
      reviewedToday,
      retentionRate: reviewedTotal ? Math.round((retainedTotal / reviewedTotal) * 100) : 0,
      avgEase: rows.length ? Math.round((easeSum / rows.length) * 100) / 100 : 0,
      reviewStreak,
      newToday,
    }),
  );
});

export default router;