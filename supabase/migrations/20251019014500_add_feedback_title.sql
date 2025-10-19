-- Add title field to feedback entries
alter table public.feedback
  add column if not exists title text;


