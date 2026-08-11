-- Circle read model: expose only the published member fields needed by the UI.
-- Private profile/session rows remain behind the SECURITY DEFINER boundary.
create or replace function public.circle_leaderboard(p_circle_id uuid, p_day date)
returns table (user_id uuid, display_name text, minutes bigint, streak integer)
language sql
security definer
set search_path = public
as $$
  with eligible as (
    select cm.user_id
    from public.circle_members cm
    where cm.circle_id = p_circle_id
      and exists (
        select 1 from public.circle_members viewer
        where viewer.circle_id = p_circle_id and viewer.user_id = auth.uid()
      )
  ),
  session_rows as (
    select e.user_id, kv.value as sessions
    from eligible e
    left join public.kv_store kv on kv.owner_id = e.user_id and kv.key = 'sessions' and kv.shared = false
  )
  select e.user_id,
    coalesce(nullif(profile.value->>'name', ''), 'Circle member') as display_name,
    coalesce((
      select sum(greatest(0, round((item->>'minutes')::numeric)))::bigint
      from jsonb_array_elements(case when jsonb_typeof(sr.sessions) = 'array' then sr.sessions else '[]'::jsonb end) session_item(item)
      where (item->>'date')::date = p_day
    ), 0)::bigint as minutes,
    coalesce((
      select min(day_offset)::int
      from generate_series(0, 365) offsets(day_offset)
      where not exists (
        select 1
        from jsonb_array_elements(case when jsonb_typeof(sr.sessions) = 'array' then sr.sessions else '[]'::jsonb end) session_item(item)
        where (item->>'date')::date = p_day - offsets.day_offset
      )
    ), 0)::int as streak
  from eligible e
  left join session_rows sr on sr.user_id = e.user_id
  left join public.kv_store profile on profile.owner_id = e.user_id and profile.key = 'profile' and profile.shared = false
  order by 3 desc, 2 asc;
$$;

revoke all on function public.circle_leaderboard(uuid, date) from public;
grant execute on function public.circle_leaderboard(uuid, date) to authenticated;
