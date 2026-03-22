-- BacTracker personalization and daily AI insight fields
-- Run in Supabase SQL editor

alter table public.profiles
  add column if not exists personalization jsonb default '{}'::jsonb,
  add column if not exists last_insight_date date,
  add column if not exists daily_insight jsonb;
