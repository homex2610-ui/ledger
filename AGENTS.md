# AGENTS.md

Vite + React (JSX, not TS) single-page study tracker backed by Supabase. No lint/typecheck tooling — verification is `build` plus the QA harness in `qa/`.

## Run & verify
- `npm install`, copy `.env.example` to `.env.local` and fill in real Supabase values, `npm run dev` (Vite, port 5173).
- Optional `VITE_DISCORD_INVITE_URL` (public discord.gg invite): when set, "Join Ledger Discord" CTAs render in Community, the profile panel and Stories (`src/lib/discord.js` is the single source). Absent/empty = CTAs hidden — never hardcode an invite URL in components.
- The app **throws on startup** in `src/lib/supabaseClient.js:8` if `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing — it links against the live Supabase project, no local DB/mock.
- Env vars are `VITE_`-prefixed (client-exposed). `.env.local` and `.env` are gitignored.

## QA harness (`qa/`)
- `npm run qa` = `npm run test:unit` (node:test on `qa/*.test.mjs`, pure functions only — no browser) + `npm run test:e2e` (Playwright, `playwright.config.mjs`).
- The e2e suite drives the app in **Demo Mode** — fabricated local session, no Supabase writes. Needs `.env.local` present (the app won't boot without it) and network reachability to Supabase for the initial `getSession()`.
- The e2e suite boots two dev servers: `:5173` (no `VITE_DISCORD_INVITE_URL` — unconfigured state) and `:5174` via `qa/serve-configured.mjs` (QA invite `https://discord.gg/ledger-qa` — configured state, used by `qa/discord.spec.js`). The QA invite is test-only: after any `npm run build`, grep `dist/assets/*.js` for `discord.gg/ledger-qa` and `Join the Ledger Discord` — both must be absent from the production bundle (the CTAs are dead-code-eliminated when the env var is missing; `.env.local` has no value, so a plain `npm run build` covers this).
- Tests assert on **rendered output** (computed styles, attributes, `data-wallpaper` layers) plus the dev-only `window.__ledgerWallpaper` / `window.__ledgerSound` / `window.__ledgerSessions` / `window.__ledgerAuth` hooks exposed by App.jsx. Those hooks are `if (!import.meta.env.DEV)` gated and must stay absent from the production bundle — after any `npm run build`, grep `dist/assets/*.js` for `__ledgerWallpaper` / `__ledgerSound` / `__ledgerAudioState` / `__ledgerWallpaperHooks` / `__ledgerSessions` / `__ledgerAuth` / `__ledgerSave` / `__ledgerFailSave` / `data-dev-only` / `ledger-qa-crash` (all must be `False`; `__ledgerAudioCtx` must be `True` — the chime reads it) and for `details suppressed in production` (must be `True` — the error-boundary's prod console marker; the raw `fatal render error:",` two-arg form must be `False`). `__ledgerAuth` drives session switches through AuthGate's real `setSession` terminal — never shortcut `userId` directly in tests. `__ledgerSave.failNext()` arms a one-shot write failure inside `useStorage.save()` — the save-failure toast e2e relies on it.
- `qa/ledger.spec.js` pins the current default appearance (`THEME_PRESETS.verdigris.focus` = `#6CCBC0`) plus the countdown coral numeral (`#F0645A` → `rgb(240, 100, 90)`). If the default theme/accent changes, update the constants at the top of the spec too.
- `qa/contrast-check.mjs` is a standalone accessibility audit (WCAG ratios for every palette's text/button/status pairs) — run it with `node qa/contrast-check.mjs` after touching palette tokens.
- New e2e tests: sidebar rail opacity + wordmark no-overlap bounding rects; weekly subject ring segments/center/legend + trigger; session-logged trigger fires tick on Focus tab; save-failure toast via `__ledgerSave.failNext()` (auto-dismiss + recovery); Discord invite CTA in configured state (`:5174`) + hidden state with no broken/undefined hrefs (`:5173`).
- Run e2e with `npx playwright test` (workers=1; browser installed via `npx playwright install chromium`).

## Architecture
- **Almost all code lives in one monolith `src/App.jsx` (~5,800 lines: whole app + AuthGate + all feature tabs)**. `src/components/*` and `src/lib/*` are thin — read App.jsx first when changing behavior.
- Storage: all per-user data (syllabus, tasks, sessions, mocks, cards, settings) persists through the `load(key, fallback, shared)` / `save(key, value, shared)` hook using `useStorage` in `src/App.jsx:150`. It writes to one generic `kv_store` table. Every write funnels through `save()`, which refuses writes until the current user's boot load has resolved (`loadedRef` guard in `useStorage`) — keep that guard in place: it prevents stale values from a session change (e.g. a demo profile) from landing under the new user's rows. The leaderboard publish writes `shared=true` rows keyed `lb:<ownerId>`.
- **Study circles are real tables** (`study_circles`, `circle_members`), NOT `kv_store` rows — `kv_store`'s upsert on `(owner_id, key, shared)` breaks when multiple people write the same key. See `supabase/migrations/003_circles.sql`. Cross-member stats (leaderboards, activity) go through the SECURITY DEFINER adapters `get_circle_preview` / `circle_activity` because each user's sessions live in private kv_store rows that RLS hides from everyone else. Add any multi-writer/multi-reader feature as real tables too.

## Database
- `supabase/schema.sql` is the canonical `kv_store` + RLS source — apply manually in the Supabase SQL editor (not a migration runner).
- `supabase/migrations/*.sql` are appended by hand; keep them ordered/append-only. RLS matters: private rows owner-only; only owner can write their own rows.
- `qa/rls-check.mjs` verifies the circles schema/RLS against the live project — run it standalone (`node qa/rls-check.mjs`) AFTER applying the latest migration. It signs up two throwaway users; if the project enforces email confirmation it reports the policy manifest only and skips behavior. Not part of `npm run qa`.
- `qa/kv-check.mjs` verifies a fresh account's `kv_store` rows contain no demo-derived data after the demo → real-account transition (Bug 2 persistence check) — run it standalone (`node qa/kv-check.mjs create|verify|cleanup`). With email confirmation enabled it falls back to printing the SQL to run in the Supabase dashboard. Not part of `npm run qa`.

## Gotchas
- `src/lib/utils.js` date helpers deliberately avoid UTC-parsed dates (blend of UTC + local `.setDate()` shifts results by a day across DST). Use `parseLocalDate`/`todayStr`/`addDays`/`daysBetween` for all date math; don't hand-roll `new Date(str)` arithmetic.
- `useStorage.save()` **silently skips writing** a key if its last `load()` failed (to avoid clobbering real data) — don't treat missing writes as a query bug. Those guard skips do NOT fire the save-failure toast (they're internal sequencing, not user-facing failures); only actual write failures do (thrown errors and non-2xx `upsert` responses — `onSaveError` → toast in Workspace).
- Sign-in is email magic-link + optional Discord OAuth; there's no password flow.

## Resuming work across sessions
- When running low on tokens / session budget, write a detailed handoff summary (what is being done, how, why, current state, what's left) into a temp note file (e.g. `C:\Users\updes\AppData\Local\Temp\opencode\ledger-handoff.md`) and tell the user to start a new session, rather than risk losing progress mid-edit.
- Re-read this AGENTS.md and the handoff file at the start of every session before touching code.