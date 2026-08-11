# Ledger

A study tracker for JEE/NEET prep — syllabus coverage, spaced-repetition
recall cards, a focus timer, daily targets, and a peer leaderboard.

This is the real, deployable version: a Vite + React app backed by
Supabase (auth + database), instead of the Claude-artifact prototype it
started as.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project (free tier is fine to start).
2. Once it's created, open **SQL Editor → New query**, paste in the contents
   of `supabase/schema.sql`, and run it. This creates the one table the app
   needs (`kv_store`) with row-level security already configured.
3. Go to **Authentication → Providers** and make sure **Email** is enabled
   (it is by default). The app uses magic-link sign-in — no password setup
   needed.
4. Go to **Project Settings → API** and copy the **Project URL** and the
   **anon public** key.

## 2. Run it locally

```bash
npm install
cp .env.example .env.local
# paste your Project URL and anon key into .env.local
npm run dev
```

Open the printed `localhost` URL. Sign in with your email — Supabase will
send a magic link. Click it and you're in.

## 3. Deploy it live

Push this folder to a GitHub repo, then:

1. Go to [vercel.com](https://vercel.com) → **New Project** → import the repo.
   Vercel auto-detects Vite; no build config needed.
2. Under **Environment Variables**, add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` (same values as your `.env.local`).
3. Deploy. You'll get a `your-project.vercel.app` URL immediately.
4. In Supabase, go to **Authentication → URL Configuration** and add your
   Vercel URL (and later your custom domain) to **Redirect URLs**, or the
   magic-link email will bounce people back to `localhost`. Also add
   `VITE_REDIRECT_URL` to your Vercel env vars (set to the deployed URL) so
   the redirect target is explicit rather than derived from whatever origin
   the link is clicked on.
5. (Optional) Buy a domain and point it at the Vercel project under
   **Settings → Domains**.

Netlify works the same way if you prefer it over Vercel.

### Discord sign-in (optional)

The sign-in screen has a "Continue with Discord" button. To enable it:

1. In Supabase, go to **Authentication → Providers → Discord** and enable it.
2. Create an app at the [Discord Developer Portal](https://discord.com/developers/applications)
   → OAuth2, copy its **Client ID** and **Client Secret** into the Supabase
   provider settings.
3. In the Discord app's OAuth2 settings, add the redirect URI Supabase shows
   you (something like `https://<project-ref>.supabase.co/auth/v1/callback`).
4. Until Discord is enabled in Supabase, the button shows an error message
   when clicked instead of crashing — no code change needed once it's set up.

### Discord community invite (optional)

"Join Ledger Discord" CTAs (Community tab, the profile panel, and Stories)
point at the official Discord server. The invite is **not hardcoded** — each
deployment configures the destination:

1. Create the invite in Discord → **Server Settings → Invites** (a public
   `discord.gg/...` link).
2. In Vercel, add the environment variable `VITE_DISCORD_INVITE_URL` set to
   that URL, then redeploy.
3. Locally, add the same line to `.env.local` (`VITE_DISCORD_INVITE_URL=...`).

When the variable is absent or empty, all Discord CTAs are hidden — nothing
broken renders. This is only a server invite (a plain external link); it has
nothing to do with Discord OAuth sign-in and no scopes, bots, roles or
account linking.

## 4. A few things to know before real users show up

- **Free-tier Supabase projects pause after 7 days with no API traffic.**
  Fine while you're the only user; once real people are using it, this
  mostly won't trigger — but set up a free
  [UptimeRobot](https://uptimerobot.com) ping against your Supabase URL if
  you expect quiet stretches (e.g. over a holiday) so it doesn't go offline
  on someone mid-exam-week.
- **No automatic backups on the free plan.** Use the in-app **Settings →
  Export all data (JSON)** yourself occasionally, or set up a scheduled
  pg_dump via GitHub Actions once you have real users depending on this.
- **Add a Google sign-in button later** if email magic-links feel like too
  much friction — `supabase.auth.signInWithOAuth({ provider: "google" })`
  is a small addition once you're ready to configure an OAuth app.

## Project structure

```
src/
  App.jsx              — the whole app (Workspace + all feature tabs + AuthGate)
  lib/supabaseClient.js — Supabase client, reads env vars
  main.jsx             — React entry point
supabase/schema.sql     — run once in the Supabase SQL editor
```
