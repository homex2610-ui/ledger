import { and, eq, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import { referralAttributionsTable, shareEventsTable } from "@workspace/db/schema";
import { DAILY_FOCUS_MIN_ELIGIBLE_MINUTES, evaluateReferralProgress } from "./shares-core.js";

export const SHARE_EVENT_TYPES = [
  "eligible_session",
  "share_prompt_viewed",
  "share_clicked",
  "share_link_opened",
  "signup_completed",
  "ten_min_session_completed",
  "d7_second_session",
  "referred_user_shares",
] as const;
export type ShareEventType = (typeof SHARE_EVENT_TYPES)[number];

export async function recordShareEvent(input: {
  eventType: ShareEventType;
  artifactId?: string | null;
  ownerId?: string | null;
  actorId?: string | null;
  meta?: Record<string, unknown> | null;
}): Promise<void> {
  await db.insert(shareEventsTable).values({
    artifactId: input.artifactId ?? null,
    ownerId: input.ownerId ?? null,
    actorId: input.actorId ?? null,
    eventType: input.eventType,
    meta: input.meta ?? null,
  });
}

export async function afterSessionRecorded(input: { userId: string; minutes: number; createdAt: Date }): Promise<void> {
  if (input.minutes >= DAILY_FOCUS_MIN_ELIGIBLE_MINUTES) {
    await recordShareEvent({ eventType: "eligible_session", ownerId: input.userId, meta: { minutes: input.minutes } });
  }

  const attributionRows = await db
    .select()
    .from(referralAttributionsTable)
    .where(eq(referralAttributionsTable.inviteeId, input.userId))
    .limit(1);
  const attribution = attributionRows[0];
  if (!attribution) return;

  const decision = evaluateReferralProgress({
    sessionCreatedAt: input.createdAt,
    sessionMinutes: input.minutes,
    attributionCreatedAt: attribution.createdAt,
    activated: attribution.activatedAt !== null,
    d7Done: attribution.d7At !== null,
  });

  if (decision.activate) {
    const updated = await db
      .update(referralAttributionsTable)
      .set({ activatedAt: input.createdAt })
      .where(and(eq(referralAttributionsTable.id, attribution.id), isNull(referralAttributionsTable.activatedAt)))
      .returning();
    if (updated.length > 0) {
      await recordShareEvent({
        eventType: "ten_min_session_completed",
        ownerId: attribution.inviterId,
        actorId: input.userId,
        artifactId: attribution.artifactId,
        meta: { minutes: input.minutes },
      });
    }
  }

  if (decision.d7) {
    const updated = await db
      .update(referralAttributionsTable)
      .set({ d7At: input.createdAt })
      .where(and(eq(referralAttributionsTable.id, attribution.id), isNull(referralAttributionsTable.d7At)))
      .returning();
    if (updated.length > 0) {
      await recordShareEvent({
        eventType: "d7_second_session",
        ownerId: attribution.inviterId,
        actorId: input.userId,
        artifactId: attribution.artifactId,
        meta: { minutes: input.minutes },
      });
    }
  }
}