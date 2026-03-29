-- EasyBac auth + onboarding schema
-- Run this in Supabase SQL Editor before supabase/rls.sql.

begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  onboarding_completed boolean not null default false,
  personalized boolean not null default false,
  plan text,
  exam_date timestamptz,
  subscription_status text not null default 'free',
  trial_start timestamptz,
  trial_active boolean not null default false,
  trial_ends_at timestamptz,
  payment_verified boolean not null default false,
  personalization jsonb default '{}'::jsonb,
  last_insight_date date,
  daily_insight jsonb
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists personalized boolean not null default false,
  add column if not exists plan text,
  add column if not exists exam_date timestamptz,
  add column if not exists subscription_status text not null default 'free',
  add column if not exists trial_start timestamptz,
  add column if not exists trial_active boolean not null default false,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists payment_verified boolean not null default false,
  add column if not exists personalization jsonb default '{}'::jsonb,
  add column if not exists last_insight_date date,
  add column if not exists daily_insight jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'p'
  ) then
    alter table public.profiles
      add constraint profiles_pkey primary key (id);
  end if;
exception
  when duplicate_table or duplicate_object then null;
end $$;

update public.profiles
set subscription_status = 'trial'
where subscription_status = 'free_trial';

update public.profiles
set personalized = true
where personalized = false
  and personalization is not null
  and personalization <> '{}'::jsonb;

alter table public.profiles
  drop constraint if exists profiles_subscription_status_check;

alter table public.profiles
  add constraint profiles_subscription_status_check
  check (subscription_status in ('free', 'trial', 'premium', 'premium_trial'));

alter table public.profiles
  drop constraint if exists profiles_plan_check;

alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('free', 'trial', 'premium', 'premium_trial') or plan is null);

update public.profiles
set
  plan = case
    when payment_verified = true or subscription_status = 'premium' then 'premium'
    when trial_active = true and trial_ends_at is not null and trial_ends_at > now() then 'premium_trial'
    when subscription_status = 'trial' then 'trial'
    else plan
  end,
  subscription_status = case
    when payment_verified = true or subscription_status = 'premium' then 'premium'
    when trial_active = true and trial_ends_at is not null and trial_ends_at > now() then 'premium_trial'
    when subscription_status = 'free_trial' then 'trial'
    else subscription_status
  end,
  personalized = case
    when personalized = true then true
    when personalization is not null and personalization <> '{}'::jsonb then true
    else personalized
  end,
  onboarding_completed = case
    when onboarding_completed = true then true
    when personalized = true and (plan in ('trial', 'premium')) then true
    when (personalization is not null and personalization <> '{}'::jsonb)
      and (payment_verified = true or subscription_status in ('trial', 'premium')) then true
    else onboarding_completed
  end;

update public.profiles
set exam_date = nullif(personalization->>'examDate', '')::timestamptz
where exam_date is null
  and personalization ? 'examDate'
  and nullif(personalization->>'examDate', '') is not null;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    onboarding_completed,
    personalized,
    plan,
    exam_date,
    subscription_status,
    trial_start,
    trial_active,
    trial_ends_at,
    payment_verified,
    personalization
  )
  values (
    new.id,
    new.email,
    false,
    false,
    null,
    null,
    'free',
    null,
    false,
    null,
    false,
    null
  )
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user_profile();

create index if not exists profiles_subscription_status_idx
  on public.profiles(subscription_status);

create index if not exists profiles_trial_start_idx
  on public.profiles(trial_start);

create index if not exists profiles_trial_active_idx
  on public.profiles(trial_active);

create index if not exists profiles_trial_ends_at_idx
  on public.profiles(trial_ends_at);

create index if not exists profiles_exam_date_idx
  on public.profiles(exam_date);

create or replace function public.start_premium_trial_checkout()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := auth.uid();
  current_email text;
  next_profile public.profiles;
begin
  if current_uid is null then
    raise exception 'Authentication required';
  end if;

  select email into current_email
  from auth.users
  where id = current_uid;

  insert into public.profiles (
    id,
    email,
    onboarding_completed,
    personalized,
    plan,
    subscription_status,
    trial_start,
    trial_active,
    trial_ends_at,
    payment_verified
  )
  values (
    current_uid,
    current_email,
    true,
    false,
    'premium_trial',
    'premium_trial',
    null,
    true,
    now() + interval '48 hours',
    false
  )
  on conflict (id) do update
  set
    email = excluded.email,
    onboarding_completed = true,
    plan = case
      when profiles.payment_verified = true or profiles.subscription_status = 'premium'
        then 'premium'
      else 'premium_trial'
    end,
    subscription_status = case
      when profiles.payment_verified = true or profiles.subscription_status = 'premium'
        then 'premium'
      else 'premium_trial'
    end,
    trial_active = case
      when profiles.payment_verified = true or profiles.subscription_status = 'premium'
        then false
      else true
    end,
    trial_ends_at = case
      when profiles.payment_verified = true or profiles.subscription_status = 'premium'
        then null
      else now() + interval '48 hours'
    end
  returning * into next_profile;

  return next_profile;
end;
$$;

create or replace function public.admin_confirm_payment(target_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  next_profile public.profiles;
begin
  update public.profiles
  set
    plan = 'premium',
    subscription_status = 'premium',
    payment_verified = true,
    trial_active = false,
    trial_ends_at = null,
    onboarding_completed = true
  where id = target_user_id
  returning * into next_profile;

  return next_profile;
end;
$$;

create or replace function public.admin_reject_payment(target_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  next_profile public.profiles;
begin
  update public.profiles
  set
    plan = 'free',
    subscription_status = 'free',
    payment_verified = false,
    trial_active = false,
    trial_ends_at = null,
    onboarding_completed = true
  where id = target_user_id
  returning * into next_profile;

  return next_profile;
end;
$$;

revoke all on function public.start_premium_trial_checkout() from public, anon, authenticated;
grant execute on function public.start_premium_trial_checkout() to authenticated;

revoke all on function public.admin_confirm_payment(uuid) from public, anon, authenticated;
revoke all on function public.admin_reject_payment(uuid) from public, anon, authenticated;

commit;
