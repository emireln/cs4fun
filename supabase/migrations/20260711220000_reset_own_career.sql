-- Player-facing: wipe own career save + career leaderboard/stats (irreversible).
create or replace function public.reset_own_career()
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
  perform public.assert_not_banned(uid);

  delete from public.career_saves where user_id = uid;
  delete from public.leaderboard where player_id = uid and board = 'career';
  update public.user_stats set
    career_majors_won = 0,
    career_best_season = 0,
    career_seasons = 0,
    updated_at = now()
  where user_id = uid;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.reset_own_career() from public;
grant execute on function public.reset_own_career() to authenticated;
revoke all on function public.reset_own_career() from anon;
