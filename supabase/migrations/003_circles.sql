-- Study circles — the real Community model, replacing both the identity-code
-- peer system (profile.code + shared `lb:<code>` kv_store rows + `peers` key)
-- and the throwaway groups/group_members tables from 002.
--
-- Why real tables again: circles are multi-writer/multi-reader by nature
-- (every member updates the roster by joining/leaving), and kv_store's upsert
-- on (owner_id, key, shared) breaks the moment two people write the same key.
-- 002 hit that wall with groups and went to real tables; circles keep that
-- lesson.
--
-- Why no circle_invites table: the invite_code column on study_circles is
-- single-row state owned by the circle — one unique code, regeneratable by
-- the owner, and the code itself is the invite (same trust model the app
-- already used for peer codes). Membership joins are atomic self-inserts.
--
-- Why two SECURITY DEFINER functions:
--   - get_circle_preview: RLS makes non-members unable to SELECT circles at
--     all, so the join flow needs a narrow, read-only peek keyed by invite
--     code — name/description/focus/member count, nothing else.
--   - circle_activity: focus minutes live in each user's PRIVATE kv_store
--     'sessions' rows, which RLS hides from everyone but the owner. A
--     circle leaderboard can only be computed by a function that runs as
--     the table owner (bypasses RLS), is gated on the caller actually being
--     a member, and returns only (user_id, day, minutes) — never topics,
--     subjects, or anything else from the session payloads.

create table if not exists public.study_circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  exam_focus text,
  subject_focus text[] not null default '{}',
  owner_id uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.circle_members (
  circle_id uuid not null references public.study_circles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

alter table public.study_circles enable row level security;
alter table public.circle_members enable row level security;

-- Circles: visible only to members (the invite code is the discovery
-- mechanism, so a wide-open select leaks nothing useful and gains nothing).
-- Only the owner can update or delete the circle row.
create policy "circles_select_members_only" on public.study_circles
  for select using (
    auth.uid() in (select user_id from public.circle_members where circle_id = id)
  );

create policy "circles_insert_owner" on public.study_circles
  for insert with check (auth.uid() = owner_id);

create policy "circles_update_owner_only" on public.study_circles
  for update using (auth.uid() = owner_id);

create policy "circles_delete_owner_only" on public.study_circles
  for delete using (auth.uid() = owner_id);

-- Membership: visible to members of the same circle (roster rendering). A
-- user can only insert/delete THEIR OWN row — that is what makes join/leave
-- atomic and race-free, exactly like 002's design. The circle owner may also
-- remove any member. The PK (circle_id, user_id) blocks duplicate joins.
create policy "members_select_circle_members" on public.circle_members
  for select using (
    exists (
      select 1
      from public.circle_members member_of_same_circle
      where member_of_same_circle.circle_id = circle_members.circle_id
        and member_of_same_circle.user_id = auth.uid()
    )
  );

create policy "members_insert_self" on public.circle_members
  for insert with check (auth.uid() = user_id);

create policy "members_delete_self_or_owner" on public.circle_members
  for delete using (
    auth.uid() = user_id
    or auth.uid() in (select owner_id from public.study_circles where id = circle_id)
  );

create index if not exists idx_circle_members_circle on public.circle_members(circle_id);
create index if not exists idx_circle_members_user on public.circle_members(user_id);

-- Preview for the join flow — readable by anyone who knows the code, returns
-- the bare minimum a stranger needs to decide whether to join.
create or replace function public.get_circle_preview(p_invite_code text)
returns table (
  id uuid,
  name text,
  description text,
  exam_focus text,
  subject_focus text[],
  member_count bigint
)
language sql
security definer
set search_path = public
as $$
  select c.id, c.name, c.description, c.exam_focus, c.subject_focus,
         count(cm.user_id)::bigint as member_count
  from public.study_circles c
  left join public.circle_members cm on cm.circle_id = c.id
  where c.invite_code = upper(trim(p_invite_code))
  group by c.id
  limit 1;
$$;

-- Per-member daily focus minutes since a cutoff, for circle leaderboards and
-- activity heatmaps. Runs as the table owner so it can read every member's
-- private 'sessions' kv rows, but refuses to compute anything for callers
-- who are not members of the circle, and exposes only (user_id, day, minutes).
create or replace function public.circle_activity(p_circle_id uuid, p_since date)
returns table (user_id uuid, day date, minutes bigint)
language sql
security definer
set search_path = public
as $$
  select cm.user_id,
         (s.item->>'date')::date as day,
         sum(greatest(0, round((s.item->>'minutes')::numeric))::bigint) as minutes
  from public.circle_members cm
  join lateral (
    select kv.value as val
    from public.kv_store kv
    where kv.owner_id = cm.user_id
      and kv.key = 'sessions'
      and kv.shared = false
    order by kv.updated_at desc
    limit 1
  ) kv on true
  join lateral jsonb_array_elements(
    case when jsonb_typeof(kv.val) = 'array' then kv.val else '[]'::jsonb end
  ) s(item) on true
  where cm.circle_id = p_circle_id
    and exists (
      select 1 from public.circle_members me
      where me.circle_id = p_circle_id and me.user_id = auth.uid()
    )
    and (s.item->>'date')::date >= p_since
  group by cm.user_id, (s.item->>'date')::date
  order by day;
$$;

-- Security-definer functions are executable by public by default; lock both
-- down to signed-in users only (the membership gate inside circle_activity
-- is the real protection, this just removes anonymous attack surface).
revoke all on function public.get_circle_preview(text) from public;
revoke all on function public.circle_activity(uuid, date) from public;
grant execute on function public.get_circle_preview(text) to authenticated;
grant execute on function public.circle_activity(uuid, date) to authenticated;

-- Retire the old model: drop the 002 group tables and scrub every kv_store
-- row the peer system wrote (shared leaderboard rows plus the peers list).
drop table if exists public.group_members;
drop table if exists public.groups;

delete from public.kv_store where key = 'peers' or key like 'lb:%';
