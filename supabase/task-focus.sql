-- BacTracker task <-> focus session integration
-- Run in Supabase SQL editor when you are ready to persist focus links in DB.

alter table public.tasks
  add column if not exists total_focus_time integer default 0,
  add column if not exists sessions_count integer default 0,
  add column if not exists last_session_at timestamptz;

alter table public.study_sessions
  add column if not exists task_id uuid references public.tasks(id) on delete set null,
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz;

create index if not exists study_sessions_task_id_idx on public.study_sessions(task_id);
