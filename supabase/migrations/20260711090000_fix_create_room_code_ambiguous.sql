-- Fix: PL/pgSQL variable `code` shadowed rooms.code → "column reference code is ambiguous"
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
  if p_mode not in ('party', 'duel') then raise exception 'invalid_mode'; end if;

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
