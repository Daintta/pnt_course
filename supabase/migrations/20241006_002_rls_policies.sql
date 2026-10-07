-- Enable RLS on all tables
alter table public.learners enable row level security;
alter table public.progress enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.certificates enable row level security;

-- Learners table: users can read, insert, and update only their own row
create policy "learners_select_self"
  on public.learners
  for select
  using (auth.uid() = id);

create policy "learners_insert_self"
  on public.learners
  for insert
  with check (auth.uid() = id);

create policy "learners_update_self"
  on public.learners
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Progress table: users can read and update only their own progress
create policy "progress_select_self"
  on public.progress
  for select
  using (auth.uid() = learner_id);

create policy "progress_insert_self"
  on public.progress
  for insert
  with check (auth.uid() = learner_id);

create policy "progress_update_self"
  on public.progress
  for update
  using (auth.uid() = learner_id)
  with check (auth.uid() = learner_id);

-- Assessment attempts: users can read and create only their own, but cannot edit
create policy "assessment_attempts_select_self"
  on public.assessment_attempts
  for select
  using (auth.uid() = learner_id);

create policy "assessment_attempts_insert_self"
  on public.assessment_attempts
  for insert
  with check (auth.uid() = learner_id);

-- Certificates: users can read only their own
create policy "certificates_select_self"
  on public.certificates
  for select
  using (auth.uid() = learner_id);

-- Service role (via secret key) can read all data for admin dashboard
-- Supabase applies this automatically; RLS is bypassed when using the service role key