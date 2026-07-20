# lumi — Projektplan (konsolidiert, Stand: 2026-07-20)

> **Eine** zentrale Plan-Datei. Frühere Einzelpläne (Handy/Tunnel, Profil-SaaS, Sync,
> Gardena, Entdeckungen) sind umgesetzt und hier zusammengeführt; ihre Historie liegt
> in Git. Diese Datei ist der Einstieg — auch für eine neue Sitzung.

## Was ist das
**lumi** — Garten-PWA (deutsch, „Dein Garten. Dein Zuhause."). Pflanzen-Bibliothek, Beete +
grafischer Beetplaner, Aufgaben/Erinnerungen, Tagebuch, Wetter, Geräte, Garten-Entdeckungen,
Blüh-/Schnittkalender. Läuft Handy + Desktop, installierbar, **offline-first** (IndexedDB), mit
optionalem **Online-Konto (Supabase)**: Login, Geräte-Sync und echte **Gardena**-Anbindung.
Version **1.0.0 live** auf GitHub Pages.

## Stack & Start
- Vue 3 + TS + Vite · Pinia · Vue Router · Dexie (IndexedDB) · PrimeVue · vite-plugin-pwa ·
  Supabase (Auth + Postgres + Edge Functions). UI deutsch, Code englisch. Kein i18n/Tailwind/E2E.
- Pfad `C:\Users\Drago\MyGardenApp` · Repo `github.com/dragonfire11235/mygardenapp` · Branch
  **`main`** (direkte Commits; Deploy per GitHub-Actions beim Push). `gh` CLI nicht installiert.
- Befehle: `npm run dev` · `npm test` (Vitest + fake-indexeddb, 129 grün) · `npm run build`
  (vue-tsc + Vite). Katalog-Pipeline: `catalog:build|images|beneficials`, `species:photos`.
- **Supabase-Projekt EU/Frankfurt**, ref `vqcoacpusktyeszhcmfw`. Edge Function: `gardena`.
  Migrationen: `profiles`, `sync_rows`, `gardena_tokens`.

## Architektur (kurz)
- Einstieg `src/main.ts` · Shell `src/App.vue` (lädt Stores in `onMounted`) · Routen `src/router.ts`.
  Feature-Module `src/features/<name>/` (importieren nie voneinander; Ausnahme Dashboard-Widgets via
  `widgetRegistry.ts`).
- Datenschicht `src/data/`: `models.ts` (Entitäten erben `BaseEntity` id/createdAt/updatedAt/deletedAt;
  Löschen = Soft-Delete), `storage.ts` (`StorageProvider`/`Repository<T>`), `dexie/DexieProvider.ts`,
  `backup.ts`. Zugriff über `storage` aus `src/data/index.ts`. Supabase-Client `src/data/supabase/client.ts`.
- Wiederverwendbar: `src/shared/photos.ts`, `shared/texts.ts`, `shared/shareFile.ts`,
  `data/clone.ts` (`toPlainObject`), `features/devices/adapters/` (DeviceAdapter-Naht),
  `features/plants/bloomCalendar.ts` (Monatskalender-Helfer).

---

## Aktueller Stand — ERLEDIGT ✅

**App-Kern (1.0.0 „lumi"-Redesign):** Pflanzen/Beete/Bepflanzungen/Aufgaben/Tagebuch/Wetter,
Beetplaner (Raster/Drag), Kartenansicht, Detailseiten (Pflanze/Beet/Tagebuch), Kalender-Seite
`/kalender`, Dashboard-Widgets, Dunkelmodus, PWA (installierbar/offline), JSON-Backup, Teilen
(Beetplan/Tagebuch als PNG), Konto/Onboarding-Stub, Design-System (Tokens, Nunito, Phosphor).

**Pflanzen-Katalog als Datenfundament:** `public/catalog/garten-de.json` (657) + Pipeline
(`scripts/`), Nützlinge/Score via GloBI, **Blüh- + Schnittkalender**, **Mischkultur** (`companions.ts`,
Grün/Rot im Beetplaner), Zierpflanzen-Overlay, Wikidata-Bilder, Katalog-Suchdialog.

**Garten-Entdeckungen:** Foto-Sammelspiel (Sichtungen, Album `/entdeckungen`, Abzeichen,
Biodiversitäts-Score, Nützlings-Tipps, Vogelwert, Artenlisten mit Referenzfotos).

**SaaS-Fundament (20. Juli 2026 — diese Ausbaustufe):**
- **Trefle raus** — Online-Suche entfernt (war auf Pages kaputt); Suche nur noch Offline-Katalog.
- **Supabase Auth** (E-Mail+Passwort): `profiles`-Tabelle + RLS + Auto-Profil-Trigger; `authStore`
  + `AuthDialog`; Onboarding an echte Registrierung angebunden; Konto-Karte zeigt echten Login;
  **Konto-Identität** = `display_name` (Titel/Avatar, inline änderbar), gespiegelt in lokalen Namen.
  Live (GitHub-Secrets `VITE_SUPABASE_URL`/`ANON_KEY`).
- **Geräte-Sync** (local-first, Last-Write-Wins): **eine** Tabelle `sync_rows` (id/user_id/kind/
  updated_at/deleted_at/`data jsonb`) + RLS; reine `mergeById`-Funktion; `syncEngine`/`syncStore`
  (`src/features/sync/`); Auto-Sync bei Login + App-Start + Button; **7 Entitäten** (Fotos/Settings
  bewusst nicht). Nutzt **nie** `importAll`. Live.
- **Gardena smart system** (Multi-User, live): OAuth Authorization-Code je Nutzer, **Edge Function
  `gardena`** als Proxy (hält Secret + Tokens via `service_role`, Token-Refresh), `GardenaAdapter`
  über die `DeviceAdapter`-Naht: Mäher (Status/Akku + Mähen/Parken), Ventile, generisch Sensor/
  Steckdose. **WebSocket-getrieben** (Live-Status, kein Polling), **AP08**: WS nur bei sichtbarer
  Geräte-Seite. **Demo-Geräte** per Button an/aus, bei Gardena-Verbindung automatisch aus.
- **Kalender-Widgets**: Umschalter Pflanzen ⇄ Beete oben rechts.

---

## OFFENE ROADMAP (Reihenfolge = Empfehlung)

1. **Stripe / Abo + serverseitiges Pro-Gating** *(nächster großer Schritt)*
   - Stripe Checkout (gehostet), Webhook als Edge Function → **`subscriptions`-Tabelle**
     (Quelle der Wahrheit, nicht der Client). Stripe Customer Portal fürs Kündigen.
   - **Feature-Gating serverseitig** für alles, was Geld kostet. Kandidaten für **Pro**:
     Geräte-Sync, **Gardena**, Cloud-Foto-Backup, KI-Arterkennung, evtl. Premium-Katalog.
     Gratis = ganze Offline-App inkl. 657er-Katalog + JSON-Backup (der Trichter).
   - Nutzer besorgt: Stripe-Konto + Geschäftsidentität, Produkte/Preise, DPA.
2. **Rechtliche Vorarbeit (parallel, längste Vorlaufzeit)** — Impressum, Datenschutzerklärung,
   AGB, Widerrufsbelehrung; **Konto-Löschen** (DSGVO Art. 17; Export deckt Art. 15 via Backup);
   **EU-OSS/Umsatzsteuer** + Gewerbe mit Steuerberater. *Keine Rechtsberatung durch mich —
   Fachperson nötig; ich kann Platzhalter/Struktur liefern.*
3. **Eigener SMTP** (z. B. Resend) vor Go-Live — sonst kommen Bestätigungs-/Reset-Mails
   nicht zuverlässig an (Supabase-Standardmailer ist nur zum Testen).
4. **Eigene Domain + Hosting-Umzug** — weg von `…github.io/mygardenapp/`; der
   `--base=/mygardenapp/`-Build muss auf Root; Gardena/Auth-Redirect-URIs nachziehen.
5. **Foto-Sync** (zuletzt, Kostentreiber) — Blobs → Supabase Storage, **hinter Paywall**,
   aggressiv cachen (nur fehlende IDs laden), evtl. Foto-Limit. Egress ist die Kostenfalle.
6. **Pro-Katalog als Supabase-Premium-Erweiterung** — Basis-Katalog bleibt gratis/offline;
   Premium-Einträge serverseitig, nur für Pro (ein mitgeliefertes JSON lässt sich nicht paywallen).

## BACKLOG / Ideen (kleiner, unabhängig)
- **Aussaat-/Ernte-Kalender** — Jahres-Zeitleiste aus `sowingMonths`/`harvestMonths`.
- **Ernte-Tracking + Saison-Statistik** — „Geerntet"-Aktion mit Menge, Auswertung.
- **Auto-Backup-Erinnerung** — sanfter Hinweis „lange kein Backup".
- **In-App „Installieren"-Button** (`beforeinstallprompt`) in den Einstellungen (nie gebaut).
- **Home-Assistant-Adapter** — Naht bereit (`adapters/`), nur `HomeAssistantAdapter` ergänzen.
- **KI-Arterkennung** für Entdeckungen — Naht (`SpeciesIdentifier`/`source`) da; Impl. via Proxy.
- **Katalog ausbauen** — Perenual als 2. Quelle / Florenliste (9.434 Taxa) / mehr Zierpflanzen.
- **Gardena-Ausbau** — wählbare Mäh-/Bewässerungsdauer, Zeitpläne, mehr Sensortypen.
- **Verworfen:** Fruchtfolge-Warnung (Nutzerwunsch).

---

## Gotchas / Regeln (Pflicht)
- **`toPlainObject()`** (`data/clone.ts`) vor jedem persistenten Schreiben — macht `storage.put`/
  `bulkPut` automatisch. Nie entfernen (Vue-Proxys sonst nicht klonbar).
- **Keine Geheimnisse im Client.** anon/publishable-Key + Gardena-**Key** (client_id) sind
  öffentlich-unkritisch (RLS schützt). **Secrets nur serverseitig:** Supabase `service_role`,
  `HUSQVARNA_SECRET`, Stripe-Keys — **nie** in `VITE_`-Variablen/committen. `.env` gitignored.
- **Sync nutzt NIE `importAll`** (das löscht alle Tabellen — bleibt „Backup wiederherstellen").
- **Foto-GC-Falle:** jedes neue Settings-Foto (`*PhotoId`) in die Schutzliste in
  `src/shared/photoGc.ts`, sonst löscht der Start-Sweep das Bild.
- **Service-Worker-Cache:** nach Deploy aktualisiert sich die installierte PWA erst beim
  nächsten (ggf. 2.) Öffnen. Im Browser-Test SW/Caches aktiv leeren.
- **Supabase-Migration anwenden:** `npx supabase link --project-ref vqcoacpusktyeszhcmfw` (DB-
  Passwort) **dann** `npx supabase db push`. Migrationen idempotent (`if not exists`). Fallback:
  SQL im Dashboard-Editor. Prüfen ob Tabelle live: `curl .../rest/v1/<tabelle>` mit anon-Key →
  `404 PGRST205` = fehlt, `200` = da.
- **Deploy aus `main`** (GitHub Pages). Ändert sich eine `package.json`-Dep → `package-lock.json`
  mitcommitten (CI nutzt `npm ci`). GitHub-Secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_GARDENA_CLIENT_ID`. Supabase-Function-Secrets: `HUSQVARNA_KEY`, `HUSQVARNA_SECRET`.
- **Redirect-URIs (Gardena/OAuth):** Dev `http://localhost:5173/gardena/callback` (Dev-Base ist
  `/`!), Prod `https://dragonfire11235.github.io/mygardenapp/gardena/callback`.
- **Gardena:** Rate-Limit **~1000 Requests/Woche appweit geteilt** (nicht pro Nutzer!) — deshalb
  WebSocket statt Polling + AP08-Gating; bei vielen Nutzern Kontingent-Erhöhung im Portal.
  Attribute `{value,timestamp}`-verschachtelt; Cache nach **`Typ:id`** (COMMON teilt die Geräte-id).
- **iOS:** Formularfelder ≥16px (Auto-Zoom); PrimeVue `InputNumber` braucht `:min-fraction-digits`
  für Komma-Tastatur. Safe-Area/Rundecken nur real am iPhone prüfbar (nicht in Preview).
- **`ResizeObserver`** feuert in eingebetteter Preview nicht → `BedPlanner` misst zusätzlich direkt.
- Nicht-indexierte Felder brauchen **keine** Dexie-Migration. **Testdaten mit Präfix** seeden
  (z. B. `ZZTEST-`) und wieder entfernen — echte Nutzerdaten (localhost:5173) nicht anfassen.

## Für eine neue Sitzung — Quickstart
1. Diese Datei + Memory `project-mygardenapp.md` lesen.
2. Stand: 1.0.0 live; **Auth + Sync + Gardena stehen live**. Nächster großer Schritt = **Stripe/
   Abo + serverseitiges Pro-Gating** (Punkt 1 oben) — davor/parallel die rechtliche Checkliste.
3. Arbeitsweise: Features über den `/projekt`-Skill planen; nach jedem Push testet der Nutzer
   selbst am iPhone → aktiv nach Testergebnis fragen. Commits deutsch + `Co-Authored-By: Claude`.
