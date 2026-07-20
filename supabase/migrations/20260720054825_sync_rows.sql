-- Geräte-Sync: EINE Tabelle für alle Garten-Entitäten (local-first, LWW).
--
-- Jede Zeile ist eine Entität (Pflanze/Beet/…): Sync-Metadaten als Spalten,
-- der komplette Datensatz als JSONB in `data`. Kein Spalten-Mapping, keine
-- Server-Migration bei Modell-Feldänderungen. Merge = Last-Write-Wins über
-- updated_at, Löschen als Tombstone (deleted_at gesetzt). Fotos gehören NICHT
-- hierher (Blobs → später, hinter Paywall).

create table if not exists public.sync_rows (
  id         uuid not null,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind       text not null,      -- 'plant' | 'bed' | 'planting' | 'task' | 'diary' | 'device' | 'sighting'
  updated_at timestamptz not null,
  deleted_at timestamptz,        -- Tombstone, wenn gesetzt
  data       jsonb not null,     -- die ganze Entität (inkl. id/updatedAt/deletedAt)
  primary key (id)
);

comment on table public.sync_rows is
  'Sync-Zeilen je Nutzer (eine Zeile = eine Garten-Entität als JSONB). LWW über updated_at.';

create index if not exists sync_rows_user_idx on public.sync_rows (user_id);

-- Row Level Security: jeder sieht/ändert nur die eigenen Zeilen.
alter table public.sync_rows enable row level security;

drop policy if exists "Sync lesen (nur eigene)" on public.sync_rows;
create policy "Sync lesen (nur eigene)"
  on public.sync_rows for select
  using (auth.uid() = user_id);

drop policy if exists "Sync anlegen (nur eigene)" on public.sync_rows;
create policy "Sync anlegen (nur eigene)"
  on public.sync_rows for insert
  with check (auth.uid() = user_id);

drop policy if exists "Sync ändern (nur eigene)" on public.sync_rows;
create policy "Sync ändern (nur eigene)"
  on public.sync_rows for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Sync löschen (nur eigene)" on public.sync_rows;
create policy "Sync löschen (nur eigene)"
  on public.sync_rows for delete
  using (auth.uid() = user_id);
