-- ============================================
-- Switch to shared 6-week template + per-user cycle tracking
-- ATHX and ATHX PRO are separate workouts (one row per category x week)
-- ============================================

-- Drop per-user workouts (replaced by shared templates)
drop table if exists public.user_workouts;

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('athx', 'athx_pro')),
  week_number integer not null check (week_number between 1 and 6),
  content jsonb not null,
  model_version text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(category, week_number)
);

alter table public.workout_templates enable row level security;

create policy "Authenticated users read templates"
  on workout_templates for select using (auth.role() = 'authenticated');

-- User cycle start (Monday of signup week)
alter table public.profiles add column cycle_start_date date;
