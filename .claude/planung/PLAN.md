# Plan: Handy-Nutzung + Supabase-Sync (Stand: 2026-07-07)

## Ziel
Zwei aufeinanderfolgende Vorhaben für die Garten-PWA:
1. **Handy-Nutzung & Installation** — die App über einen Cloudflare-Tunnel per HTTPS am Handy nutzen und als PWA installieren (offline-fähig).
2. **Supabase-Backend (Sync)** — Daten in die Cloud spiegeln, damit Handy und PC denselben Stand zeigen und nichts mehr durch gelöschte Browser-Daten verloren geht.

Erfolg: (1) Die App lässt sich am Handy über eine `https://…trycloudflare.com`-URL installieren und läuft offline. (2) Eine auf Gerät A angelegte/geänderte/gelöschte Pflanze erscheint nach Sync identisch auf Gerät B.

## Projektkontext
- **Projektpfad:** `C:\Users\Drago\MyGardenApp` (der Lumio-Ordner ist ein anderes Projekt, ignorieren).
- **Stack & Einstiegspunkte:** Vue 3 + TypeScript + Vite · Pinia · Vue Router · Dexie (IndexedDB) · PrimeVue · vite-plugin-pwa. Einstieg `src/main.ts`, Shell `src/App.vue`, Routen `src/router.ts`. Feature-Module unter `src/features/<name>/`. UI-Texte Deutsch, Code-Bezeichner Englisch.
- **Wiederverwendbare Bausteine (mit Pfad):**
  - `src/data/storage.ts` — `StorageProvider` + `Repository<T>` + `BackupData` (`exportAll`/`importAll`). **Gegen dieses Interface wird gebaut.**
  - `src/data/index.ts` — `export const storage = new DexieProvider()`. Hier wird Sync/Provider verdrahtet.
  - `src/data/dexie/DexieProvider.ts` — Vorbild für Query-Muster; bleibt der lokale Speicher.
  - `src/data/models.ts` — Entitäten erben `BaseEntity` (`id` UUID, `createdAt`, `updatedAt`, `deletedAt`). Helfer `createEntity()` / `touch()`. Löschen ist **Soft-Delete** (`deletedAt` gesetzt) — genau dafür gedacht, damit Sync funktioniert.
  - `src/data/clone.ts` — `toPlainObject()`. **Pflicht vor jedem Schreibzugriff** auf persistente Speicher (Dexie und Supabase-Payloads): Vue-Reactivity-Proxys sind sonst nicht klonbar (DataCloneError). Blobs/Dates bleiben erhalten.
  - `src/data/blobCodec.ts` — Blob↔Base64 (für Foto-Handling/Migration).
  - `src/data/backup.ts` — `downloadBackup`/`importBackupFile`; Vorbild für die Erststart-Migration.
  - `src/features/settings/settingsStore.ts` + `SettingsPage.vue` — Ort für Installier-Button, Login-UI und Sync-Status.
  - `vite.config.ts` — `VitePWA({ registerType: 'autoUpdate' })` (Service Worker wird automatisch registriert); `server`/`preview`-Config inkl. Trefle-Proxy.
- **Projektregeln/Constraints:**
  - Nur über das `StorageProvider`-Interface gehen; Features nie an Dexie/Supabase direkt koppeln.
  - `toPlainObject()` vor jedem persistierenden Schreibzugriff verwenden.
  - **Keine Geheimnisse committen.** Supabase-Zugang über `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` aus einer **gitignore-ten `.env`**. Der anon key ist öffentlich-unkritisch, der Schutz läuft über RLS. Trefle-Token liegt weiterhin in den App-Einstellungen (IndexedDB), nie im Code.
  - Trefle-Proxy existiert nur in `vite dev`/`preview` (`vite.config.ts`); der Tunnel muss deshalb auf einen dieser Server zeigen.
  - Tests: Vitest (Datenschicht + Engines), `fake-indexeddb` als Setup. Prüfbefehle: `npm test`, `npm run build`, `npm run dev` / `npm run preview`.

## Entscheidungen
- **Handy-HTTPS via Cloudflare-Tunnel** (Nutzerwahl) — liefert eine vertrauenswürdige URL fürs Handy ohne Zertifikat-Fummeln. Verworfen: mkcert (lokal, aber Wurzel-CA muss am Handy vertraut werden); reines LAN-HTTP (kein Installieren/Offline möglich).
- **Tunnel zeigt auf `npm run preview` (Produktions-Build), nicht auf den Dev-Server** — nur im Build existiert der echte Service Worker (Offline/Installieren). Verworfen: Dev-Server (SW nur über devOptions, HMR über Tunnel fragil).
- **Vite `allowedHosts` um `.trycloudflare.com` erweitern** — sonst blockt Vite die Tunnel-Anfrage („Blocked request. This host is not allowed.").
- **Lokal-first bleibt; Supabase ist nur Sync-Ziel.** Konfliktlösung Last-Write-Wins pro Datensatz über `updatedAt`, Löschen über `deletedAt`. Begründung: erhält die Offline-Fähigkeit (Kernwert der PWA) und nutzt die schon vorhandenen sync-tauglichen Felder. Verworfen: reiner Online-`SupabaseProvider` (einfacher, aber Offline ginge verloren); CRDT/Realtime (Overkill für einen Nutzer mit zwei Geräten).
- **Auth: Magic-Link (passwortlos) per E-Mail.** Kein Passwort-Handling, für Einzelnutzer am einfachsten. Verworfen: E-Mail+Passwort (mehr UI + Recovery-Aufwand).

## Arbeitspakete

### Block A — Handy-Nutzung & Installation

#### AP01 — LAN- & Tunnel-Zugang
- Hängt ab von: —
- Dateien: `vite.config.ts`, `package.json` (Skripte), `README.md`
- Aufgabe: Dev- und Preview-Server im LAN erreichbar machen (`server.host = true`, `preview.host = true`) und Tunnel-Hosts erlauben (`server.allowedHosts` / `preview.allowedHosts` = `['.trycloudflare.com']`). npm-Skript zum Previewen des Builds; dokumentierter Befehl `cloudflared tunnel --url http://localhost:4173`. cloudflared-Installation (winget/scoop/Direkt-Download) im README beschreiben.
- Abnahme: `npm run build && npm run preview` startet; `cloudflared tunnel --url http://localhost:4173` gibt eine `https://…trycloudflare.com`-URL aus; diese URL auf einem zweiten Gerät geöffnet zeigt die App ohne „Blocked request"; die Trefle-Suche liefert über die Tunnel-URL Treffer.
- Verifikation: obige Befehle; Tunnel-URL auf Handy/zweitem Gerät öffnen, Pflanzen-Seite lädt, Trefle-Suche testen.

#### AP02 — PWA installierbar & offline
- Hängt ab von: AP01
- Dateien: ggf. `vite.config.ts` (Manifest-Feinschliff) — sonst Prüf-/Doku-Paket
- Aufgabe: Sicherstellen, dass über die Tunnel-Preview der Service Worker registriert wird und die App die Installier-Kriterien erfüllt (Manifest + Icons vorhanden). Falls DevTools/Lighthouse Mängel zeigen, Manifest/Icons nachbessern.
- Abnahme: Auf der Tunnel-URL bietet Chrome „Installieren" bzw. „Zum Startbildschirm" an; nach Installation startet die App im Standalone-Modus (ohne Browserleiste); im Flugmodus lädt die zuvor geöffnete App weiter (Offline); DevTools → Application zeigt Manifest ohne Fehler und Service Worker „activated".
- Verifikation: Chrome DevTools (Application-Tab), Installation durchführen, Offline-/Flugmodus-Test.

#### AP03 — In-App „Installieren"-Button
- Hängt ab von: AP01
- Dateien: neu `src/features/settings/usePwaInstall.ts`, `src/features/settings/SettingsPage.vue`
- Aufgabe: `beforeinstallprompt` global abfangen (Composable, früh registriert) und gespeichertes Event halten; Button „App installieren" in den Einstellungen, der `prompt()` auslöst; Button nur sichtbar, solange installierbar und nicht bereits installiert (`appinstalled`-Event bzw. `matchMedia('(display-mode: standalone)')`). Auf iOS (kein Event) statt Button ein kurzer Hinweis „Über Teilen → Zum Home-Bildschirm".
- Abnahme: In installierbarem Chrome erscheint der Button in den Einstellungen; Klick öffnet den nativen Installationsdialog; nach Installation / im Standalone-Modus ist der Button verborgen; `npx vue-tsc -b` fehlerfrei.
- Verifikation: `npm run build && npm run preview` über Tunnel; Button-Sichtbarkeit vor/nach Installation prüfen.

### Block B — Supabase-Backend (Sync)

#### AP04 — Supabase-Projekt, Schema & RLS
- Hängt ab von: — (Vorbedingung: Nutzer legt ein kostenloses Supabase-Projekt an und trägt `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in `.env` ein)
- Dateien: neu `supabase/schema.sql`, `.env.example`, `.gitignore` (Eintrag `.env`), `README.md`
- Aufgabe: SQL-Skript mit je einer Tabelle pro Entität (`plants`, `beds`, `plantings`, `tasks`, `diary`, `devices`) + `settings` (key/value pro User) + `photos` (Metadaten; Blob im Storage). Spalten passend zu `src/data/models.ts` (Namenskonvention 1:1 zu den TS-Feldern wählen und dokumentieren), plus `user_id uuid default auth.uid()`. RLS aktiviert; Policies „User sieht/ändert nur eigene Zeilen". Storage-Bucket `photos` mit user-basierter Policy.
- Abnahme: Skript läuft im Supabase-SQL-Editor fehlerfrei; als eingeloggter Test-User lässt sich eine `plants`-Zeile anlegen und lesen; ein Zugriff auf eine Zeile mit fremder `user_id` liefert leer (RLS greift, per Testquery belegt).
- Verifikation: SQL im Dashboard ausführen; RLS mit zwei Test-Usern gegenprüfen.

#### AP05 — Supabase-Client + Auth (Magic Link)
- Hängt ab von: AP04
- Dateien: `package.json` (`@supabase/supabase-js`), neu `src/data/supabase/client.ts`, neu `src/features/auth/authStore.ts`, neu `src/features/auth/AuthPanel.vue` (oder Abschnitt in `SettingsPage.vue`), `src/App.vue` (Session beim Start laden)
- Aufgabe: Supabase-Client aus den `VITE_`-Env-Werten erzeugen; Magic-Link-Login (E-Mail → Link → eingeloggt); Session persistent; Logout; Statusanzeige „eingeloggt als …" in den Einstellungen.
- Abnahme: E-Mail eingeben → Supabase-Mail kommt an → Link öffnet die App eingeloggt; `authStore.userId` gesetzt; nach Reload weiterhin eingeloggt; Logout leert die Session. Ohne gesetzte `.env` startet die App normal im reinen Lokal-Modus (kein Absturz).
- Verifikation: `npm run dev`; echten Magic-Link-Flow mit einer E-Mail durchspielen; Reload/Logout prüfen; `npx vue-tsc -b` fehlerfrei.

#### AP06 — Sync-Engine (Push/Pull, Last-Write-Wins)
- Hängt ab von: AP05
- Dateien: neu `src/data/supabase/SyncService.ts`, Einbindung in `src/data/index.ts` bzw. Stores, Sync-Status in `settingsStore.ts`
- Aufgabe: Lokal-first-Sync für die sechs Entitäts-Tabellen + `settings`. **Pull:** alle Remote-Zeilen des Users laden, je Datensatz nach `updatedAt` mit dem lokalen Stand vergleichen, den neueren übernehmen (inkl. `deletedAt`). **Push:** lokal seit dem letzten Sync geänderte Datensätze nach Supabase upserten (`toPlainObject()` vor dem Senden). Kein Realtime; Auslöser: nach Login, per Button, optional Intervall. Die Merge-/LWW-Entscheidung in eine reine, testbare Funktion auslagern.
- Abnahme: Gerät A legt eine Pflanze an → Sync → Gerät B (anderer Browser, gleicher Login) → Sync → Pflanze erscheint. Namensänderung auf B → Sync → auf A erscheint der neuere Name. Soft-Delete auf A → Sync → auf B verschwindet die Pflanze. Bei zwei Änderungen gewinnt die mit dem größeren `updatedAt`.
- Verifikation: zwei Browser-Profile mit gleichem Login; Szenarien durchspielen; Vitest-Unit-Test der Merge-Funktion (LWW + `deletedAt`).

#### AP07 — Foto-Sync über Supabase Storage
- Hängt ab von: AP06
- Dateien: `src/data/supabase/SyncService.ts` bzw. neu `src/data/supabase/photoSync.ts`
- Aufgabe: Foto-Blobs in den Bucket `photos` hochladen (Pfad `${userId}/${photoId}`), Metadaten in Tabelle `photos`; beim Pull fehlende Blobs herunterladen und lokal (Dexie `photos`) ablegen. Bestehendes `Photo`-Modell/`blobCodec` nutzen.
- Abnahme: Tagebuch-Foto auf Gerät A → Sync → auf Gerät B wird das Bild im Eintrag angezeigt (aus dem Storage geladen). Löschen des Eintrags entfernt das Foto lokal; das Storage-Objekt wird spätestens beim nächsten Sync bereinigt.
- Verifikation: zwei Browser; Foto anlegen/synchronisieren/anzeigen; Upload im Storage-Bucket des Dashboards prüfen.

#### AP08 — Erststart-Migration + Auto-Sync
- Hängt ab von: AP06, AP07
- Dateien: `src/data/supabase/SyncService.ts`, `src/App.vue` (Auto-Sync bei Start), `src/features/settings/SettingsPage.vue` („Jetzt synchronisieren" + Zeitpunkt des letzten Syncs)
- Aufgabe: Beim ersten Login mit vorhandenen Lokaldaten diese nach Supabase hochladen — dank stabiler UUIDs per Upsert **ohne Duplikate**. Danach Auto-Sync bei App-Start und nach Login, manueller Button, Anzeige „zuletzt synchronisiert um …". Fehler (offline/kein Login) sauber abfangen; die App bleibt lokal nutzbar.
- Abnahme: Frischer Login auf Gerät A mit bestehenden Beeten/Pflanzen → nach Sync stimmt die Zeilenzahl in Supabase mit der lokalen Anzahl überein; Login auf Gerät B lädt denselben Bestand; erneuter Sync erzeugt keine Duplikate (Zeilenzahl unverändert). Ohne Netz zeigt der Button eine Fehlermeldung, die App funktioniert weiter.
- Verifikation: zwei Geräte; Zeilenzahlen vergleichen; doppelten Sync auslösen; Offline-Fall testen.

## Status
| AP | Titel | Status | Review |
|---|---|---|---|
| 01 | LAN- & Tunnel-Zugang | in Arbeit | — |
| 02 | PWA installierbar & offline | offen | — |
| 03 | In-App „Installieren"-Button | offen | — |
| 04 | Supabase-Projekt, Schema & RLS | offen | — |
| 05 | Supabase-Client + Auth (Magic Link) | offen | — |
| 06 | Sync-Engine (Push/Pull, LWW) | offen | — |
| 07 | Foto-Sync über Supabase Storage | offen | — |
| 08 | Erststart-Migration + Auto-Sync | offen | — |

Status-Werte: `offen` → `in Arbeit` → `umgesetzt` → `abgenommen` (nur durch Review, Phase 3).

## Nicht in diesem Plan (Folge-Ideen)
Echte Push-Benachrichtigungen (Web Push + Supabase Edge Function/Cron), Social-Media-Auto-Posting über die vorhandene `SocialPublisher`-Naht (`src/features/diary/socialShare.ts`), feste Tunnel-Domain via Cloudflare-Konto.
