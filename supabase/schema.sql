-- Ledger — Supabase schema
-- Run this once in your project's SQL editor (Supabase Dashboard → SQL Editor → New query).
--
-- One generic table, `kv_store`, mirrors the load(key, fallback, shared) /
-- save(key, value, shared) contract the app already speaks. This means the
-- 2000+ lines of feature code (syllabus, tasks, sessions, mocks, cards...)
-- didn't need to be rewritten table-by-table — only the storage hook did.
--
-- Private rows (shared = false): profile, syllabus, tasks, sessions, mocks,
--   errors, peers, dpp, cards, settings — one row per (owner, key).
-- Shared rows (shared = true): the peer leaderboard entries, keyed as
--   `lb:<their 6-char code>` — readable by anyone signed in, writable only
--   by the row's own owner.

create table if not exists public.kv_store (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  key         text not null,
  shared      boolean not null default false,
  value       jsonb,
  updated_at  timestamptz not null default now(),
  unique (owner_id, key, shared)
);

create index if not exists kv_store_key_shared_idx on public.kv_store (key, shared);

alter table public.kv_store enable row level security;

-- Read: your own rows, or any signed-in user's shared rows. (Anonymous
-- visitors get nothing — the peer leaderboard should only be visible to
-- signed-in users, matching the rest of the policy set.)
create policy "kv_store_select" on public.kv_store
  for select
  using (auth.role() = 'authenticated' and (shared = true or owner_id = auth.uid()));

-- Write: only your own rows (private or shared).
create policy "kv_store_insert" on public.kv_store
  for insert
  with check (owner_id = auth.uid());

create policy "kv_store_update" on public.kv_store
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "kv_store_delete" on public.kv_store
  for delete
  using (owner_id = auth.uid());
