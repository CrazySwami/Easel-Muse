-- Add on_hold to feedback_status enum (safe if already added)
do $$ begin
  alter type public.feedback_status add value if not exists 'on_hold';
exception when duplicate_object then null; end $$;


