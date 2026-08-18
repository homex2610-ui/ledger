import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { featureFlagsTable } from "@workspace/db/schema";

export const FEATURE_LEADERBOARD_WEEKLY = "leaderboard_weekly";

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { enabled: boolean; expiresAt: number }>();

/**
 * Server-enforced feature gate. Missing flag rows resolve to disabled (fail
 * closed) so an unapplied migration or a deleted row is a kill switch, not a
 * silent enable.
 */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.enabled;
  const rows = await db.select({ enabled: featureFlagsTable.enabled }).from(featureFlagsTable).where(eq(featureFlagsTable.key, key)).limit(1);
  const enabled = rows[0]?.enabled ?? false;
  cache.set(key, { enabled, expiresAt: Date.now() + CACHE_TTL_MS });
  return enabled;
}

/** Drop the cache entry so the next read hits the database. */
export function invalidateFeatureFlag(key: string): void {
  cache.delete(key);
}

export class FeatureDisabledError extends Error {
  constructor(readonly key: string) {
    super(`Feature disabled: ${key}`);
  }
}

export async function assertFeatureEnabled(key: string): Promise<void> {
  if (!(await isFeatureEnabled(key))) throw new FeatureDisabledError(key);
}