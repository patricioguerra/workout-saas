-- ============================================
-- Workout SaaS — Initial Schema
-- ============================================

-- Profiles: auto-created on signup via trigger
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  stripe_customer_id text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Subscriptions: synced via Stripe webhooks
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_subscription_id text unique not null,
  status text not null default 'inactive',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can read own subscription"
  on subscriptions for select using (auth.uid() = user_id);

create index idx_subscriptions_user_id on subscriptions(user_id);
create index idx_subscriptions_stripe_id on subscriptions(stripe_subscription_id);

-- Workouts: one per week, shared by all subscribers
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  content jsonb not null,
  prompt_used text,
  model_version text,
  created_at timestamptz default now()
);

alter table public.workouts enable row level security;

create policy "Authenticated users can read workouts"
  on workouts for select using (auth.role() = 'authenticated');

create unique index idx_workouts_week_start on workouts(week_start);

-- Trigger: auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
