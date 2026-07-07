-- Run this in the Supabase SQL editor after docs/supabase-profiles.sql.
-- It stores the editable My Page profile for each signed-in user.

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  gender text,
  birth_date date,
  email text,
  phone text,
  address text,
  educations jsonb not null default '[]'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  chips jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists "Users can read own mypage profile" on public.user_profiles;
create policy "Users can read own mypage profile"
  on public.user_profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own mypage profile" on public.user_profiles;
create policy "Users can insert own mypage profile"
  on public.user_profiles
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own mypage profile" on public.user_profiles;
create policy "Users can update own mypage profile"
  on public.user_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
