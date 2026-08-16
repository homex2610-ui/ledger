import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@workspace/db";
import { authSessionsTable, usersTable } from "@workspace/db/schema";
import {
  ChangePasswordBody,
  ChangePasswordResponse,
  ForgotPasswordBody,
  ForgotPasswordResponse,
  GetMeResponse,
  LogInBody,
  LogInResponse,
  ResetPasswordBody,
  ResetPasswordResponse,
  SignUpBody,
  SignUpResponse,
} from "@workspace/api-zod";
import { createSession, currentTokenHash, destroySession, hashPassword, requireAuth, setSessionCookie, verifyPassword, clearSessionCookie } from "../lib/auth.js";
import { toProfileShape } from "../lib/prep-stats.js";
import { createUserWithProfile } from "../lib/oauth/users.js";
import { sendRecoveryEmail, supabaseAuthConfigured, verifyRecoveryToken } from "../lib/supabase-auth.js";

const AUTH_WINDOW_MS = 10 * 60 * 1000;
const AUTH_MAX_REQUESTS = Number(process.env.AUTH_RATE_LIMIT_MAX ?? 60);
const PROD_ORIGIN = "https://ledger-pi-topaz.vercel.app";

// PARTIAL FIX (documented limitation): the bucket store is an in-memory Map
// on globalThis. This app runs on Vercel as a serverless function
// (`λ api/[...slug]`): state is NOT shared across instances and is lost on
// cold starts, so a distributed client can exceed the per-IP budget by
// spreading requests across warm instances. With `trust proxy` configured
// (see app.ts), each real client gets its own bucket and the original bug
// (all users sharing one bucket via the edge-node IP) is gone. If a hard
// per-IP limit is required, move this store to a persistent one (e.g.
// Upstash Redis / Vercel KV keyed by `rate:<ip>`) — until then this is a
// best-effort limiter.
export function authRateLimit(req: Request, res: Response, next: NextFunction): void {
  const now = Date.now();
  const windowStart = now - AUTH_WINDOW_MS;
  const buckets = (globalThis as { __authBuckets?: Map<string, number[]> }).__authBuckets ??= new Map<string, number[]>();
  const ip = req.ip ?? req.socket?.remoteAddress ?? "unknown";
  const bucket = (buckets.get(ip) ?? []).filter((timestamp) => timestamp > windowStart);
  if (bucket.length >= AUTH_MAX_REQUESTS) {
    res.status(429).json({ error: "Too many attempts. Wait a few minutes and try again.", code: "rate_limited" });
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
      user: { id: user.id, email: user.email, handle: user.handle, hasPassword: Boolean(user.passwordHash), createdAt: user.createdAt },
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
      user: { id: user.id, email: user.email, handle: user.handle, hasPassword: Boolean(user.passwordHash), createdAt: user.createdAt },
      profile: profileShape,
    }),
  );
});

router.post("/logout", async (req, res) => {
  await destroySession(req);
  clearSessionCookie(res);
  res.status(204).end();
});

// Resolves the origin for password-recovery emails. Never returns localhost:
// the production alias and Vercel preview hosts redirect to themselves, and
// everything else (dev servers, unknown hosts) falls back to the production
// origin. APP_ORIGIN overrides all of this when set (per-environment value in
// Vercel, e.g. a Preview env). The target must also be in the Supabase
// project's Redirect URLs allow-list, or Supabase silently falls back to its
// Site URL.
function resetRedirectOrigin(req: Request): string {
  const override = process.env.APP_ORIGIN?.replace(/\/+$/, "");
  if (override) return override;
  const host = (req.get("host") ?? "").toLowerCase();
  if (host === "ledger-pi-topaz.vercel.app" || host.endsWith(".vercel.app")) {
    return `https://${host}`;
  }
  return PROD_ORIGIN;
}

router.post("/forgot-password", authRateLimit, async (req, res) => {
  const body = ForgotPasswordBody.parse(req.body);
  const email = body.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Enter a valid email address" });
    return;
  }
  if (!supabaseAuthConfigured()) {
    res.status(503).json({ error: "Password recovery is temporarily unavailable" });
    return;
  }
  const redirectTo = `${resetRedirectOrigin(req)}/reset-password`;
  try {
    await sendRecoveryEmail(email, redirectTo);
  } catch {
    res.status(503).json({ error: "Password recovery is temporarily unavailable" });
    return;
  }
  res.json(ForgotPasswordResponse.parse({ ok: true }));
});

router.post("/reset-password", authRateLimit, async (req, res) => {
  const body = ResetPasswordBody.parse(req.body);
  if (!supabaseAuthConfigured()) {
    res.status(503).json({ error: "Password recovery is temporarily unavailable" });
    return;
  }
  const verified = await verifyRecoveryToken(body.accessToken);
  if (!verified) {
    res.status(400).json({ error: "Reset link is invalid or has expired" });
    return;
  }

  const email = verified.email.toLowerCase();
  let rows = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  let user = rows[0];
  if (!user) {
    let handle = email.split("@")[0].replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 24) || "learner";
    for (let i = 2; ; i++) {
      const clash = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.handle, handle)).limit(1);
      if (!clash[0]) break;
      handle = `${handle.slice(0, 20)}_${i}`;
    }
    user = await createUserWithProfile({ id: verified.id, email, handle, passwordHash: null });
  }

  const passwordHash = await hashPassword(body.newPassword);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, user.id));

  const { token, expiresAt } = await createSession(user.id);
  setSessionCookie(res, token, expiresAt);

  const profileShape = await toProfileShape(user.id);
  if (!profileShape) {
    res.status(500).json({ error: "Failed to load profile" });
    return;
  }
  res.json(
    ResetPasswordResponse.parse({
      user: { id: user.id, email: user.email, handle: user.handle, hasPassword: true, createdAt: user.createdAt },
      profile: profileShape,
    }),
  );
});

router.post("/change-password", authRateLimit, requireAuth, async (req, res) => {
  const body = ChangePasswordBody.parse(req.body);
  const rows = await db.select().from(usersTable).where(eq(usersTable.id, req.userId)).limit(1);
  const user = rows[0];
  if (!user) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  if (user.passwordHash) {
    if (!body.currentPassword || !(await verifyPassword(body.currentPassword, user.passwordHash))) {
      res.status(400).json({ error: "Current password is incorrect" });
      return;
    }
  }

  const passwordHash = await hashPassword(body.newPassword);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, user.id));

  const currentHash = currentTokenHash(req);
  if (currentHash) {
    await db
      .delete(authSessionsTable)
      .where(and(eq(authSessionsTable.userId, user.id), ne(authSessionsTable.tokenHash, currentHash)));
  }
  res.json(ChangePasswordResponse.parse({ ok: true }));
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
      user: { id: user.id, email: user.email, handle: user.handle, hasPassword: Boolean(user.passwordHash), createdAt: user.createdAt },
      profile: profileShape,
    }),
  );
});

export default router;