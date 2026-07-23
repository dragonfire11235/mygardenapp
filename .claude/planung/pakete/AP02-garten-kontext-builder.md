# AP02 — Garten-Kontext-Builder (`src/features/assistant/context.ts`)

## Kontext
Projekt: `C:\Users\Drago\MyGardenApp` — Garten-PWA „lumi" (Vue 3 + TS, Pinia, Dexie offline-first). Ein KI-Assistent (Edge Function `lumi`, bereits gebaut) braucht bei jeder Anfrage eine kompakte deutsche Textzusammenfassung des Nutzergartens als System-Kontext. Dieses Paket baut den Builder; Versand an die KI kommt in AP03.
Lies zuerst: `src/data/models.ts` (Entitäten Plant/Bed/Planting/Task), `src/features/plants/catalogApi.ts` (`getCatalogMapByBotanical`, `normalizeBotanical`), `src/features/plants/companions.ts` (`relationBetween`), `src/features/weather/weatherApi.ts` (Interface `Weather`), `src/features/tasks/tasksStore.ts` (Computed `dueTasks`), `src/features/beds/bedsStore.ts` (`activePlantingsByBed`), `src/shared/dates.ts`.

## Aufgabe
Neues Verzeichnis `src/features/assistant/` (neues Feature-Modul; es darf — wie das Dashboard — Stores anderer Features lesen; das ist die 2. sanktionierte Ausnahme der Import-Regel, als Kommentar im Dateikopf vermerken).

1. **`context.ts`** mit zwei Exporten:
   - **Pure Funktion** `buildGardenContext(input: GardenContextInput): string` — testbar ohne Pinia.
     `GardenContextInput = { today: string (ISO-Datum), locationName: string | null, weather: Weather | null, plants: Plant[], beds: Bed[], plantings: Planting[] (nur aktive), dueTasks: Task[], catalog: Map<string, CatalogPlant> }`.
     Ausgabe: kompakter deutscher Text mit Abschnitten (Überschriften als `##`):
     - Datum + Jahreszeit (aus dem Monat ableiten) + Standortname.
     - Wetter: aktuelle Temperatur, 4-Tages-Kurzform (`Mo 22/12° Regen 80%`), Warnzeilen bei `frostWarning`/`rainToday` (Felder `hailWarning`/`thunderstormWarning` per optionalem Zugriff `(weather as …)` mitnehmen, falls vorhanden — kommen in AP05).
     - Beete: je Beet Name, Maße (`widthM × heightM m`, falls gesetzt) und Liste der aktiv gepflanzten Pflanzen (deutscher Name + botanischer Name in Klammern).
     - Pflanzen-Bibliothek: je Pflanze eine Zeile mit Pflege-Eckdaten (Gieß-/Düngeintervall, Standort/`sunlight`, relevante Monate) — **Kappung: max. 60 Pflanzen**, danach `… und N weitere`.
     - Fällige Aufgaben: `dueTasks` sortiert nach `dueDate`, Zeile `<dueDate> <title> (überfällig seit X Tagen)` — **Kappung: max. 15**, danach `… und N weitere`.
     - Mischkultur-Konflikte: für jedes Beet alle Pflanzenpaare via `relationBetween(catalog.get(normalizeBotanical(a.botanicalName)), catalog.get(…b))` prüfen; nur `'bad'`-Paare auflisten (`Tomate + Kartoffel im Beet „Hochbeet 1" vertragen sich schlecht`).
     - Leere Abschnitte weglassen; leerer Garten → gültiger Minimaltext (Datum + Hinweis „Noch keine Pflanzen/Beete angelegt.").
   - `collectGardenContext(): Promise<string>` — liest `usePlantsStore()`, `useBedsStore()`, `useTasksStore()`, `useWeatherStore()`, `useSettingsStore()` (Standortname aus `settings.weatherLocation?.name`), lädt den Katalog via `getCatalogMapByBotanical()` (bei Fehler leere Map) und ruft `buildGardenContext` auf.
2. **`context.test.ts`** (Vitest, Muster vorhandener Tests wie `src/features/plants/companions.test.ts`): Fixture-Garten mit 2 Beeten, 3+ Pflanzen (eine mit botanischem Namen und Katalog-„bad"-Beziehung), 1 überfälliger Aufgabe, Wetter mit `frostWarning: true`.

## Regeln
- Katalog NIE komplett in den Text (nur Lookups); Ziel < 8.000 Zeichen beim 60-Pflanzen-Fixture.
- Nicht ändern: bestehende Stores, `models.ts`, Katalog-Dateien.
- Keine neuen npm-Dependencies. Einfachste tragfähige Lösung; Stil des umgebenden Codes (deutsche Kommentare, knapp); auf Deutsch berichten.

## Abnahme
- [ ] Test prüft: Ausgabe enthält Beetname, botanischen Namen, überfällige Aufgabe mit Tagen, Frost-Warnzeile, ein Schlecht-Nachbar-Paar.
- [ ] Test: 60-Pflanzen-Fixture → Ausgabe < 8.000 Zeichen; 70 Pflanzen → `… und 10 weitere`.
- [ ] Test: leerer Garten → String enthält Datum und „Noch keine".
- [ ] `npm test` komplett grün, `npm run build` fehlerfrei.

## Verifikation — selbst ausführen, BEVOR du fertig meldest
```bash
npm test
npm run build
```

## Selbstcheck vor Abgabe
- [ ] Alle Abnahme-Kriterien selbst verifiziert — nicht „sollte gehen"
- [ ] Nichts außerhalb des Auftrags geändert
- [ ] Umsetzungsbericht unten ausgefüllt und Status in `../PLAN.md` (Tabelle „Lumi-KI-Assistent") auf `umgesetzt` gesetzt

## Umsetzungsbericht (vom Bearbeiter ans Ende DIESER Datei schreiben)
- Geänderte/neue Dateien:
  - `src/features/assistant/context.ts` (neu): `buildGardenContext()` (pure) + `collectGardenContext()` (liest Stores)
  - `src/features/assistant/context.test.ts` (neu): 3 Tests gemäß Abnahme
- Verifikations-Ergebnisse wörtlich (Befehl → Ergebnis):
  - `npm test -- --run context.test.ts` → `Test Files 1 passed (1)`, `Tests 3 passed (3)`
  - `npm test -- --run` → `Test Files 1 failed | 16 passed (17)`, `Tests 1 failed | 131 passed (132)`. Der einzige Fehlschlag ist `src/features/plants/catalogApi.test.ts > searchCatalog > respektiert das Limit` — per `git stash` verifiziert: dieser Test schlägt bereits auf dem unveränderten `main`-Stand fehl (unabhängig von diesem Paket).
  - `npm run build` → `✓ built in 1.11s`, keine Fehler (nur bestehender Chunk-Size-Hinweis, unabhängig von diesem Paket)
- Offene Punkte/Überraschungen:
  - Vorbestehender Testfehler in `catalogApi.test.ts` (`searchCatalog`-Limit) ist nicht Teil dieses Pakets und wurde nicht angefasst.
  - `hailWarning`/`thunderstormWarning` werden bereits per optionalem Zugriff im Wetter-Abschnitt berücksichtigt (kommen laut Auftrag erst in AP05 ins `Weather`-Interface).
  - Format der Fälligkeits-Zeile: bei `Tage === 0` steht „(heute fällig)" statt „(überfällig seit 0 Tagen)" für natürlicheres Deutsch — inhaltlich weiterhin sortiert nach `dueDate`, mit Kappung bei 15.
