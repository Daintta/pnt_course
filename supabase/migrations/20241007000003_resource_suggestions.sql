-- Resource suggestions table
CREATE TABLE IF NOT EXISTS resource_suggestions (
  id bigint primary key generated always as identity,
  title text not null,
  url text not null,
  description text not null,
  suggested_by text,
  created_at timestamp default now(),
  reviewed boolean default false,
  notes text
);

-- RLS: allow anyone to insert, only authenticated users to see all
ALTER TABLE resource_suggestions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'resource_suggestions' AND policyname = 'Allow anonymous inserts') THEN
    CREATE POLICY "Allow anonymous inserts" ON resource_suggestions
      FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'resource_suggestions' AND policyname = 'Allow authenticated reads') THEN
    CREATE POLICY "Allow authenticated reads" ON resource_suggestions
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END
$$;
