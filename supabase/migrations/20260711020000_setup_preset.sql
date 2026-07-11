-- Setup preset: skip ModeSetup when enabled (signed-in profiles)
alter table public.profiles add column if not exists setup_preset_enabled boolean not null default false;
alter table public.profiles add column if not exists setup_preset_mode text;
alter table public.profiles add column if not exists setup_preset_mentality text;
alter table public.profiles add column if not exists setup_preset_map text;

do $$
begin
  alter table public.profiles drop constraint if exists profiles_setup_preset_mode_ok;
  alter table public.profiles
    add constraint profiles_setup_preset_mode_ok
    check (setup_preset_mode is null or setup_preset_mode in ('classic', 'almanac'));
exception when others then null;
end $$;

do $$
begin
  alter table public.profiles drop constraint if exists profiles_setup_preset_mentality_ok;
  alter table public.profiles
    add constraint profiles_setup_preset_mentality_ok
    check (
      setup_preset_mentality is null
      or setup_preset_mentality in ('aggressive', 'tactical', 'loose')
    );
exception when others then null;
end $$;

do $$
begin
  alter table public.profiles drop constraint if exists profiles_setup_preset_map_ok;
  alter table public.profiles
    add constraint profiles_setup_preset_map_ok
    check (
      setup_preset_map is null
      or setup_preset_map in (
        'Mirage', 'Inferno', 'Nuke', 'Ancient', 'Anubis', 'Dust2', 'Overpass', 'Cache'
      )
    );
exception when others then null;
end $$;
