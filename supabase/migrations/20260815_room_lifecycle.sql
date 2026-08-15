-- Room lifecycle: leave room (transfer host / delete when empty) + stale-room sweep.

-- Leave a room. Signed-in users identify via auth.uid(); guests pass p_guest_id.
-- If the host leaves and players remain, host transfers to the first remaining player.
-- If no players remain, the room row is deleted.
create or replace function public.leave_room(p_code text, p_guest_id text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  room public.rooms%rowtype;
  remaining jsonb;
  pid text;
  new_host uuid;
  member boolean;
begin
  select * into room from public.rooms where code = upper(trim(p_code)) for update;
  if not found then return null; end if;

  if p_guest_id is not null and p_guest_id <> '' then
    pid := lower(trim(p_guest_id));
    if pid !~ '^p_[a-z0-9]{4,24}$' then
      raise exception 'invalid_guest' using errcode = '22023';
    end if;
    member := exists (
      select 1 from jsonb_array_elements(coalesce(room.payload->'players', '[]'::jsonb)) el
      where lower(el->>'id') = pid
    );
    if not member then return null; end if;
  else
    if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
    pid := uid::text;
    member := (room.host_id = uid) or exists (
      select 1 from jsonb_array_elements(coalesce(room.payload->'players', '[]'::jsonb)) el
      where el->>'id' = uid::text
    );
    if not member then return null; end if;
  end if;

  remaining := (
    select coalesce(jsonb_agg(el), '[]'::jsonb)
    from jsonb_array_elements(coalesce(room.payload->'players', '[]'::jsonb)) el
    where lower(el->>'id') <> lower(pid)
  );

  if jsonb_array_length(remaining) = 0 then
    delete from public.rooms where code = room.code;
    return null;
  end if;

  if room.host_id::text = pid then
    select (el->>'id')::uuid into new_host from jsonb_array_elements(remaining) el limit 1;
    remaining := (
      select coalesce(jsonb_agg(
        case when el->>'id' = new_host::text then el || '{"isHost": true}'::jsonb else el end
      ), '[]'::jsonb)
      from jsonb_array_elements(remaining) el
    );
    update public.rooms set
      payload = jsonb_set(coalesce(room.payload, '{}'::jsonb), '{players}', remaining, true),
      host_id = new_host,
      updated_at = now()
    where code = room.code
    returning * into room;
  else
    update public.rooms set
      payload = jsonb_set(coalesce(room.payload, '{}'::jsonb), '{players}', remaining, true),
      updated_at = now()
    where code = room.code
    returning * into room;
  end if;

  return to_jsonb(room);
end;
$$;

-- Opportunistic sweep: drop old lobby/finished rooms so codes and rows don't accumulate.
create or replace function public.sweep_stale_rooms(p_hours integer default 2)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  delete from public.rooms
  where status in ('lobby', 'finished')
    and updated_at < now() - make_interval(hours => greatest(1, p_hours));
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.leave_room from public;
revoke all on function public.sweep_stale_rooms from public;
grant execute on function public.leave_room to anon, authenticated;
grant execute on function public.sweep_stale_rooms to anon, authenticated;
