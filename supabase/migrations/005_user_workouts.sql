-- ============================================
-- Individual workout cycles + category field
-- ============================================

-- Per-user workout cycles (6-week cycles)
create table public.user_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cycle_number integer not null default 1,
  week_number integer not null check (week_number between 1 and 6),
  week_start date not null,
  content jsonb not null,
  model_version text,
  created_at timestamptz default now(),
  unique(user_id, cycle_number, week_number)
);

alter table public.user_workouts enable row level security;

create policy "Users read own workouts"
  on user_workouts for select using (auth.uid() = user_id);

create index idx_user_workouts_user on user_workouts(user_id, cycle_number, week_number);

-- Category field on profiles
alter table public.profiles add column category text check (category in ('athx', 'athx_pro'));
