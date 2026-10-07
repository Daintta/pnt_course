-- Rename 'name' column to 'full_name' for email/password auth
alter table public.learners rename column name to full_name;
