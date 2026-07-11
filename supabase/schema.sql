-- cs4fun schema (SQL editor / reference copy)
-- Production applies versioned files in supabase/migrations/ via GitHub Actions.
-- When changing the backend: add a NEW migration under supabase/migrations/ (do not edit old ones).
-- Keep this file in sync only if you still paste into the Supabase SQL editor manually.
-- cs4fun secure schema — run in Supabase SQL editor
-- Frontend only uses the anon key. All writes go through SECURITY DEFINER RPCs.

create extension if not exists pgcrypto;

-- ─── Profiles ───────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default 'Player',
  email text,
  avatar_id text not null default 'cs4fun',
  avatar_url text,
  showcase_badge text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safe adds if table already existed without these columns
alter table public.profiles add column if not exists avatar_id text not null default 'cs4fun';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists showcase_badge text;
alter table public.profiles add column if not exists steam_url text;
alter table public.profiles add column if not exists profile_public boolean not null default true;
alter table public.profiles
  add column if not exists public_sections jsonb not null default '{
    "stats": true,
    "modes": true,
    "career": true,
    "box": true,
    "steam": true,
    "showcase": true
  }'::jsonb;
alter table public.profiles add column if not exists banned_at timestamptz;
alter table public.profiles add column if not exists ban_reason text;
alter table public.profiles add column if not exists sessions_revoked_at timestamptz;
alter table public.profiles add column if not exists setup_preset_enabled boolean not null default false;
alter table public.profiles add column if not exists setup_preset_mode text;
alter table public.profiles add column if not exists setup_preset_mentality text;
alter table public.profiles add column if not exists setup_preset_map text;

-- Bound avatar data URLs (client also compresses; this blocks direct API abuse)
do $$
begin
  alter table public.profiles drop constraint if exists profiles_avatar_url_len;
  alter table public.profiles
    add constraint profiles_avatar_url_len
    check (
      avatar_url is null
      or (
        length(avatar_url) <= 80000
        and avatar_url ~ '^data:image/(jpeg|jpg|png|webp);base64,'
      )
    );
exception when others then null;
end $$;

-- Only steamcommunity.com profile links
do $$
begin
  alter table public.profiles drop constraint if exists profiles_steam_url_ok;
  alter table public.profiles
    add constraint profiles_steam_url_ok
    check (
      steam_url is null
      or (
        length(steam_url) <= 200
        and steam_url ~* '^https?://(www\.)?steamcommunity\.com/'
      )
    );
exception when others then null;
end $$;

do $$
begin
  alter table public.profiles drop constraint if exists profiles_setup_preset_mode_ok;
  alter table public.profiles
    add constraint profiles_setup_preset_mode_ok
    check (setup_preset_mode is null or setup_preset_mode in ('classic', 'almanac'));
exception when others then null;
end $$;

do $$
begin
  alter table public.profiles drop constraint if exists profiles_setup_preset_mentality_ok;
  alter table public.profiles
    add constraint profiles_setup_preset_mentality_ok
    check (
      setup_preset_mentality is null
      or setup_preset_mentality in ('aggressive', 'tactical', 'loose')
    );
exception when others then null;
end $$;

do $$
begin
  alter table public.profiles drop constraint if exists profiles_setup_preset_map_ok;
  alter table public.profiles
    add constraint profiles_setup_preset_map_ok
    check (
      setup_preset_map is null
      or setup_preset_map in (
        'Mirage', 'Inferno', 'Nuke', 'Ancient', 'Anubis', 'Dust2', 'Overpass', 'Cache'
      )
    );
exception when others then null;
end $$;

-- ─── Leaderboard (read-only from clients) ─────────────────
create table if not exists public.leaderboard (
  id bigint generated always as identity primary key,
  board text not null check (board in ('daily', 'duel', 'gauntlet', 'major', 'party', 'box', 'career')),
  player_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null default 'Player',
  score integer not null default 0 check (score >= 0 and score <= 1000000),
  day_key text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists leaderboard_daily_unique
  on public.leaderboard (board, player_id, day_key)
  where board = 'daily';

create unique index if not exists leaderboard_board_player_unique
  on public.leaderboard (board, player_id)
  where board <> 'daily';

create index if not exists leaderboard_board_score_idx
  on public.leaderboard (board, score desc);

-- ─── Game history (own-read; insert via RPC only) ─────────
create table if not exists public.game_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text,
  mode text not null check (mode in ('major', 'duel', 'party', 'daily', 'gauntlet', 'box', 'career')),
  won boolean not null default false,
  score integer not null default 0 check (score >= 0 and score <= 1000000),
  wins integer not null default 0 check (wins >= 0 and wins <= 50),
  losses integer not null default 0 check (losses >= 0 and losses <= 50),
  streak integer not null default 0 check (streak >= 0 and streak <= 100),
  lineup jsonb,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists game_history_user_idx
  on public.game_history (user_id, created_at desc);

-- ─── Rooms (payload updates via RPC) ──────────────────────
create table if not exists public.rooms (
  code text primary key check (code ~ '^[A-Z0-9]{6}$'),
  mode text not null check (mode in ('party', 'duel', 'box')),
  host_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'lobby' check (status in ('lobby', 'drafting', 'reveal', 'finished')),
  seed text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Badges ───────────────────────────────────────────────
create table if not exists public.badge_defs (
  id text primary key,
  category text not null,
  threshold integer not null default 1,
  icon text not null default 'award',
  sort_order integer not null default 0
);

create table if not exists public.user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null references public.badge_defs(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create index if not exists user_badges_user_idx on public.user_badges (user_id);

insert into public.badge_defs (id, category, threshold, icon, sort_order) values
  ('first_win', 'wins', 1, 'crosshair', 10),
  ('wins_5', 'wins', 5, 'target', 20),
  ('wins_10', 'wins', 10, 'trophy', 30),
  ('wins_25', 'wins', 25, 'medal', 40),
  ('wins_50', 'wins', 50, 'crown', 50),
  ('games_5', 'games', 5, 'gamepad', 60),
  ('games_25', 'games', 25, 'dices', 70),
  ('games_100', 'games', 100, 'rocket', 80),
  ('major_champ', 'major_wins', 1, 'award', 90),
  ('major_3', 'major_wins', 3, 'gem', 100),
  ('duel_5', 'duel_wins', 5, 'swords', 110),
  ('duel_15', 'duel_wins', 15, 'skull', 120),
  ('gauntlet_3', 'max_streak', 3, 'zap', 130),
  ('gauntlet_7', 'max_streak', 7, 'flame', 140),
  ('gauntlet_15', 'max_streak', 15, 'mountain', 150),
  ('daily_3', 'daily_wins', 3, 'sun', 160),
  ('party_king', 'party_wins', 5, 'party', 170),
  ('box_first', 'box_wins', 1, 'package', 171),
  ('box_3', 'box_wins', 3, 'package', 175),
  ('box_10', 'box_wins', 10, 'gem', 176),
  ('box_whale', 'box_wins', 25, 'crown', 177),
  ('box_gold', 'box_gold_hits', 1, 'sparkles', 178),
  ('box_gold_3', 'box_gold_hits', 3, 'gem', 179),
  ('box_covert', 'box_covert_hits', 1, 'flame', 181),
  ('box_covert_10', 'box_covert_hits', 10, 'skull', 182),
  ('box_jackpot', 'box_best_value', 500, 'star', 183),
  ('box_opener', 'box_opens', 50, 'dices', 184),
  ('perfect_major', 'perfect_majors', 1, 'star', 190),
  ('almanac_win', 'almanac_wins', 1, 'book', 200),
  ('social', 'party_games', 1, 'handshake', 210),
  ('career_first_major', 'career_majors_won', 1, 'trophy', 220),
  ('career_major_3', 'career_majors_won', 3, 'crown', 221),
  ('career_season_1', 'career_seasons', 1, 'star', 222),
  ('career_season_5', 'career_seasons', 5, 'flame', 223),
  ('career_dynasty', 'career_best_season', 800, 'gem', 224),
  ('completionist', 'meta_all', 20, 'sparkles', 999)
on conflict (id) do update set
  category = excluded.category,
  threshold = excluded.threshold,
  icon = excluded.icon,
  sort_order = excluded.sort_order;

-- ─── Stats cache for badge checks ─────────────────────────
create table if not exists public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  games integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  major_wins integer not null default 0,
  duel_wins integer not null default 0,
  daily_wins integer not null default 0,
  party_wins integer not null default 0,
  party_games integer not null default 0,
  perfect_majors integer not null default 0,
  almanac_wins integer not null default 0,
  max_streak integer not null default 0,
  box_wins integer not null default 0,
  box_gold_hits integer not null default 0,
  box_covert_hits integer not null default 0,
  box_opens integer not null default 0,
  box_best_value numeric not null default 0,
  best_drop jsonb,
  career_majors_won integer not null default 0,
  career_best_season integer not null default 0,
  career_seasons integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_stats
  add column if not exists box_gold_hits integer not null default 0;
alter table public.user_stats
  add column if not exists box_covert_hits integer not null default 0;
alter table public.user_stats
  add column if not exists box_opens integer not null default 0;
alter table public.user_stats
  add column if not exists box_best_value numeric not null default 0;
alter table public.user_stats
  add column if not exists best_drop jsonb;
alter table public.user_stats
  add column if not exists career_majors_won integer not null default 0;
alter table public.user_stats
  add column if not exists career_best_season integer not null default 0;
alter table public.user_stats
  add column if not exists career_seasons integer not null default 0;

-- Career persistent save (signed-in only)
create table if not exists public.career_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  season_score integer not null default 0,
  majors_won integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.career_saves enable row level security;

-- ─── Harden RLS ───────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.leaderboard enable row level security;
alter table public.game_history enable row level security;
alter table public.rooms enable row level security;
alter table public.badge_defs enable row level security;
alter table public.user_badges enable row level security;
alter table public.user_stats enable row level security;

-- Drop old permissive policies if present
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles','leaderboard','game_history','rooms','badge_defs','user_badges','user_stats')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Profiles
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert
  with check (auth.uid() = id);

-- Leaderboard: public read, NO direct client writes
create policy "leaderboard_select" on public.leaderboard for select using (true);

-- History: own read only, NO direct client writes
create policy "history_select_own" on public.game_history for select
  using (auth.uid() = user_id);

-- Rooms: public read (needed for join), writes via RPC
create policy "rooms_select" on public.rooms for select using (true);

-- Badges
create policy "badge_defs_select" on public.badge_defs for select using (true);
create policy "user_badges_select" on public.user_badges for select using (true);
create policy "user_stats_select" on public.user_stats for select using (true);

-- ─── Helpers ──────────────────────────────────────────────
create or replace function public.clamp_int(v integer, lo integer, hi integer)
returns integer language sql immutable as $$
  select greatest(lo, least(hi, coalesce(v, 0)));
$$;

-- ─── Admin privilege (SQL-only promote; clients cannot write) ───
-- Promote after Auth user exists:
--   insert into public.app_admins (user_id, note)
--   select id, 'bootstrap admin' from auth.users
--   where lower(email) = lower('YOUR_ADMIN_EMAIL@example.com')
--   on conflict (user_id) do nothing;

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  note text
);

alter table public.app_admins enable row level security;
-- No policies for anon/authenticated → deny all client access

do $$
begin
  alter table public.profiles drop constraint if exists profiles_ban_reason_len;
  alter table public.profiles
    add constraint profiles_ban_reason_len
    check (ban_reason is null or length(ban_reason) <= 500);
exception when others then null;
end $$;

create or replace function public.is_admin(p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_admins a where a.user_id = p_uid
  );
$$;

create or replace function public.assert_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.assert_not_banned(p_uid uuid default auth.uid())
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_uid is null then return; end if;
  if exists (
    select 1 from public.profiles p
    where p.id = p_uid and p.banned_at is not null
  ) then
    raise exception 'banned' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.protect_profile_ban_cols()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and (
       new.banned_at is distinct from old.banned_at
       or new.ban_reason is distinct from old.ban_reason
     )
     and coalesce(current_setting('cs4fun.allow_ban_update', true), '') <> '1'
  then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_ban on public.profiles;
create trigger profiles_protect_ban
  before update on public.profiles
  for each row execute function public.protect_profile_ban_cols();

revoke all on function public.is_admin(uuid) from public;
revoke all on function public.assert_admin() from public;
revoke all on function public.assert_not_banned(uuid) from public;
-- Helpers are only called from other security definer RPCs (owner)
create or replace function public.award_badges(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.user_stats%rowtype;
  b public.badge_defs%rowtype;
  metric integer;
begin
  select * into s from public.user_stats where user_id = p_user;
  if not found then return; end if;

  for b in select * from public.badge_defs where category <> 'meta_all' loop
    metric := case b.category
      when 'wins' then s.wins
      when 'games' then s.games
      when 'major_wins' then s.major_wins
      when 'duel_wins' then s.duel_wins
      when 'daily_wins' then s.daily_wins
      when 'party_wins' then s.party_wins
      when 'party_games' then s.party_games
      when 'perfect_majors' then s.perfect_majors
      when 'almanac_wins' then s.almanac_wins
      when 'max_streak' then s.max_streak
      when 'box_wins' then coalesce(s.box_wins, 0)
      when 'box_gold_hits' then coalesce(s.box_gold_hits, 0)
      when 'box_covert_hits' then coalesce(s.box_covert_hits, 0)
      when 'box_opens' then coalesce(s.box_opens, 0)
      when 'box_best_value' then floor(coalesce(s.box_best_value, 0))::integer
      when 'career_majors_won' then coalesce(s.career_majors_won, 0)
      when 'career_best_season' then coalesce(s.career_best_season, 0)
      when 'career_seasons' then coalesce(s.career_seasons, 0)
      else 0
    end;
    if metric >= b.threshold then
      insert into public.user_badges (user_id, badge_id)
      values (p_user, b.id)
      on conflict do nothing;
    end if;
  end loop;

  -- Ultra: every non-meta badge unlocked → completionist (highlights profile)
  if (
    select count(*) from public.user_badges ub
    where ub.user_id = p_user
      and ub.badge_id <> 'completionist'
  ) >= (
    select count(*) from public.badge_defs bd
    where bd.category <> 'meta_all'
  ) then
    insert into public.user_badges (user_id, badge_id)
    values (p_user, 'completionist')
    on conflict do nothing;
  end if;
end;
$$;

-- ─── Main secure write RPC ────────────────────────────────
create or replace function public.submit_game_result(
  p_mode text,
  p_won boolean,
  p_score integer,
  p_wins integer default 0,
  p_losses integer default 0,
  p_streak integer default 0,
  p_lineup jsonb default null,
  p_meta jsonb default '{}'::jsonb,
  p_board text default null,
  p_nickname text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  nick text;
  score_c integer;
  v_board text;
  v_day text;
  new_badges text[] := '{}';
  updated int;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform public.assert_not_banned(uid);

  if p_mode not in ('major', 'duel', 'party', 'daily', 'gauntlet', 'box', 'career') then
    raise exception 'invalid_mode';
  end if;

  score_c := public.clamp_int(p_score, 0, 1000000);
  p_wins := public.clamp_int(p_wins, 0, 50);
  p_losses := public.clamp_int(p_losses, 0, 50);
  p_streak := public.clamp_int(p_streak, 0, 100);

  -- Soft anti-cheat: reject absurd per-match win/loss totals
  if p_wins + p_losses > 16 then
    raise exception 'invalid_match_totals';
  end if;

  -- Soft rate limit: max 40 submissions / hour
  if (
    select count(*) from public.game_history
    where user_id = uid and created_at > now() - interval '1 hour'
  ) >= 40 then
    raise exception 'rate_limited';
  end if;

  select coalesce(nullif(trim(p_nickname), ''), nickname, 'Player')
    into nick from public.profiles where id = uid;
  if nick is null then nick := coalesce(nullif(trim(p_nickname), ''), 'Player'); end if;

  insert into public.profiles (id, nickname)
  values (uid, nick)
  on conflict (id) do update set
    nickname = coalesce(nullif(trim(p_nickname), ''), public.profiles.nickname),
    updated_at = now();

  insert into public.game_history (user_id, nickname, mode, won, score, wins, losses, streak, lineup, meta)
  values (uid, nick, p_mode, coalesce(p_won, false), score_c, p_wins, p_losses, p_streak, p_lineup, coalesce(p_meta, '{}'::jsonb));

  insert into public.user_stats (user_id)
  values (uid)
  on conflict (user_id) do nothing;

  update public.user_stats set
    games = games + 1,
    wins = wins + case when p_won then 1 else 0 end,
    losses = losses + case when p_won then 0 else 1 end,
    major_wins = major_wins + case when p_mode = 'major' and p_won then 1 else 0 end,
    duel_wins = duel_wins + case when p_mode = 'duel' and p_won then 1 else 0 end,
    daily_wins = daily_wins + case when p_mode = 'daily' and p_won then 1 else 0 end,
    party_wins = party_wins + case when p_mode = 'party' and p_won then 1 else 0 end,
    party_games = party_games + case when p_mode = 'party' then 1 else 0 end,
    box_wins = coalesce(box_wins, 0) + case when p_mode = 'box' and p_won then 1 else 0 end,
    box_gold_hits = coalesce(box_gold_hits, 0) + case when p_mode = 'box' then greatest(0, coalesce((p_meta->>'roundGold')::integer, 0)) else 0 end,
    box_covert_hits = coalesce(box_covert_hits, 0) + case when p_mode = 'box' then greatest(0, coalesce((p_meta->>'roundCovert')::integer, 0)) else 0 end,
    box_opens = coalesce(box_opens, 0) + case when p_mode = 'box' then greatest(0, coalesce((p_meta->>'roundOpens')::integer, 0)) else 0 end,
    box_best_value = case
      when p_mode = 'box' and coalesce((p_meta->'bestDrop'->>'value')::numeric, 0) > coalesce(box_best_value, 0)
        then coalesce((p_meta->'bestDrop'->>'value')::numeric, 0)
      else coalesce(box_best_value, 0)
    end,
    best_drop = case
      when p_mode = 'box' and coalesce((p_meta->'bestDrop'->>'value')::numeric, 0) > coalesce(box_best_value, 0)
        then p_meta->'bestDrop'
      when p_mode = 'box' and best_drop is null and p_meta ? 'bestDrop' then p_meta->'bestDrop'
      else best_drop
    end,
    perfect_majors = perfect_majors + case when p_mode = 'major' and p_won and p_wins >= 3 and p_losses = 0 then 1 else 0 end,
    almanac_wins = almanac_wins + case when p_won and coalesce(p_meta->>'difficulty', '') = 'almanac' then 1 else 0 end,
    max_streak = greatest(max_streak, case when p_mode = 'gauntlet' then p_streak else 0 end),
    career_majors_won = coalesce(career_majors_won, 0) + case when p_mode = 'career' and coalesce(p_meta->>'event', '') = 'major_win' and p_won then 1 else 0 end,
    career_best_season = greatest(coalesce(career_best_season, 0), case when p_mode = 'career' then score_c else 0 end),
    career_seasons = coalesce(career_seasons, 0) + case when p_mode = 'career' and coalesce(p_meta->>'event', '') = 'season_end' then 1 else 0 end,
    updated_at = now()
  where user_id = uid;

  v_board := coalesce(p_board, p_mode);
  if v_board not in ('daily', 'duel', 'gauntlet', 'major', 'party', 'box', 'career') then
    v_board := p_mode;
  end if;

  v_day := case when v_board = 'daily' then coalesce(p_meta->>'dayKey', to_char(timezone('utc', now()), 'YYYY-MM-DD')) else null end;

  if v_board = 'daily' then
    update public.leaderboard
      set score = greatest(score, score_c),
          nickname = nick,
          meta = coalesce(p_meta, '{}'::jsonb),
          updated_at = now()
    where leaderboard.board = v_board and player_id = uid and day_key = v_day;
    get diagnostics updated = row_count;
    if updated = 0 then
      insert into public.leaderboard (board, player_id, nickname, score, day_key, meta)
      values (v_board, uid, nick, score_c, v_day, coalesce(p_meta, '{}'::jsonb));
    end if;
  else
    update public.leaderboard
      set score = greatest(score, score_c),
          nickname = nick,
          meta = coalesce(p_meta, '{}'::jsonb),
          updated_at = now()
    where leaderboard.board = v_board and player_id = uid;
    get diagnostics updated = row_count;
    if updated = 0 then
      insert into public.leaderboard (board, player_id, nickname, score, meta)
      values (v_board, uid, nick, score_c, coalesce(p_meta, '{}'::jsonb));
    end if;
  end if;

  perform public.award_badges(uid);

  select coalesce(array_agg(badge_id), '{}') into new_badges
  from public.user_badges
  where user_id = uid
    and earned_at > now() - interval '5 seconds';

  return jsonb_build_object(
    'ok', true,
    'score', score_c,
    'new_badges', to_jsonb(new_badges)
  );
end;
$$;

revoke all on function public.submit_game_result from public;
grant execute on function public.submit_game_result to authenticated;

-- Career save RPCs
create or replace function public.get_career_save()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.career_saves%rowtype;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform public.assert_not_banned(uid);
  select * into row from public.career_saves where user_id = uid;
  if not found then
    return jsonb_build_object('exists', false, 'state', '{}'::jsonb, 'season_score', 0, 'majors_won', 0);
  end if;
  return jsonb_build_object(
    'exists', true,
    'state', row.state,
    'season_score', row.season_score,
    'majors_won', row.majors_won,
    'updated_at', row.updated_at
  );
end;
$$;

create or replace function public.upsert_career_save(
  p_state jsonb,
  p_season_score integer default 0,
  p_majors_won integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  score_c integer;
  majors_c integer;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform public.assert_not_banned(uid);
  score_c := public.clamp_int(p_season_score, 0, 1000000);
  majors_c := public.clamp_int(p_majors_won, 0, 100);
  insert into public.career_saves (user_id, state, season_score, majors_won, updated_at)
  values (uid, coalesce(p_state, '{}'::jsonb), score_c, majors_c, now())
  on conflict (user_id) do update set
    state = coalesce(p_state, public.career_saves.state),
    season_score = score_c,
    majors_won = greatest(public.career_saves.majors_won, majors_c),
    updated_at = now();
  insert into public.user_stats (user_id) values (uid) on conflict (user_id) do nothing;
  update public.user_stats set
    career_majors_won = greatest(coalesce(career_majors_won, 0), majors_c),
    career_best_season = greatest(coalesce(career_best_season, 0), score_c),
    updated_at = now()
  where user_id = uid;
  perform public.award_badges(uid);
  return jsonb_build_object('ok', true, 'season_score', score_c, 'majors_won', majors_c);
end;
$$;

revoke all on function public.get_career_save() from public;
grant execute on function public.get_career_save() to authenticated;
revoke all on function public.upsert_career_save(jsonb, integer, integer) from public;
grant execute on function public.upsert_career_save(jsonb, integer, integer) to authenticated;

drop policy if exists "career_saves_select_own" on public.career_saves;
create policy "career_saves_select_own" on public.career_saves
  for select using (auth.uid() = user_id);

-- Room RPCs
create or replace function public.create_room(p_mode text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_code text;
  i int;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  perform public.assert_not_banned(uid);
  if p_mode not in ('party', 'duel', 'box') then raise exception 'invalid_mode'; end if;

  for i in 1..12 loop
    v_code := '';
    for j in 1..6 loop
      v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.rooms r where r.code = v_code);
  end loop;

  insert into public.rooms (code, mode, host_id, status, seed, payload)
  values (
    v_code,
    p_mode,
    uid,
    'lobby',
    p_mode || '-' || v_code || '-' || extract(epoch from now())::bigint,
    coalesce(p_payload, '{}'::jsonb)
  );

  return (select to_jsonb(r) from public.rooms r where r.code = v_code);
end;
$$;

create or replace function public.update_room_payload(p_code text, p_payload jsonb, p_status text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  room public.rooms%rowtype;
  is_member boolean;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  perform public.assert_not_banned(uid);

  select * into room from public.rooms where code = upper(trim(p_code));
  if not found then raise exception 'room_not_found'; end if;

  -- Authorize against stored membership only (never trust incoming payload.players)
  is_member := (room.host_id = uid) or exists (
    select 1 from jsonb_array_elements(coalesce(room.payload->'players', '[]'::jsonb)) el
    where el->>'id' = uid::text
  );
  if not is_member then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_payload is not null and octet_length(p_payload::text) > 65536 then
    raise exception 'payload_too_large';
  end if;

  update public.rooms set
    payload = coalesce(p_payload, payload),
    status = coalesce(p_status, status),
    updated_at = now()
  where code = room.code
  returning * into room;

  return to_jsonb(room);
end;
$$;

create or replace function public.join_room(p_code text, p_nickname text default 'Guest')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  room public.rooms%rowtype;
  players jsonb;
  max_players integer;
  already boolean;
  nick text;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  perform public.assert_not_banned(uid);

  select * into room from public.rooms where code = upper(trim(p_code)) for update;
  if not found then raise exception 'room_not_found'; end if;

  players := coalesce(room.payload->'players', '[]'::jsonb);
  max_players := coalesce((room.payload->>'maxPlayers')::integer, case when room.mode = 'duel' then 2 else 6 end);
  already := exists (
    select 1 from jsonb_array_elements(players) el where el->>'id' = uid::text
  );

  if not already then
    if jsonb_array_length(players) >= max_players then
      raise exception 'room_full';
    end if;
    nick := left(trim(coalesce(nullif(p_nickname, ''), 'Guest')), 16);
    players := players || jsonb_build_array(jsonb_build_object(
      'id', uid::text,
      'nickname', nick,
      'ready', false,
      'lineup', null,
      'power', 0,
      'isHost', false
    ));
    update public.rooms set
      payload = jsonb_set(coalesce(room.payload, '{}'::jsonb), '{players}', players, true),
      updated_at = now()
    where code = room.code
    returning * into room;
  end if;

  return to_jsonb(room);
end;
$$;

revoke all on function public.create_room from public;
revoke all on function public.update_room_payload from public;
revoke all on function public.join_room from public;
grant execute on function public.create_room to authenticated;
grant execute on function public.update_room_payload to authenticated;
grant execute on function public.join_room to authenticated;

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, email, avatar_id, showcase_badge)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1), 'Player'),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatarId', 'cs4fun'),
    nullif(new.raw_user_meta_data->>'showcaseBadge', '')
  )
  on conflict (id) do nothing;
  insert into public.user_stats (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Account self-delete (auth user + related public rows)
create or replace function public.delete_own_account()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  delete from public.user_badges where user_id = uid;
  delete from public.user_stats where user_id = uid;
  delete from public.game_history where user_id = uid;
  delete from public.leaderboard where player_id = uid;
  delete from public.rooms where host_id = uid;
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.delete_own_account from public;
grant execute on function public.delete_own_account to authenticated;

-- ─── Friends ──────────────────────────────────────────────
create table if not exists public.friendships (
  id bigint generated always as identity primary key,
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  constraint friendships_not_self check (requester_id <> addressee_id),
  constraint friendships_unique_pair unique (requester_id, addressee_id)
);

create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);
create index if not exists friendships_requester_idx on public.friendships (requester_id, status);

create table if not exists public.friend_invites (
  id bigint generated always as identity primary key,
  from_id uuid not null references auth.users(id) on delete cascade,
  to_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('duel', 'party', 'box')),
  room_code text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  created_at timestamptz not null default now()
);

create index if not exists friend_invites_to_idx on public.friend_invites (to_id, status, created_at desc);

create table if not exists public.friend_h2h (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  matches integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

alter table public.friendships enable row level security;
alter table public.friend_invites enable row level security;
alter table public.friend_h2h enable row level security;

drop policy if exists "friendships_select" on public.friendships;
drop policy if exists "friendships_insert" on public.friendships;
drop policy if exists "friendships_update" on public.friendships;
drop policy if exists "friendships_update_requester" on public.friendships;
drop policy if exists "friendships_update_addressee" on public.friendships;
drop policy if exists "friendships_delete" on public.friendships;
create policy "friendships_select" on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "friendships_insert" on public.friendships for insert
  with check (auth.uid() = requester_id);
-- Requester may only keep/cancel pending (cannot self-accept)
create policy "friendships_update_requester" on public.friendships for update
  using (auth.uid() = requester_id and status = 'pending')
  with check (auth.uid() = requester_id and status = 'pending');
-- Addressee may accept or block
create policy "friendships_update_addressee" on public.friendships for update
  using (auth.uid() = addressee_id and status = 'pending')
  with check (auth.uid() = addressee_id and status in ('accepted', 'blocked'));
create policy "friendships_delete" on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "friend_invites_select" on public.friend_invites;
drop policy if exists "friend_invites_insert" on public.friend_invites;
drop policy if exists "friend_invites_update" on public.friend_invites;
drop policy if exists "friend_invites_update_recipient" on public.friend_invites;
drop policy if exists "friend_invites_update_sender" on public.friend_invites;
create policy "friend_invites_select" on public.friend_invites for select
  using (auth.uid() = from_id or auth.uid() = to_id);
create policy "friend_invites_insert" on public.friend_invites for insert
  with check (auth.uid() = from_id);
create policy "friend_invites_update_recipient" on public.friend_invites for update
  using (auth.uid() = to_id and status = 'pending')
  with check (auth.uid() = to_id and status in ('accepted', 'declined'));
create policy "friend_invites_update_sender" on public.friend_invites for update
  using (auth.uid() = from_id and status = 'pending')
  with check (auth.uid() = from_id and status = 'expired');

drop policy if exists "friend_h2h_select" on public.friend_h2h;
create policy "friend_h2h_select" on public.friend_h2h for select
  using (auth.uid() = user_id);

create or replace function public.record_friend_match(p_friend_id uuid, p_won boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  perform public.assert_not_banned(uid);
  if p_friend_id is null or p_friend_id = uid then return; end if;

  if not exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = uid and f.addressee_id = p_friend_id)
        or (f.requester_id = p_friend_id and f.addressee_id = uid)
      )
  ) then
    raise exception 'not_friends' using errcode = '42501';
  end if;

  insert into public.friend_h2h (user_id, friend_id, matches, wins, losses, updated_at)
  values (uid, p_friend_id, 1, case when p_won then 1 else 0 end, case when p_won then 0 else 1 end, now())
  on conflict (user_id, friend_id) do update set
    matches = public.friend_h2h.matches + 1,
    wins = public.friend_h2h.wins + case when p_won then 1 else 0 end,
    losses = public.friend_h2h.losses + case when p_won then 0 else 1 end,
    updated_at = now();

  insert into public.friend_h2h (user_id, friend_id, matches, wins, losses, updated_at)
  values (p_friend_id, uid, 1, case when p_won then 0 else 1 end, case when p_won then 1 else 0 end, now())
  on conflict (user_id, friend_id) do update set
    matches = public.friend_h2h.matches + 1,
    wins = public.friend_h2h.wins + case when p_won then 0 else 1 end,
    losses = public.friend_h2h.losses + case when p_won then 1 else 0 end,
    updated_at = now();
end;
$$;

revoke all on function public.record_friend_match from public;
grant execute on function public.record_friend_match to authenticated;

revoke all on function public.award_badges(uuid) from public;
revoke all on function public.clamp_int(integer, integer, integer) from public;

-- Public profile peek (respects privacy; never returns email)
create or replace function public.get_public_profile(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  p public.profiles%rowtype;
  is_friend boolean := false;
  is_self boolean;
  can_see boolean;
  stats public.user_stats%rowtype;
  badge_count integer := 0;
begin
  if p_id is null then return null; end if;

  select * into p from public.profiles where id = p_id;
  if not found then return null; end if;

  is_self := (uid is not null and uid = p.id);
  if uid is not null and not is_self then
    is_friend := exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = uid and f.addressee_id = p.id)
          or (f.requester_id = p.id and f.addressee_id = uid)
        )
    );
  end if;

  can_see := is_self or coalesce(p.profile_public, true) or is_friend;

  select * into stats from public.user_stats where user_id = p.id;
  select count(*)::integer into badge_count from public.user_badges where user_id = p.id;

  return jsonb_build_object(
    'id', p.id,
    'nickname', p.nickname,
    'avatarId', coalesce(p.avatar_id, 'crosshair'),
    'avatarUrl', p.avatar_url,
    'profilePublic', coalesce(p.profile_public, true),
    'private', not can_see,
    'showcaseBadge', case when can_see then p.showcase_badge else null end,
    'steamUrl', case when can_see then p.steam_url else null end,
    'wins', case when can_see then coalesce(stats.wins, 0) else null end,
    'games', case when can_see then coalesce(stats.games, 0) else null end,
    'badgeCount', case when can_see then badge_count else null end,
    'boxWins', case when can_see then coalesce(stats.box_wins, 0) else null end,
    'bestDrop', case when can_see then stats.best_drop else null end,
    'ultra', exists (
      select 1 from public.user_badges ub
      where ub.user_id = p.id and ub.badge_id = 'completionist'
    )
  );
end;
$$;

revoke all on function public.get_public_profile(uuid) from public;
grant execute on function public.get_public_profile(uuid) to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.friend_invites;
exception when duplicate_object then null;
end $$;

-- Realtime for rooms
do $$
begin
  alter publication supabase_realtime add table public.rooms;
exception when duplicate_object then null;
end $$;

-- ─── Admin console RPCs (require app_admins row) ───────────
create or replace function public.get_my_access()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  banned timestamptz;
  reason text;
begin
  if uid is null then
    return jsonb_build_object('is_admin', false, 'banned', false, 'ban_reason', null);
  end if;
  select p.banned_at, p.ban_reason into banned, reason
  from public.profiles p where p.id = uid;
  return jsonb_build_object(
    'is_admin', public.is_admin(uid),
    'banned', banned is not null,
    'ban_reason', reason
  );
end;
$$;

revoke all on function public.get_my_access() from public;
grant execute on function public.get_my_access() to authenticated;

create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  users_total bigint;
  banned_total bigint;
  users_7d bigint;
  games_today bigint;
  games_7d bigint;
  rooms_active bigint;
  by_mode jsonb;
begin
  perform public.assert_admin();

  select count(*) into users_total from public.profiles;
  select count(*) into banned_total from public.profiles where banned_at is not null;
  select count(*) into users_7d
    from public.profiles where created_at >= now() - interval '7 days';
  select count(*) into games_today
    from public.game_history where created_at >= date_trunc('day', timezone('utc', now()));
  select count(*) into games_7d
    from public.game_history where created_at >= now() - interval '7 days';
  select count(*) into rooms_active
    from public.rooms where status in ('lobby', 'drafting', 'reveal');

  select coalesce(jsonb_object_agg(mode, cnt), '{}'::jsonb) into by_mode
  from (
    select mode, count(*)::int as cnt
    from public.game_history
    where created_at >= now() - interval '7 days'
    group by mode
  ) s;

  return jsonb_build_object(
    'users_total', users_total,
    'banned_total', banned_total,
    'users_7d', users_7d,
    'games_today', games_today,
    'games_7d', games_7d,
    'rooms_active', rooms_active,
    'games_by_mode_7d', by_mode
  );
end;
$$;

create or replace function public.admin_list_users(
  p_search text default null,
  p_limit integer default 40,
  p_offset integer default 0,
  p_banned_only boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  lim integer := public.clamp_int(p_limit, 1, 100);
  off integer := public.clamp_int(p_offset, 0, 100000);
  q text := nullif(trim(p_search), '');
  rows jsonb;
  total bigint;
begin
  perform public.assert_admin();

  select count(*) into total
  from public.profiles p
  where (not p_banned_only or p.banned_at is not null)
    and (
      q is null
      or p.nickname ilike '%' || q || '%'
      or coalesce(p.email, '') ilike '%' || q || '%'
      or p.id::text ilike '%' || q || '%'
    );

  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb)
  into rows
  from (
    select
      p.id,
      p.nickname,
      p.email,
      p.avatar_id,
      p.avatar_url,
      p.steam_url,
      p.profile_public,
      p.banned_at,
      p.ban_reason,
      p.created_at,
      public.is_admin(p.id) as is_admin,
      coalesce(s.games, 0) as games,
      coalesce(s.wins, 0) as wins,
      coalesce(s.losses, 0) as losses
    from public.profiles p
    left join public.user_stats s on s.user_id = p.id
    where (not p_banned_only or p.banned_at is not null)
      and (
        q is null
        or p.nickname ilike '%' || q || '%'
        or coalesce(p.email, '') ilike '%' || q || '%'
        or p.id::text ilike '%' || q || '%'
      )
    order by p.created_at desc
    limit lim offset off
  ) r;

  return jsonb_build_object('total', total, 'users', rows);
end;
$$;

create or replace function public.admin_get_user(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles%rowtype;
  stats public.user_stats%rowtype;
  recent jsonb;
begin
  perform public.assert_admin();
  if p_id is null then return null; end if;

  select * into p from public.profiles where id = p_id;
  if not found then return null; end if;
  select * into stats from public.user_stats where user_id = p_id;

  select coalesce(jsonb_agg(to_jsonb(g) order by g.created_at desc), '[]'::jsonb)
  into recent
  from (
    select id, mode, won, score, wins, losses, streak, created_at
    from public.game_history
    where user_id = p_id
    order by created_at desc
    limit 20
  ) g;

  return jsonb_build_object(
    'id', p.id,
    'nickname', p.nickname,
    'email', p.email,
    'avatarId', p.avatar_id,
    'avatarUrl', p.avatar_url,
    'steamUrl', p.steam_url,
    'profilePublic', p.profile_public,
    'showcaseBadge', p.showcase_badge,
    'bannedAt', p.banned_at,
    'banReason', p.ban_reason,
    'createdAt', p.created_at,
    'isAdmin', public.is_admin(p.id),
    'stats', jsonb_build_object(
      'games', coalesce(stats.games, 0),
      'wins', coalesce(stats.wins, 0),
      'losses', coalesce(stats.losses, 0),
      'major_wins', coalesce(stats.major_wins, 0),
      'duel_wins', coalesce(stats.duel_wins, 0),
      'daily_wins', coalesce(stats.daily_wins, 0),
      'party_wins', coalesce(stats.party_wins, 0),
      'max_streak', coalesce(stats.max_streak, 0)
    ),
    'recentGames', recent
  );
end;
$$;

create or replace function public.admin_ban_user(p_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  reason text := left(trim(coalesce(p_reason, '')), 500);
begin
  perform public.assert_admin();
  if p_id is null then raise exception 'invalid_user'; end if;
  if p_id = uid then raise exception 'cannot_ban_self'; end if;
  if public.is_admin(p_id) then raise exception 'cannot_ban_admin'; end if;
  if not exists (select 1 from public.profiles where id = p_id) then
    raise exception 'user_not_found';
  end if;

  perform set_config('cs4fun.allow_ban_update', '1', true);
  update public.profiles set
    banned_at = now(),
    ban_reason = nullif(reason, ''),
    updated_at = now()
  where id = p_id;

  return jsonb_build_object('ok', true, 'id', p_id, 'banned', true);
end;
$$;

create or replace function public.admin_unban_user(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  if p_id is null then raise exception 'invalid_user'; end if;
  if not exists (select 1 from public.profiles where id = p_id) then
    raise exception 'user_not_found';
  end if;

  perform set_config('cs4fun.allow_ban_update', '1', true);
  update public.profiles set
    banned_at = null,
    ban_reason = null,
    updated_at = now()
  where id = p_id;

  return jsonb_build_object('ok', true, 'id', p_id, 'banned', false);
end;
$$;

create or replace function public.admin_list_games(
  p_mode text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  lim integer := public.clamp_int(p_limit, 1, 100);
  off integer := public.clamp_int(p_offset, 0, 100000);
  mode_f text := nullif(trim(p_mode), '');
  rows jsonb;
  total bigint;
begin
  perform public.assert_admin();
  if mode_f is not null and mode_f not in ('major', 'duel', 'party', 'daily', 'gauntlet') then
    raise exception 'invalid_mode';
  end if;

  select count(*) into total
  from public.game_history g
  where mode_f is null or g.mode = mode_f;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb)
  into rows
  from (
    select
      g.id,
      g.user_id,
      g.nickname,
      g.mode,
      g.won,
      g.score,
      g.wins,
      g.losses,
      g.streak,
      g.created_at
    from public.game_history g
    where mode_f is null or g.mode = mode_f
    order by g.created_at desc
    limit lim offset off
  ) r;

  return jsonb_build_object('total', total, 'games', rows);
end;
$$;

create or replace function public.admin_list_rooms(p_limit integer default 40)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  lim integer := public.clamp_int(p_limit, 1, 100);
  rows jsonb;
begin
  perform public.assert_admin();

  select coalesce(jsonb_agg(to_jsonb(r) order by r.updated_at desc), '[]'::jsonb)
  into rows
  from (
    select
      code,
      mode,
      host_id,
      status,
      seed,
      jsonb_array_length(coalesce(payload->'players', '[]'::jsonb)) as player_count,
      created_at,
      updated_at
    from public.rooms
    order by updated_at desc
    limit lim
  ) r;

  return jsonb_build_object('rooms', rows);
end;
$$;

create or replace function public.admin_purge_user_history(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted integer;
begin
  perform public.assert_admin();
  if p_id is null then raise exception 'invalid_user'; end if;
  if public.is_admin(p_id) then raise exception 'cannot_modify_admin'; end if;

  delete from public.game_history where user_id = p_id;
  get diagnostics deleted = row_count;
  delete from public.leaderboard where player_id = p_id;
  delete from public.user_stats where user_id = p_id;
  delete from public.user_badges where user_id = p_id;

  return jsonb_build_object('ok', true, 'deleted_games', deleted);
end;
$$;

create or replace function public.admin_reset_profile(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  if p_id is null then raise exception 'invalid_user'; end if;
  if public.is_admin(p_id) then raise exception 'cannot_modify_admin'; end if;
  if not exists (select 1 from public.profiles where id = p_id) then
    raise exception 'user_not_found';
  end if;

  update public.profiles set
    nickname = 'Player',
    avatar_id = 'cs4fun',
    avatar_url = null,
    showcase_badge = null,
    steam_url = null,
    profile_public = true,
    updated_at = now()
  where id = p_id;

  return jsonb_build_object('ok', true, 'id', p_id);
end;
$$;

create or replace function public.admin_close_room(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  code_n text := upper(trim(p_code));
  deleted integer;
begin
  perform public.assert_admin();
  if code_n is null or code_n = '' then raise exception 'invalid_code'; end if;
  delete from public.rooms where code = code_n;
  get diagnostics deleted = row_count;
  if deleted = 0 then raise exception 'room_not_found'; end if;
  return jsonb_build_object('ok', true, 'code', code_n);
end;
$$;

revoke all on function public.admin_dashboard_stats() from public;
revoke all on function public.admin_list_users(text, integer, integer, boolean) from public;
revoke all on function public.admin_list_users(text, integer, integer) from public;
revoke all on function public.admin_get_user(uuid) from public;
revoke all on function public.admin_ban_user(uuid, text) from public;
revoke all on function public.admin_unban_user(uuid) from public;
revoke all on function public.admin_list_games(text, integer, integer) from public;
revoke all on function public.admin_list_rooms(integer) from public;
revoke all on function public.admin_purge_user_history(uuid) from public;
revoke all on function public.admin_reset_profile(uuid) from public;
revoke all on function public.admin_close_room(text) from public;

grant execute on function public.admin_dashboard_stats() to authenticated;
grant execute on function public.admin_list_users(text, integer, integer, boolean) to authenticated;
grant execute on function public.admin_get_user(uuid) to authenticated;
grant execute on function public.admin_ban_user(uuid, text) to authenticated;
grant execute on function public.admin_unban_user(uuid) to authenticated;
grant execute on function public.admin_list_games(text, integer, integer) to authenticated;
grant execute on function public.admin_list_rooms(integer) to authenticated;
grant execute on function public.admin_purge_user_history(uuid) to authenticated;
grant execute on function public.admin_reset_profile(uuid) to authenticated;
grant execute on function public.admin_close_room(text) to authenticated;-- Admin control expansion + career/auth hardening
-- Run in Supabase SQL editor after prior migrations.

-- ─── Session revoke flag (admin force-signout / ban) ──────
alter table public.profiles
  add column if not exists sessions_revoked_at timestamptz;

-- ─── Sanitize career save payloads (anti-cheat caps) ──────
create or replace function public.sanitize_career_state(p_state jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  s jsonb := coalesce(p_state, '{}'::jsonb);
  budget numeric;
  season integer;
  week integer;
  majors integer;
  org_name text;
  short_name text;
  org_logo text;
  logo_max integer := 72000;
begin
  if jsonb_typeof(s) <> 'object' then
    raise exception 'invalid_career_state';
  end if;

  budget := coalesce((s->>'budget')::numeric, 0);
  if budget < 0 then budget := 0; end if;
  if budget > 5000000 then budget := 5000000; end if;

  season := public.clamp_int(coalesce((s->>'season')::integer, 1), 1, 200);
  week := public.clamp_int(coalesce((s->>'week')::integer, 1), 1, 20);
  majors := public.clamp_int(coalesce((s->>'majorsWonCareer')::integer, 0), 0, 100);

  org_name := left(trim(coalesce(s->>'orgName', 'Org')), 32);
  if org_name = '' then org_name := 'Org'; end if;
  short_name := upper(regexp_replace(coalesce(s->>'shortName', org_name), '[^A-Za-z0-9]', '', 'g'));
  short_name := left(short_name, 8);
  if length(short_name) < 2 then short_name := 'ORG'; end if;

  org_logo := s->>'orgLogo';
  if org_logo is null or org_logo = '' then
    org_logo := null;
  elsif length(org_logo) > logo_max then
    org_logo := null;
  elsif org_logo !~* '^data:image/(jpeg|jpg|png|webp);base64,' then
    org_logo := null;
  end if;

  s := s
    || jsonb_build_object(
      'budget', floor(budget)::bigint,
      'season', season,
      'week', week,
      'majorsWonCareer', majors,
      'orgName', org_name,
      'shortName', short_name,
      'orgLogo', to_jsonb(org_logo)
    );

  -- Drop absurd seasonScore if present in state blob
  if (s ? 'seasonScore') then
    s := s || jsonb_build_object(
      'seasonScore', public.clamp_int(coalesce((s->>'seasonScore')::integer, 0), 0, 1000000)
    );
  end if;

  return s;
end;
$$;

revoke all on function public.sanitize_career_state(jsonb) from public;

-- ─── Hardened career RPCs (auth + ban + sanitize) ─────────
create or replace function public.get_career_save()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.career_saves%rowtype;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform public.assert_not_banned(uid);

  select * into row from public.career_saves where user_id = uid;
  if not found then
    return jsonb_build_object(
      'exists', false,
      'state', '{}'::jsonb,
      'season_score', 0,
      'majors_won', 0
    );
  end if;
  return jsonb_build_object(
    'exists', true,
    'state', row.state,
    'season_score', row.season_score,
    'majors_won', row.majors_won,
    'updated_at', row.updated_at
  );
end;
$$;

create or replace function public.upsert_career_save(
  p_state jsonb,
  p_season_score integer default 0,
  p_majors_won integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  score_c integer;
  majors_c integer;
  clean jsonb;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform public.assert_not_banned(uid);

  if p_state is null or jsonb_typeof(p_state) <> 'object' then
    raise exception 'invalid_career_state';
  end if;

  clean := public.sanitize_career_state(p_state);
  score_c := public.clamp_int(
    greatest(
      coalesce(p_season_score, 0),
      coalesce((clean->>'seasonScore')::integer, 0)
    ),
    0,
    1000000
  );
  majors_c := public.clamp_int(
    greatest(
      coalesce(p_majors_won, 0),
      coalesce((clean->>'majorsWonCareer')::integer, 0)
    ),
    0,
    100
  );

  insert into public.career_saves (user_id, state, season_score, majors_won, updated_at)
  values (uid, clean, score_c, majors_c, now())
  on conflict (user_id) do update set
    state = clean,
    season_score = score_c,
    majors_won = greatest(public.career_saves.majors_won, majors_c),
    updated_at = now();

  insert into public.user_stats (user_id)
  values (uid)
  on conflict (user_id) do nothing;

  update public.user_stats set
    career_majors_won = greatest(coalesce(career_majors_won, 0), majors_c),
    career_best_season = greatest(coalesce(career_best_season, 0), score_c),
    updated_at = now()
  where user_id = uid;

  perform public.award_badges(uid);

  return jsonb_build_object('ok', true, 'season_score', score_c, 'majors_won', majors_c);
end;
$$;

revoke all on function public.get_career_save() from public;
grant execute on function public.get_career_save() to authenticated;
revoke all on function public.upsert_career_save(jsonb, integer, integer) from public;
grant execute on function public.upsert_career_save(jsonb, integer, integer) to authenticated;

-- Explicit: anon cannot touch career
revoke all on function public.get_career_save() from anon;
revoke all on function public.upsert_career_save(jsonb, integer, integer) from anon;

-- Ensure no direct write policies on career_saves
drop policy if exists "career_saves_insert" on public.career_saves;
drop policy if exists "career_saves_update" on public.career_saves;
drop policy if exists "career_saves_delete" on public.career_saves;

-- ─── Access probe includes revoke timestamp ───────────────
create or replace function public.get_my_access()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  banned timestamptz;
  reason text;
  revoked timestamptz;
begin
  if uid is null then
    return jsonb_build_object(
      'is_admin', false,
      'banned', false,
      'ban_reason', null,
      'sessions_revoked_at', null
    );
  end if;
  select p.banned_at, p.ban_reason, p.sessions_revoked_at
    into banned, reason, revoked
  from public.profiles p where p.id = uid;
  return jsonb_build_object(
    'is_admin', public.is_admin(uid),
    'banned', banned is not null,
    'ban_reason', reason,
    'sessions_revoked_at', revoked
  );
end;
$$;

-- ─── Helper: kick user rooms ──────────────────────────────
create or replace function public.admin_kick_user_rooms(p_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted integer := 0;
begin
  delete from public.rooms where host_id = p_id;
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;

revoke all on function public.admin_kick_user_rooms(uuid) from public;

-- ─── Ban also revokes sessions + kicks rooms ──────────────
create or replace function public.admin_ban_user(p_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  reason text := left(trim(coalesce(p_reason, '')), 500);
  kicked integer;
begin
  perform public.assert_admin();
  if p_id is null then raise exception 'invalid_user'; end if;
  if p_id = uid then raise exception 'cannot_ban_self'; end if;
  if public.is_admin(p_id) then raise exception 'cannot_ban_admin'; end if;
  if not exists (select 1 from public.profiles where id = p_id) then
    raise exception 'user_not_found';
  end if;

  perform set_config('cs4fun.allow_ban_update', '1', true);
  update public.profiles set
    banned_at = now(),
    ban_reason = nullif(reason, ''),
    sessions_revoked_at = now(),
    updated_at = now()
  where id = p_id;

  kicked := public.admin_kick_user_rooms(p_id);

  return jsonb_build_object('ok', true, 'id', p_id, 'banned', true, 'rooms_closed', kicked);
end;
$$;

-- ─── Dashboard: career + ban extras ───────────────────────
create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  users_total bigint;
  banned_total bigint;
  users_7d bigint;
  games_today bigint;
  games_7d bigint;
  rooms_active bigint;
  career_saves bigint;
  by_mode jsonb;
begin
  perform public.assert_admin();

  select count(*) into users_total from public.profiles;
  select count(*) into banned_total from public.profiles where banned_at is not null;
  select count(*) into users_7d
    from public.profiles where created_at >= now() - interval '7 days';
  select count(*) into games_today
    from public.game_history where created_at >= date_trunc('day', timezone('utc', now()));
  select count(*) into games_7d
    from public.game_history where created_at >= now() - interval '7 days';
  select count(*) into rooms_active
    from public.rooms where status in ('lobby', 'drafting', 'reveal');
  select count(*) into career_saves from public.career_saves;

  select coalesce(jsonb_object_agg(mode, cnt), '{}'::jsonb) into by_mode
  from (
    select mode, count(*)::int as cnt
    from public.game_history
    where created_at >= now() - interval '7 days'
    group by mode
  ) s;

  return jsonb_build_object(
    'users_total', users_total,
    'banned_total', banned_total,
    'users_7d', users_7d,
    'games_today', games_today,
    'games_7d', games_7d,
    'rooms_active', rooms_active,
    'career_saves', career_saves,
    'games_by_mode_7d', by_mode
  );
end;
$$;

-- ─── User detail includes career ──────────────────────────
create or replace function public.admin_get_user(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles%rowtype;
  stats public.user_stats%rowtype;
  recent jsonb;
  career jsonb;
begin
  perform public.assert_admin();
  if p_id is null then return null; end if;

  select * into p from public.profiles where id = p_id;
  if not found then return null; end if;
  select * into stats from public.user_stats where user_id = p_id;

  select coalesce(jsonb_agg(to_jsonb(g) order by g.created_at desc), '[]'::jsonb)
  into recent
  from (
    select id, mode, won, score, wins, losses, streak, created_at
    from public.game_history
    where user_id = p_id
    order by created_at desc
    limit 20
  ) g;

  select jsonb_build_object(
    'exists', true,
    'season_score', cs.season_score,
    'majors_won', cs.majors_won,
    'updated_at', cs.updated_at,
    'orgName', cs.state->>'orgName',
    'shortName', cs.state->>'shortName',
    'budget', (cs.state->>'budget')::bigint,
    'season', (cs.state->>'season')::integer,
    'week', (cs.state->>'week')::integer
  )
  into career
  from public.career_saves cs
  where cs.user_id = p_id;

  if career is null then
    career := jsonb_build_object('exists', false);
  end if;

  return jsonb_build_object(
    'id', p.id,
    'nickname', p.nickname,
    'email', p.email,
    'avatarId', p.avatar_id,
    'avatarUrl', p.avatar_url,
    'steamUrl', p.steam_url,
    'profilePublic', p.profile_public,
    'showcaseBadge', p.showcase_badge,
    'bannedAt', p.banned_at,
    'banReason', p.ban_reason,
    'sessionsRevokedAt', p.sessions_revoked_at,
    'createdAt', p.created_at,
    'isAdmin', public.is_admin(p.id),
    'stats', jsonb_build_object(
      'games', coalesce(stats.games, 0),
      'wins', coalesce(stats.wins, 0),
      'losses', coalesce(stats.losses, 0),
      'major_wins', coalesce(stats.major_wins, 0),
      'duel_wins', coalesce(stats.duel_wins, 0),
      'daily_wins', coalesce(stats.daily_wins, 0),
      'party_wins', coalesce(stats.party_wins, 0),
      'max_streak', coalesce(stats.max_streak, 0),
      'career_majors_won', coalesce(stats.career_majors_won, 0),
      'career_best_season', coalesce(stats.career_best_season, 0),
      'career_seasons', coalesce(stats.career_seasons, 0)
    ),
    'career', career,
    'recentGames', recent
  );
end;
$$;

-- ─── Games list: career + box + gauntlet ───────────────────
create or replace function public.admin_list_games(
  p_mode text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  lim integer := public.clamp_int(p_limit, 1, 100);
  off integer := public.clamp_int(p_offset, 0, 100000);
  mode_f text := nullif(trim(p_mode), '');
  rows jsonb;
  total bigint;
begin
  perform public.assert_admin();
  if mode_f is not null and mode_f not in (
    'major', 'duel', 'party', 'daily', 'gauntlet', 'box', 'career'
  ) then
    raise exception 'invalid_mode';
  end if;

  select count(*) into total
  from public.game_history g
  where mode_f is null or g.mode = mode_f;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb)
  into rows
  from (
    select
      g.id,
      g.user_id,
      g.nickname,
      g.mode,
      g.won,
      g.score,
      g.wins,
      g.losses,
      g.streak,
      g.created_at
    from public.game_history g
    where mode_f is null or g.mode = mode_f
    order by g.created_at desc
    limit lim offset off
  ) r;

  return jsonb_build_object('total', total, 'games', rows);
end;
$$;

-- ─── Expanded purge ───────────────────────────────────────
create or replace function public.admin_purge_user_history(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted integer;
  friends_n integer;
begin
  perform public.assert_admin();
  if p_id is null then raise exception 'invalid_user'; end if;
  if public.is_admin(p_id) then raise exception 'cannot_modify_admin'; end if;

  delete from public.game_history where user_id = p_id;
  get diagnostics deleted = row_count;
  delete from public.leaderboard where player_id = p_id;
  delete from public.user_stats where user_id = p_id;
  delete from public.user_badges where user_id = p_id;
  delete from public.career_saves where user_id = p_id;
  delete from public.friend_h2h where user_id = p_id or friend_id = p_id;
  delete from public.friend_invites where from_id = p_id or to_id = p_id;
  delete from public.friendships where requester_id = p_id or addressee_id = p_id;
  get diagnostics friends_n = row_count;
  perform public.admin_kick_user_rooms(p_id);

  return jsonb_build_object(
    'ok', true,
    'deleted_games', deleted,
    'friends_cleared', friends_n
  );
end;
$$;

-- ─── New admin RPCs ───────────────────────────────────────
create or replace function public.admin_get_career_save(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.career_saves%rowtype;
begin
  perform public.assert_admin();
  if p_id is null then raise exception 'invalid_user'; end if;
  select * into row from public.career_saves where user_id = p_id;
  if not found then
    return jsonb_build_object('exists', false);
  end if;
  return jsonb_build_object(
    'exists', true,
    'state', row.state,
    'season_score', row.season_score,
    'majors_won', row.majors_won,
    'updated_at', row.updated_at
  );
end;
$$;

create or replace function public.admin_reset_career(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  if p_id is null then raise exception 'invalid_user'; end if;
  if public.is_admin(p_id) then raise exception 'cannot_modify_admin'; end if;
  if not exists (select 1 from public.profiles where id = p_id) then
    raise exception 'user_not_found';
  end if;

  delete from public.career_saves where user_id = p_id;
  delete from public.leaderboard where player_id = p_id and board = 'career';
  update public.user_stats set
    career_majors_won = 0,
    career_best_season = 0,
    career_seasons = 0,
    updated_at = now()
  where user_id = p_id;

  return jsonb_build_object('ok', true, 'id', p_id);
end;
$$;

create or replace function public.admin_delete_game(p_game_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted integer;
begin
  perform public.assert_admin();
  if p_game_id is null then raise exception 'invalid_game'; end if;
  delete from public.game_history where id = p_game_id;
  get diagnostics deleted = row_count;
  if deleted = 0 then raise exception 'game_not_found'; end if;
  return jsonb_build_object('ok', true, 'id', p_game_id);
end;
$$;

create or replace function public.admin_set_nickname(p_id uuid, p_nickname text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  nick text := left(trim(coalesce(p_nickname, '')), 16);
begin
  perform public.assert_admin();
  if p_id is null then raise exception 'invalid_user'; end if;
  if public.is_admin(p_id) then raise exception 'cannot_modify_admin'; end if;
  if nick = '' or length(nick) < 2 then raise exception 'invalid_nickname'; end if;
  if not exists (select 1 from public.profiles where id = p_id) then
    raise exception 'user_not_found';
  end if;

  update public.profiles set
    nickname = nick,
    updated_at = now()
  where id = p_id;

  return jsonb_build_object('ok', true, 'id', p_id, 'nickname', nick);
end;
$$;

create or replace function public.admin_force_signout(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  kicked integer;
begin
  perform public.assert_admin();
  if p_id is null then raise exception 'invalid_user'; end if;
  if public.is_admin(p_id) and p_id <> auth.uid() then
    raise exception 'cannot_modify_admin';
  end if;
  if not exists (select 1 from public.profiles where id = p_id) then
    raise exception 'user_not_found';
  end if;

  update public.profiles set
    sessions_revoked_at = now(),
    updated_at = now()
  where id = p_id;

  kicked := public.admin_kick_user_rooms(p_id);

  return jsonb_build_object('ok', true, 'id', p_id, 'rooms_closed', kicked);
end;
$$;

create or replace function public.admin_close_all_rooms()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted integer;
begin
  perform public.assert_admin();
  delete from public.rooms;
  get diagnostics deleted = row_count;
  return jsonb_build_object('ok', true, 'closed', deleted);
end;
$$;

-- Keep delete_own_account wiping career
create or replace function public.delete_own_account()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  delete from public.user_badges where user_id = uid;
  delete from public.user_stats where user_id = uid;
  delete from public.game_history where user_id = uid;
  delete from public.leaderboard where player_id = uid;
  delete from public.career_saves where user_id = uid;
  delete from public.friend_h2h where user_id = uid or friend_id = uid;
  delete from public.friend_invites where from_id = uid or to_id = uid;
  delete from public.friendships where requester_id = uid or addressee_id = uid;
  delete from public.rooms where host_id = uid;
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;

  return jsonb_build_object('ok', true);
end;
$$;

-- Grants
revoke all on function public.admin_get_career_save(uuid) from public;
revoke all on function public.admin_reset_career(uuid) from public;
revoke all on function public.admin_delete_game(bigint) from public;
revoke all on function public.admin_set_nickname(uuid, text) from public;
revoke all on function public.admin_force_signout(uuid) from public;
revoke all on function public.admin_close_all_rooms() from public;

grant execute on function public.admin_get_career_save(uuid) to authenticated;
grant execute on function public.admin_reset_career(uuid) to authenticated;
grant execute on function public.admin_delete_game(bigint) to authenticated;
grant execute on function public.admin_set_nickname(uuid, text) to authenticated;
grant execute on function public.admin_force_signout(uuid) to authenticated;
grant execute on function public.admin_close_all_rooms() to authenticated;

-- Re-assert existing admin grants after replace
grant execute on function public.admin_dashboard_stats() to authenticated;
grant execute on function public.admin_get_user(uuid) to authenticated;
grant execute on function public.admin_ban_user(uuid, text) to authenticated;
grant execute on function public.admin_list_games(text, integer, integer) to authenticated;
grant execute on function public.admin_purge_user_history(uuid) to authenticated;
grant execute on function public.get_my_access() to authenticated;


-- (admin control + career security applied above)

-- public profile sections (see migrations/20260711190000_public_profile_sections.sql)

-- Public profile section toggles + career stats on public profiles
-- Run after 20260711180000_admin_control_security.sql

alter table public.profiles
  add column if not exists public_sections jsonb not null default '{
    "stats": true,
    "modes": true,
    "career": true,
    "box": true,
    "steam": true,
    "showcase": true
  }'::jsonb;

create or replace function public.normalize_public_sections(p jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  s jsonb := coalesce(p, '{}'::jsonb);
begin
  return jsonb_build_object(
    'stats', coalesce((s->>'stats')::boolean, true),
    'modes', coalesce((s->>'modes')::boolean, true),
    'career', coalesce((s->>'career')::boolean, true),
    'box', coalesce((s->>'box')::boolean, true),
    'steam', coalesce((s->>'steam')::boolean, true),
    'showcase', coalesce((s->>'showcase')::boolean, true)
  );
end;
$$;

revoke all on function public.normalize_public_sections(jsonb) from public;

create or replace function public.get_public_profile(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  p public.profiles%rowtype;
  is_friend boolean := false;
  is_self boolean;
  can_see boolean;
  stats public.user_stats%rowtype;
  badge_count integer := 0;
  sections jsonb;
  show_stats boolean;
  show_modes boolean;
  show_career boolean;
  show_box boolean;
  show_steam boolean;
  show_showcase boolean;
begin
  if p_id is null then return null; end if;

  select * into p from public.profiles where id = p_id;
  if not found then return null; end if;

  is_self := (uid is not null and uid = p.id);
  if uid is not null and not is_self then
    is_friend := exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = uid and f.addressee_id = p.id)
          or (f.requester_id = p.id and f.addressee_id = uid)
        )
    );
  end if;

  can_see := is_self or coalesce(p.profile_public, true) or is_friend;
  sections := public.normalize_public_sections(p.public_sections);

  -- Self always sees everything; friends/public respect section toggles
  if is_self then
    show_stats := true;
    show_modes := true;
    show_career := true;
    show_box := true;
    show_steam := true;
    show_showcase := true;
  elsif can_see then
    show_stats := coalesce((sections->>'stats')::boolean, true);
    show_modes := coalesce((sections->>'modes')::boolean, true);
    show_career := coalesce((sections->>'career')::boolean, true);
    show_box := coalesce((sections->>'box')::boolean, true);
    show_steam := coalesce((sections->>'steam')::boolean, true);
    show_showcase := coalesce((sections->>'showcase')::boolean, true);
  else
    show_stats := false;
    show_modes := false;
    show_career := false;
    show_box := false;
    show_steam := false;
    show_showcase := false;
  end if;

  select * into stats from public.user_stats where user_id = p.id;
  select count(*)::integer into badge_count from public.user_badges where user_id = p.id;

  return jsonb_build_object(
    'id', p.id,
    'nickname', p.nickname,
    'avatarId', coalesce(p.avatar_id, 'crosshair'),
    'avatarUrl', p.avatar_url,
    'profilePublic', coalesce(p.profile_public, true),
    'publicSections', sections,
    'private', not can_see,
    'showcaseBadge', case when show_showcase then p.showcase_badge else null end,
    'steamUrl', case when show_steam then p.steam_url else null end,
    'wins', case when show_stats then coalesce(stats.wins, 0) else null end,
    'games', case when show_stats then coalesce(stats.games, 0) else null end,
    'badgeCount', case when show_stats then badge_count else null end,
    'maxStreak', case when show_stats then coalesce(stats.max_streak, 0) else null end,
    'majorWins', case when show_modes then coalesce(stats.major_wins, 0) else null end,
    'duelWins', case when show_modes then coalesce(stats.duel_wins, 0) else null end,
    'partyWins', case when show_modes then coalesce(stats.party_wins, 0) else null end,
    'dailyWins', case when show_modes then coalesce(stats.daily_wins, 0) else null end,
    'boxWins', case when show_box then coalesce(stats.box_wins, 0) else null end,
    'bestDrop', case when show_box then stats.best_drop else null end,
    'careerMajorsWon', case when show_career then coalesce(stats.career_majors_won, 0) else null end,
    'careerBestSeason', case when show_career then coalesce(stats.career_best_season, 0) else null end,
    'careerSeasons', case when show_career then coalesce(stats.career_seasons, 0) else null end,
    'ultra', exists (
      select 1 from public.user_badges ub
      where ub.user_id = p.id and ub.badge_id = 'completionist'
    )
  );
end;
$$;

revoke all on function public.get_public_profile(uuid) from public;
grant execute on function public.get_public_profile(uuid) to anon, authenticated;

