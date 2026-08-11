-- Chunk 3 — circle dashboard: leaderboard, activity feed, invite management.
--
-- What 003 left us: circles + membership with atomic join/leave, an invite
-- code column on study_circles, get_circle_preview for the join flow, and
-- circle_activity (SECURITY DEFINER, member-gated) exposing each member's
-- private focus minutes as (user_id, day, minutes) — nothing else.
--
-- This migration adds:
--   - circle_members.display_name — a denormalized snapshot taken at join
--     time, because display names live in each user's PRIVATE kv profile
--     row that RLS hides from other members. A leaderboard that can only
--     say "somebody: 214m" is useless, so the roster carries a copy.
--   - circle_events — a real multi-writer feed table (kv_store's
--     (owner_id, key, shared) upsert breaks for shared writers). Members
--     insert their own events (create/join/leave/session), members of the
--     circle select them. The client writes these at the moment the action
--     happens, so no polling and no server work.
--   - circle_leaderboard() — SECURITY DEFINER like circle_activity: reads
--     every member's private minutes through the owner role, gated on the
--     caller being a member, and joins display names. Returns only
--     (user_id, display_name, minutes, days_active).
--
-- Invite management (rotate the code) needs no new function: RLS already
-- limits study_circles updates to the owner, and the client retries on the
-- 23505 unique-violation when a rolled code collides — the same loop the
-- create flow already uses.

alter table public.circle_members
  add column if not exists display_name text;

-- Backfill names from the members' private profile rows (owner role can
-- read kv_store). Falls back to a neutral label for members without one.
update public.circle_members cm
set display_name = coalesce(
  cm.display_name,
  (select (kv.value->>'name')::text
     from public.kv_store kv
    where kv.owner_id = cm.user_id
      and kv.key = 'profile'
      and kv.shared = false
    order by kv.updated_at desc
    limit 1),
  'Study buddy'
)
where cm.display_name is null;

create table if not exists public.circle_events (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.study_circles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('create', 'join', 'leave', 'session')),
  minutes bigint not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.circle_events enable row level security;

-- Feed visible to members of the circle only — the roster is the gate,
-- exactly like the circles select policy. (Membership checks MUST qualify
-- the outer column: `circle_id = circle_id` inside the subquery resolves
-- both sides to circle_members.circle_id and becomes a tautology.)
create policy "events_select_members" on public.circle_events
  for select using (
    exists (
      select 1 from public.circle_members m
      where m.circle_id = public.circle_events.circle_id
        and m.user_id = auth.uid()
    )
  );

-- A member may only record their OWN events, and only in a circle they
-- belong to. The membership check makes stale active circle ids (left the
-- circle, then logged a session) fail closed.
create policy "events_insert_members_self" on public.circle_events
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.circle_members m
      where m.circle_id = public.circle_events.circle_id
        and m.user_id = auth.uid()
    )
  );

-- The feed is append-only; no update/delete policies.

create index if not exists idx_circle_events_circle on public.circle_events(circle_id, created_at desc);

-- Per-member totals + active days for the leaderboard. Mirrors the
-- circle_activity trust model: SECURITY DEFINER reads private minutes,
-- but only ever answers for circles the caller is a member of, and never
-- exposes anything beyond minutes/days/display name.
create or replace function public.circle_leaderboard(p_circle_id uuid, p_since date)
returns table (
  user_id uuid,
  display_name text,
  minutes bigint,
  days_active bigint
)
language sql
security definer
set search_path = public
as $$
  select act.user_id,
         cm.display_name,
         sum(act.minutes)::bigint as minutes,
         count(distinct act.day)::bigint as days_active
  from public.circle_activity(p_circle_id, p_since) act
  left join public.circle_members cm
    on cm.circle_id = p_circle_id and cm.user_id = act.user_id
  where exists (
    select 1 from public.circle_members me
    where me.circle_id = p_circle_id and me.user_id = auth.uid()
  )
  group by act.user_id, cm.display_name
  order by minutes desc;
$$;

revoke all on function public.circle_leaderboard(uuid, date) from public;
grant execute on function public.circle_leaderboard(uuid, date) to authenticated;

-- Fix: 003's members_select_circle_members wrote `where circle_id = circle_id`
-- in the subquery — PostgreSQL resolves both unqualified names to the inner
-- circle_members column, so the condition is always true and the roster was
-- readable by any authenticated user. Drop and recreate with a qualified,
-- correlated check.
drop policy if exists "members_select_circle_members" on public.circle_members;
create policy "members_select_circle_members" on public.circle_members
  for select using (
    exists (
      select 1 from public.circle_members m
      where m.circle_id = public.circle_members.circle_id
        and m.user_id = auth.uid()
    )
  );
