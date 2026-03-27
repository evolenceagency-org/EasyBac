-- BacTracker auth + onboarding hardening
-- Run this in Supabase SQL Editor.
-- This keeps the profile/onboarding/payment flow aligned with the current app code.

begin;

-- 1) Profiles schema expected by the app
alter table public.profiles
  add column if not exists email text,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists plan text,
  add column if not exists subscription_status text not null default 'free',
  add column if not exists trial_start timestamptz,
  add column if not exists payment_verified boolean not null default false,
  add column if not exists personalization jsonb default '{}'::jsonb,
  add column if not exists last_insight_date date,
  add column if not exists daily_insight jsonb;

update public.profiles
set subscription_status = 'trial'
where subscription_status = 'free_trial';

alter table public.profiles
  drop constraint if exists profiles_subscription_status_check;

alter table public.profiles
  add constraint profiles_subscription_status_check
  check (subscription_status in ('free', 'trial', 'premium'));

alter table public.profiles
  drop constraint if exists profiles_plan_check;

alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('trial', 'premium') or plan is null);

update public.profiles
set
  plan = case
    when payment_verified = true or subscription_status = 'premium' then 'premium'
    when subscription_status = 'trial' then 'trial'
    else plan
  end,
  onboarding_completed = case
    when onboarding_completed = true then true
    when (personalization is not null and personalization <> '{}'::jsonb)
      and (payment_verified = true or subscription_status in ('trial', 'premium'))
      then true
    else onboarding_completed
  end;

create index if not exists profiles_subscription_status_idx
  on public.profiles(subscription_status);

create index if not exists profiles_trial_start_idx
  on public.profiles(trial_start);
-- 2) RLS
-- Intentionally omitted here to avoid duplicate policy creation.
-- Run supabase/rls.sql after this script to apply row-level security policies.

commit;
