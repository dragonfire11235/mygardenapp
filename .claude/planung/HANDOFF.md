# Handoff: „Mein Garten" (MyGardenApp) — Stand v0.9.0, 2026-07-12

## Was ist das
Persönliche Garten-PWA (deutsch): Pflanzen-Bibliothek, Beete + Beetplaner, Aufgaben/Erinnerungen, Wetter, Gartentagebuch. Läuft am Handy und Desktop, als PWA installierbar, offline nutzbar, alle Daten lokal (IndexedDB) mit JSON-Backup. Funktional vollständig und deployt (v0.9.0).

## Stack & Start
- Stack: Vue 3 + TypeScript + Vite · Pinia · Vue Router · Dexie (IndexedDB) · PrimeVue · vite-plugin-pwa. UI-Texte deutsch, Code-Bezeichner englisch. Kein i18n, kein Tailwind, keine E2E-Tests (Hobby-angemessen).
- Verzeichnis: `C:\Users\Drago\MyGardenApp` · Repo: `github.com/dragonfire11235/mygardenapp` · Branch: `main` (direkte Commits, kein PR-Flow).
- Befehle: `npm run dev` (Desktop) · `npm test` (Vitest + fake-indexeddb) · `npm run build` (vue-tsc + Vite) · `npm run handy` (Build + Preview für Handy/Cloudflare-Tunnel).
- Deployment: GitHub Pages aus `main` (Actions-Workflow deployt automatisch beim Push). Release-Tags: `gh` CLI ist **nicht** installiert → Releases im GitHub-Web aus dem Tag erstellen.

## Architektur (Kurz)
- Einstieg `src/main.ts` · Shell `src/App.vue` · Routen `src/router.ts`. Feature-Module unter `src/features/<name>/` (plants, beds, tasks, diary, dashboard, weather, devices, settings). Features importieren nie voneinander (Ausnahme: Dashboard-Widgets über `widgetRegistry.ts`).
- Datenschicht framework-frei in `src/data/`: `models.ts` (Entitäten erben `BaseEntity`: id/createdAt/updatedAt/deletedAt, Löschen = Soft-Delete), `storage.ts` (`StorageProvider`/`Repository<T>`-Interface), `dexie/DexieProvider.ts` (IndexedDB), `backup.ts` (JSON-Export/-Import; Import **ersetzt** aktuell alles). Zugriff überall über `storage` aus `src/data/index.ts`.
- Wiederverwendbare Bausteine: `src/shared/photos.ts` (addPhoto/getPhotoUrl/deletePhoto), `src/shared/texts.ts` (`categoryLabels`/`categoryColors`/`categorySpreadM`/`plantSpreadM`), `src/shared/shareFile.ts` (Web-Share/Download), `src/features/diary/diaryCard.ts` + `src/features/beds/plannerImage.ts` (Canvas→PNG), `src/features/devices/adapters/` (DeviceAdapter-Naht für Home Assistant).

## Stand
- **Version/Tag:** v0.9.0 · alles committed & gepusht.
- **Zuletzt erledigt:** aufklappbarer Kategorie-Banner (Pflanzen-Seite), Dialog-Breite/iOS-Safe-Area-Fixes, Pflanzen-/Beet-Detailseiten, Beetplaner (Raster/Drag&Drop) + Kartenansicht, Wetter-Widget, .ics-Kalenderexport, Tagebuch-Share-Card, Dunkelmodus, PWA-Installation.
- **Als Nächstes / geparkt** (Details in `PLAN.md`/`BACKLOG.md`):
  1. **Florenliste-Katalog** — `import/Pflanzenliste.xlsx` (~9.434 Taxa, Spalten G=Vollname, H=wiss. Name, **kein** deutscher Name). Empfehlung/Entscheidung offen: **durchsuchbarer Offline-Katalog** (deutsche Namen einmalig lokal per GBIF anreichern) statt 9.400 Einträge in die Bibliothek (würde Pflanzen-Seite/Dropdowns überlasten).
  2. **Supabase-Sync** (geräteübergreifend, echte Push-Nachrichten, Auto-Posting) — Plan liegt in `PLAN.md` (Block B).
  3. **Home Assistant** (Adapter-Naht bereit).

## Stolpersteine / Regeln (Gotchas)
- **`toPlainObject()`** aus `src/data/clone.ts` vor jedem persistierenden Schreibzugriff — Vue-Reactivity-Proxys sind sonst nicht klonbar (DataCloneError). Nicht entfernen.
- **Keine Geheimnisse committen.** Trefle-Token liegt in den App-Einstellungen (IndexedDB), nie im Code. Trefle nur über den Vite-Proxy (`/api/trefle`, nur in dev/preview). `.env`/`.env.*` sind ge-gitignored (für spätere Supabase-Keys).
- **PrimeVue `InputNumber`:** ohne `:min-fraction-digits="1"` wird `inputmode="numeric"` gesetzt → am iPhone keine Komma-Tastatur. Meter-Felder brauchen deshalb `min-fraction-digits ≥ 1`.
- **iOS-Safe-Area/Rundecken** lassen sich in Preview/Screenshot NICHT reproduzieren — nur real am installierten iPhone-PWA. Nach Änderungen deployen und dort prüfen.
- **`ResizeObserver`** feuert in der eingebetteten Preview nicht → `BedPlanner.vue` misst zusätzlich direkt + `window.resize` (nicht entfernen).
- Neue **Nicht-indexierte Felder** an Entitäten brauchen **keine** Dexie-Migration (Schema bleibt v1). Nur über das `StorageProvider`-Interface gehen.
- **Beim Testen echte Nutzerdaten nicht anfassen:** Testdaten mit Präfix seeden (z. B. `CATTEST-`) und danach wieder entfernen; die IndexedDB wurde in diesem Projekt schon einmal komplett geleert (Import ersetzt alles / Site-Data-Löschung).

## Weiterarbeiten
Vollständige Historie/Pläne: `.claude/planung/PLAN.md` (Versionen v1–v12), Ideen in `.claude/planung/BACKLOG.md`, Persistenz-Notizen im Memory `project-mygardenapp.md`.
Nächster sinnvoller Schritt: mit dem Nutzer die **Florenliste**-Richtung entscheiden (Katalog vs. Teilmenge) oder mit **Supabase-Sync** (PLAN.md Block B) beginnen.
