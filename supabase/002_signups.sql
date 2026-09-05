-- ============================================================================
-- The waiting list.
--
-- Runs on the same project as 001. Its only job is to answer one question:
-- does anyone actually want this? Without it every visitor is lost and the
-- six-week test has nothing to measure.
--
-- The browser never touches this table. The page posts to /api/signup and the
-- function writes with the service key, so there is no public write path to
-- spam and no anon policy to get wrong.
-- ============================================================================

create table if not exists proof_signups (
  id         uuid primary key default gen_random_uuid(),
  email      citext not null unique
             check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  -- Which page they were looking at when they asked. Not who they are.
  source     text check (source is null or length(source) <= 40),
  created_at timestamptz not null default now()
);

comment on table proof_signups is
  'People who asked to be told when the record can hold more than code. '
  'No name, no handle, no link to a profile — an address and the day it arrived.';

alter table proof_signups enable row level security;

-- No policies at all: with RLS on and nothing granted, neither anon nor a
-- signed-in user can read or write this table. Only the service key can,
-- and that key never leaves the server.
