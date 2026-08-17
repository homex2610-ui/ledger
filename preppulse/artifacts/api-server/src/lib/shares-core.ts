import type { ShareArtifact } from "@workspace/db/schema";

export const SHARE_SCHEMA_VERSION = "1";

export const DAILY_FOCUS_MIN_ELIGIBLE_MINUTES = 25;
export const REFERRAL_ACTIVATION_MINUTES = 10;
export const REFERRAL_ACTIVATION_WINDOW_MS = 24 * 60 * 60 * 1000;
export const REFERRAL_D7_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const SHARE_ARTIFACT_TTL_DAYS = 30;

export const SHARE_VISIBILITIES = ["public", "circle", "private"] as const;
export type ShareVisibility = (typeof SHARE_VISIBILITIES)[number];

export function resolveShareVariant(envValue: string | undefined): "A" | "B" {
  return envValue === "B" ? "B" : "A";
}

export function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatMinutesLabel(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export interface DailyFocusPayload {
  type: "daily_focus";
  displayName: string;
  minutes: number;
  minutesLabel: string;
  streak: number;
  subjects: Array<{ subject: string; minutes: number; percent: number }>;
  dayLabel: string;
  createdAt: string;
}

export interface SubjectMinutes {
  subject: string;
  minutes: number;
}

export function buildDailyFocusPayload(input: {
  displayName: string;
  minutes: number;
  streak: number;
  subjects: SubjectMinutes[];
  createdAt: Date;
}): DailyFocusPayload {
  const subjects = input.subjects
    .filter((s) => s.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 4)
    .map((s) => ({
      subject: s.subject,
      minutes: s.minutes,
      percent: input.minutes > 0 ? Math.round((s.minutes / input.minutes) * 100) : 0,
    }));
  return {
    type: "daily_focus",
    displayName: input.displayName,
    minutes: input.minutes,
    minutesLabel: formatMinutesLabel(input.minutes),
    streak: input.streak,
    subjects,
    dayLabel: input.createdAt.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
    createdAt: input.createdAt.toISOString(),
  };
}

export interface ReferralProgressInput {
  sessionCreatedAt: Date;
  sessionMinutes: number;
  attributionCreatedAt: Date;
  activated: boolean;
  d7Done: boolean;
}

export interface ReferralProgressDecision {
  activate: boolean;
  d7: boolean;
}

export function evaluateReferralProgress(input: ReferralProgressInput): ReferralProgressDecision {
  const sessionAt = input.sessionCreatedAt.getTime();
  const signedUpAt = input.attributionCreatedAt.getTime();
  const qualified = input.sessionMinutes >= REFERRAL_ACTIVATION_MINUTES;
  const inWindow = (windowMs: number) => sessionAt >= signedUpAt && sessionAt - signedUpAt <= windowMs;

  if (!input.activated) {
    return { activate: qualified && inWindow(REFERRAL_ACTIVATION_WINDOW_MS), d7: false };
  }
  const differentDay = utcDayKey(input.sessionCreatedAt) !== utcDayKey(input.attributionCreatedAt);
  return {
    activate: false,
    d7: !input.d7Done && qualified && inWindow(REFERRAL_D7_WINDOW_MS) && differentDay,
  };
}

export function isShareArtifactExpired(artifact: Pick<ShareArtifact, "expiresAt">): boolean {
  return artifact.expiresAt !== null && artifact.expiresAt.getTime() < Date.now();
}

export function sanitizeShareArtifact(artifact: Pick<ShareArtifact, "id" | "type" | "variant" | "payload" | "createdAt">) {
  return {
    id: artifact.id,
    type: artifact.type,
    variant: artifact.variant,
    payload: artifact.payload,
    createdAt: artifact.createdAt,
  };
}