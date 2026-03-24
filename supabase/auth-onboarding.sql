-- BacTracker auth + onboarding hardening
-- Run this in Supabase SQL Editor.
-- This keeps the profile/onboarding/payment flow aligned with the current app code.

begin;

-- 1) Profiles schema expected by the app
alter table public.profiles
  add column if not exists email text,
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

create index if not exists profiles_subscription_status_idx
  on public.profiles(subscription_status);

create index if not exists profiles_trial_start_idx
  on public.profiles(trial_start);

-- 2) Canonical subscription helper used by frontend + RLS
create or replace function public.is_subscription_active(user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = user_id
      and (
        p.payment_verified = true
        or p.subscription_status = 'premium'
        or (
          p.subscription_status = 'trial'
          and p.trial_start is not null
          and p.trial_start >= now() - interval '3 days'
        )
      )
  );
$$;

-- 3) RLS
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.study_sessions enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
on public.profiles
for select
using (id = auth.uid());

create policy "profiles_insert_own"
on public.profiles
for insert
with check (
  id = auth.uid()
  and coalesce(payment_verified, false) = false
  and coalesce(subscription_status, 'free') in ('free', 'trial', 'premium')
);

create policy "profiles_update_own"
on public.profiles
for update
using (id = auth.uid())
with check (
  id = auth.uid()
  and payment_verified = (select p.payment_verified from public.profiles p where p.id = auth.uid())
  and (
    (
      subscription_status = (select p.subscription_status from public.profiles p where p.id = auth.uid())
      and trial_start is not distinct from (select p.trial_start from public.profiles p where p.id = auth.uid())
    )
    or (
      (select p.subscription_status from public.profiles p where p.id = auth.uid()) = 'free'
      and (select p.trial_start from public.profiles p where p.id = auth.uid()) is null
      and subscription_status = 'trial'
      and trial_start is not null
    )
  )
);

do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tasks'
  loop
    execute format('drop policy if exists %I on public.tasks', pol.policyname);
  end loop;

  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'study_sessions'
  loop
    execute format('drop policy if exists %I on public.study_sessions', pol.policyname);
  end loop;
end $$;

create policy "tasks_subscription_access"
on public.tasks
for all
using (
  user_id = auth.uid()
  and public.is_subscription_active(auth.uid())
)
with check (
  user_id = auth.uid()
  and public.is_subscription_active(auth.uid())
);

create policy "study_sessions_subscription_access"
on public.study_sessions
for all
using (
  user_id = auth.uid()
  and public.is_subscription_active(auth.uid())
)
with check (
  user_id = auth.uid()
  and public.is_subscription_active(auth.uid())
);

commit;
