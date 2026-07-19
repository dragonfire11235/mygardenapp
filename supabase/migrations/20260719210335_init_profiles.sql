-- Auth-Fundament: profiles-Tabelle (1:1 zu auth.users) + RLS + Auto-Anlage.
--
-- Bewusst NUR profiles. Die 8 Entitäts-Tabellen (plants/beds/… mit user_id + RLS)
-- kommen mit dem späteren Sync-Paket, nicht hier — hält den Auth-Schritt klein.

-- 1) Tabelle: eine Zeile je Auth-User, id == auth.users.id
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is
  'App-Profil je Auth-User (Anzeige-Info). 1:1 zu auth.users.';

-- 2) Row Level Security: jeder sieht/ändert nur die eigene Zeile
alter table public.profiles enable row level security;

drop policy if exists "Profil lesen (nur eigenes)" on public.profiles;
create policy "Profil lesen (nur eigenes)"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Profil anlegen (nur eigenes)" on public.profiles;
create policy "Profil anlegen (nur eigenes)"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Profil ändern (nur eigenes)" on public.profiles;
create policy "Profil ändern (nur eigenes)"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 3) Auto-Anlage: bei jeder neuen Registrierung automatisch ein Profil erzeugen.
--    SECURITY DEFINER, damit der Trigger die RLS-Prüfung beim Insert umgehen darf.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
