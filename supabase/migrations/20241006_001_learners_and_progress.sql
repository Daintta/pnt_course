-- Create learners table
create table public.learners (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  created_at timestamp with time zone default now(),
  last_login timestamp with time zone
);

-- Create progress table
create table public.progress (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners(id) on delete cascade,
  module_num integer not null,
  lessons_read text[] default '{}',
  assessment_attempted boolean default false,
  assessment_score integer,
  passed boolean default false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(learner_id, module_num)
);

-- Create assessment_attempts table (immutable once submitted)
create table public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners(id) on delete cascade,
  module_num integer not null,
  answers jsonb not null,
  score integer,
  submitted_at timestamp with time zone default now()
);

-- Create certificates table
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners(id) on delete cascade,
  type text not null check (type in ('module', 'pathway', 'programme')),
  module_num integer,
  pathway_name text,
  score integer,
  issued_at timestamp with time zone default now(),
  unique(learner_id, type, module_num)
);

-- Create indexes for performance
create index progress_learner_idx on public.progress(learner_id);
create index assessment_attempts_learner_idx on public.assessment_attempts(learner_id);
create index certificates_learner_idx on public.certificates(learner_id);