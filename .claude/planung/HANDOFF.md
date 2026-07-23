# Handoff: lumi — Garten-PWA (Stand: v1.0.0 + SaaS-Fundament, 22. Juli 2026)

## Was ist das
**lumi** („Dein Garten. Dein Zuhause.") — deutsche Garten-PWA: Pflanzen-Bibliothek, Beete +
grafischer Beetplaner, Aufgaben, Tagebuch, Wetter, Geräte, Garten-Entdeckungen,
Blüh-/Schnittkalender. Läuft Handy + Desktop, installierbar, offline-first, mit optionalem
Online-Konto (Supabase: Login, Geräte-Sync, echte Gardena-Anbindung). **Live und nutzbar**
auf GitHub Pages.

## Stack & Start
- Vue 3 + TS + Vite · Pinia · Vue Router · Dexie (IndexedDB) · PrimeVue · vite-plugin-pwa ·
  Supabase (Auth + Postgres + Edge Functions). UI deutsch, Code englisch.
- Verzeichnis: `C:\Users\Drago\MyGardenApp` · Repo: `github.com/dragonfire11235/mygardenapp` ·
  Branch `main` (direkte Commits, kein `gh` CLI installiert)
- Starten: `npm run dev` · Testen: `npm test` (Vitest + fake-indexeddb, ~129 grün) · Bauen:
  `npm run build` (vue-tsc + Vite)
- Deployment: GitHub Actions baut & deployt bei jedem Push auf `main` nach GitHub Pages
  (`https://dragonfire11235.github.io/mygardenapp/`)

## Architektur (Kurz)
- Einstieg `src/main.ts` · Shell `src/App.vue` (lädt Stores in `onMounted`) · Routen `src/router.ts`
- Feature-Module `src/features/<name>/` (importieren nie voneinander — Ausnahme: Dashboard-Widgets
  über `src/features/dashboard/widgetRegistry.ts`)
- Datenschicht `src/data/`: `models.ts` (Entitäten, Soft-Delete), `storage.ts`
  (`StorageProvider`/`Repository<T>`), `dexie/DexieProvider.ts`, Supabase-Client
  `src/data/supabase/client.ts`
- Wiederverwendbar: `src/shared/photos.ts`, `shared/texts.ts`, `shared/shareFile.ts`,
  `data/clone.ts` (`toPlainObject`), `features/devices/adapters/` (DeviceAdapter-Naht),
  `features/plants/bloomCalendar.ts` (Monatskalender-Helfer)

## Stand
- **Version/Tag:** `package.json` 1.0.0, Git-Tag `v1.0.0`; seither mehrere kleine Fixes on top
  (Tag nicht nachgezogen). **Alles committed und gepusht**, Arbeitsverzeichnis sauber.
- **Zuletzt erledigt (23. Juli 2026):**
  - Lumi-Avatar reagiert auf Kontext (Dashboard-Tipp + Nav-Bereich).
  - Beetplaner-Hintergrund lesbar gemacht, Pflanzenkatalog verkleinert, Katalog-Suche im Namensfeld.
- **Zuletzt erledigt (22. Juli 2026):**
  - PWA-Install-Dialog (`<pwa-install>`): fehlendes `icon`-Attribut ergänzt — zeigte vorher nur
    Platzhaltertext „icon" statt Logo, weil `name`/`description` gesetzt waren, `icon` aber nicht.
  - Dashboard-Widget „Schalter" → „Geräte" umbenannt, Footer-Link „Zur Geräte-Seite →" ergänzt
    (gleiches Muster wie beim Blühkalender-Widget: `.more`-Link unten links im Widget, **nicht**
    am Titel).
  - Sensoren- und Geräte-Dashboard-Widgets (`SensorsWidget.vue`, `SwitchesWidget.vue`) filtern
    Demo-Geräte jetzt korrekt aus, wenn die Demo deaktiviert ist — vorher zeigten sie
    Demo-Geräte unabhängig vom Setting weiter an (Filterlogik jetzt identisch zu `DevicesPage.vue`:
    `settings.demoDevicesEnabled && !gardena.connected`).
- **Als Nächstes / geparkt:** siehe `.claude/planung/PLAN.md` → Abschnitt „OFFENE ROADMAP".
  Nächster großer Schritt: **Stripe/Abo + serverseitiges Pro-Gating** (Punkt 1), parallel dazu
  die rechtliche Vorarbeit (Impressum/DSGVO/AGB — längste Vorlaufzeit). Kleinere Ideen in
  `BACKLOG.md`-Abschnitt derselben Datei (kein separates BACKLOG.md mehr, ist in PLAN.md
  integriert).

## Stolpersteine / Regeln (Gotchas)
- **`toPlainObject()`** (`data/clone.ts`) vor jedem persistenten Schreiben — Vue-Proxys sind
  sonst nicht IndexedDB-clonebar. Passiert automatisch in `storage.put`/`bulkPut`, nie entfernen.
- **Keine Geheimnisse im Client.** Secrets (Supabase `service_role`, `HUSQVARNA_SECRET`,
  künftige Stripe-Keys) nur serverseitig/Edge-Function-Secrets, nie in `VITE_`-Variablen.
- **Sync nutzt NIE `importAll`** (löscht alle Tabellen — bleibt der „Backup wiederherstellen"-Weg).
- **Foto-GC-Falle:** jedes neue Settings-Foto (`*PhotoId`) in die Schutzliste in
  `src/shared/photoGc.ts` eintragen, sonst löscht der Start-Sweep das Bild beim nächsten Boot.
- **Service-Worker-Cache:** nach einem Deploy aktualisiert sich die installierte PWA erst beim
  nächsten (ggf. zweiten) Öffnen — beim Testen am Gerät App ganz schließen + neu öffnen.
- **Demo-Geräte-Filter:** Sichtbarkeit von Demo-Geräten läuft überall über dieselbe Regel
  `settings.demoDevicesEnabled && !gardena.connected` — bei neuen Geräte-Widgets/-Ansichten
  diese Regel übernehmen, sonst tauchen Demo-Geräte trotz ausgeschalteter Demo wieder auf.
- **`package.json`-Dep geändert → `package-lock.json` mitcommitten** (CI nutzt `npm ci`, sonst
  schlägt der Actions-Build fehl).
- **iOS:** Formularfelder brauchen `font-size:16px` (Auto-Zoom-Falle); PrimeVue `InputNumber`
  braucht `:min-fraction-digits` für die Komma-Tastatur.
- Nicht-indexierte Dexie-Felder brauchen **keine** Migration. Testdaten mit Präfix (z. B.
  `ZZTEST-`) seeden und wieder entfernen — echte Nutzerdaten nicht anfassen.

## Weiterarbeiten
Details in `.claude/planung/PLAN.md` (Stand/Erledigt, Roadmap, Backlog, alle Gotchas
ausführlich). Nächster sinnvoller Schritt: **Stripe/Abo + Pro-Gating** starten, z. B. mit
`/projekt plan` für einen neuen Teilplan.
