-- Study groups, done as real tables instead of overloading kv_store.
--
-- Why: kv_store's upsert conflict target is (owner_id, key, shared). A
-- "shared" row is really just each writer's own private row that happens to
-- be readable by others — there's no single canonical row per key once more
-- than one person writes to the same key. For a group definition that every
-- member needs to update (join/leave), that meant every member who ever
-- called save("group:XYZ", ...) created a SEPARATE row under their own
-- owner_id, all matching the same key. Reads via .maybeSingle() then either
-- errored (multiple rows) or returned an arbitrary one. This schema gives
-- groups a single row per group and a proper join table for membership, with
-- membership changes as atomic inserts/deletes instead of read-modify-write
-- on a JSON blob.

create table if not exists groups (
  code text primary key,
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  group_code text not null references groups(code) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Denormalized copy of the member's public profile code (same 6-char code
  -- used for peer leaderboards). Storing it here avoids a second lookup
  -- table just to map user_id -> profile code for leaderboard rendering.
  profile_code text not null,
  joined_at timestamptz not null default now(),
  primary key (group_code, user_id)
);

alter table groups enable row level security;
alter table group_members enable row level security;

-- Anyone signed in can read a group's name/owner if they know its code (the
-- code itself is the invite mechanism — same trust model the app already
-- uses for peer codes). Only the creator can update/delete the group row.
create policy "groups_select_any_authenticated" on groups
  for select using (auth.role() = 'authenticated');

create policy "groups_insert_own" on groups
  for insert with check (auth.uid() = owner_id);

create policy "groups_update_owner_only" on groups
  for update using (auth.uid() = owner_id);

create policy "groups_delete_owner_only" on groups
  for delete using (auth.uid() = owner_id);

-- Membership: any authenticated user can see who's in a group (needed to
-- render the leaderboard). A user can only insert/delete THEIR OWN
-- membership row — this is what makes join/leave atomic and race-free: two
-- people joining at once each insert their own row, no read-modify-write on
-- a shared array.
create policy "members_select_any_authenticated" on group_members
  for select using (auth.role() = 'authenticated');

create policy "members_insert_self" on group_members
  for insert with check (auth.uid() = user_id);

create policy "members_delete_self" on group_members
  for delete using (auth.uid() = user_id);

create index if not exists idx_group_members_group on group_members(group_code);
create index if not exists idx_group_members_user on group_members(user_id);
