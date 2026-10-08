-- Add admin role to learners
alter table public.learners add column is_admin boolean default false;

-- Set admin for specific user
update public.learners set is_admin = true where email = 'jaime.strathern@daintta.com';

-- Create index for faster admin queries
create index learners_is_admin_idx on public.learners(is_admin);
