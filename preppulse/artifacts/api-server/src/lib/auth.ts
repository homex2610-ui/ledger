import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt, lt } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { db } from "@workspace/db";
import { authSessionsTable } from "@workspace/db/schema";

const scrypt = promisify(scryptCallback);

export const SESSION_COOKIE = "preppulse_sid";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const derived = (await scrypt(password, Buffer.from(saltHex, "hex"), 64)) as Buffer;
  const expected = Buffer.from(hashHex, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(authSessionsTable).values({ userId, tokenHash: hashToken(token), expiresAt });
  await db.delete(authSessionsTable).where(lt(authSessionsTable.expiresAt, new Date()));
  return { token, expiresAt };
}

export async function destroySession(req: Request): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return;
  await db.delete(authSessionsTable).where(eq(authSessionsTable.tokenHash, hashToken(token)));
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax", path: "/" });
}

export async function resolveSession(req: Request): Promise<{ userId: string } | null> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  const rows = await db
    .select()
    .from(authSessionsTable)
    .where(and(eq(authSessionsTable.tokenHash, hashToken(token)), gt(authSessionsTable.expiresAt, new Date())));
  const session = rows[0];
  if (!session) return null;
  return { userId: session.userId };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const session = await resolveSession(req);
  if (!session) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  req.userId = session.userId;
  next();
}
