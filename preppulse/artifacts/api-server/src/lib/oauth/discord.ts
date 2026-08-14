import { loadOAuthConfig } from "./config.js";

export interface DiscordIdentity {
  id: string;
  username: string;
  globalName: string | null;
  email: string | null;
  avatar: string | null;
}

export function discordAvatarUrl(id: string, avatar: string | null): string | null {
  if (!avatar) return null;
  const extension = avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${extension}?size=128`;
}

export class DiscordOAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiscordOAuthError";
  }
}

export function getDiscordAuthorizeUrl(state: string, redirectUri: string, link: boolean): string {
  const { discordClientId, discordGuildId } = loadOAuthConfig();
  if (!discordClientId) throw new DiscordOAuthError("Discord OAuth is not configured");

  const scope = discordGuildId ? "identify email guilds.join" : "identify email";
  const params = new URLSearchParams({
    client_id: discordClientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope,
    state,
  });
  if (link) params.set("prompt", "consent");
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export async function exchangeDiscordCode(code: string, redirectUri: string): Promise<string> {
  const { discordClientId, discordClientSecret, discordTokenUrl } = loadOAuthConfig();
  if (!discordClientId || !discordClientSecret) {
    throw new DiscordOAuthError("Discord OAuth is not configured");
  }

  const body = new URLSearchParams({
    client_id: discordClientId,
    client_secret: discordClientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch(discordTokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new DiscordOAuthError("Discord code exchange failed");
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new DiscordOAuthError("Discord code exchange returned no token");
  return json.access_token;
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordIdentity> {
  const { discordApiUrl } = loadOAuthConfig();
  const res = await fetch(`${discordApiUrl}/users/@me`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new DiscordOAuthError("Failed to fetch Discord identity");
  const json = (await res.json()) as {
    id?: string;
    username?: string;
    global_name?: string | null;
    email?: string | null;
    avatar?: string | null;
  };
  if (!json.id) throw new DiscordOAuthError("Discord identity is missing its id");
  return {
    id: json.id,
    username: json.username ?? "discord-user",
    globalName: json.global_name ?? null,
    email: json.email ?? null,
    avatar: json.avatar ?? null,
  };
}

/**
 * Adds the user to the configured Discord server. Only works when the user
 * granted the `guilds.join` scope during authorization (the consent screen
 * shows a "join <server>" checkbox) and the bot is a member of the server.
 * Best-effort: failures never break the sign-in flow.
 */
export async function joinDiscordGuild(accessToken: string, userId: string): Promise<void> {
  const { discordGuildId, discordApiUrl } = loadOAuthConfig();
  if (!discordGuildId) return;
  const res = await fetch(`${discordApiUrl}/guilds/${discordGuildId}/members/${userId}`, {
    method: "PUT",
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 204) {
    throw new DiscordOAuthError(`Failed to join Discord server (${res.status})`);
  }
}