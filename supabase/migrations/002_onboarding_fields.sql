-- ============================================
-- Add onboarding fields to profiles
-- ============================================

alter table public.profiles add column age integer;
alter table public.profiles add column weight numeric;
alter table public.profiles add column sex text check (sex in ('male', 'female', 'other'));
alter table public.profiles add column onboarding_completed boolean default false;
