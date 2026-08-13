import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { oauthAccountsTable, profilesTable, usersTable, type User } from "@workspace/db/schema";
import { generateProfileCode } from "../utils";

export type OAuthProvider = "google" | "discord";

export interface OAuthUserContext {
  provider: OAuthProvider;
  providerUserId: string;
  email: string | null;
  displayName: string;
}

export class OAuthLinkConflictError extends Error {
  readonly code = "account_linking_required";
  constructor() {
    super("An account with this email already exists and is not linked to this provider");
    this.name = "OAuthLinkConflictError";
  }
}

export class AlreadyLinkedError extends Error {
  readonly code = "already_linked";
  constructor() {
    super("This provider identity is already linked to another account");
    this.name = "AlreadyLinkedError";
  }
}

export function defaultExamDate(targetYear: number): Date {
  return new Date(targetYear, 0, 24);
}

export async function createUserWithProfile(values: {
  email: string;
  handle: string;
  passwordHash?: string | null;
}): Promise<User> {
  const user = (
    await db
      .insert(usersTable)
      .values({ email: values.email, handle: values.handle, passwordHash: values.passwordHash ?? null })
      .returning()
  )[0];

  const targetYear = new Date().getFullYear() + 1;
  await db.insert(profilesTable).values({
    userId: user.id,
    targetYear,
    examDate: defaultExamDate(targetYear),
    profileCode: generateProfileCode(),
  });
  return user;
}

async function uniqueHandle(base: string): Promise<string> {
  const cleaned =
    base
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "")
      .replace(/[._-]{2,}/g, "-")
      .replace(/^[._-]+|[._-]+$/g, "")
      .slice(0, 24) || "learner";
  let candidate = cleaned;
  for (let i = 2; ; i++) {
    const rows = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.handle, candidate)).limit(1);
    if (!rows[0]) return candidate;
    candidate = `${cleaned.slice(0, 20)}_${i}`;
  }
}

export async function findOAuthAccount(provider: OAuthProvider, providerUserId: string) {
  const rows = await db
    .select()
    .from(oauthAccountsTable)
    .where(and(eq(oauthAccountsTable.provider, provider), eq(oauthAccountsTable.providerUserId, providerUserId)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Logs an OAuth identity in: returns the local user it already maps to, or
 * creates a fresh local account. Never merges an existing account purely
 * because the email matches - that raises OAuthLinkConflictError instead.
 */
export async function resolveOrCreateOAuthUser(context: OAuthUserContext): Promise<{ user: User; created: boolean }> {
  const existing = await findOAuthAccount(context.provider, context.providerUserId);
  if (existing) {
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, existing.userId)).limit(1);
    if (!rows[0]) throw new Error("OAuth account references a missing user");
    return { user: rows[0], created: false };
  }

  const email = context.email?.trim().toLowerCase() || null;
  if (email) {
    const clash = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (clash[0]) throw new OAuthLinkConflictError();
  }

  const fallbackEmail = `${context.provider}-${context.providerUserId}@local.preppulse`;
  const handle = await uniqueHandle(context.displayName || email?.split("@")[0] || "learner");
  const user = await createUserWithProfile({ email: email ?? fallbackEmail, handle });
  await db.insert(oauthAccountsTable).values({
    userId: user.id,
    provider: context.provider,
    providerUserId: context.providerUserId,
    email,
  });
  return { user, created: true };
}

/** Explicitly links a verified provider identity to the signed-in account. */
export async function linkOAuthToUser(userId: string, context: OAuthUserContext): Promise<void> {
  const existing = await findOAuthAccount(context.provider, context.providerUserId);
  if (existing) {
    if (existing.userId !== userId) throw new AlreadyLinkedError();
    return;
  }
  await db.insert(oauthAccountsTable).values({
    userId,
    provider: context.provider,
    providerUserId: context.providerUserId,
    email: context.email?.trim().toLowerCase() || null,
  });
}

/** Counts the sign-in methods the account can still use. */
export async function countSignInMethods(userId: string): Promise<number> {
  const userRows = await db.select({ passwordHash: usersTable.passwordHash }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const hasPassword = Boolean(userRows[0]?.passwordHash);
  const oauthRows = await db.select({ id: oauthAccountsTable.id }).from(oauthAccountsTable).where(eq(oauthAccountsTable.userId, userId));
  return (hasPassword ? 1 : 0) + oauthRows.length;
}