-- Run this in the Supabase SQL editor.
-- Stores generated and managed portfolio records per signed-in user.

create table if not exists public.portfolios (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  purpose text,
  summary text,
  content text,
  format text,
  status text not null default 'done',
  liked boolean not null default false,
  experiences jsonb not null default '[]'::jsonb,
  experience_projects jsonb not null default '[]'::jsonb,
  keywords jsonb not null default '[]'::jsonb,
  blocks jsonb not null default '[]'::jsonb,
  slides jsonb not null default '[]'::jsonb,
  cover_lines jsonb not null default '[]'::jsonb,
  raw jsonb,
  template_values jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.portfolios enable row level security;

drop policy if exists "Users can read own portfolios" on public.portfolios;
create policy "Users can read own portfolios"
  on public.portfolios
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own portfolios" on public.portfolios;
create policy "Users can insert own portfolios"
  on public.portfolios
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own portfolios" on public.portfolios;
create policy "Users can update own portfolios"
  on public.portfolios
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own portfolios" on public.portfolios;
create policy "Users can delete own portfolios"
  on public.portfolios
  for delete
  using (auth.uid() = user_id);
