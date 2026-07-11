-- Box Battle: career best drop + extra badge metrics
-- Run in Supabase SQL editor after prior migrations.

alter table public.user_stats
  add column if not exists box_gold_hits integer not null default 0,
  add column if not exists box_covert_hits integer not null default 0,
  add column if not exists box_opens integer not null default 0,
  add column if not exists box_best_value numeric not null default 0,
  add column if not exists best_drop jsonb;

insert into public.badge_defs (id, category, threshold, icon, sort_order) values
  ('box_first', 'box_wins', 1, 'package', 170),
  ('box_gold', 'box_gold_hits', 1, 'sparkles', 178),
  ('box_gold_3', 'box_gold_hits', 3, 'gem', 179),
  ('box_covert', 'box_covert_hits', 1, 'flame', 180),
  ('box_covert_10', 'box_covert_hits', 10, 'skull', 181),
  ('box_jackpot', 'box_best_value', 500, 'star', 182),
  ('box_opener', 'box_opens', 50, 'dices', 183)
on conflict (id) do nothing;

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
  v_round_gold integer := 0;
  v_round_covert integer := 0;
  v_round_opens integer := 0;
  v_drop_value numeric := 0;
  v_best jsonb;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform public.assert_not_banned(uid);

  if p_mode not in ('major', 'duel', 'party', 'daily', 'gauntlet', 'box') then
    raise exception 'invalid_mode';
  end if;

  score_c := public.clamp_int(p_score, 0, 1000000);
  p_wins := public.clamp_int(p_wins, 0, 50);
  p_losses := public.clamp_int(p_losses, 0, 50);
  p_streak := public.clamp_int(p_streak, 0, 100);

  if p_wins + p_losses > 16 then
    raise exception 'invalid_match_totals';
  end if;

  select nickname into nick from public.profiles where id = uid;
  nick := coalesce(nullif(trim(p_nickname), ''), nick, 'Player');

  v_round_gold := greatest(0, coalesce((p_meta->>'roundGold')::integer, 0));
  v_round_covert := greatest(0, coalesce((p_meta->>'roundCovert')::integer, 0));
  v_round_opens := greatest(0, coalesce((p_meta->>'roundOpens')::integer, 0));
  v_best := p_meta->'bestDrop';
  if v_best is not null and jsonb_typeof(v_best) = 'object' then
    v_drop_value := greatest(0, coalesce((v_best->>'value')::numeric, 0));
  end if;

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
    box_gold_hits = coalesce(box_gold_hits, 0) + case when p_mode = 'box' then v_round_gold else 0 end,
    box_covert_hits = coalesce(box_covert_hits, 0) + case when p_mode = 'box' then v_round_covert else 0 end,
    box_opens = coalesce(box_opens, 0) + case when p_mode = 'box' then v_round_opens else 0 end,
    box_best_value = case
      when p_mode = 'box' and v_drop_value > coalesce(box_best_value, 0) then v_drop_value
      else coalesce(box_best_value, 0)
    end,
    best_drop = case
      when p_mode = 'box' and v_drop_value > coalesce(box_best_value, 0) and v_best is not null then v_best
      else best_drop
    end,
    perfect_majors = perfect_majors + case when p_mode = 'major' and p_won and p_wins >= 3 and p_losses = 0 then 1 else 0 end,
    almanac_wins = almanac_wins + case when p_won and coalesce(p_meta->>'difficulty', '') = 'almanac' then 1 else 0 end,
    max_streak = greatest(max_streak, case when p_mode = 'gauntlet' then p_streak else 0 end),
    updated_at = now()
  where user_id = uid;

  -- Fix best_drop when value was equal path: re-read after update using greatest on value
  if p_mode = 'box' and v_best is not null and v_drop_value > 0 then
    update public.user_stats set
      best_drop = case
        when coalesce((best_drop->>'value')::numeric, 0) < v_drop_value then v_best
        when best_drop is null then v_best
        else best_drop
      end,
      box_best_value = greatest(coalesce(box_best_value, 0), v_drop_value)
    where user_id = uid;
  end if;

  v_board := coalesce(p_board, p_mode);
  if v_board not in ('daily', 'duel', 'gauntlet', 'major', 'party', 'box') then
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
      values (v_board, uid, nick, score_c, v_day, coalesce(p_meta, '{}'::jsonb))
      on conflict do nothing;
    end if;
  else
    update public.leaderboard
      set score = greatest(score, score_c),
          nickname = nick,
          meta = coalesce(p_meta, '{}'::jsonb),
          updated_at = now()
    where leaderboard.board = v_board and player_id = uid and day_key is null;
    get diagnostics updated = row_count;
    if updated = 0 then
      insert into public.leaderboard (board, player_id, nickname, score, day_key, meta)
      values (v_board, uid, nick, score_c, null, coalesce(p_meta, '{}'::jsonb))
      on conflict do nothing;
    end if;
  end if;

  select coalesce(array_agg(badge_id), '{}') into new_badges
  from (
    select ub.badge_id
    from public.user_badges ub
    where ub.user_id = uid
      and ub.earned_at >= now() - interval '2 seconds'
  ) x;

  perform public.award_badges(uid);

  select coalesce(array_agg(badge_id), '{}') into new_badges
  from (
    select ub.badge_id
    from public.user_badges ub
    where ub.user_id = uid
      and ub.earned_at >= now() - interval '3 seconds'
  ) x;

  return jsonb_build_object(
    'ok', true,
    'score', score_c,
    'board', v_board,
    'mode', p_mode,
    'new_badges', coalesce(new_badges, '{}')
  );
end;
$$;

grant execute on function public.submit_game_result to authenticated;

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

grant execute on function public.get_public_profile(uuid) to anon, authenticated;
