-- Allow auction/survivor game modes, leaderboard boards, and rematch room status.

alter table public.game_history drop constraint if exists game_history_mode_check;
alter table public.game_history
  add constraint game_history_mode_check
  check (mode in ('major', 'duel', 'party', 'daily', 'gauntlet', 'box', 'career', 'auction', 'survivor'));

alter table public.leaderboard drop constraint if exists leaderboard_board_check;
alter table public.leaderboard
  add constraint leaderboard_board_check
  check (board in ('daily', 'duel', 'gauntlet', 'major', 'party', 'box', 'career', 'auction', 'survivor'));

alter table public.rooms drop constraint if exists rooms_status_check;
alter table public.rooms
  add constraint rooms_status_check
  check (status in ('lobby', 'drafting', 'reveal', 'finished', 'rematch'));

-- Re-apply submit_game_result from schema.sql after this migration
-- (allow-list includes auction + survivor). Full function lives in schema.sql.
-- Minimal live patch: recreate validation by re-running the function body from schema.
-- Operators should re-run supabase/schema.sql after pull, or at least the
-- submit_game_result definition there.


-- Patched submit_game_result allow-list
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

  if p_mode not in ('major', 'duel', 'party', 'daily', 'gauntlet', 'box', 'career', 'auction', 'survivor') then
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
  if v_board not in ('daily', 'duel', 'gauntlet', 'major', 'party', 'box', 'career', 'auction', 'survivor') then
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

