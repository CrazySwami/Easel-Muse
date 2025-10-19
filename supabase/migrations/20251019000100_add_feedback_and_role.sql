-- Create feedback table and add role to profile

-- Enum for user roles
do $$ begin
  create type public.user_role as enum ('user', 'admin', 'superadmin');
exception when duplicate_object then null; end $$;

-- Add role column to profile if not exists
alter table public.profile
  add column if not exists role public.user_role default 'user';

-- Feedback table
create table if not exists public.feedback (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,
  project_id text,
  kind text not null check (kind in ('feature', 'bug')),
  email text,
  message text not null,
  image_url text,
  created_at timestamp without time zone not null default now()
);

-- RLS policies (optional basic read/write for owner; admin reads handled server-side)
alter table public.feedback enable row level security;

create policy "Users can insert their own feedback"
on public.feedback for insert to authenticated
with check (auth.uid()::text = user_id);

create policy "Users can read their own feedback"
on public.feedback for select to authenticated
using (auth.uid()::text = user_id);

-- Indexes
create index if not exists idx_feedback_user on public.feedback(user_id);
create index if not exists idx_feedback_project on public.feedback(project_id);



