-- Status enum and column for feedback workflow

do $$ begin
  create type public.feedback_status as enum ('new', 'in_progress', 'resolved');
exception when duplicate_object then null; end $$;

alter table public.feedback
  add column if not exists status public.feedback_status default 'new' not null;

-- Index for filtering by status
create index if not exists idx_feedback_status on public.feedback(status);


