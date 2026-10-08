-- Add admin role to learners (default to true for new users)
alter table public.learners add column is_admin boolean default true;

-- Create index for faster admin queries
create index learners_is_admin_idx on public.learners(is_admin);
