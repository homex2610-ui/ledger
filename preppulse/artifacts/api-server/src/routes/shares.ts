import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  referralAttributionsTable,
  shareArtifactsTable,
  studySessionsTable,
  usersTable,
} from "@workspace/db/schema";
import { requireAuth } from "../lib/auth.js";
import { createRateLimiter } from "../lib/rate-limit.js";
import {
  buildDailyFocusPayload,
  DAILY_FOCUS_MIN_ELIGIBLE_MINUTES,
  isShareArtifactExpired,
  resolveShareVariant,
  sanitizeShareArtifact,
  SHARE_ARTIFACT_TTL_DAYS,
  SHARE_SCHEMA_VERSION,
  SHARE_VISIBILITIES,
  type DailyFocusPayload,
} from "../lib/shares-core.js";
import { recordShareEvent, type ShareEventType } from "../lib/shares-events.js";
import { computeStreak, studyMinutesBetween } from "../lib/prep-stats.js";
import { renderShareOgPng } from "../lib/share-og.js";
import { buildSharePageHtml } from "../lib/share-page.js";
import { safeTimeZone, startOfDayIn, clientIpFromRequest } from "../lib/utils.js";

const router: IRouter = Router();

const createArtifactLimiter = createRateLimiter(24 * 60 * 60 * 1000, 20);
const promptEventsLimiter = createRateLimiter(60 * 1000, 30);
const openEventsLimiter = createRateLimiter(10 * 60 * 1000, 50);
const ogIpLimiter = createRateLimiter(60 * 1000, 30);
const ogArtifactLimiter = createRateLimiter(60 * 1000, 10);

const APP_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const SHARE_TYPE_BY_PATH = { focus: "daily_focus" } as const;
type ShareType = (typeof SHARE_TYPE_BY_PATH)[keyof typeof SHARE_TYPE_BY_PATH];

async function resolvePublicArtifact(id: string, type: "daily_focus"): Promise<(typeof shareArtifactsTable.$inferSelect) | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const rows = await db.select().from(shareArtifactsTable).where(eq(shareArtifactsTable.id, id)).limit(1);
  const artifact = rows[0];
  if (!artifact || artifact.type !== type) return null;
  if (artifact.visibility !== "public") return null;
  if (isShareArtifactExpired(artifact)) return null;
  return artifact;
}

function payloadOf(artifact: (typeof shareArtifactsTable.$inferSelect) | null): DailyFocusPayload | null {
  if (!artifact) return null;
  const payload = artifact.payload as DailyFocusPayload;
  if (!payload || payload.type !== "daily_focus" || typeof payload.minutes !== "number") return null;
  return payload;
}

// ---------------------------------------------------------------------------
// Owner endpoints (auth)
// ---------------------------------------------------------------------------

router.post("/shares", requireAuth, async (req, res) => {
  const userId = req.userId;
  const limit = createArtifactLimiter.check(`create:${userId}`);
  if (!limit.ok) {
    res.status(429).json({ error: "Too many shares today. Try again tomorrow.", code: "share_limit_exceeded" });
    return;
  }

  const visibility = req.body?.visibility;
  if (!SHARE_VISIBILITIES.includes(visibility)) {
    res.status(400).json({ error: "visibility must be one of public, circle, private" });
    return;
  }
  const clientVersion = typeof req.body?.appVersion === "string" && APP_VERSION_PATTERN.test(req.body.appVersion) ? req.body.appVersion : "0.0.0";
  const timeZone = safeTimeZone(req.body?.tz);

  const now = new Date();
  const dayStart = startOfDayIn(now, timeZone ?? "UTC");
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  const [userRows, todayMinutes, streak, subjectRows] = await Promise.all([
    db.select({ handle: usersTable.handle }).from(usersTable).where(eq(usersTable.id, userId)).limit(1),
    studyMinutesBetween(userId, dayStart, dayEnd),
    computeStreak(userId, timeZone),
    db
      .select({ subject: studySessionsTable.subject, minutes: sql<number>`coalesce(sum(${studySessionsTable.minutes}),0)::int` })
      .from(studySessionsTable)
      .where(and(eq(studySessionsTable.userId, userId), gte(studySessionsTable.createdAt, dayStart), lt(studySessionsTable.createdAt, dayEnd)))
      .groupBy(studySessionsTable.subject),
  ]);

  const user = userRows[0];
  if (!user) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  if (todayMinutes < DAILY_FOCUS_MIN_ELIGIBLE_MINUTES) {
    res.status(400).json({ error: "Not enough focused minutes to share yet", code: "not_eligible" });
    return;
  }

  const variant = resolveShareVariant(process.env["SHARE_VARIANT"]);
  const payload = buildDailyFocusPayload({
    displayName: user.handle,
    minutes: todayMinutes,
    streak,
    subjects: subjectRows.map((row) => ({ subject: row.subject, minutes: row.minutes })),
    createdAt: now,
  });

  const expiresAt = new Date(now.getTime() + SHARE_ARTIFACT_TTL_DAYS * 86_400_000);
  const inserted = (
    await db
      .insert(shareArtifactsTable)
      .values({
        ownerId: userId,
        type: "daily_focus",
        variant,
        visibility,
        payload: payload as unknown as object,
        appVersion: clientVersion,
        shareSchemaVersion: SHARE_SCHEMA_VERSION,
        expiresAt,
      })
      .returning()
  )[0];

  const referredRows = await db
    .select({ id: referralAttributionsTable.id })
    .from(referralAttributionsTable)
    .where(eq(referralAttributionsTable.inviteeId, userId))
    .limit(1);
  if (referredRows.length > 0) {
    await recordShareEvent({ eventType: "referred_user_shares", ownerId: userId, artifactId: inserted.id });
  }

  res.status(201).json({
    id: inserted.id,
    type: inserted.type,
    variant: inserted.variant,
    payload: inserted.payload,
    createdAt: inserted.createdAt,
    shareUrl: `/api/share-page/${inserted.type === "daily_focus" ? "focus" : "unknown"}/${inserted.id}`,
  });
});

router.post("/shares/events", requireAuth, async (req, res) => {
  const userId = req.userId;
  const eventType = req.body?.event;
  if (eventType !== "share_prompt_viewed" && eventType !== "share_clicked") {
    res.status(400).json({ error: "event must be share_prompt_viewed or share_clicked" });
    return;
  }
  const limit = promptEventsLimiter.check(`prompt:${userId}`);
  if (!limit.ok) {
    res.status(429).json({ error: "Too many events", code: "event_rate_limited" });
    return;
  }

  let artifactId: string | null = null;
  if (typeof req.body?.artifactId === "string") {
    const artifactRows = await db
      .select({ id: shareArtifactsTable.id })
      .from(shareArtifactsTable)
      .where(and(eq(shareArtifactsTable.id, req.body.artifactId), eq(shareArtifactsTable.ownerId, userId)))
      .limit(1);
    if (artifactRows[0]) artifactId = artifactRows[0].id;
  }

  await recordShareEvent({ eventType: eventType as ShareEventType, ownerId: userId, artifactId });
  res.status(204).end();
});

router.post("/shares/:shareId/attribution", requireAuth, async (req, res) => {
  const inviteeId = req.userId;
  const artifactId = String(req.params.shareId);
  const artifact = await resolvePublicArtifact(artifactId, "daily_focus");
  if (!artifact) {
    res.status(404).json({ error: "Share not found" });
    return;
  }
  if (artifact.ownerId === inviteeId) {
    res.status(400).json({ error: "You cannot refer yourself", code: "self_referral" });
    return;
  }

  const existing = await db
    .select({ id: referralAttributionsTable.id })
    .from(referralAttributionsTable)
    .where(eq(referralAttributionsTable.inviteeId, inviteeId))
    .limit(1);
  if (existing[0]) {
    res.status(409).json({ error: "This account is already attributed to a share", code: "already_attributed" });
    return;
  }

  try {
    await db.insert(referralAttributionsTable).values({
      inviterId: artifact.ownerId,
      inviteeId,
      artifactId: artifact.id,
    });
  } catch {
    res.status(409).json({ error: "This account is already attributed to a share", code: "already_attributed" });
    return;
  }

  await recordShareEvent({
    eventType: "signup_completed",
    ownerId: artifact.ownerId,
    actorId: inviteeId,
    artifactId: artifact.id,
  });

  res.status(201).json({ ok: true });
});

// ---------------------------------------------------------------------------
// Public endpoints
// ---------------------------------------------------------------------------

router.get("/shares/:shareId", async (req, res) => {
  const artifact = await resolvePublicArtifact(req.params.shareId, "daily_focus");
  if (!artifact) {
    res.status(404).json({ error: "Share not found" });
    return;
  }
  res.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
  res.json(sanitizeShareArtifact(artifact));
});

router.post("/shares/:shareId/events", async (req, res) => {
  const artifactId = req.params.shareId;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(artifactId)) {
    res.status(400).json({ error: "Invalid share id" });
    return;
  }
  if (req.body?.event !== "share_link_opened") {
    res.status(400).json({ error: "event must be share_link_opened" });
    return;
  }
  const limit = openEventsLimiter.check(`open:${clientIpFromRequest(req)}:${artifactId}`);
  if (!limit.ok) {
    res.status(429).json({ error: "Too many events", code: "event_rate_limited" });
    return;
  }

  const artifact = await resolvePublicArtifact(artifactId, "daily_focus");
  if (!artifact) {
    res.status(404).json({ error: "Share not found" });
    return;
  }

  await recordShareEvent({
    eventType: "share_link_opened",
    ownerId: artifact.ownerId,
    artifactId: artifact.id,
    meta: { referer: typeof req.headers.referer === "string" ? req.headers.referer.slice(0, 300) : null },
  });
  res.status(204).end();
});

router.get("/og/share", async (req, res) => {
  const ipKey = clientIpFromRequest(req);
  const ipLimit = ogIpLimiter.check(`og:${ipKey}`);
  if (!ipLimit.ok) {
    res.status(429).set("Cache-Control", "no-store").end();
    return;
  }

  const artifactId = typeof req.query.id === "string" ? req.query.id : "";
  const artifactLimit = ogArtifactLimiter.check(`og-art:${artifactId}`);
  if (!artifactLimit.ok) {
    res.status(429).set("Cache-Control", "no-store").end();
    return;
  }

  const artifact = await resolvePublicArtifact(artifactId, "daily_focus");
  const payload = payloadOf(artifact);
  if (!artifact || !payload) {
    res.status(404).set("Cache-Control", "no-store").json({ error: "Share not found" });
    return;
  }

  try {
    const png = await renderShareOgPng(payload, {
      variant: artifact.variant === "B" ? "B" : "A",
      shareUrl: `${appOrigin(req)}/api/share-page/focus/${artifact.id}`,
    });
    res
      .status(200)
      .set("Content-Type", "image/png")
      .set("Content-Length", String(png.length))
      .set("Cache-Control", "public, max-age=86400, s-maxage=2592000, immutable")
      .send(png);
  } catch (error) {
    console.error("OG render failed", error);
    res.status(500).json({ error: "Something went wrong", code: "internal_error" });
  }
});

router.get("/share-page/:type/:shareId", async (req, res) => {
  const type = SHARE_TYPE_BY_PATH[req.params.type as keyof typeof SHARE_TYPE_BY_PATH];
  if (!type) {
    res.status(404).json({ error: "Share not found" });
    return;
  }
  await serveSharePage(type, req.params.shareId, req, res);
});

async function serveSharePage(
  type: ShareType,
  shareId: string,
  req: Request,
  res: Response,
): Promise<void> {
  const artifact = await resolvePublicArtifact(shareId, type);
  const payload = payloadOf(artifact);
  if (!artifact || !payload) {
    res.status(404).set("Cache-Control", "no-store").json({ error: "Share not found" });
    return;
  }

  res
    .status(200)
    .set("Content-Type", "text/html; charset=utf-8")
    .set("Cache-Control", "public, max-age=3600, s-maxage=2592000")
    .send(
      buildSharePageHtml(payload, {
        appOrigin: appOrigin(req),
        artifactId: artifact.id,
        variant: artifact.variant === "B" ? "B" : "A",
      }),
    );
}

export default router;

function appOrigin(req: Request): string {
  const fromEnv = process.env["APP_ORIGIN"];
  if (fromEnv && /^https?:\/\/[^\s]+$/.test(fromEnv)) return fromEnv.replace(/\/$/, "");
  const host = req.get("host");
  return host ? `https://${host}` : "https://ledger-pi-topaz.vercel.app";
}