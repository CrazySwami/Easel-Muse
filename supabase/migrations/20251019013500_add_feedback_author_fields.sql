-- Add author display fields to feedback
alter table public.feedback
  add column if not exists author_name text,
  add column if not exists author_email text,
  add column if not exists author_avatar text;


