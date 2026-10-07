-- Update learners table to support email/password auth
-- Drop existing constraints and recreate
alter table public.learners drop constraint learners_pkey;
alter table public.learners add primary key (id);

-- Rename 'name' column to 'full_name' for clarity
alter table public.learners rename column name to full_name;
