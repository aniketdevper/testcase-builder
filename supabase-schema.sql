create table if not exists public.testcase_builder_state (
  id text primary key,
  data jsonb not null default '{"users":[],"files":[],"sessions":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.testcase_builder_state enable row level security;

comment on table public.testcase_builder_state is
  'Shared storage for the Testcase Builder backend. Access this table only from the server with the Supabase service role key.';
