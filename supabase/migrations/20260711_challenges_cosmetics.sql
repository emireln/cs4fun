-- Engagement roadmap: challenges, streak rewards, and cosmetics.

alter table public.profiles add column if not exists equipped_title text;
alter table public.profiles add column if not exists equipped_frame text;

create table if not exists public.challenge_defs (
  id text primary key,
  tier text not null default 'easy',
  event text not null,
  target integer not null default 1,
  label_key text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_challenges (
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id text not null references public.challenge_defs(id) on delete cascade,
  week_key text not null,
  progress integer not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, challenge_id, week_key)
);

create table if not exists public.streak_rewards (
  id text primary key,
  day_count integer not null,
  cosmetic_id text,
  label_key text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_cosmetics (
  user_id uuid not null references auth.users(id) on delete cascade,
  cosmetic_id text not null,
  kind text not null default 'title',
  equipped boolean not null default false,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, cosmetic_id)
);

alter table public.challenge_defs enable row level security;
alter table public.user_challenges enable row level security;
alter table public.streak_rewards enable row level security;
alter table public.user_cosmetics enable row level security;

drop policy if exists "challenge defs readable" on public.challenge_defs;
create policy "challenge defs readable"
  on public.challenge_defs for select
  using (active = true);

drop policy if exists "streak rewards readable" on public.streak_rewards;
create policy "streak rewards readable"
  on public.streak_rewards for select
  using (true);

drop policy if exists "user challenges own rows" on public.user_challenges;
create policy "user challenges own rows"
  on public.user_challenges for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user cosmetics own rows" on public.user_cosmetics;
create policy "user cosmetics own rows"
  on public.user_cosmetics for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into public.challenge_defs (id, tier, event, target, label_key)
values
  ('play_3', 'easy', 'game_played', 3, 'challenges.play3'),
  ('open_5', 'easy', 'cases_opened', 5, 'challenges.open5'),
  ('win_daily', 'medium', 'daily_win', 1, 'challenges.winDaily'),
  ('win_duel', 'medium', 'duel_win', 1, 'challenges.winDuel'),
  ('win_box', 'medium', 'box_win', 1, 'challenges.winBox'),
  ('gauntlet_5', 'spicy', 'gauntlet_streak', 5, 'challenges.gauntlet5'),
  ('box_covert', 'spicy', 'box_covert', 1, 'challenges.boxCovert'),
  ('career_major', 'spicy', 'career_major_final', 1, 'challenges.careerMajor'),
  ('friend_2', 'medium', 'friend_match', 2, 'challenges.friend2')
on conflict (id) do update set
  tier = excluded.tier,
  event = excluded.event,
  target = excluded.target,
  label_key = excluded.label_key,
  active = true;

insert into public.streak_rewards (id, day_count, cosmetic_id, label_key)
values
  ('streak_3', 3, 'title_streak3', 'cosmetics.titleStreak3'),
  ('streak_7', 7, 'frame_gold', 'cosmetics.frameGold'),
  ('streak_14', 14, 'frame_fire', 'cosmetics.frameFire')
on conflict (id) do update set
  day_count = excluded.day_count,
  cosmetic_id = excluded.cosmetic_id,
  label_key = excluded.label_key;

create or replace function public.get_weekly_challenges()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(d) order by d.tier, d.id), '[]'::jsonb)
  from public.challenge_defs d
  where d.active = true;
$$;

create or replace function public.report_challenge_progress(
  p_challenge_id text,
  p_week_key text,
  p_amount integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  target_amount integer;
  row_out public.user_challenges;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select target into target_amount from public.challenge_defs where id = p_challenge_id and active = true;
  if target_amount is null then
    return jsonb_build_object('ok', false, 'error', 'missing_challenge');
  end if;

  insert into public.user_challenges (user_id, challenge_id, week_key, progress, completed_at)
  values (
    uid,
    p_challenge_id,
    coalesce(nullif(p_week_key, ''), to_char(now() at time zone 'utc', 'IYYY-"W"IW')),
    greatest(0, coalesce(p_amount, 1)),
    case when greatest(0, coalesce(p_amount, 1)) >= target_amount then now() else null end
  )
  on conflict (user_id, challenge_id, week_key)
  do update set
    progress = least(target_amount, public.user_challenges.progress + greatest(0, coalesce(p_amount, 1))),
    completed_at = case
      when public.user_challenges.completed_at is not null then public.user_challenges.completed_at
      when public.user_challenges.progress + greatest(0, coalesce(p_amount, 1)) >= target_amount then now()
      else null
    end,
    updated_at = now()
  returning * into row_out;

  return jsonb_build_object('ok', true, 'challenge', to_jsonb(row_out));
end;
$$;

create or replace function public.equip_cosmetic(p_cosmetic_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cosmetic_kind text;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  cosmetic_kind := case
    when p_cosmetic_id like 'frame_%' then 'frame'
    when p_cosmetic_id like 'ring_%' then 'ring'
    else 'title'
  end;

  insert into public.user_cosmetics (user_id, cosmetic_id, kind, equipped)
  values (uid, p_cosmetic_id, cosmetic_kind, true)
  on conflict (user_id, cosmetic_id)
  do update set equipped = true;

  update public.user_cosmetics
  set equipped = false
  where user_id = uid and kind = cosmetic_kind and cosmetic_id <> p_cosmetic_id;

  if cosmetic_kind = 'title' then
    update public.profiles set equipped_title = p_cosmetic_id, updated_at = now() where id = uid;
  elsif cosmetic_kind = 'frame' then
    update public.profiles set equipped_frame = p_cosmetic_id, updated_at = now() where id = uid;
  end if;

  return jsonb_build_object('ok', true, 'cosmeticId', p_cosmetic_id, 'kind', cosmetic_kind);
end;
$$;

create or replace function public.claim_streak_reward(p_reward_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  reward public.streak_rewards;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into reward from public.streak_rewards where id = p_reward_id;
  if reward.id is null then
    return jsonb_build_object('ok', false, 'error', 'missing_reward');
  end if;

  if reward.cosmetic_id is not null then
    insert into public.user_cosmetics (user_id, cosmetic_id, kind, equipped)
    values (
      uid,
      reward.cosmetic_id,
      case when reward.cosmetic_id like 'frame_%' then 'frame' when reward.cosmetic_id like 'ring_%' then 'ring' else 'title' end,
      false
    )
    on conflict (user_id, cosmetic_id) do nothing;
  end if;

  return jsonb_build_object('ok', true, 'reward', to_jsonb(reward));
end;
$$;

revoke all on function public.get_weekly_challenges() from public;
revoke all on function public.report_challenge_progress(text, text, integer) from public;
revoke all on function public.equip_cosmetic(text) from public;
revoke all on function public.claim_streak_reward(text) from public;

grant execute on function public.get_weekly_challenges() to authenticated;
grant execute on function public.report_challenge_progress(text, text, integer) to authenticated;
grant execute on function public.equip_cosmetic(text) to authenticated;
grant execute on function public.claim_streak_reward(text) to authenticated;
