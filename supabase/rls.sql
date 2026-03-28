-- BacTracker RLS policies (subscription enforcement)
-- Run in Supabase SQL editor as admin.

-- 1) Helper function: single source of truth
create or replace function public.is_subscription_active(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and (
        p.payment_verified = true
        or p.subscription_status = 'premium'
        or (
          p.trial_active = true
          and p.trial_ends_at is not null
          and p.trial_ends_at > now()
        )
        or (
          p.subscription_status in ('trial', 'free_trial')
          and p.trial_start is not null
          and p.trial_start >= now() - interval '3 days'
        )
      )
  );
$$;

-- 2) Enable RLS
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.study_sessions enable row level security;

-- 3) Profiles policies (single policy per action)
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', pol.policyname);
  end loop;
end $$;

create policy "profiles_select_own"
on public.profiles
for select
using (id = auth.uid());

create policy "profiles_insert_own"
on public.profiles
for insert
with check (id = auth.uid());

-- Prevent updates to trial_start, payment_verified, subscription_status
create policy "profiles_update_own"
on public.profiles
for update
using (id = auth.uid())
with check (
  id = auth.uid()
  and payment_verified = (select p.payment_verified from public.profiles p where p.id = auth.uid())
  and trial_active is not distinct from (select p.trial_active from public.profiles p where p.id = auth.uid())
  and trial_ends_at is not distinct from (select p.trial_ends_at from public.profiles p where p.id = auth.uid())
  and (
    plan is not distinct from (select p.plan from public.profiles p where p.id = auth.uid())
    or (
      (select coalesce(p.plan, 'free') from public.profiles p where p.id = auth.uid()) in ('free', '')
      and plan = 'trial'
    )
  )
  and (
    (
      trial_start is not distinct from (select p.trial_start from public.profiles p where p.id = auth.uid())
      and subscription_status is not distinct from (select p.subscription_status from public.profiles p where p.id = auth.uid())
    )
    or (
      (select p.trial_start is null from public.profiles p where p.id = auth.uid())
      and subscription_status = 'trial'
      and trial_start is not null
    )
  )
);

-- 4) Drop ALL existing policies on tasks/study_sessions
do $$
declare
  pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'tasks' loop
    execute format('drop policy if exists %I on public.tasks', pol.policyname);
  end loop;

  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'study_sessions' loop
    execute format('drop policy if exists %I on public.study_sessions', pol.policyname);
  end loop;
end $$;

-- 5) Tasks policy (single policy for all ops)
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

-- 6) Study sessions policy (single policy for all ops)
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
