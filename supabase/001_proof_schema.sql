-- ============================================================================
-- TRUST Proof — schema for the commercial product.
--
-- ⚠️  RUN THIS ON A SUPABASE PROJECT OF ITS OWN.
--     Every table here is prefixed `proof_`, so it will not collide with an
--     existing schema — but a project of its own keeps the data separate too.
--
-- The whole design rests on one property: an addition is stamped when it
-- arrives and that stamp can never move. We do not verify what anyone adds —
-- we do not need to. Twelve items added the night before an interview show as
-- twelve items from one day. Two years of additions cannot be made after the
-- fact, exactly like the commits.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------------------------------------------------------------- profiles --
create table if not exists proof_profiles (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  handle        citext unique not null
                check (handle ~ '^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,38}$'),
  github_handle text
                check (github_handle is null or
                       github_handle ~ '^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$'),
  display_name  text check (display_name is null or length(display_name) <= 80),
  created_at    timestamptz not null default now()
);

comment on table proof_profiles is
  'One public page per person. The handle is the URL: /@handle';

-- ---------------------------------------------------------------- evidence --
create table if not exists proof_evidence (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null default 'made'
             check (kind in ('made', 'did', 'learned')),
  note       text not null check (length(trim(note)) between 1 and 240),
  image_path text,
  link_url   text check (link_url is null or link_url ~* '^https://'),
  hidden     boolean not null default false,
  -- The stamp. Set once, on arrival. See the trigger below.
  added_at   timestamptz not null default now()
);

comment on column proof_evidence.added_at is
  'When it arrived. Immutable — the trigger below rejects any change. This '
  'single column is what makes an added record evidence rather than a gallery.';

create index if not exists proof_evidence_user_time
  on proof_evidence (user_id, added_at desc);

-- The stamp cannot move. Not by the owner, not by the app, not by a later
-- migration that forgets why. Backdating one row would empty the whole idea.
create or replace function proof_freeze_added_at()
returns trigger language plpgsql as $$
begin
  if new.added_at is distinct from old.added_at then
    raise exception 'added_at is immutable — evidence is dated when it arrives';
  end if;
  if new.user_id is distinct from old.user_id then
    raise exception 'evidence cannot change hands';
  end if;
  return new;
end $$;

drop trigger if exists proof_evidence_freeze on proof_evidence;
create trigger proof_evidence_freeze
  before update on proof_evidence
  for each row execute function proof_freeze_added_at();

-- --------------------------------------------------------------------- RLS --
alter table proof_profiles enable row level security;
alter table proof_evidence enable row level security;

-- The page is public. That is the product — it is made to be handed to someone.
drop policy if exists proof_profiles_public_read on proof_profiles;
create policy proof_profiles_public_read
  on proof_profiles for select to anon, authenticated using (true);

drop policy if exists proof_evidence_public_read on proof_evidence;
create policy proof_evidence_public_read
  on proof_evidence for select to anon, authenticated using (hidden = false);

-- Everything else is the owner's alone.
drop policy if exists proof_profiles_own_write on proof_profiles;
create policy proof_profiles_own_write
  on proof_profiles for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists proof_evidence_own_read on proof_evidence;
create policy proof_evidence_own_read
  on proof_evidence for select to authenticated using (user_id = auth.uid());

drop policy if exists proof_evidence_own_write on proof_evidence;
create policy proof_evidence_own_write
  on proof_evidence for insert to authenticated with check (user_id = auth.uid());

drop policy if exists proof_evidence_own_edit on proof_evidence;
create policy proof_evidence_own_edit
  on proof_evidence for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists proof_evidence_own_delete on proof_evidence;
create policy proof_evidence_own_delete
  on proof_evidence for delete to authenticated using (user_id = auth.uid());

-- ----------------------------------------------------------------- reading --
-- One public page, by handle. Everything the page renders, in one call.
create or replace function proof_page(p_handle citext)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'handle',        p.handle,
    'display_name',  p.display_name,
    'github_handle', p.github_handle,
    'since',         p.created_at,
    'added',         coalesce((
      select json_agg(json_build_object(
               'kind', e.kind, 'note', e.note,
               'image_path', e.image_path, 'link_url', e.link_url,
               'added_at', e.added_at)
             order by e.added_at desc)
      from proof_evidence e
      where e.user_id = p.user_id and e.hidden = false
    ), '[]'::json)
  )
  from proof_profiles p
  where p.handle = p_handle;
$$;

revoke all on function proof_page(citext) from public;
grant execute on function proof_page(citext) to anon, authenticated;

-- ---------------------------------------------------------------- deletion --
-- The promise has to name every table it touches. Iron rule #4.
-- Touches: proof_evidence · proof_profiles · storage objects under proof-evidence.
-- Storage is cleared client-side before this runs, since the rows hold the only
-- pointers to those files.
create or replace function proof_delete_everything()
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  delete from proof_evidence where user_id = uid;
  delete from proof_profiles where user_id = uid;
end $$;

revoke all on function proof_delete_everything() from public;
grant execute on function proof_delete_everything() to authenticated;

-- ----------------------------------------------------------------- storage --
insert into storage.buckets (id, name, public)
values ('proof-evidence', 'proof-evidence', true)
on conflict (id) do nothing;

drop policy if exists proof_ev_read on storage.objects;
create policy proof_ev_read on storage.objects for select
  to anon, authenticated using (bucket_id = 'proof-evidence');

-- Each person writes only inside a folder named for their own id.
drop policy if exists proof_ev_write on storage.objects;
create policy proof_ev_write on storage.objects for insert
  to authenticated with check (
    bucket_id = 'proof-evidence' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists proof_ev_delete on storage.objects;
create policy proof_ev_delete on storage.objects for delete
  to authenticated using (
    bucket_id = 'proof-evidence' and (storage.foldername(name))[1] = auth.uid()::text);
