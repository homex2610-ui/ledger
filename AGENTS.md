# AGENTS.md

Vite + React (JSX, not TS) single-page study tracker backed by Supabase. **No lint/typecheck/test tooling exists** — only `dev`, `build`, `preview`. Don't invent one; just run the app.

## Run & verify
- `npm install`, copy `.env.example` to `.env.local` and fill in real Supabase values, `npm run dev` (Vite, port 5173).
- The app **throws on startup** in `src/lib/supabaseClient.js:8` if `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing — it links against the live Supabase project, no local DB/mock.
- Env vars are `VITE_`-prefixed (client-exposed). `.env.local` and `.env` are gitignored.

## Architecture
- **Almost all code lives in one ~2,500-line monolith `src/App.jsx`** (whole app + AuthGate + all feature tabs). `src/components/*` and `src/lib/*` are thin — read App.jsx first when changing behavior.
- Storage: all per-user data (syllabus, tasks, sessions, mocks, cards, settings) persists through the `load(key, fallback, shared)` / `save(key, value, shared)` hook using `useStorage` in `src/App.jsx:150`. It writes to one generic `kv_store` table. `shared=true` = peer leaderboard rows (`lb:<code>`) readable by any signed-in user but written only by their owner. Keep using this contract for new per-user features.
- **Study groups are real tables** (`groups`, `group_members`), NOT `kv_store` rows — `kv_store`'s upsert on `(owner_id, key, shared)` breaks when multiple people write the same key. See `supabase/migrations/002_groups.sql` (575+ lines of reasoning). Add any multi-writer/multi-reader feature as real tables too.

## Database
- `supabase/schema.sql` is the canonical `kv_store` + RLS source — apply manually in the Supabase SQL editor (not a migration runner).
- `supabase/migrations/*.sql` are appended by hand; keep them ordered/append-only. RLS matters: private rows owner-only; only owner can write their own rows.

## Gotchas
- `src/lib/utils.js` date helpers deliberately avoid UTC-parsed dates (blend of UTC + local `.setDate()` shifts results by a day across DST). Use `parseLocalDate`/`todayStr`/`addDays`/`daysBetween` for all date math; don't hand-roll `new Date(str)` arithmetic.
- `useStorage.save()` **silently skips writing** a key if its last `load()` failed (to avoid clobbering real data) — don't treat missing writes as a query bug.
- Sign-in is email magic-link + optional Discord OAuth; there's no password flow.

## Resuming work across sessions
- When running low on tokens / session budget, write a detailed handoff summary (what is being done, how, why, current state, what's left) into a temp note file (e.g. `C:\Users\updes\AppData\Local\Temp\opencode\ledger-handoff.md`) and tell the user to start a new session, rather than risk losing progress mid-edit.
- Re-read this AGENTS.md and the handoff file at the start of every session before touching code.