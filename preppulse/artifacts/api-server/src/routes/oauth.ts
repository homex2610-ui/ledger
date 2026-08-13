import { randomBytes } from "node:crypto";
import { Router, type IRouter, type Request } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { oauthAccountsTable, usersTable } from "@workspace/db/schema";
import { GetAuthDiscordAuthorizeResponse, GetAuthOauthProvidersResponse, GoogleAuthBody, GoogleAuthResponse, OauthLinkBody, OauthLinkResponse } from "@workspace/api-zod";
import { createSession, resolveSession, setSessionCookie, requireAuth } from "../lib/auth";
import { authRateLimit } from "./auth";
import { toProfileShape } from "../lib/prep-stats";
import { GoogleVerificationError, verifyGoogleCredential } from "../lib/oauth/google";
import { DiscordOAuthError, exchangeDiscordCode, fetchDiscordUser, getDiscordAuthorizeUrl } from "../lib/oauth/discord";
import { loadOAuthConfig } from "../lib/oauth/config";
import {
  AlreadyLinkedError,
  countSignInMethods,
  linkOAuthToUser,
  OAuthLinkConflictError,
  resolveOrCreateOAuthUser,
  type OAuthProvider,
} from "../lib/oauth/users";

const OAUTH_STATE_COOKIE = "pp_oauth_state";
const OAUTH_LINK_COOKIE = "pp_oauth_link";
const OAUTH_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

function isOAuthProvider(value: unknown): value is OAuthProvider {
  return value === "google" || value === "discord";
}

function buildRedirectUri(req: Request): string {
  return `${req.protocol}://${req.get("host")}/api/auth/discord/callback`;
}

function redirectBase(req: Request): string {
  return `${req.protocol}://${req.get("host")}`;
}

function csrfMatches(req: Request, csrfToken: unknown): boolean {
  const cookieToken = req.cookies?.g_csrf_token;
  return typeof cookieToken === "string" && cookieToken.length > 0 && typeof csrfToken === "string" && csrfToken === cookieToken;
}

async function authResponseFor(userId: string) {
  const rows = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const user = rows[0];
  const profileShape = await toProfileShape(userId);
  if (!user || !profileShape) throw new Error("Failed to load auth response");
  return GoogleAuthResponse.parse({
    user: { id: user.id, email: user.email, handle: user.handle, createdAt: user.createdAt },
    profile: profileShape,
  });
}

const router: IRouter = Router();

router.get("/oauth/providers", async (req, res) => {
  const config = loadOAuthConfig();
  const session = await resolveSession(req);
  let googleConnected = false;
  let discordConnected = false;
  if (session) {
    const rows = await db.select({ provider: oauthAccountsTable.provider }).from(oauthAccountsTable).where(eq(oauthAccountsTable.userId, session.userId));
    googleConnected = rows.some((row) => row.provider === "google");
    discordConnected = rows.some((row) => row.provider === "discord");
  }
  res.json(
    GetAuthOauthProvidersResponse.parse({
      google: { enabled: Boolean(config.googleClientId), clientId: config.googleClientId ?? undefined, connected: googleConnected },
      discord: { enabled: Boolean(config.discordClientId && config.discordClientSecret), connected: discordConnected },
    }),
  );
});

router.post("/google", authRateLimit, async (req, res) => {
  const body = GoogleAuthBody.parse(req.body);
  if (!csrfMatches(req, body.csrfToken)) {
    res.status(400).json({ error: "Google sign-in state expired. Try again.", code: "csrf_mismatch" });
    return;
  }

  let identity;
  try {
    identity = await verifyGoogleCredential(body.credential);
  } catch (error) {
    if (error instanceof GoogleVerificationError) {
      res.status(400).json({ error: error.message, code: "invalid_credential" });
      return;
    }
    throw error;
  }

  const session = await resolveSession(req);
  if (session) {
    try {
      await linkOAuthToUser(session.userId, { provider: "google", providerUserId: identity.sub, email: identity.email, displayName: identity.name });
    } catch (error) {
      if (error instanceof AlreadyLinkedError) {
        res.status(409).json({ error: "This Google account is already linked to another PrepPulse account", code: "already_linked" });
        return;
      }
      throw error;
    }
    res.json(await authResponseFor(session.userId));
    return;
  }

  try {
    const { user, created } = await resolveOrCreateOAuthUser({
      provider: "google",
      providerUserId: identity.sub,
      email: identity.email,
      displayName: identity.name,
    });
    const { token, expiresAt } = await createSession(user.id);
    setSessionCookie(res, token, expiresAt);
    res.status(created ? 201 : 200).json(await authResponseFor(user.id));
  } catch (error) {
    if (error instanceof OAuthLinkConflictError) {
      res.status(409).json({ error: "An account with this email already exists. Sign in with email and connect Google in Settings.", code: "account_linking_required" });
      return;
    }
    throw error;
  }
});

router.post("/oauth/link", authRateLimit, requireAuth, async (req, res) => {
  const body = OauthLinkBody.parse(req.body);
  if (!csrfMatches(req, body.csrfToken)) {
    res.status(400).json({ error: "Google sign-in state expired. Try again.", code: "csrf_mismatch" });
    return;
  }

  let identity;
  try {
    identity = await verifyGoogleCredential(body.credential);
  } catch (error) {
    if (error instanceof GoogleVerificationError) {
      res.status(400).json({ error: error.message, code: "invalid_credential" });
      return;
    }
    throw error;
  }

  try {
    await linkOAuthToUser(req.userId, { provider: "google", providerUserId: identity.sub, email: identity.email, displayName: identity.name });
  } catch (error) {
    if (error instanceof AlreadyLinkedError) {
      res.status(409).json({ error: "This Google account is already linked to another PrepPulse account", code: "already_linked" });
      return;
    }
    throw error;
  }
  res.json(OauthLinkResponse.parse(await authResponseFor(req.userId)));
});

router.get("/discord/authorize", authRateLimit, async (req, res) => {
  const config = loadOAuthConfig();
  if (!config.discordClientId || !config.discordClientSecret) {
    res.status(400).json({ error: "Discord sign-in is not configured", code: "provider_unavailable" });
    return;
  }

  const link = req.query.link === "true" || req.query.link === "1";
  if (link) {
    const session = await resolveSession(req);
    if (!session) {
      res.status(401).json({ error: "Sign in first to connect Discord" });
      return;
    }
    res.cookie(OAUTH_LINK_COOKIE, "1", { httpOnly: true, sameSite: "lax", maxAge: OAUTH_COOKIE_MAX_AGE_MS, path: "/" });
  }

  const state = randomBytes(24).toString("hex");
  res.cookie(OAUTH_STATE_COOKIE, state, { httpOnly: true, sameSite: "lax", maxAge: OAUTH_COOKIE_MAX_AGE_MS, path: "/" });
  res.json(GetAuthDiscordAuthorizeResponse.parse({ url: getDiscordAuthorizeUrl(state, buildRedirectUri(req), link) }));
});

router.get("/discord/callback", async (req, res) => {
  const { code, state } = req.query;
  const storedState = req.cookies?.[OAUTH_STATE_COOKIE];
  if (typeof code !== "string" || code.length === 0 || typeof state !== "string" || !storedState || storedState !== state) {
    res.status(400).json({ error: "Discord sign-in state does not match. Try again.", code: "state_mismatch" });
    return;
  }

  res.clearCookie(OAUTH_STATE_COOKIE, { httpOnly: true, sameSite: "lax", path: "/" });
  const link = req.cookies?.[OAUTH_LINK_COOKIE] === "1";
  res.clearCookie(OAUTH_LINK_COOKIE, { httpOnly: true, sameSite: "lax", path: "/" });

  let identity;
  try {
    const redirectUri = buildRedirectUri(req);
    const accessToken = await exchangeDiscordCode(code, redirectUri);
    identity = await fetchDiscordUser(accessToken);
  } catch (error) {
    if (error instanceof DiscordOAuthError) {
      res.redirect(`${redirectBase(req)}/?oauth=error&provider=discord`);
      return;
    }
    throw error;
  }

  const context = { provider: "discord" as const, providerUserId: identity.id, email: identity.email, displayName: identity.globalName ?? identity.username };

  if (link) {
    const session = await resolveSession(req);
    if (!session) {
      res.redirect(`${redirectBase(req)}/?oauth=error&provider=discord`);
      return;
    }
    try {
      await linkOAuthToUser(session.userId, context);
    } catch (error) {
      if (error instanceof AlreadyLinkedError) {
        res.redirect(`${redirectBase(req)}/?oauth=conflict&provider=discord`);
        return;
      }
      throw error;
    }
    res.redirect(`${redirectBase(req)}/?oauth=success&provider=discord&linked=1`);
    return;
  }

  try {
    const { user } = await resolveOrCreateOAuthUser(context);
    const { token, expiresAt } = await createSession(user.id);
    setSessionCookie(res, token, expiresAt);
    res.redirect(`${redirectBase(req)}/?oauth=success&provider=discord`);
  } catch (error) {
    if (error instanceof OAuthLinkConflictError) {
      res.redirect(`${redirectBase(req)}/?oauth=conflict&provider=discord`);
      return;
    }
    throw error;
  }
});

router.delete("/oauth/:provider", requireAuth, async (req, res) => {
  const { provider } = req.params;
  if (!isOAuthProvider(provider)) {
    res.status(400).json({ error: "Unknown provider" });
    return;
  }

  const account = (
    await db
      .select()
      .from(oauthAccountsTable)
      .where(and(eq(oauthAccountsTable.userId, req.userId), eq(oauthAccountsTable.provider, provider)))
      .limit(1)
  )[0];
  if (!account) {
    res.status(204).end();
    return;
  }

  const signInMethods = await countSignInMethods(req.userId);
  if (signInMethods <= 1) {
    res.status(409).json({ error: "You need another sign-in method before disconnecting this one.", code: "last_auth_method" });
    return;
  }

  await db.delete(oauthAccountsTable).where(eq(oauthAccountsTable.id, account.id));
  res.status(204).end();
});

export default router;
