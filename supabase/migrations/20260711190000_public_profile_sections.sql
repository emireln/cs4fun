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
