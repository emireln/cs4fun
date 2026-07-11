-- Allow guests (no account) to join code lobbies and update ready/state.
-- Guest ids are local `p_…` strings, never auth UUIDs.

create or replace function public.join_room_guest(
  p_code text,
  p_guest_id text,
  p_nickname text default 'Guest'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  room public.rooms%rowtype;
  players jsonb;
  max_players integer;
  already boolean;
  nick text;
  gid text := lower(trim(coalesce(p_guest_id, '')));
begin
  if gid !~ '^p_[a-z0-9]{4,24}$' then
    raise exception 'invalid_guest' using errcode = '22023';
  end if;

  select * into room from public.rooms where code = upper(trim(p_code)) for update;
  if not found then raise exception 'room_not_found'; end if;
  if room.status is distinct from 'lobby' then
    raise exception 'room_not_joinable';
  end if;

  players := coalesce(room.payload->'players', '[]'::jsonb);
  max_players := coalesce(
    (room.payload->>'maxPlayers')::integer,
    case when room.mode in ('duel', 'box') then 2 else 6 end
  );
  already := exists (
    select 1 from jsonb_array_elements(players) el where lower(el->>'id') = gid
  );

  if not already then
    if jsonb_array_length(players) >= max_players then
      raise exception 'room_full';
    end if;
    nick := left(trim(coalesce(nullif(p_nickname, ''), 'Guest')), 16);
    players := players || jsonb_build_array(jsonb_build_object(
      'id', gid,
      'nickname', nick,
      'ready', false,
      'lineup', null,
      'power', 0,
      'isHost', false,
      'isGuest', true
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

create or replace function public.update_room_guest(
  p_code text,
  p_guest_id text,
  p_payload jsonb,
  p_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  room public.rooms%rowtype;
  is_member boolean;
  gid text := lower(trim(coalesce(p_guest_id, '')));
begin
  if gid !~ '^p_[a-z0-9]{4,24}$' then
    raise exception 'invalid_guest' using errcode = '22023';
  end if;

  select * into room from public.rooms where code = upper(trim(p_code));
  if not found then raise exception 'room_not_found'; end if;

  is_member := exists (
    select 1 from jsonb_array_elements(coalesce(room.payload->'players', '[]'::jsonb)) el
    where lower(el->>'id') = gid
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

revoke all on function public.join_room_guest from public;
revoke all on function public.update_room_guest from public;
grant execute on function public.join_room_guest to anon, authenticated;
grant execute on function public.update_room_guest to anon, authenticated;
