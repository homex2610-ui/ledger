-- Split the personal Circle network from named Groups.
-- study_circles/circle_members remain the Group model.

alter table public.study_circles
  add column if not exists is_discoverable boolean not null default false;

create index if not exists study_circles_discoverable_name_idx
  on public.study_circles (lower(name)) where is_discoverable = true;

create table if not exists public.circle_connections (
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, connection_id),
  check (user_id <> connection_id)
);

alter table public.circle_connections enable row level security;

create policy "connections_select_own" on public.circle_connections
  for select using (auth.uid() = user_id);
create policy "connections_insert_own" on public.circle_connections
  for insert with check (auth.uid() = user_id);
create policy "connections_delete_own" on public.circle_connections
  for delete using (auth.uid() = user_id);

create or replace function public.connect_by_profile_code(p_code text)
returns table (user_id uuid, display_name text)
language plpgsql security definer set search_path = public
as $$
declare target_id uuid; target_name text;
begin
  select kv.owner_id, coalesce(nullif(kv.value->>'name', ''), 'Ledger member')
    into target_id, target_name
  from public.kv_store kv
  where kv.key = 'profile' and kv.shared = false
    and upper(trim(kv.value->>'code')) = upper(trim(p_code))
  limit 1;
  if target_id is null or target_id = auth.uid() then return; end if;
  insert into public.circle_connections(user_id, connection_id) values (auth.uid(), target_id) on conflict do nothing;
  insert into public.circle_connections(user_id, connection_id) values (target_id, auth.uid()) on conflict do nothing;
  return query select target_id, target_name;
end;
$$;

create or replace function public.circle_connections_feed(p_day date)
returns table (user_id uuid, display_name text, minutes bigint, streak integer)
language sql security definer set search_path = public
as $$
  with people as (
    select cc.connection_id as user_id
    from public.circle_connections cc where cc.user_id = auth.uid()
  ), session_rows as (
    select p.user_id, kv.value as sessions
    from people p left join public.kv_store kv on kv.owner_id = p.user_id and kv.key = 'sessions' and kv.shared = false
  )
  select p.user_id,
    coalesce(nullif(profile.value->>'name', ''), 'Ledger member') as display_name,
    coalesce((select sum(greatest(0, round((item->>'minutes')::numeric)))::bigint from jsonb_array_elements(case when jsonb_typeof(sr.sessions) = 'array' then sr.sessions else '[]'::jsonb end) session_item(item) where (item->>'date')::date = p_day), 0)::bigint,
    coalesce((select min(day_offset)::int from generate_series(0, 365) offsets(day_offset) where not exists (select 1 from jsonb_array_elements(case when jsonb_typeof(sr.sessions) = 'array' then sr.sessions else '[]'::jsonb end) session_item(item) where (item->>'date')::date = p_day - offsets.day_offset)), 0)::int
  from people p
  left join session_rows sr on sr.user_id = p.user_id
  left join public.kv_store profile on profile.owner_id = p.user_id and profile.key = 'profile' and profile.shared = false
  order by 3 desc, 2 asc;
$$;

create or replace function public.search_public_groups(p_query text)
returns table (id uuid, name text, invite_code text, member_count bigint)
language sql security definer set search_path = public
as $$
  select g.id, g.name, g.invite_code, count(m.user_id)::bigint
  from public.study_circles g left join public.circle_members m on m.circle_id = g.id
  where g.is_discoverable = true and lower(g.name) like '%' || lower(trim(p_query)) || '%'
  group by g.id order by g.name limit 20;
$$;

create or replace function public.join_group_by_code(p_code text)
returns table (id uuid, name text, invite_code text, owner_id uuid)
language plpgsql security definer set search_path = public
as $$
declare target public.study_circles;
begin
  select * into target from public.study_circles where invite_code = upper(trim(p_code)) limit 1;
  if target.id is null then return; end if;
  insert into public.circle_members(circle_id, user_id, role) values (target.id, auth.uid(), 'member') on conflict do nothing;
  return query select target.id, target.name, target.invite_code, target.owner_id;
end;
$$;

revoke all on function public.connect_by_profile_code(text) from public;
revoke all on function public.circle_connections_feed(date) from public;
revoke all on function public.search_public_groups(text) from public;
revoke all on function public.join_group_by_code(text) from public;
grant execute on function public.connect_by_profile_code(text) to authenticated;
grant execute on function public.circle_connections_feed(date) to authenticated;
grant execute on function public.search_public_groups(text) to authenticated;
grant execute on function public.join_group_by_code(text) to authenticated;
