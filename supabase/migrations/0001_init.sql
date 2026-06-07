-- BrewRef — initial cloud schema (Postgres / Supabase)
-- Multi-user: every row is owned by an auth.users id. Row Level Security
-- guarantees a user can only ever read/write their own coffees, grinders and
-- brews. Cross-user "community" reads happen exclusively through the
-- SECURITY DEFINER aggregation function added in 0002_community.sql — never
-- via direct table access.

-- ---------------------------------------------------------------------------
-- profiles — app-facing row per auth user (auth identity lives in auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text,
  -- Opt-in (default on) to contribute anonymized brews to community advice.
  -- Honored immediately by get_community_bean_stats().
  share_brews boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Owner-only access.
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create a profile when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- coffees
-- ---------------------------------------------------------------------------
create table if not exists public.coffees (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  roastery    text not null default 'Unknown',
  origin      text,
  variety     text,
  process     text,
  roast_level text,
  roast_date  text,        -- ISO yyyy-mm-dd (kept as text to match client)
  notes       text,
  created_at  timestamptz not null default now(),
  -- Canonical bean identity for cross-user matching. Stored (generated) so the
  -- community function can group by it without touching other users' rows.
  bean_key    text generated always as (
                lower(trim(coalesce(roastery, ''))) || '|' || lower(trim(coalesce(name, '')))
              ) stored
);

create index if not exists coffees_user_id_idx on public.coffees (user_id);
create index if not exists coffees_bean_key_idx on public.coffees (bean_key);

alter table public.coffees enable row level security;

create policy "coffees_select_own" on public.coffees
  for select using (auth.uid() = user_id);
create policy "coffees_insert_own" on public.coffees
  for insert with check (auth.uid() = user_id);
create policy "coffees_update_own" on public.coffees
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "coffees_delete_own" on public.coffees
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- grinders
-- ---------------------------------------------------------------------------
create table if not exists public.grinders (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  brand       text,
  model       text,
  description text,
  created_at  timestamptz not null default now(),
  grinder_key text generated always as (
                lower(trim(coalesce(brand, '') || ' ' || coalesce(model, '')))
              ) stored
);

create index if not exists grinders_user_id_idx on public.grinders (user_id);

alter table public.grinders enable row level security;

create policy "grinders_select_own" on public.grinders
  for select using (auth.uid() = user_id);
create policy "grinders_insert_own" on public.grinders
  for insert with check (auth.uid() = user_id);
create policy "grinders_update_own" on public.grinders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "grinders_delete_own" on public.grinders
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- brew_logs
-- bean_key / grinder_key / rating are denormalized onto the brew so the
-- community aggregation never has to read another user's coffee/grinder rows.
-- ---------------------------------------------------------------------------
create table if not exists public.brew_logs (
  id                bigint generated always as identity primary key,
  user_id           uuid not null references auth.users (id) on delete cascade,
  coffee_id         bigint references public.coffees (id) on delete set null,
  grinder_id        bigint references public.grinders (id) on delete set null,
  date              text not null,            -- ISO 8601
  dose_in           real not null,
  dose_out          real not null,
  time_seconds      real not null,
  temperature       real,
  grind_setting     text,
  rating            real,                     -- 0..5, supports 0.5 steps
  rating_body       integer not null default 1,
  rating_acidity    integer not null default 5,
  rating_bitterness integer not null default 5,
  taste_notes       text,                     -- JSON array string
  created_at        timestamptz not null default now(),
  bean_key          text,                     -- denormalized from coffees at insert
  grinder_key       text                      -- denormalized from grinders at insert
);

create index if not exists brew_logs_user_id_idx on public.brew_logs (user_id);
create index if not exists brew_logs_bean_key_idx on public.brew_logs (bean_key);

alter table public.brew_logs enable row level security;

create policy "brew_logs_select_own" on public.brew_logs
  for select using (auth.uid() = user_id);
create policy "brew_logs_insert_own" on public.brew_logs
  for insert with check (auth.uid() = user_id);
create policy "brew_logs_update_own" on public.brew_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "brew_logs_delete_own" on public.brew_logs
  for delete using (auth.uid() = user_id);

-- Backfill bean_key / grinder_key on insert (and keep in sync on update) from the
-- referenced coffee/grinder, so the client never has to send them and they stay
-- trustworthy for community matching.
create or replace function public.brew_logs_set_keys()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.coffee_id is not null then
    select bean_key into new.bean_key from public.coffees where id = new.coffee_id;
  end if;
  if new.grinder_id is not null then
    select grinder_key into new.grinder_key from public.grinders where id = new.grinder_id;
  end if;
  return new;
end;
$$;

drop trigger if exists brew_logs_set_keys_trg on public.brew_logs;
create trigger brew_logs_set_keys_trg
  before insert or update of coffee_id, grinder_id on public.brew_logs
  for each row execute function public.brew_logs_set_keys();
