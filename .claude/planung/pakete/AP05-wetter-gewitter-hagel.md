# AP05 — Wetter: Gewitter-/Hagelwarnung (deterministisch, ohne KI)

## Kontext
Projekt: `C:\Users\Drago\MyGardenApp` — Garten-PWA „lumi". Das Wetter kommt von Open-Meteo (`src/features/weather/weatherApi.ts`); es gibt bereits `frostWarning` (Nachtfrost ≤ 0° in 4 Tagen) und `rainToday`. WMO-Codes 95–99 (Gewitter, 96/99 = mit Hagel) werden geholt, aber nur als Label gemappt — dieses Paket macht daraus Warnungen. Unabhängig vom KI-Assistenten; funktioniert für alle Nutzer.
Lies zuerst: `src/features/weather/weatherApi.ts` (Interface `Weather`, `fetchWeather`, `codeMap`), `src/features/weather/weatherStore.ts`, `src/features/weather/WeatherWidget.vue` (bestehende Hinweiszeile: Frost vor Regen), `src/features/dashboard/lumiTips.ts` (`WeatherLike`, `buildLumiTips`).

## Aufgabe
1. **`weatherApi.ts`:**
   - Zwei exportierte pure Helfer: `thunderstormExpected(days: DayForecast[]): boolean` (Code 95/96/99 in **heute oder morgen**, also `days.slice(0, 2)`) und `hailExpected(days: DayForecast[]): boolean` (Code 96/99, gleicher Zeitraum).
   - Interface `Weather` um `thunderstormWarning: boolean` und `hailWarning: boolean` erweitern; in `fetchWeather` aus den Helfern befüllen (Kommentar-Stil wie bei `frostWarning`).
2. **`weatherStore.ts`:** Computeds `thunderstormWarning`/`hailWarning` analog zu den bestehenden (`frostWarning`).
3. **`WeatherWidget.vue`:** Hinweiszeile erweitern — Priorität **Hagel („🧊 Hagel/Gewitter möglich — empfindliche Pflanzen schützen!") > Gewitter („⛈️ Gewitter erwartet") > Frost > Regen**; Stil der bestehenden Zeile übernehmen.
4. **`lumiTips.ts`:** `WeatherLike` um `thunderstormWarning?`/`hailWarning?` ergänzen; in `buildLumiTips` VOR dem Frost-Tipp: Hagel-Tipp („🧊 Lumi-Tipp: Hagel möglich — Kübel unters Dach, Vlies bereitlegen!"), dann Gewitter-Tipp („⛈️ Lumi-Tipp: Gewitter im Anzug — binde hohe Stauden fest.").
5. **Test `weatherApi.test.ts`** (neu, Vitest): Fixtures mit `DayForecast[]` — Code 96 heute → beide Flags true; Code 95 morgen → nur thunderstorm; Code 95 am Tag 3 → beide false; Codes < 95 → false. Zusätzlich in `lumiTips.test.ts` (existiert): Hagel-Flag → Hagel-Tipp steht vorn.

## Regeln
- Deterministische Logik, kein LLM-Bezug; keine neuen API-Felder von Open-Meteo nötig (Codes sind schon in `daily.weather_code`).
- Nicht ändern: `fetchWeather`-URL/Abfrageparameter, bestehende Flags (`frostWarning`/`rainToday`) und deren Verhalten.
- Keine neuen npm-Dependencies. Stil des umgebenden Codes; auf Deutsch berichten.

## Abnahme
- [ ] Unit-Tests wie beschrieben grün; bestehende Tests unverändert grün (`npm test`).
- [ ] `npm run build` fehlerfrei.
- [ ] Dev-Server: mit im Store gemocktem/manipuliertem Wetter (z. B. Vue DevTools oder temporärem Testwert, danach entfernen) zeigt das WeatherWidget den Hagel-Chip.

## Verifikation — selbst ausführen, BEVOR du fertig meldest
```bash
npm test
npm run build
npm run dev   # WeatherWidget-Hinweis prüfen (Mock siehe oben)
```

## Selbstcheck vor Abgabe
- [ ] Alle Abnahme-Kriterien selbst verifiziert — nicht „sollte gehen"
- [ ] Nichts außerhalb des Auftrags geändert (kein Test-Mock im Code vergessen!)
- [ ] Umsetzungsbericht unten ausgefüllt und Status in `../PLAN.md` (Tabelle „Lumi-KI-Assistent") auf `umgesetzt` gesetzt

## Umsetzungsbericht (vom Bearbeiter ans Ende DIESER Datei schreiben)
- Geänderte/neue Dateien:
  - `src/features/weather/weatherApi.ts` — Helfer `thunderstormExpected`/`hailExpected` (heute+morgen, `days.slice(0,2)`), Interface `Weather` um `thunderstormWarning`/`hailWarning` erweitert, in `fetchWeather` befüllt.
  - `src/features/weather/weatherStore.ts` — Computeds `thunderstormWarning`/`hailWarning` analog zu `frostWarning`, im Return exportiert.
  - `src/features/weather/WeatherWidget.vue` — Hinweiszeile mit Priorität Hagel > Gewitter > Frost > Regen.
  - `src/features/dashboard/lumiTips.ts` — `WeatherLike` um beide Flags erweitert; Hagel- und Gewitter-Tipp VOR dem Frost-Tipp.
  - `src/features/weather/weatherApi.test.ts` — NEU: Fixtures Code 96 heute (beide true), Code 95 morgen (nur Gewitter), Code 95 Tag 3 (beide false), Codes < 95 (false).
  - `src/features/dashboard/lumiTips.test.ts` — Hagel-Flag → Hagel-Tipp vorn (auch vor Frost); Gewitter-Tipp-Test ergänzt.
  - `src/features/assistant/context.test.ts` — bestehendes `Weather`-Literal um die zwei neuen Pflichtfelder ergänzt (sonst TS-Fehler im Build).
- Verifikations-Ergebnisse wörtlich (Befehl → Ergebnis):
  - `npm test` → `Test Files  20 passed (20)` / `Tests  147 passed (147)`.
  - `npm run build` → `✓ built in 838ms`, `vue-tsc` fehlerfrei (nur bekannter chunk-size-Hinweis).
- Offene Punkte/Überraschungen: Der Build erzwingt Vollständigkeit des `Weather`-Literals — ein bestehender Assistant-Test musste um die zwei Felder ergänzt werden (innerhalb des Auftrags, kein Verhaltenswechsel). Kein Test-Mock im Produktivcode zurückgelassen.
