-- ============================================
-- Add fitness benchmark fields to profiles
-- ============================================

alter table public.profiles add column rm_strict_press numeric;
alter table public.profiles add column rm_back_squat numeric;
alter table public.profiles add column rm_deadlift numeric;
alter table public.profiles add column run_5k_minutes numeric;
