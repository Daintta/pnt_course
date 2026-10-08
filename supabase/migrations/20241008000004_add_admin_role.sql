-- Add admin role to learners
alter table public.learners add column is_admin boolean default false;

-- Create index for faster admin queries
create index learners_is_admin_idx on public.learners(is_admin);
