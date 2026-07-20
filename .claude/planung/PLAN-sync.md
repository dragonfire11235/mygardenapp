# Plan: Geräte-Sync über Supabase (local-first, LWW) — Stand: 2026-07-20

## Ziel
Angemeldete Nutzer bekommen ihre Garten-Daten (Pflanzen, Beete, Bepflanzungen,
Aufgaben, Tagebuch, Geräte, Entdeckungen) über mehrere Geräte synchron. Local-first:
Die App funktioniert ohne Login unverändert offline; Sync ist additiv. Erfolg: Ein
Datensatz, den ich auf Gerät A anlege/ändere/lösche, erscheint nach einem Sync auch auf
Gerät B — inklusive Löschungen — ohne Datenverlust und ohne Duplikate.

## Projektkontext
- **Stack & Einstieg:** Vue 3 + TS + Vite PWA, Pinia, Dexie/IndexedDB, PrimeVue. Feature-Module
  unter `src/features/<name>/`, Datenschicht `src/data/` (Zugriff über `storage` aus
  `src/data/index.ts`). Auth ist fertig & live.
- **Wiederverwendbare Bausteine (mit Pfad):**
  - `src/data/supabase/client.ts` — `supabase` (Client) + `isSupabaseConfigured`. Sync läuft nur, wenn gesetzt.
  - `src/features/auth/authStore.ts` — `isAuthenticated`, `user`, `init()` hört bereits via
    `onAuthStateChange`. Hier wird der Login-Trigger angedockt.
  - `src/data/storage.ts` / `src/data/dexie/DexieProvider.ts` — Repository-Naht: `getAll` (filtert
    Tombstones RAUS), `bulkPut` (schreibt Zeilen 1:1, wendet `toPlainObject` an), `softDelete`.
  - `src/data/models.ts` — `BaseEntity` (id/createdAt/updatedAt/deletedAt), 7 Entitäten, `createEntity`/`touch`.
  - Pinia-Stores je Feature mit `load()` (`plantsStore`, `bedsStore`, `tasksStore`, `diaryStore`,
    `devicesStore`, `sightingsStore`, `bedsStore` für plantings) — nach Pull neu laden.
  - `SettingsPage.vue` Konto-Karte (`account-auth`-Block) — Heimat für Button + Sync-Status.
- **Projektregeln/Constraints (Pflicht):**
  - **Sync nutzt NIE `importAll`** (`DexieProvider.importAll` löscht alle Tabellen — bleibt nur „Backup wiederherstellen").
  - **Fotos sind NICHT Teil dieses Pakets** (Blobs, Egress-Kosten → hinter Paywall später). Foto-*Referenzen*
    (`photoId`/`photoIds`) synchronisieren mit; die Blobs fehlen auf anderen Geräten → Platzhalter. Bekannt & ok.
  - **Settings werden NICHT synchronisiert** (gerätespezifisch/foto-referenzierend; `plan` kommt später serverseitig).
  - Deutsche UI, englische Code-Bezeichner. `toPlainObject` macht der Storage-`put`/`bulkPut` automatisch.
  - ISO-UTC-Zeitstempel (`new Date().toISOString()`) vergleichen sich lexikografisch korrekt → LWW als String-Vergleich ok.

## Entscheidungen
- **Eine Server-Tabelle `sync_rows`** (`id, user_id, kind, updated_at, deleted_at, data jsonb`) statt
  einer Tabelle je Entität. Begründung: minimales SQL/RLS, kein camelCase→snake_case-Mapping, keine
  Server-Migration bei Modell-Feldänderungen (Feld liegt in `data`). Verworfen: Tabelle+Spalten je
  Entität (viel Boilerplate, Nutzen nur bei serverseitigen Abfragen, die wir nicht brauchen).
- **Voller bidirektionaler Abgleich** (pull alles + push alles) statt Delta-/Cursor-Sync. Begründung:
  Hobby-Datenmengen sind klein; einfachste tragfähige Lösung. Verworfen: Änderungs-Cursor/Realtime (zu groß).
- **Last-Write-Wins über `updatedAt`**, Löschen als Tombstone (`deletedAt`). Begründung: Soft-Delete ist
  überall vorhanden; deterministisch und als reine Funktion testbar. Verworfen: CRDTs (Overkill).
- **Merge als reine Funktion** (`mergeById`), getrennt von Netzwerk/DB. Begründung: unit-testbar ohne Supabase.
- **Auslöser: Login + App-Start + manueller Button** (kein Auto-Push nach jeder Änderung). Begründung:
  robust, kein Dauer-Hintergrundprozess; Änderungen fließen beim nächsten Öffnen/Sync. Verworfen:
  debounced Auto-Push (jede Mutation müsste den Sync anstoßen — mehr Komplexität; → BACKLOG).
- **Erst-Login-Migration braucht keinen Sonderpfad:** der normale Abgleich pusht lokale Daten hoch und
  merged Server-Daten runter; stabile UUIDs → per Upsert duplikatfrei.

## Arbeitspakete

### Block A — Server & Daten-Naht

#### AP01 — Supabase-Migration `sync_rows` (Tabelle + RLS)
- Hängt ab von: —
- Dateien: `supabase/migrations/<ts>_sync_rows.sql`
- Aufgabe: Tabelle `public.sync_rows` mit `id uuid primary key`, `user_id uuid not null default auth.uid()`,
  `kind text not null`, `updated_at timestamptz not null`, `deleted_at timestamptz`, `data jsonb not null`.
  Index auf `(user_id)`. RLS an; Policies select/insert/update/delete jeweils `auth.uid() = user_id`
  (Insert zusätzlich `with check`). Muster/Idempotenz wie `20260719210335_init_profiles.sql` (drop policy if exists).
- Abnahme: `npx supabase db push` läuft fehlerfrei; in einer authentifizierten Session liefert
  `select * from sync_rows` nur eigene Zeilen; ein fremder `user_id`-Insert wird von RLS abgelehnt.
- Verifikation: `npx supabase db push`; im Dashboard SQL-Editor (als eingeloggter User über die App getestet in AP05).

#### AP02 — Repository-Rohzugriff für Sync (`getAllForSync`)
- Hängt ab von: —
- Dateien: `src/data/storage.ts`, `src/data/dexie/DexieProvider.ts`, `src/data/dexie/DexieProvider.test.ts`
- Aufgabe: `Repository<T>` um `getAllForSync(): Promise<T[]>` erweitern — liefert **alle** Zeilen inklusive
  Tombstones (Gegenstück zu `getAll`, das `deletedAt !== null` rausfiltert). In `DexieRepository` = `this.table.toArray()`.
- Abnahme: Für eine soft-gelöschte Zeile liefert `getAll()` sie NICHT, `getAllForSync()` schon (Testfall).
- Verifikation: `npm test` (neuer DexieProvider-Test grün).

### Block B — Sync-Kern (netz-/DB-unabhängig testbar)

#### AP03 — Reine Merge-Funktion `mergeById`
- Hängt ab von: —
- Dateien: `src/features/sync/merge.ts`, `src/features/sync/merge.test.ts`
- Aufgabe: `mergeById(local: BaseEntity[], remote: BaseEntity[]): { applyLocal: BaseEntity[]; pushRemote: BaseEntity[] }`.
  Pro `id`: existiert nur eine Seite → gehört auf die andere. Beide Seiten → höheres `updatedAt` gewinnt
  (String-Vergleich); Gewinner ist Server → nach `applyLocal`, Gewinner ist lokal → nach `pushRemote`;
  gleich → nichts. Tombstones (`deletedAt` gesetzt) sind normale Zeilen (LWW zählt `updatedAt`).
- Abnahme: Tests decken ab: nur-lokal, nur-remote, remote-neuer, lokal-neuer, gleichstand, Tombstone-gewinnt-über-Edit.
- Verifikation: `npm test` (merge.test grün).

#### AP04 — Supabase-Sync-Client `syncRemote.ts`
- Hängt ab von: AP01
- Dateien: `src/features/sync/syncRemote.ts`
- Aufgabe: Reiner Server-Zugriff gegen `sync_rows` über den `supabase`-Client:
  `pullAll(): Promise<Record<Kind, BaseEntity[]>>` (select; RLS liefert nur eigene; gruppiert nach `kind`,
  Rückgabe = `data`-Objekte) und `pushRows(kind, entities): Promise<void>`
  (upsert `{ id, kind, updated_at: e.updatedAt, deleted_at: e.deletedAt, data: e }`, `onConflict: 'id'`).
  Wirft, wenn `supabase` null oder nicht angemeldet (Aufrufer prüft vorher).
- Abnahme: Typen kompilieren; `KINDS`-Konstante enthält genau die 7 Entitäten (plant, bed, planting, task,
  diary, device, sighting) — Fotos NICHT.
- Verifikation: `npm run build` fehlerfrei; Live-Round-Trip in AP05.

#### AP05 — Sync-Engine `syncEngine.ts`
- Hängt ab von: AP02, AP03, AP04
- Dateien: `src/features/sync/syncEngine.ts`
- Aufgabe: `runSync(): Promise<{ changedLocal: boolean }>`. Registry `kind → storage-Repository`. Ablauf:
  `pullAll()` + je Repo `getAllForSync()` → `mergeById` je Kind → lokale Gewinner via `repo.bulkPut(applyLocal)`
  schreiben, Server-Gewinner via `pushRows(kind, pushRemote)` hochladen. `changedLocal = true`, wenn irgendein
  `applyLocal` nichtleer war. **Nie `importAll`.** Reihenfolge der Kinds egal (keine FK-Constraints, nur ID-Referenzen).
- Abnahme: Nach `runSync()` gilt: jede lokal fehlende Server-Zeile ist in Dexie; jede nur lokal vorhandene Zeile
  ist am Server; bei konkurrierender Änderung steht überall die mit dem höheren `updatedAt`.
- Verifikation: Manueller Live-Test in AP08 (zwei Profile/Fenster). Kein isolierter Unit-Test nötig (Kern = AP03).

#### AP06 — Sync-Store `syncStore.ts`
- Hängt ab von: AP05
- Dateien: `src/features/sync/syncStore.ts`
- Aufgabe: Pinia-Store: `status: 'idle'|'syncing'|'error'`, `lastSyncedAt: string|null` (aus/nach
  `storage.getSetting/setSetting('lastSyncedAt')`, gerätelokal — NICHT gesynct), `errorMsg`.
  `syncNow(): Promise<void>` — guard (nur wenn `isSupabaseConfigured` && `authStore.isAuthenticated` &&
  status!=='syncing'); setzt status, ruft `runSync()`, bei `changedLocal` lädt es die betroffenen Feature-Stores
  neu (`plants/beds/tasks/diary/devices/sightings` `.load()`), schreibt `lastSyncedAt`, fängt Fehler → status 'error'.
- Abnahme: Doppelter `syncNow()`-Aufruf startet den Lauf nicht doppelt (status-Guard); nach erfolgreichem Lauf ist
  `lastSyncedAt` gesetzt und überlebt Reload.
- Verifikation: Live-Test in AP08.

### Block C — Auslöser & UI

#### AP07 — Auto-Sync bei Login und App-Start
- Hängt ab von: AP06
- Dateien: `src/App.vue`, `src/features/auth/authStore.ts`
- Aufgabe: (a) App-Start: in `App.vue` `onMounted` nach den `load()`s — wenn `authStore.isAuthenticated`,
  `void syncStore.syncNow()` (nicht awaiten, UI nicht blockieren). (b) Login: in `authStore` beim
  `onAuthStateChange`-Event `SIGNED_IN` einen Sync anstoßen (Callback/Hook, ohne Zirkularimport — z. B.
  Event bzw. `syncStore` lazy im Handler holen).
- Abnahme: Frisch eingeloggt startet genau ein Sync; App-Start als Angemeldeter startet genau ein Sync;
  als Nicht-Angemeldeter startet KEIN Sync (kein Supabase-Request).
- Verifikation: Live im Browser (Network-Panel: `sync_rows`-Request nur wenn angemeldet).

#### AP08 — Sync-UI in der Konto-Karte
- Hängt ab von: AP06
- Dateien: `src/features/settings/SettingsPage.vue`
- Aufgabe: Im `account-auth`-Block (nur wenn angemeldet) Button **„Jetzt synchronisieren"** (`@click="syncStore.syncNow()"`,
  disabled bei `status==='syncing'`, Spinner/Text „Synchronisiere …"), darunter Status: „Zuletzt synchronisiert: <relativ/Datum>"
  bzw. Fehlertext bei `status==='error'`. Stil wie die bestehenden `account-auth-actions`.
- Abnahme: Button sichtbar nur angemeldet; Klick löst Sync aus und aktualisiert die „Zuletzt"-Anzeige;
  bei Fehler erscheint eine verständliche Meldung; keine Konsolenfehler.
- Verifikation (End-to-End, zwei Sitzungen):
  1. `npm test` grün, `npm run build` fehlerfrei.
  2. Fenster A (Profil 1, angemeldet): Pflanze „SYNC-Test" anlegen → „Jetzt synchronisieren".
  3. Fenster B (gleiches Konto, anderer Origin/Port = leere Dexie): anmelden → App-Start-Sync → „SYNC-Test" erscheint.
  4. In B die Pflanze löschen → Sync; in A Sync → Pflanze ist auch in A weg (Tombstone).
  5. Danach committen + pushen (deutsche Message, `Co-Authored-By: Claude Opus 4.8`); Testdaten entfernen.

## Nicht in diesem Plan (→ BACKLOG.md)
- **Foto-Sync** (Blobs über Supabase Storage, hinter Paywall, aggressives Caching).
- **Settings-Sync** (später gezielter, ohne foto-referenzierende/gerätespezifische Keys).
- **Auto-Push nach jeder Änderung** (debounced) für schnellere Propagation ohne App-Neustart.
- **Tombstone-GC** (alte gelöschte Zeilen lokal & am Server irgendwann endgültig entfernen).
- **Batching/Pagination** beim Push/Pull, falls Datenmengen groß werden.
- `plan` (free/pro) serverseitig aus `subscriptions` statt lokal (kommt mit Stripe).

## Status
| AP | Titel | Status | Review |
|---|---|---|---|
| 01 | Migration `sync_rows` + RLS | umgesetzt (Datei; `db push` offen beim Nutzer) | — |
| 02 | Repository `getAllForSync` | umgesetzt | — |
| 03 | Reine Merge-Funktion `mergeById` | umgesetzt | — |
| 04 | Supabase-Sync-Client `syncRemote` | umgesetzt | — |
| 05 | Sync-Engine `syncEngine` | umgesetzt | — |
| 06 | Sync-Store `syncStore` | umgesetzt | — |
| 07 | Auto-Sync bei Login & App-Start | umgesetzt | — |
| 08 | Sync-UI in der Konto-Karte | umgesetzt | — |

Status-Werte: `offen` → `in Arbeit` → `umgesetzt` → `abgenommen` (nur durch Review, Phase 3).

## Umsetzungsbericht (2026-07-20)
Alle 8 Pakete direkt umgesetzt. `npm run build` + `vue-tsc` fehlerfrei, **127 Tests grün**
(neu: `merge.test.ts` 7 Fälle, `DexieProvider`-Test für `getAllForSync`). Boot-Smoke-Test im
Browser ohne Konsolenfehler (kein Zirkularimport durch `syncStore` → Feature-Stores).
Dateien: `supabase/migrations/20260720054825_sync_rows.sql`, `src/data/storage.ts` +
`src/data/dexie/DexieProvider.ts` (`getAllForSync`), `src/features/sync/{merge,merge.test,syncRemote,syncEngine,syncStore}.ts`,
`src/App.vue` (loadMeta + Auto-Sync + Login-Watcher), `src/features/settings/SettingsPage.vue` (Button + Status).
**Offen für Abnahme:** (1) `npx supabase db push` (Tabelle anlegen), (2) End-to-End-Zwei-Fenster-Test
mit echtem Konto (braucht Nutzer-Login; von mir nicht durchführbar, da kein Zugriff auf sein Konto).
