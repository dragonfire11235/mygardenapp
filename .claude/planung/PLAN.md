# Plan: Garten-Entdeckungen — Foto-Sammelspiel für Insekten & Vögel (Stand: 2026-07-16)

## Ziel
Eine kleine Gamification: Tiere, die den Garten besuchen (Wildbienen, Schmetterlinge, Schwebfliegen, Käfer, **Vögel**), mit dem Handy **fotografieren** und in einer **Sammlung** festhalten — verknüpft mit der **Nützlichkeit der Pflanzen** (unser GloBI-Nützlingssystem). Erfolg: Man kann eine Sichtung mit Foto + Gruppe/Art + optional Pflanze/Beet anlegen; ein Sammelalbum zeigt den Fortschritt je Gruppe; Erfolge/Abzeichen, ein Biodiversitäts-Score und Tipps („fotografier eine Wildbiene an deinem Salbei") entstehen daraus; Vögel sind als eigene Gruppe + Pflanzen-Vogelwert (GloBI) integriert.

## Projektkontext
- **Stack & Einstieg:** Vue 3 + TS + Vite PWA, Pinia, Dexie/IndexedDB, PrimeVue. Feature-Module unter `src/features/<name>/`, Datenschicht `src/data/`, Zugriff über `storage` aus `src/data/index.ts`.
- **Wiederverwendbare Bausteine (mit Pfad):**
  - `src/shared/photos.ts` (`addPhoto`/`getPhotoUrl`/`deletePhoto`) + `src/shared/PhotoPicker.vue` — Foto aufnehmen/wählen. **Kamera-Handling ist damit schon da.**
  - `src/features/diary/` — **bestes Vorbild**: Entität mit Foto + `plantIds`/`bedIds`, Store (`diaryStore.ts` mit `byId`), Dialog mit `preset*Ids` (`DiaryEntryDialog.vue`), Detailseite (`DiaryDetailPage.vue`).
  - `src/features/plants/beneficials.ts` (Gruppen/Icons `beneficialGroups`, `activeGroups`) + `catalogApi.getCatalogMapByBotanical` — für die Nützlings-Anbindung (Tipps, Vogelwert).
  - `scripts/enrich-beneficials-globi.mjs` — GloBI-Pipeline (Klassifizierung per `target_taxon_path`) → um **Aves (Vögel)** erweiterbar.
  - `src/features/dashboard/widgetRegistry.ts` — Dashboard-Widget andocken (wie Blüh-/Schnittkalender).
  - `src/features/devices/adapters/` — **Muster für die Identifikations-Naht** (Interface + austauschbare Implementierung).
- **Projektregeln/Constraints:**
  - `toPlainObject()` (`src/data/clone.ts`) übernimmt der Storage-`put` automatisch — nicht selbst nötig, aber nie entfernen.
  - **Neue Tabelle = Dexie-Version-Bump** (`this.version(2).stores({…})` in `DexieProvider.ts`); Dexie migriert automatisch, Bestandsdaten bleiben. Nicht-indizierte Felder allein bräuchten das nicht — eine neue Tabelle schon.
  - **Foto-GC-Falle:** `deleteOrphanPhotos` (`src/shared/photoGc.ts`) löscht Fotos ohne Referenz beim Start → `sighting.photoId` MUSS in `collectReferencedPhotoIds` aufgenommen werden (sonst verschwinden Sichtungsfotos, vgl. gardenMapPhotoId-Bug).
  - **Backup:** Neue Entität in `exportAll`/`importAll` (`DexieProvider.ts`) + `BackupData` (`src/data/storage.ts`) aufnehmen, sonst fehlt sie im JSON-Backup.
  - Deutsche UI, englische Code-Bezeichner. GloBI tokenfrei. Mobile-first (16px-Formularregel gilt automatisch).

## Entscheidungen
- **Neue Entität `Sighting`** (statt Tagebuch mitzubenutzen) — eine Sichtung hat Gruppe/Art/Quelle, das gehört nicht ins Tagebuch. Verworfen: `DiaryEntry` erweitern (vermischt zwei Konzepte, erschwert das Album).
- **Identifikation manuell, aber über austauschbare Naht** `SpeciesIdentifier` + Feld `source: 'manual'|'ai'` — so lässt sich später KI-Erkennung (iNaturalist o. ä.) andocken, ohne Datenmodell/UI umzubauen. Verworfen: KI jetzt (braucht Proxy wie Gardena, online, ungenau — zu groß für „klein").
- **Gruppen an die Nützlings-Gruppen angelehnt** (`wildbee`/`butterfly`/`hoverfly`/`beetle`/`bird`/`other`) — so verbindet eine Sichtung direkt die Pflanzen-Nützlichkeit (Tipps/Score). Verworfen: freie Kategorien (keine Anbindung möglich).
- **Vögel: GloBI-Aves-Wert je Pflanze + kuratierte Gartenvogel-Liste** — konsistent mit den Nützlingen, ohne neue Infrastruktur. Verworfen: reine Handzuordnung (weniger Abdeckung).
- **Zugang per Dashboard-Widget + Route `/entdeckungen`**, kein neuer Nav-Eintrag — die mobile Leiste ist mit 7 voll (wie bei der Kalender-Seite gelöst).

## Arbeitspakete

### Block A — Datenfundament & Erfassung (nutzbarer MVP: fotografieren + sammeln)

#### AP01 — Sighting-Entität + Storage/Backup/GC
- Hängt ab von: —
- Dateien: `src/data/models.ts` (Interface `Sighting extends BaseEntity` + Typ `SightingGroup`), `src/data/storage.ts` (`Repository<Sighting>` in `StorageProvider`, `sightings` in `BackupData`), `src/data/dexie/DexieProvider.ts` (`version(2)` + Store `sightings: 'id, date, group, plantId, bedId'` + Repository + `exportAll`/`importAll`), `src/shared/photoGc.ts` (sighting.photoId schützen), `src/data/index.ts`, Tests `photoGc.test.ts` + `DexieProvider.test.ts`.
- Aufgabe: Entität wie `DiaryEntry` anlegen (Felder: `date`, `group`, `species`, `photoId`, `plantId`, `bedId`, `notes`, `source`). Dexie v2 mit neuem Store; Backup + GC anbinden.
- Abnahme: Sichtung per `storage.sightings.put/getAll/softDelete` schreib-/lesbar (Test); `deleteOrphanPhotos` löscht ein von einer Sichtung referenziertes Foto NICHT (Test); `exportAll(true)` enthält `sightings`; Bestandsdaten bleiben nach dem v2-Bump erhalten.
- Verifikation: `npm test` (neue/erweiterte Tests grün) · `npm run build` fehlerfrei · im Browser: App startet ohne Konsolenfehler, Bestands-Pflanzen/Beete noch da.

#### AP02 — Erfassungs-Dialog + Store + Identifikations-Naht
- Hängt ab von: AP01
- Dateien: neu `src/features/sightings/sightingsStore.ts`, `src/features/sightings/SightingDialog.vue`, `src/features/sightings/identify/types.ts` (`SpeciesIdentifier`) + `identify/ManualIdentifier.ts`, `src/shared/texts.ts` (Gruppen-Labels/Icons `sightingGroupLabels`).
- Aufgabe: Store (`create/update/remove/byId/byGroup`, Muster `diaryStore`). Dialog: Foto (`PhotoPicker`), Gruppe (`Select`), Art (frei/Autocomplete), Datum, Pflanze/Beet (`preset*Ids` wie `DiaryEntryDialog`), Notizen. Naht: `SpeciesIdentifier.suggest(blob) → {group?,species?}|null`; `ManualIdentifier` gibt `null` (Nutzer bestimmt), setzt `source:'manual'`.
- Abnahme: Sichtung mit Foto + Gruppe speichern erzeugt einen Datensatz mit `source:'manual'`; ohne Foto/Gruppe kein Speichern.
- Verifikation: `npm run build` · im Browser Sichtung anlegen → erscheint in `sightingsStore.sightings`; Konsole fehlerfrei.

#### AP03 — Sammelalbum-Seite + Zugang
- Hängt ab von: AP02
- Dateien: neu `src/features/sightings/SightingsPage.vue`, `src/router.ts` (Route `/entdeckungen`), neu `src/features/sightings/SightingsWidget.vue` + Registrierung in `widgetRegistry.ts`.
- Aufgabe: Seite mit **nach Gruppe** gruppiertem Album (aufklappbar, Muster wie Kalender-Seite/Kategorie-Banner), je Gruppe Anzahl + Foto-Kacheln; „Neue Sichtung"-Button. Widget: Fortschritt (X Arten in Y Gruppen) + Link „→ Entdeckungen". Klick auf eine Sichtung öffnet Ansicht (Dialog oder kleine Detailanzeige).
- Abnahme: angelegte Sichtungen erscheinen unter ihrer Gruppe mit Foto; Widget zeigt die Gesamtzahl; Route erreichbar.
- Verifikation: im Browser 2 Sichtungen (verschiedene Gruppen) anlegen → korrekt gruppiert; Widget-Link öffnet `/entdeckungen`; danach Testdaten entfernen.

### Block B — Spiel-Elemente

#### AP04 — Erfolge/Abzeichen
- Hängt ab von: AP03
- Dateien: neu `src/features/sightings/achievements.ts` (pur) + `achievements.test.ts`, Anzeige in `SightingsPage.vue`.
- Aufgabe: reine Funktion `earnedAchievements(sightings): Badge[]` (z. B. erste Sichtung, erster Vogel, 5 Arten einer Gruppe, Sichtung mit Pflanze verknüpft, je eine aus 3 Gruppen). Anzeige als Abzeichen-Reihe.
- Abnahme: Unit-Tests für die Schwellen; erfüllte Abzeichen erscheinen, nicht erfüllte nicht.
- Verifikation: `npm test` (achievements) · Browser-Sichtprüfung.

#### AP05 — Biodiversitäts-Score
- Hängt ab von: AP03
- Dateien: neu `src/features/sightings/biodiversity.ts` (pur) + Test, Anzeige in `SightingsWidget`/`SightingsPage`.
- Aufgabe: `biodiversityScore(sightings): { score:number; distinctSpecies:number; groups:number }` (transparent: distinkte Arten + Gruppenvielfalt → 0–5/0–100). Ergänzt sichtbar den Nützlings-Gedanken.
- Abnahme: Unit-Tests (leere/gemischte Eingabe); Score wächst mit Vielfalt.
- Verifikation: `npm test` · Browser.

#### AP06 — Tipps/Aufträge (Nützlings-Anbindung)
- Hängt ab von: AP03, (Daten aus Nützlingen vorhanden)
- Dateien: neu `src/features/sightings/tips.ts` (pur, testbar) + Anzeige (Widget/Sektion).
- Aufgabe: aus den eigenen Pflanzen (Katalog-Lookup `getCatalogMapByBotanical` → `beneficials`) einen Vorschlag bilden: „Deine {Pflanze} zieht {Gruppe} an — fotografier eine!" — bevorzugt Gruppen/Pflanzen, die noch keine Sichtung haben.
- Abnahme: bei einer Pflanze mit hohem Bienen-Wert und ohne Wildbienen-Sichtung erscheint ein passender Tipp; ist alles fotografiert, ein neutraler Hinweis.
- Verifikation: `npm test` (tips-Logik mit Fixtures) · Browser mit einer Katalog-Pflanze.

### Block C — Vögel

#### AP07 — GloBI-Vogelwert je Pflanze
- Hängt ab von: —
- Dateien: `scripts/enrich-beneficials-globi.mjs` (Aves-Klassifizierung ergänzen), `scripts/build-catalog.mjs` (Feld einfalten), `src/features/plants/catalogTypes.ts` (`Beneficials.birds?: number`), `src/features/plants/beneficials.ts` (Gruppe 🐦 Vögel), Anzeige auf `PlantDetailPage`/`BedDetailPage`.
- Aufgabe: In der GloBI-Auswertung `eatenBy`/`interactsWith` mit `path.includes('Aves')` als **Vögel** zählen → Teil-Score 0–3; in Katalog + Anzeige aufnehmen. (Cache neu ziehen: `npm run catalog:beneficials` + `catalog:build`.)
- Abnahme: mind. bekannte Vogelpflanzen (z. B. Sonnenblume, Holunder, Vogelbeere) bekommen `birds>0`; Anzeige zeigt 🐦-Wert.
- Verifikation: `node scripts/build-catalog.mjs` Log zeigt Vogel-Abdeckung; Stichprobe in JSON; Browser.

#### AP08 — Kuratierte Gartenvogel-Liste
- Hängt ab von: AP03
- Dateien: neu `scripts/birds.mjs` bzw. gebündelte `src/features/sightings/birds.ts` (Name, was ihn anzieht: Beeren/Samen/Insekten/Nistplatz).
- Aufgabe: ~25–30 gängige Gartenvögel als „erwartete Arten" der Gruppe Vogel (Autocomplete im Dialog) und für Vogel-Tipps.
- Abnahme: im Sichtungs-Dialog schlägt Gruppe „Vogel" die Vogelnamen vor; Liste erscheint im Album als noch-zu-entdecken.
- Verifikation: Browser: Gruppe Vogel wählen → Vorschläge sichtbar.

## Nicht in diesem Plan
- **KI-Arterkennung** (iNaturalist/Bilderkennung über Proxy) — die Naht (`SpeciesIdentifier` + `source`) wird gebaut, die KI-Implementierung selbst ist Folge-Idee → BACKLOG.
- Teilen der Sammlung als Bild, „Ranglisten"/Online-Wettbewerb, Push-Erinnerungen — später.
- Eigene Sichtungs-Detailseite (falls Dialog reicht) — optional.

## Status
| AP | Titel | Status | Review |
|---|---|---|---|
| 01 | Sighting-Entität + Storage/Backup/GC | umgesetzt | — |
| 02 | Erfassungs-Dialog + Store + Identifikations-Naht | umgesetzt | — |
| 03 | Sammelalbum-Seite + Zugang | umgesetzt | — |
| 04 | Erfolge/Abzeichen | umgesetzt | — |
| 05 | Biodiversitäts-Score | umgesetzt | — |
| 06 | Tipps/Aufträge | offen | — |
| 07 | GloBI-Vogelwert je Pflanze | offen | — |
| 08 | Kuratierte Gartenvogel-Liste | offen | — |

Status-Werte: `offen` → `in Arbeit` → `umgesetzt` → `abgenommen` (nur durch Review).

> Vorgängerplan (Handy-Nutzung + Supabase-Sync) archiviert unter `.claude/planung/PLAN-handy-supabase.md`.
