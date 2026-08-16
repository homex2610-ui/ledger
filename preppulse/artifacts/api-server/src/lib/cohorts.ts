import { sql, type SQL } from "drizzle-orm";
import { eq } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { db } from "@workspace/db";
import { cohortMembersTable, cohortsTable } from "@workspace/db/schema";

export const COHORT_CAPACITY = 25;

/**
 * Fixed advisory-lock key serializing every cohort assignment so two
 * concurrent signups can neither overflow a cohort past 25 nor spawn
 * duplicate empty cohorts.
 */
const COHORT_ASSIGN_LOCK_KEY = 1451516941;

type DbExecutor = typeof db | PgTransaction<any, any, any>;

/**
 * Places a user into the oldest cohort with room, creating a new cohort
 * when none exists. Safe under concurrent signups:
 *
 *  1. pg_advisory_xact_lock serializes assignment transactions, so cohort
 *     creation is never duplicated and the capacity check never races.
 *  2. The chosen cohort row is FOR UPDATE locked, so even writers that
 *     bypass the advisory lock (e.g. a manual backfill) serialize against
 *     the member-count check.
 *  3. A defensive count re-check right before insert guarantees the 25-cap
 *     even against out-of-band inserts.
 *
 * Must be called inside the caller's transaction so a failed assignment
 * rolls the account creation back with it.
 */
export async function assignUserToCohort(executor: DbExecutor, userId: string): Promise<{ cohortId: string }> {
  return executor.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${COHORT_ASSIGN_LOCK_KEY})`);

    const existing = await tx
      .select({ cohortId: cohortMembersTable.cohortId })
      .from(cohortMembersTable)
      .where(eq(cohortMembersTable.userId, userId))
      .limit(1);
    if (existing[0]) return { cohortId: existing[0].cohortId };

    const underCapacity = sql`(select count(*) from ${cohortMembersTable} cm where cm.cohort_id = ${cohortsTable.id}) < ${COHORT_CAPACITY}` as SQL<boolean>;

    const roomy = await tx
      .select({ id: cohortsTable.id })
      .from(cohortsTable)
      .where(underCapacity)
      .orderBy(cohortsTable.createdAt)
      .limit(1)
      .for("update");

    let cohortId: string | null = roomy[0]?.id ?? null;

    if (cohortId) {
      const countRows = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(cohortMembersTable)
        .where(eq(cohortMembersTable.cohortId, cohortId));
      if ((countRows[0]?.count ?? 0) >= COHORT_CAPACITY) cohortId = null;
    }

    if (!cohortId) {
      const inserted = await tx.insert(cohortsTable).values({}).returning({ id: cohortsTable.id });
      cohortId = inserted[0].id;
    }

    await tx.insert(cohortMembersTable).values({ cohortId, userId }).onConflictDoNothing();
    return { cohortId };
  });
}