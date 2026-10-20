-- Certificates are written by the learner's own browser, so learners need an insert policy
create policy "certificates_insert_self"
  on public.certificates
  for insert
  with check (auth.uid() = learner_id);

-- Admin check used by the policies below. Security definer so the lookup does not
-- recurse through the learners table's own row-level security.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select l.is_admin from public.learners l where l.id = auth.uid()), false)
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Admins can read every learner's records for the admin dashboard
create policy "learners_select_admin"
  on public.learners
  for select
  using (public.is_admin());

create policy "progress_select_admin"
  on public.progress
  for select
  using (public.is_admin());

create policy "assessment_attempts_select_admin"
  on public.assessment_attempts
  for select
  using (public.is_admin());

create policy "certificates_select_admin"
  on public.certificates
  for select
  using (public.is_admin());
