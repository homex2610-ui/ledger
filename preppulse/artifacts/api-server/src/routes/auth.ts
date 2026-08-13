import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { GetMeResponse, LogInBody, LogInResponse, SignUpBody, SignUpResponse } from "@workspace/api-zod";
import { createSession, destroySession, hashPassword, requireAuth, setSessionCookie, verifyPassword, clearSessionCookie } from "../lib/auth";
import { toProfileShape } from "../lib/prep-stats";
import { createUserWithProfile } from "../lib/oauth/users";

const AUTH_WINDOW_MS = 10 * 60 * 1000;
const AUTH_MAX_REQUESTS = 60;

export function authRateLimit(req: Request, res: Response, next: NextFunction): void {
  const now = Date.now();
  const windowStart = now - AUTH_WINDOW_MS;
  const buckets = (globalThis as { __authBuckets?: Map<string, number[]> }).__authBuckets ??= new Map<string, number[]>();
  const ip = req.ip ?? req.socket?.remoteAddress ?? "unknown";
  const bucket = (buckets.get(ip) ?? []).filter((timestamp) => timestamp > windowStart);
  if (bucket.length >= AUTH_MAX_REQUESTS) {
    res.status(429).json({ error: "Too many attempts. Wait a few minutes and try again." });
    return;
  }
  bucket.push(now);
  buckets.set(ip, bucket);
  next();
}

const router: IRouter = Router();

router.post("/signup", authRateLimit, async (req, res) => {
  const body = SignUpBody.parse(req.body);

  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, body.email)).limit(1);
  if (existing[0]) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const email = body.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Enter a valid email address" });
    return;
  }

  const handle = body.handle?.trim() || email.split("@")[0].replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 24) || "learner";
  const passwordHash = await hashPassword(body.password);

  const user = await createUserWithProfile({ email, handle, passwordHash });

  const { token, expiresAt } = await createSession(user.id);
  setSessionCookie(res, token, expiresAt);

  const profileShape = await toProfileShape(user.id);
  if (!profileShape) {
    res.status(500).json({ error: "Failed to load profile" });
    return;
  }

  res.status(201).json(
    SignUpResponse.parse({
      user: { id: user.id, email: user.email, handle: user.handle, createdAt: user.createdAt },
      profile: profileShape,
    }),
  );
});

router.post("/login", authRateLimit, async (req, res) => {
  const body = LogInBody.parse(req.body);

  const rows = await db.select().from(usersTable).where(eq(usersTable.email, body.email.trim().toLowerCase())).limit(1);
  const user = rows[0];
  if (!user || !(await verifyPassword(body.password, user.passwordHash ?? ""))) {
    res.status(401).json({ error: "Email or password is incorrect" });
    return;
  }

  const { token, expiresAt } = await createSession(user.id);
  setSessionCookie(res, token, expiresAt);

  const profileShape = await toProfileShape(user.id);
  res.json(
    LogInResponse.parse({
      user: { id: user.id, email: user.email, handle: user.handle, createdAt: user.createdAt },
      profile: profileShape,
    }),
  );
});

router.post("/logout", async (req, res) => {
  await destroySession(req);
  clearSessionCookie(res);
  res.status(204).end();
});

router.get("/me", requireAuth, async (req, res) => {
  const rows = await db.select().from(usersTable).where(eq(usersTable.id, req.userId)).limit(1);
  const user = rows[0];
  if (!user) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  const profileShape = await toProfileShape(user.id);
  res.json(
    GetMeResponse.parse({
      user: { id: user.id, email: user.email, handle: user.handle, createdAt: user.createdAt },
      profile: profileShape,
    }),
  );
});

export default router;