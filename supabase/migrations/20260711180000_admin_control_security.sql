-- Admin control expansion + career/auth hardening
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
