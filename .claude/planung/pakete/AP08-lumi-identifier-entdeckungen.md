# AP08 — `LumiIdentifier` für Garten-Entdeckungen (KI-Arterkennung)

## Kontext
Projekt: `C:\Users\Drago\MyGardenApp` — Garten-PWA „lumi". Die Sichtungen („Entdeckungen", `src/features/sightings/`) haben eine vorbereitete Naht für KI-Arterkennung: `SpeciesIdentifier`-Interface mit No-op-`ManualIdentifier`. Die Edge Function `lumi` hat seit AP07 die Route `/identify` mit Modus-Parameter. Dieses Paket verdrahtet beides: Foto einer Sichtung → KI schlägt Gruppe + Art vor.
Lies zuerst: `src/features/sightings/identify/types.ts` (`SpeciesIdentifier`: `readonly source: SightingSource`; `suggest(blob): Promise<IdentificationResult | null>`; `IdentificationResult = {group?, species?}`), `identify/ManualIdentifier.ts`, **alle Verwendungsstellen** (`grep -r "ManualIdentifier\|SpeciesIdentifier" src/`), `src/data/models.ts` (`SightingGroup`, `SightingSource`), `supabase/functions/lumi/index.ts` (Route `/identify`, Platzhalter `species-only`), `src/features/assistant/{lumiApi.ts,imageUtil.ts}`.

## Aufgabe
1. **Edge Function — Modus `species-only`** in `/identify` aktivieren: System-Prompt (Konstante): „Bestimme das Lebewesen/die Pflanze auf dem Foto. Antworte NUR mit JSON: `{\"group\": \"wildbee|butterfly|hoverfly|beetle|bird|other\", \"species\": \"deutscher Artname\", \"confidence\": \"high|medium|low\"}` — kein weiterer Text. Bei Unkenntlichkeit: `{\"group\":\"other\",\"species\":null,\"confidence\":\"low\"}`." `max_tokens: 256`. Antwort der Route bleibt `{reply, usage, provider}` (reply = der JSON-String).
2. **`src/features/assistant/LumiIdentifier.ts`:** `class LumiIdentifier implements SpeciesIdentifier` — `source = 'ai'`; `suggest(blob)`: Blob → base64 (Helfer aus `imageUtil.ts` verallgemeinern oder Blob-Variante ergänzen), `lumiApi.identify({mode:'species-only', …, context: undefined})`, `reply` mit `JSON.parse` parsen (tolerant: bei Parse-Fehler oder `confidence === 'low'` → `null`), Ergebnis auf `IdentificationResult` mappen (nur gültige `SightingGroup`-Werte durchlassen).
3. **Verdrahtung ohne Import-Verletzung** (Sightings darf NICHT aus `assistant/` importieren): in `src/features/sightings/identify/` eine kleine Registry ergänzen (`let active: SpeciesIdentifier = new ManualIdentifier()`, `export function setSpeciesIdentifier(i)`, `export function getSpeciesIdentifier()`); bestehende Verwendungsstellen auf `getSpeciesIdentifier()` umstellen. In `src/App.vue` (darf alles importieren) beim Start registrieren: wenn `authStore.isAuthenticated` → `setSpeciesIdentifier(new LumiIdentifier())`, bei Logout zurück auf Manual (im bestehenden `onAuthStateChange`/Watcher-Muster des authStore beobachten — schau, wie App.vue auf Login reagiert).
4. **UI-Anbindung:** dort, wo Sichtungen ein Foto bekommen (Verwendungsstellen aus Schritt-1-Grep), nach Fotoauswahl `suggest(blob)` aufrufen, sofern der aktive Identifier nicht Manual ist: Vorschlag als vorausgefüllte Werte (Gruppe/Art) anzeigen, Nutzer kann ändern; `Sighting.source = 'ai'` nur, wenn der Vorschlag unverändert übernommen wurde. Fehler/`null` → stiller Fallback aufs manuelle Formular.
5. **Test:** `LumiIdentifier.test.ts` — gemockte `lumiApi.identify`: gültiges JSON → gemapptes Result; kaputtes JSON → `null`; `confidence: 'low'` → `null`.

## Regeln
- Interface `SpeciesIdentifier` und `ManualIdentifier` NICHT verändern; Datenmodell (`Sighting`) NICHT ändern.
- Feature-Import-Regel wahren: `sightings` importiert nie aus `assistant` (Registry-Muster oben); `assistant` darf `sightings/identify/types` importieren.
- Keine neuen npm-Dependencies; still degradieren (offline/nicht allowlisted → manuell wie bisher). Auf Deutsch berichten.

## Abnahme
- [ ] Eingeloggt + allowlisted: Sichtungs-Foto → Gruppen-/Art-Vorschlag erscheint vorausgefüllt; unverändert gespeichert → `source === 'ai'` (IndexedDB prüfen).
- [ ] Ausgeloggt: Verhalten exakt wie vorher (manuell, `source === 'manual'`).
- [ ] Identifier-Tests grün; `npm test` + `npm run build` grün.

## Verifikation — selbst ausführen, BEVOR du fertig meldest
```bash
npm test && npm run build
npx supabase functions deploy lumi
npm run dev   # Entdeckungen: Foto-Flow mit Testbild (Schmetterling o. ä.) durchspielen
```
**Umgebung:** Echter KI-Vorschlag braucht deployte Function + Allowlist + API-Key. Fehlt das: Registry-/Fallback-Pfade lokal testen, Rest im Bericht. Testdaten mit Präfix `ZZTEST-` anlegen und wieder löschen — echte Sichtungen nicht anfassen.

## Selbstcheck vor Abgabe
- [ ] Alle Abnahme-Kriterien selbst verifiziert oder ehrlich als offen dokumentiert
- [ ] Nichts außerhalb des Auftrags geändert
- [ ] Umsetzungsbericht unten ausgefüllt und Status in `../PLAN.md` (Tabelle „Lumi-KI-Assistent") auf `umgesetzt` gesetzt

## Umsetzungsbericht (vom Bearbeiter ans Ende DIESER Datei schreiben)
- Geänderte/neue Dateien:
  - `supabase/functions/lumi/index.ts` — `SPECIES_ONLY_SYSTEM_PROMPT` aktiviert, Route `/identify` behandelt `mode: 'species-only'` (max_tokens 256, eigener System-Prompt, kein Garten-Kontext).
  - `src/features/assistant/LumiIdentifier.ts` (neu) — `implements SpeciesIdentifier`, `source: 'ai'`, ruft `lumiApi.identify({mode:'species-only'})`, entfernt Markdown-Codefences vor `JSON.parse` (siehe Überraschung unten), liefert bei `confidence:'low'`/Parse-Fehler/Netzfehler `null`.
  - `src/features/assistant/LumiIdentifier.test.ts` (neu) — 5 Tests: valides JSON, gefenctes JSON, kaputtes JSON, `confidence:'low'`, Netzfehler.
  - `src/features/sightings/identify/registry.ts` (neu) — `setSpeciesIdentifier`/`getSpeciesIdentifier`, Default `ManualIdentifier`.
  - `src/features/sightings/SightingDialog.vue` — nutzt `getSpeciesIdentifier()` statt fest verdrahtetem `ManualIdentifier`; neuer Snapshot-Vergleich (`appliedSuggestion`) setzt `source: 'ai'` nur, wenn Gruppe+Art beim Speichern noch exakt dem übernommenen Vorschlag entsprechen — sonst `'manual'`.
  - `src/App.vue` — Watcher auf `auth.isAuthenticated` (immediate) registriert `LumiIdentifier` bei Login, `ManualIdentifier` bei Logout/Start.
  - `src/shared/photos.ts`, `src/features/assistant/imageUtil.ts` — `resizeImage`/`fileToLumiImage` von `File` auf `Blob` verallgemeinert (Interface verlangt `suggest(blob: Blob)`; beide Implementierungen nutzten intern ohnehin nur Blob-APIs).
- Verifikations-Ergebnisse wörtlich:
  - `npm test -- --run` → `Test Files 21 passed (21)` / `Tests 158 passed (158)`.
  - `npm run build` → `vue-tsc -b && vite build` fehlerfrei, `✓ built in 839ms`.
  - `npx supabase functions deploy lumi` → `{"project_ref":"vqcoacpusktyeszhcmfw","functions":["lumi"],"message":"Deployed Functions."}` (zweimal, nach Fence-Fix erneut).
  - Browser-Test (echter, laufender Dev-Server, eingeloggt als Owner `dragonfire11235@hotmail.com`): `registry.getSpeciesIdentifier()` liefert nach Login `LumiIdentifier`; `suggest(blob)` mit generiertem Testbild löst einen echten Call gegen die deployte Function aus (Antwort enthielt reale `usage`-Tokens, Provider `anthropic`), parst das JSON korrekt trotz Markdown-Codefences und liefert bei niedriger Konfidenz sauber `null` ohne Exception. Keine Konsolen-Fehler. Keine Testdaten gespeichert (Dialog ohne Speichern verworfen).
- Offene Punkte/Überraschungen:
  - **Überraschung:** Claude (Haiku) hält sich trotz `„kein weiterer Text"`-Anweisung nicht zuverlässig daran und umschließt die JSON-Antwort mit ` ```json ... ``` `. Ohne Gegenmaßnahme wäre `JSON.parse` bei **jeder** Antwort gescheitert und `suggest()` hätte immer `null` geliefert (stiller Totalausfall, wäre ohne echten End-to-End-Test nicht aufgefallen). Fix: Codefences vor dem Parsen abstreifen (`LumiIdentifier.ts`), Test dafür ergänzt.
  - Nicht verifiziert: ein tatsächlicher **positiver** Vorschlag (hohe Konfidenz, vorausgefülltes Formular) mit einem echten Insekten-/Vogelfoto — im Testsetup stand kein reales Artenfoto zur Verfügung, nur ein per Canvas generiertes Testbild (korrekt als `other`/`low` erkannt). Bitte am Handy mit einem echten Foto (z. B. Schmetterling) gegenprüfen: Vorschlag erscheint vorausgefüllt, unverändert übernommen → `source === 'ai'` in IndexedDB.
  - Ausgeloggt-Verhalten (`ManualIdentifier`, `source === 'manual'`) nicht separat im Browser nachgestellt, um die laufende reale Session des Nutzers auf dem gemeinsam genutzten Dev-Server nicht zu stören — Logik ist aber trivial (Default der Registry + Watcher-Zweig) und durch den bestehenden bisherigen Ablauf (unverändertes `ManualIdentifier.suggest()` → immer `null`) ohnehin abgedeckt.
