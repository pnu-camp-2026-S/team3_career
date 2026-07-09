-- Run this in the Supabase SQL editor.
-- 활동 추천 페이지에서 사용자가 캘린더에 저장한 활동 일정을 로그인 사용자별로 보관한다.

create table if not exists public.activity_schedules (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id integer not null,
  title text not null default '',
  note text not null default '',
  schedule_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, activity_id)
);

create index if not exists activity_schedules_user_date_idx
  on public.activity_schedules (user_id, schedule_date);

alter table public.activity_schedules enable row level security;

drop policy if exists "Users can read own activity schedules" on public.activity_schedules;
create policy "Users can read own activity schedules"
  on public.activity_schedules
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own activity schedules" on public.activity_schedules;
create policy "Users can insert own activity schedules"
  on public.activity_schedules
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own activity schedules" on public.activity_schedules;
create policy "Users can update own activity schedules"
  on public.activity_schedules
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own activity schedules" on public.activity_schedules;
create policy "Users can delete own activity schedules"
  on public.activity_schedules
  for delete
  using (auth.uid() = user_id);
