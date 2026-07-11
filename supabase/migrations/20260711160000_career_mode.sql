-- Career mode: replace gauntlet as the long-form signed-in org loop
-- Run in Supabase SQL editor after prior migrations.

-- ─── career_saves ─────────────────────────────────────────
create table if not exists public.career_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  season_score integer not null default 0,
  majors_won integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.career_saves enable row level security;

drop policy if exists "career_saves_select_own" on public.career_saves;
create policy "career_saves_select_own" on public.career_saves
  for select using (auth.uid() = user_id);

-- ─── user_stats career columns ────────────────────────────
alter table public.user_stats
  add column if not exists career_majors_won integer not null default 0;
alter table public.user_stats
  add column if not exists career_best_season integer not null default 0;
alter table public.user_stats
  add column if not exists career_seasons integer not null default 0;

-- ─── Allow career on history / leaderboard ────────────────
alter table public.game_history drop constraint if exists game_history_mode_check;
alter table public.game_history
  add constraint game_history_mode_check
  check (mode in ('major', 'duel', 'party', 'daily', 'gauntlet', 'box', 'career'));

alter table public.leaderboard drop constraint if exists leaderboard_board_check;
alter table public.leaderboard
  add constraint leaderboard_board_check
  check (board in ('daily', 'duel', 'gauntlet', 'major', 'party', 'box', 'career'));

-- ─── Career badges ────────────────────────────────────────
insert into public.badge_defs (id, category, threshold, icon, sort_order) values
  ('career_first_major', 'career_majors_won', 1, 'trophy', 220),
  ('career_major_3', 'career_majors_won', 3, 'crown', 221),
  ('career_season_1', 'career_seasons', 1, 'star', 222),
  ('career_season_5', 'career_seasons', 5, 'flame', 223),
  ('career_dynasty', 'career_best_season', 800, 'gem', 224)
on conflict (id) do nothing;

-- ─── RPCs ─────────────────────────────────────────────────
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

-- Patch award_badges for career metrics
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

-- Patch submit_game_result to accept career
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

  if p_wins + p_losses > 16 then
    raise exception 'invalid_match_totals';
  end if;

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
    'new_badges', new_badges
  );
end;
$$;
