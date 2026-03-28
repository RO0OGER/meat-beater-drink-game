-- ============================================================
-- MEAT BEATER DRINKING GAME – Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL)
-- ============================================================

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  username   text        unique not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create profile with username derived from email on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- GAMES (named game session owned by a user)
-- ============================================================
create table public.games (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  name       text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.games enable row level security;

create policy "games_all_own" on public.games
  for all
  using     (auth.uid() = user_id)
  with check(auth.uid() = user_id);

-- ============================================================
-- ROUNDS (belongs to a game)
-- ============================================================
create table public.rounds (
  id                    uuid        primary key default gen_random_uuid(),
  game_id               uuid        not null references public.games(id) on delete cascade,
  round_code            text        unique not null,
  team1_name            text        not null default 'Team 1',
  team2_name            text        not null default 'Team 2',
  team1_hits            integer     not null default 0,
  team2_hits            integer     not null default 0,
  remaining_time_team1  integer     not null,
  remaining_time_team2  integer     not null,
  num_players_team1     integer     not null,
  num_players_team2     integer     not null,
  is_active             boolean     not null default false,
  created_at            timestamptz not null default now()
);

alter table public.rounds enable row level security;

create policy "rounds_all_own_games" on public.rounds
  for all
  using (
    game_id in (select id from public.games where user_id = auth.uid())
  )
  with check (
    game_id in (select id from public.games where user_id = auth.uid())
  );

-- ============================================================
-- DRINKS (global catalog + user-created drinks)
-- ============================================================
create table public.drinks (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  barcode    text        unique,
  volume_ml  integer     not null,
  type       text        not null check (type in ('mixable', 'non-mixable', 'dilution')),
  created_by uuid        references public.profiles(id) on delete set null,
  is_global  boolean     not null default false,
  created_at timestamptz not null default now()
);

alter table public.drinks enable row level security;

create policy "drinks_select_global_or_own" on public.drinks
  for select using (is_global = true or created_by = auth.uid());

create policy "drinks_insert_own" on public.drinks
  for insert with check (auth.uid() = created_by);

create policy "drinks_update_own" on public.drinks
  for update using (auth.uid() = created_by);

create policy "drinks_delete_own" on public.drinks
  for delete using (auth.uid() = created_by);

-- ============================================================
-- ROUND DRINKS (drinks assigned to a round)
-- Cascade-delete when round is deleted
-- ============================================================
create table public.round_drinks (
  id          uuid        primary key default gen_random_uuid(),
  round_id    uuid        not null references public.rounds(id) on delete cascade,
  drink_id    uuid        references public.drinks(id) on delete set null,
  drink_name  text        not null,
  quantity_ml integer     not null,
  used_ml     integer     not null default 0,
  type        text        not null check (type in ('mixable', 'non-mixable', 'dilution')),
  created_at  timestamptz not null default now()
);

alter table public.round_drinks enable row level security;

create policy "round_drinks_all_own_rounds" on public.round_drinks
  for all
  using (
    round_id in (
      select r.id from public.rounds r
      join public.games g on g.id = r.game_id
      where g.user_id = auth.uid()
    )
  )
  with check (
    round_id in (
      select r.id from public.rounds r
      join public.games g on g.id = r.game_id
      where g.user_id = auth.uid()
    )
  );

-- ============================================================
-- GENERATED DRINK ENTRIES (pre-generated drink portions per round)
-- Cascade-delete when round is deleted
-- ============================================================
create table public.generated_drink_entries (
  id          uuid        primary key default gen_random_uuid(),
  round_id    uuid        not null references public.rounds(id) on delete cascade,
  is_mix      boolean     not null,
  drink_parts jsonb       not null,
  total_ml    integer     not null,
  mix_ratio   numeric,
  created_at  timestamptz not null default now()
);

alter table public.generated_drink_entries enable row level security;

create policy "generated_drink_entries_all_own_rounds" on public.generated_drink_entries
  for all
  using (
    round_id in (
      select r.id from public.rounds r
      join public.games g on g.id = r.game_id
      where g.user_id = auth.uid()
    )
  )
  with check (
    round_id in (
      select r.id from public.rounds r
      join public.games g on g.id = r.game_id
      where g.user_id = auth.uid()
    )
  );

-- ============================================================
-- TASKS (global pool + user-created tasks)
-- ============================================================
create table public.tasks (
  id         uuid        primary key default gen_random_uuid(),
  label      text        not null,
  created_by uuid        references public.profiles(id) on delete set null,
  is_global  boolean     not null default true,
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "tasks_select_global_or_own" on public.tasks
  for select using (is_global = true or created_by = auth.uid());

create policy "tasks_insert_own" on public.tasks
  for insert with check (auth.uid() = created_by);

create policy "tasks_update_own" on public.tasks
  for update using (auth.uid() = created_by);

create policy "tasks_delete_own" on public.tasks
  for delete using (auth.uid() = created_by);

-- ============================================================
-- MIGRATIONS – alc_percent + result_alc_percent
-- Run these if the tables already exist (new Supabase project:
-- these columns are included above via the ALTER statements).
-- ============================================================

-- Alcohol percentage on drinks catalog (ABV 0–100)
alter table public.drinks
  add column if not exists alc_percent numeric(4,1);

-- Alcohol percentage denormalised onto round_drinks for fast access
alter table public.round_drinks
  add column if not exists alc_percent numeric(4,1);

-- Resulting ABV of a generated drink (after mixing)
alter table public.generated_drink_entries
  add column if not exists result_alc_percent numeric(4,1);
