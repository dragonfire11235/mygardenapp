# Plan: Nutzer-Einstellungen (lokales Profil) + SaaS-Roadmap (Stand: 2026-07-17)

> Status: **freigegeben, Umsetzung noch nicht begonnen** — Nutzer recherchiert noch
> (Supabase/Stripe/Recht). Teil 1 (AP01–05) ist startbereit.

## Kontext

Du willst „später gern das mit Online-Zugang für User" — also ein echtes SaaS-Produkt
mit Abo, bei dem sich fremde Nutzer anmelden. Jetzt in diesem Schritt soll aber **nur das
lokale Profil** gebaut werden; der Rest wird geplant, nicht gebaut. Login später per
**E-Mail + Passwort**.

Wichtige Ausgangslage (aus der Code-Erkundung):
- Es gibt **noch keinen** Nutzer-/Konto-/Login-Begriff im Code. Die App ist heute
  Ein-Nutzer, rein lokal (IndexedDB).
- Das **Fundament ist aber bewusst SaaS-fähig** gebaut: UUIDs, ISO-Zeitstempel,
  Soft-Delete (`deletedAt`) auf jeder Entität, und die `StorageProvider`-Abstraktion
  (`src/data/storage.ts`), hinter die später ein `SupabaseProvider` geschoben werden kann.
- Es existiert ein **archivierter Supabase-Plan** (`.claude/planung/PLAN-handy-supabase.md`),
  der aber von *einem Nutzer mit zwei Geräten* ausging (Magic-Link, kein Abo). Für ein
  echtes Produkt mit zahlenden Kunden sind Auth, Bezahlung und v. a. die **rechtliche
  Seite (AT/DE)** komplett neu und der eigentliche Kraftakt — nicht der Code.

Ziel dieses Schritts: Ein **lokales Profil** (Name, Gartenname, Profilfoto), das sofort
offline nützlich ist (Name in der Dashboard-Begrüßung) und später **ohne Umbau** zum
Konto-Profil wird. Dazu eine sichtbare **Konto-Karte** als Naht fürs spätere Login.

---

## Teil 1 — JETZT bauen: Lokales Profil + Konto-Naht

Alles rein lokal, **kein Backend**, offline funktionierend. Nutzt exakt die bestehenden
Muster (kein neuer Dexie-Table nötig — die `settings`-Tabelle ist ein generischer
Key/Value-Bag, deshalb **keine Migration**).

### AP01 — Profil-Felder im Settings-Store
- Dateien: `src/features/settings/settingsStore.ts`
- Aufgabe: Drei neue Keys nach bestehendem Muster (`ref` + Zeile in `load()` +
  je eine `setX`-Action, im `return` ergänzen):
  - `profileName: string` (Default `''`) — Anzeigename/Vorname
  - `gardenName: string` (Default `''`) — z. B. „Schrebergarten Floridsdorf"
  - `profilePhotoId: string | null` (Default `null`) — nutzt `PhotoPicker`/`addPhoto`
  Bewusst **keine** E-Mail/kein Passwort hier — Identität kommt später aus Supabase Auth.
  So bleibt das Profil reine Anzeige-Info und übersteht den Login-Umbau unverändert.
- Abnahme: `settings.profileName` etc. sind nach `load()` lesbar und per `setX`
  persistent (überleben Reload).

### AP02 — Foto-GC-Schutz (kritisch!)
- Dateien: `src/shared/photoGc.ts` (+ `src/shared/photoGc.test.ts`)
- Aufgabe: In `collectReferencedPhotoIds` die Key-Liste
  `['dashboardHeaderPhotoId','dashboardBackgroundPhotoId','gardenMapPhotoId']` um
  `'profilePhotoId'` erweitern. **Sonst löscht der Start-Sweep `deleteOrphanPhotos`
  das Profilfoto beim nächsten App-Start** (exakt der schon einmal aufgetretene
  `gardenMapPhotoId`-Bug). Test-Fall analog zu den bestehenden ergänzen.
- Abnahme: Test „behält Profilfoto"; Profilfoto ist nach einem simulierten
  GC-Lauf noch vorhanden.

### AP03 — Profil-Karte auf der Einstellungsseite
- Dateien: `src/features/settings/SettingsPage.vue`
- Aufgabe: Neue `<section class="card">` **ganz oben** (vor „Pflanzen-Datenbank"),
  Überschrift **„Profil"**, exakt im bestehenden Stil (`.row`, `.grow`, `computed`
  mit `get`/`set` → `void settings.setX(...)`, `toast` bei Speichern):
  - `InputText` Anzeigename (+ „Speichern" oder onBlur-Save wie Trefle-Token)
  - `InputText` Gartenname
  - `PhotoPicker v-model` fürs Profilfoto (`label="Profilfoto wählen"`)
- Abnahme: Eingaben werden gespeichert, bleiben nach Reload; Foto wählen/entfernen geht.

### AP04 — Konto-Karte (Naht fürs spätere Login)
- Dateien: `src/features/settings/SettingsPage.vue`
- Aufgabe: Zweite neue `<section class="card">`, Überschrift **„Konto"**, die den
  aktuellen Zustand ehrlich anzeigt:
  „🔒 Lokal — nicht angemeldet. Deine Daten liegen nur auf diesem Gerät." plus
  `.muted`-Hinweis „Online-Konto & Geräte-Sync kommen später." und ein **deaktivierter**
  Button „Anmelden (bald verfügbar)". Das ist bewusst nur Platzhalter/Naht — die echte
  Auth-UI kommt in der Roadmap-Phase Auth. So sieht man den Weg, ohne toten Code.
- Abnahme: Karte sichtbar, Button deaktiviert, keine Konsolenfehler.

### AP05 — Name in der Dashboard-Begrüßung (echter Nutzen heute)
- Dateien: `src/features/dashboard/DashboardPage.vue`
- Aufgabe: Das bestehende `greeting`-Computed (gibt „Guten Morgen"/„Hallo"/
  „Guten Abend") um den Namen ergänzen: aus `{{ greeting }}! 🌱` wird
  `{{ greeting }}{{ profileName ? ', ' + profileName : '' }}! 🌱`
  → „Guten Abend, Drago! 🌱". `settingsStore` ist dort bereits eingebunden. Optional:
  `gardenName` klein unter der Begrüßung.
- Abnahme: Mit gesetztem Namen erscheint er in der Begrüßung; ohne Namen bleibt es
  wie bisher (kein „, undefined").

### Verifikation (Teil 1)
- `npm test` (photoGc-Test grün) · `npm run build` fehlerfrei.
- Dev-Server (`preview_start "garden-dev"`): Einstellungen → Profil ausfüllen +
  Profilfoto wählen → Reload → Werte + Foto noch da. Dashboard zeigt „…, <Name>! 🌱".
  Konto-Karte sichtbar mit deaktiviertem Button. Danach committen + pushen (deutsche
  Commit-Message, `Co-Authored-By: Claude Opus 4.8`).

---

## Teil 2 — Roadmap zum bezahlten SaaS (nur Referenz, wird NICHT jetzt gebaut)

Ehrliche Reihenfolge vom heutigen Stand bis zum ersten zahlenden Kunden. Das Fundament
(UUIDs/Timestamps/Soft-Delete/Provider-Abstraktion) ist fertig; der Aufwand liegt in
Auth, Bezahlung und Recht — nicht im Datenmodell.

**Kürzester ehrlicher Weg (empfohlene Reihenfolge):**

1. **Edge-Function-Proxy (früh, behebt einen Live-Bug).** Die Trefle-Suche ist auf
   GitHub Pages **kaputt** (der Proxy aus `vite.config.ts` existiert nur im Dev-/
   Preview-Server). Eine Supabase Edge Function als Proxy behebt das — und ist dieselbe
   Bauart, die später auch **Gardena** und **KI-Arterkennung** braucht (ein Baustein,
   drei Probleme). Zwingt dich, das Supabase-Konto risikoarm aufzusetzen.
2. **Rechtliche/geschäftliche Vorarbeit parallel starten** (längste Vorlaufzeit, s. u.).
3. **Auth (E-Mail + Passwort) + Mandantentrennung.** Supabase Auth, neues
   `src/features/auth/` (Registrieren, Anmelden, E-Mail bestätigen, Passwort vergessen/
   ändern), `authStore` in `App.vue` initialisiert. **App bleibt ohne Login voll
   offline nutzbar** — Login ist additiv, kein Nag-Wall. Schema: je Tabelle
   `user_id uuid default auth.uid()` + RLS „nur eigene Zeilen". **Achtung:** die
   Tabellenliste des alten Plans ist veraltet — `sightings` gehört dazu (8 Entitäten
   + `settings` + `profiles` + später `subscriptions`).
4. **Sync-Engine (local-first, Last-Write-Wins über `updatedAt`, Löschen via
   `deletedAt`).** Merge-/Upsert-Logik als reine, testbare Funktion. Erst-Login-
   Migration ist dank stabiler UUIDs per **Upsert duplikatfrei**. **Wichtig:** Sync
   darf NIE das destruktive `importAll` (löscht alle Tabellen) benutzen — das bleibt
   nur „Backup wiederherstellen". Entscheiden, welche Settings gerätespezifisch sind
   (z. B. `darkMode`, `weatherLocation` besser NICHT syncen).
5. **Bezahlung (Stripe — Supabase hat keine Abrechnung).** Stripe Checkout (gehostet,
   du fasst keine Kartendaten an), Webhook als Edge Function schreibt eine
   `subscriptions`-Tabelle (Quelle der Wahrheit, nicht der Client). Feature-Gating
   **serverseitig** für alles, was Geld kostet. Stripe Customer Portal fürs Kündigen.
6. **Eigene Domain + Hosting-Umzug.** `…github.io/mygardenapp/` reicht für ein
   bezahltes Produkt nicht (Vertrauen, Impressum, stabile Auth-Redirects). Eigene
   Domain (z. B. `meingarten.at`); der `--base=/mygardenapp/`-Build muss auf Root
   umgestellt werden. Public Repo ist ok (anon key ist öffentlich-unkritisch), aber
   **nie** Service-Role-/Stripe-Secret-Keys committen oder in `VITE_`-Variablen legen.
7. **Foto-Sync zuletzt (der Kostentreiber).** Fotos sind heute Blobs in IndexedDB; auf
   Supabase Storage sind sie die Hauptkosten. Grobe Rechnung: ~200 Fotos ≈ 90 MB;
   Gratis-Tarif 1 GB Storage / 5 GB Egress/Monat — **Egress** (jedes erneute Laden auf
   neuem Gerät zieht alle Blobs) ist die Kostenfalle. Deshalb **hinter dem Paywall**
   und lokal aggressiv cachen (nur fehlende IDs nachladen), evtl. Foto-Limit im Abo.

**Sinnvolle Gratis-vs.-Pro-Aufteilung für diese App:** Gratis = die ganze heutige
Offline-App inkl. statischem 657-Pflanzen-Katalog und JSON-Backup (kostet dich nichts,
ist dein Trichter). **Pro (kostet dich Geld) =** Geräte-Sync, Cloud-Foto-Backup,
KI-Arterkennung, Gardena/Live-Geräte, evtl. Live-Trefle-Suche.

**Was du selbst besorgen/entscheiden musst (deine Frage „was brauchst du"):**
1. **Supabase-Konto** — Projekt anlegen, **EU-Region (Frankfurt) bei Erstellung wählen**
   (quasi unumkehrbar), `VITE_SUPABASE_URL` + anon key für `.env`, DPA akzeptieren.
2. **Stripe-Konto + Geschäftsidentität** (Bankkonto, Steuerdaten), Produkte/Preise
   anlegen, DPA akzeptieren, Preis festlegen.
3. **Domain** kaufen + DNS.
4. **Rechtstexte:** Impressum, Datenschutzerklärung, AGB, Widerrufsbelehrung — über
   seriösen Generator/Anwalt. Ich kann Platzhalter entwerfen, bin aber **keine
   Rechtsquelle**.
5. **Steuerberater** — Gewerbe, Kleinunternehmer vs. USt, und v. a. **EU-OSS**: der
   Verkauf digitaler Leistungen an Verbraucher in anderen EU-Ländern macht USt im
   **Land des Kunden** fällig (die Kleinunternehmer-Regel schützt das *nicht*). Vor dem
   ersten grenzüberschreitenden Verkauf klären.
6. **Eigener SMTP** (z. B. Resend/Postmark), damit Bestätigungs-/Reset-Mails ankommen.
7. **Preis + Gratis/Pro-Grenze** final entscheiden.

**Echter Blocker vor dem ersten zahlenden Kunden (nicht der Code):** Impressum,
Datenschutzerklärung, AGB + Widerruf, EU-Region gewählt, DPAs akzeptiert,
Konto-Löschen-Funktion (DSGVO Art. 17 — `exportAll`/Backup deckt Art. 15 „Datenexport"
schon ab), Gewerbe/OSS mit Steuerberater geklärt. *Hinweis: keine Rechtsberatung — für
Texte und Steuer bitte eine Fachperson.*

**Voreilig / NICHT für Kunde #1:** KI-Arterkennung, Gardena/Home Assistant,
Push-Benachrichtigungen, Realtime-Sync, CRDTs, Thumbnail-Pipeline.

---

## Kritische Dateien (Referenz)
- `src/features/settings/settingsStore.ts` — Muster für neue Keys (Teil 1); später Heimat
  für Sync-Status/Login.
- `src/features/settings/SettingsPage.vue` — Karten-Aufbau (`.card`/`.row`/`.grow`),
  hier Profil- + Konto-Karte.
- `src/shared/photoGc.ts` (Zeile ~26) — Key-Liste MUSS `'profilePhotoId'` bekommen.
- `src/features/dashboard/DashboardPage.vue` — `greeting`-Computed für den Namen.
- `src/data/storage.ts` — die Provider-Naht (inkl. destruktivem `importAll`, das Sync
  NICHT nutzen darf); `src/data/index.ts` = einziger Swap-Punkt für später.
