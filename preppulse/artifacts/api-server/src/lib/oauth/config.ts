export interface OAuthConfig {
  googleClientId: string | null;
  discordClientId: string | null;
  discordClientSecret: string | null;
  /** Server id to auto-join new Discord sign-ins to (needs the bot in that server). */
  discordGuildId: string | null;
  /** Test-only override for the Google signing-certs endpoint. */
  googleCertsUrl: string | null;
  discordTokenUrl: string;
  discordApiUrl: string;
}

export function loadOAuthConfig(): OAuthConfig {
  return {
    googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() || null,
    discordClientId: process.env.DISCORD_CLIENT_ID?.trim() || null,
    discordClientSecret: process.env.DISCORD_CLIENT_SECRET?.trim() || null,
    discordGuildId: process.env.DISCORD_GUILD_ID?.trim() || null,
    googleCertsUrl: process.env.GOOGLE_CERTS_URL?.trim() || null,
    discordTokenUrl: process.env.DISCORD_TOKEN_URL?.trim() || "https://discord.com/api/oauth2/token",
    discordApiUrl: process.env.DISCORD_API_URL?.trim() || "https://discord.com/api/v10",
  };
}