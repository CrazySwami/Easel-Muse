-- Add share tokens to project for read-only and invite links
alter table if exists public.project
  add column if not exists read_only_token text,
  add column if not exists invite_token text;


