// Discord invite configuration.
//
// The official server invite is intentionally a public destination, but it
// must NOT be hardcoded across components — each deployment configures it
// via VITE_DISCORD_INVITE_URL (e.g. a Vercel environment variable). When the
// variable is absent or empty, hasDiscordInvite is false and every Discord
// CTA is hidden: no broken href, no "undefined" text, no dead link.
//
// Deliberately no method calls or shared-variable indirection in the flag
// chain: a production build without the variable folds this ternary to the
// literal `false`, so the minifier dead-code-eliminates every Discord CTA
// (verified by the AGENTS.md build grep).
const DISCORD_INVITE_URL = import.meta.env.VITE_DISCORD_INVITE_URL || "";

export const discordInviteUrl = DISCORD_INVITE_URL;
export const hasDiscordInvite = import.meta.env.VITE_DISCORD_INVITE_URL ? true : false;
// Single accessible name for every CTA — announces that the link leaves
// Ledger and opens a new tab.
export const DISCORD_CTA_LABEL = "Join the Ledger Discord community (opens in a new tab)";
