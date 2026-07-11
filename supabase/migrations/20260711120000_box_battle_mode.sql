-- Box Battle mode: rooms, invites, history, leaderboard, stats, badges
alter table public.user_stats
  add column if not exists box_wins integer not null default 0;

insert into public.badge_defs (id, category, threshold, icon, sort_order) values
  ('box_3', 'box_wins', 3, 'package', 145),
  ('box_10', 'box_wins', 10, 'gem', 146),
  ('box_whale', 'box_wins', 25, 'crown', 147)
on conflict (id) do update set
  category = excluded.category,
  threshold = excluded.threshold,
  icon = excluded.icon,
  sort_order = excluded.sort_order;

-- Relax CHECK constraints to include 'box'
do $$
declare
  r record;
begin
  for r in
    select con.conname, rel.relname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname in ('game_history', 'leaderboard', 'rooms', 'friend_invites')
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%mode%'
  loop
    execute format('alter table public.%I drop constraint if exists %I', r.relname, r.conname);
  end loop;

  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'leaderboard'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%board%'
  loop
    execute format('alter table public.leaderboard drop constraint if exists %I', r.conname);
  end loop;
end $$;

alter table public.game_history
  add constraint game_history_mode_check
  check (mode in ('major', 'duel', 'party', 'daily', 'gauntlet', 'box'));

alter table public.leaderboard
  add constraint leaderboard_board_check
  check (board in ('daily', 'duel', 'gauntlet', 'major', 'party', 'box'));

alter table public.rooms
  add constraint rooms_mode_check
  check (mode in ('party', 'duel', 'box'));

alter table public.friend_invites
  add constraint friend_invites_mode_check
  check (mode in ('duel', 'party', 'box'));

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

revoke all on function public.create_room from public;
grant execute on function public.create_room to authenticated;

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
    box_wins = box_wins + case when p_mode = 'box' and p_won then 1 else 0 end,
    perfect_majors = perfect_majors + case when p_mode = 'major' and p_won and p_wins >= 3 and p_losses = 0 then 1 else 0 end,
    almanac_wins = almanac_wins + case when p_won and coalesce(p_meta->>'difficulty', '') = 'almanac' then 1 else 0 end,
    max_streak = greatest(max_streak, case when p_mode = 'gauntlet' then p_streak else 0 end),
    updated_at = now()
  where user_id = uid;

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

  return jsonb_build_object(
    'ok', true,
    'score', score_c,
    'board', v_board,
    'mode', p_mode
  );
end;
$$;

revoke all on function public.submit_game_result from public;
grant execute on function public.submit_game_result to authenticated;
