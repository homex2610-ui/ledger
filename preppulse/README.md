# PrepPulse

A private, single-user study companion for JEE Main / NEET aspirants. Tracks
your daily pulse, syllabus coverage, mock-test history, flashcards and focus
sessions — and only shares what you opt into, through circles you create.

## Stack

- **pnpm workspaces**, Node.js, TypeScript (strict, `noUnusedLocals`/`noUnusedParameters`)
- **API**: Express 5 + Drizzle ORM on PostgreSQL
- **Validation + contracts**: OpenAPI spec (`lib/api-spec/openapi.yaml`) → generated Zod schemas (`@workspace/api-zod`) and React Query hooks (`@workspace/api-client-react`) via Orval
- **Frontend**: Vite + React + Tailwind 4 + Wouter
- **Build**: esbuild bundle for the server; the server also serves the built SPA

## Repository map

| Path | Purpose |
| --- | --- |
| `lib/api-spec/openapi.yaml` | Source of truth for the API contract |
| `lib/api-zod` | Generated request/response Zod schemas |
| `lib/api-client-react` | Generated React Query hooks + fetcher |
| `lib/db` | Drizzle schema, migrations config, seed catalog |
| `artifacts/api-server` | Express server (routes per domain: prep, study, recall, community) |
| `artifacts/prep-pulse` | Vite React frontend |
| `scripts/qa-isolation.mjs` | Cross-user isolation QA suite (node:test) |

## Setup

```sh
pnpm install
```

Required environment variable (run commands with it inline, there is no `.env`):

```
DATABASE_URL=postgres://preppulse:preppulse@localhost:5433/preppulse
```

Push the schema and seed the topic catalog once:

```sh
pnpm --filter @workspace/db run push
pnpm --filter @workspace/db run seed
```

### OAuth (optional)

Google and Discord sign-in are enabled only when the client credentials are
provided. Without them the providers are reported as unavailable and the
sign-in buttons are disabled.

| Variable                 | Purpose                                          | Source                                        |
| ------------------------ | ------------------------------------------------ | --------------------------------------------- |
| `GOOGLE_CLIENT_ID`       | OAuth client id (the only value the browser sees) | Google Cloud console → Credentials → OAuth 2.0 Client |
| `DISCORD_CLIENT_ID`      | OAuth client id                                   | Discord Developer Portal → OAuth2             |
| `DISCORD_CLIENT_SECRET`  | OAuth client secret (server-side only)            | Discord Developer Portal → OAuth2             |

Google uses Identity Services: the rendered button returns an ID token that
the server verifies against Google's signing certificates (audience,
issuer, expiry and `email_verified` are all checked). Discord uses the
authorization-code flow with a random, one-use state cookie. New-account
emails are never auto-linked: matching an existing email asks for explicit
linking (Settings → Connected accounts), and disconnecting is refused when
it would leave the account without a sign-in method.

For testing, `GOOGLE_CERTS_URL`, `DISCORD_TOKEN_URL` and `DISCORD_API_URL`
override the OAuth endpoints (the QA suite uses its own mock OAuth server).

## Run

Build and start the API server (it serves the built SPA from `dist/public`):

```sh
# artifacts/api-server
pnpm run typecheck
node ./build.mjs
$env:PORT=5000  # PowerShell; export PORT=5000 on POSIX shells
$env:DATABASE_URL="postgres://..."  # must also be set
node ./dist/index.mjs
```

Build the frontend (env vars required by `vite.config.ts`):

```sh
# artifacts/prep-pulse
$env:PORT=5000
$env:BASE_PATH=/
pnpm run build
```

For development, `pnpm --filter @workspace/api-server run dev` and the Vite
dev server (`pnpm --filter @workspace/prep-pulse run dev`) proxy `/api` to
`localhost:5000`.

## QA

```sh
# scripts
$env:DATABASE_URL="postgres://preppulse:preppulse@localhost:5433/preppulse"
pnpm run qa   # or: node ./qa-isolation.mjs
```

Boots the API on port 5099 and runs 33 tests (56 checks) covering
auth (password, Google and Discord OAuth), OAuth account linking and
disconnect guards, cross-user isolation, ownership guards, rate limiting,
locked topics, prerequisite scoping, leaderboard privacy, API error
handling, study-session minute bounds, timezone handling, export ownership
and account deletion.

## Codegen

After editing `openapi.yaml`:

```sh
pnpm --filter @workspace/api-spec run codegen
```

## Notes

- The server runs with CORS disabled by default (same-origin only). Set
  `CORS_ORIGIN` to a comma-separated allowlist to enable cross-origin access.
- Auth rate limit: 20 signup/login attempts per IP per 10 minutes.
- The QA suite expects a running PostgreSQL; it uses real seeded users
  (`alice.qa@test.dev`, `bob.qa@test.dev`) and is safe to re-run.
