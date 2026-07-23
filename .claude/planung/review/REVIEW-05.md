# REVIEW-05 — AP05 Wetter: Gewitter-/Hagelwarnung

**Verdikt: abgenommen.** Alle Abnahmekriterien objektiv erfüllt und selbst verifiziert.

## Verifikation (selbst ausgeführt)
- `npm test` → `Test Files 20 passed (20)`, `Tests 147 passed (147)`. Neue Tests (`weatherApi.test.ts`) und ergänzte Tests (`lumiTips.test.ts`) grün, bestehende unverändert grün.
- `npm run build` → `vue-tsc` fehlerfrei, `✓ built`. (Nur bekannter chunk-size-Hinweis, unverändert.)
- Dev-Server (eigene Instanz, Port 5199): Store mit Code-96-Wetter gemockt → WeatherWidget zeigt exakt den Hagel-Chip „🧊 Hagel/Gewitter möglich — empfindliche Pflanzen schützen!" und keinen zweiten. Mock nur zur Laufzeit im Browser, kein Rückstand im Code.

## Prüfung gegen Kriterien
- **Helfer korrekt:** `thunderstormExpected`/`hailExpected` prüfen `days.slice(0,2)` (heute+morgen); Hagel nur 96/99, Gewitter 95/96/99. Rein & exportiert.
- **Interface/Store:** `thunderstormWarning`/`hailWarning` in `Weather`, in `fetchWeather` befüllt, Store-Computeds analog zu `frostWarning`.
- **Priorität Widget:** Hagel > Gewitter > Frost > Regen über `v-if`/`v-else-if` sauber umgesetzt.
- **lumiTips:** Hagel- und Gewitter-Tipp VOR dem Frost-Tipp; Flags im `WeatherLike`-Interface.
- **Nicht-Ziele eingehalten:** `fetchWeather`-URL/Parameter, `frostWarning`/`rainToday` und `codeMap` unverändert. Keine neuen npm-Dependencies.

## Befunde
- Keine kritischen oder wichtigen Befunde.
- Kosmetisch: Der Gewitter-Chip trägt den Zusatz „— hohe Pflanzen sichern" statt nur „⛈️ Gewitter erwartet". Bewusst gewählt für Stilkonsistenz mit der Frost-/Regenzeile; kein Mangel.

## Notwendige Anpassung außerhalb der Paketdateien (im Scope)
- `src/features/assistant/context.test.ts`: bestehendes `Weather`-Literal um die zwei neuen Pflichtfelder ergänzt — sonst TS-Fehler im Build. Kein Verhaltenswechsel.
