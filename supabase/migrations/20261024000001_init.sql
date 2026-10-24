-- Migration 0001: Life Dashboard v2 schema.
-- The database enforces the same rules as the domain (BR1-BR3), so an app bug cannot write bad data.
-- Row Level Security on every table: a user can only touch rows where user_id = their auth id (NFR4).

-- ---------------------------------------------------------------- helpers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- daily_entries
create table public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,                                   -- BR4: the morning you woke up
  bedtime time not null,
  wake_time time not null,
  study_hours numeric(4, 2) not null check (study_hours between 0 and 24),
  spending_thb numeric(10, 2) not null check (spending_thb >= 0),
  mood smallint not null check (mood between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_entries_one_per_day unique (user_id, date),          -- BR1
  constraint daily_entries_sleep_not_zero check (bedtime <> wake_time)  -- BR2 decision
);
-- Sleep duration is NOT stored: it is computed from bedtime and wake_time.

create trigger daily_entries_updated_at
  before update on public.daily_entries
  for each row execute function public.set_updated_at();

alter table public.daily_entries enable row level security;

create policy "owner access" on public.daily_entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- user_settings
create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  sleep_goal_hours numeric(3, 1) not null default 8 check (sleep_goal_hours > 0 and sleep_goal_hours <= 16),
  study_goal_hours numeric(3, 1) not null default 2 check (study_goal_hours between 0 and 24),
  -- Decision D3: lets the Edge Function work out "today" in the owner's zone.
  timezone text not null default 'Asia/Bangkok',
  updated_at timestamptz not null default now()
);

create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;

create policy "owner access" on public.user_settings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- devices
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),  -- SHA-256 hex only
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);

alter table public.devices enable row level security;

create policy "owner reads devices" on public.devices
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "owner registers devices" on public.devices
  for insert to authenticated
  with check (user_id = (select auth.uid()) and revoked_at is null and last_seen_at is null);

create policy "owner updates devices" on public.devices
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- The browser may rename or revoke a device, but never change its token hash or last_seen_at.
-- (last_seen_at is written by the Edge Function with the service role.)
revoke update on public.devices from authenticated, anon;
grant update (name, revoked_at) on public.devices to authenticated;

-- No anonymous access to anything.
revoke all on public.daily_entries, public.user_settings, public.devices from anon;
