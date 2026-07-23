# AP03 — Client-API (`lumiApi.ts`) + `assistantStore`

## Kontext
Projekt: `C:\Users\Drago\MyGardenApp` — Garten-PWA „lumi". Die Edge Function `lumi` (Route `POST /chat`, AP01) und der Kontext-Builder (`src/features/assistant/context.ts`, AP02) existieren. Dieses Paket baut die Client-Anbindung: API-Wrapper + Pinia-Store für den Chat. UI folgt in AP04.
Lies zuerst: `src/features/devices/gardena/gardenaApi.ts` (Funktion `callEdge`, Zeilen 50–74 — exakt dieses Muster), `src/features/assistant/context.ts`, `src/data/supabase/client.ts` (`supabase` kann `null` sein), ein bestehender Store-Test wie `src/features/sync/syncStore.test.ts` o. ä. (`ls src/**/*.test.ts`).

## Aufgabe
1. **`src/features/assistant/lumiApi.ts`**: eigenes `callLumi<T>(route, body)` nach dem `callEdge`-Muster aus gardenaApi.ts (Bearer-Token aus `supabase.auth.getSession()`, Header `apikey`, URL `${SUPABASE_URL}/functions/v1/lumi/${route}`), aber mit **typisierten Fehlern**: wirf ein `LumiError extends Error` mit Feld `code: 'offline' | 'not_allowed' | 'limit_reached' | 'unauthenticated' | 'error'` —
   - fetch wirft (Netz weg) → `offline`
   - HTTP 403 → `not_allowed`, 429 → `limit_reached`, 401 → `unauthenticated`, sonst → `error` (Message aus Response-JSON `message`/`code`).
   - Export `lumiApi = { chat: (messages, context) => callLumi<{reply, usage, provider}>('chat', {messages, context}) }` mit `messages: {role:'user'|'assistant', text:string}[]`.
2. **`src/features/assistant/assistantStore.ts`** (Pinia, Setup-Syntax wie `uiStore.ts`):
   - State: `messages: ref<ChatMessage[]>` (`ChatMessage = { role:'user'|'assistant', text:string }`), `sending: ref(false)`, `error: ref<LumiErrorCode | null>`, modul-lokal gecachter Kontext-String.
   - `async send(text: string)`: trimmen, leere Eingaben ignorieren; User-Message anhängen; beim **ersten** Send der Session `collectGardenContext()` holen und cachen (Fehler → leerer Kontext, nicht blockieren); `lumiApi.chat(messages, context)` mit der **gesamten** bisherigen Message-Liste; Antwort als assistant-Message anhängen. `sending` sauber per try/finally; Fehler → `error` setzen, User-Message in der Liste lassen.
   - `reset()`: Messages, Fehler und Kontext-Cache leeren.
   - Kein Dexie/keine Persistenz — Chat ist bewusst session-only (Architektur-Entscheidung D8).
3. **`assistantStore.test.ts`** (Vitest): `global.fetch` mocken, `collectGardenContext` via `vi.mock('./context', …)` stubben, Supabase-Session mocken (siehe wie andere Tests `src/data/supabase/client` mocken, sonst `vi.mock` auf `./lumiApi` und Store-Logik direkt testen — der einfachere Weg ist erlaubt):
   - Erfolgsfall: nach `send('Hallo')` stehen 2 Messages (user + assistant) im Store.
   - 403-Fall: `error === 'not_allowed'`, User-Message bleibt, `sending === false`.
   - Netzfehler: `error === 'offline'`.

## Regeln
- Kein `supabase.functions.invoke` — das Projekt nutzt bewusst rohes `fetch` (Muster gardenaApi).
- Nicht ändern: `gardenaApi.ts`, `context.ts` (nur importieren), Edge Function.
- Keine neuen npm-Dependencies. UI-Texte deutsch, Code englisch; auf Deutsch berichten.

## Abnahme
- [ ] Die drei Store-Tests laufen grün; `npm test` komplett grün.
- [ ] `npm run build` (vue-tsc) fehlerfrei.
- [ ] `lumiApi.ts` enthält keine Kopie von Kontext-/UI-Logik (nur Transport + Fehler-Mapping).

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
  - `src/features/assistant/lumiApi.ts` (neu) — `callLumi<T>` nach `callEdge`-Muster (POST, Bearer aus `supabase.auth.getSession()`, Header `apikey`), `LumiError extends Error` mit `code`, Mapping fetch-Wurf→`offline`, HTTP 403/429/401/sonst→`not_allowed`/`limit_reached`/`unauthenticated`/`error`, `lumiApi.chat(messages, context)`.
  - `src/features/assistant/assistantStore.ts` (neu) — Pinia Setup-Store `assistant`: `messages`, `sending`, `error`, modul-lokaler `gardenContext`-Cache (`let`, kein `ref`, da nicht UI-relevant); `send()` mit try/finally, `reset()`.
  - `src/features/assistant/assistantStore.test.ts` (neu) — 3 Tests (Erfolg, 403→not_allowed, offline), `./lumiApi` und `./context` gemockt (einfacherer Weg laut Auftrag, kein Supabase-Session-Mock nötig).
- Verifikations-Ergebnisse wörtlich:
  - `npx vitest run src/features/assistant` → `Test Files  2 passed (2)` / `Tests  6 passed (6)`.
  - `npm test -- --run` (komplette Suite) → `Test Files  1 failed | 17 passed (18)` / `Tests  1 failed | 134 passed (135)`. Der einzige Fehlschlag ist `src/features/plants/catalogApi.test.ts > searchCatalog > respektiert das Limit` (erwartet 2, erhält 4) — **vorbestehend, unabhängig von diesem Paket**, Datei wurde nicht angefasst.
  - `npm run build` → `✓ built in 885ms`, keine vue-tsc-Fehler (nur bestehende Chunk-Size-Warnung, unabhängig).
- Offene Punkte/Überraschungen:
  - Kein bereits existierender Pinia-Store-Test im Projekt als Vorlage gefunden (`syncStore.test.ts` existiert nicht) — Testaufbau (`setActivePinia(createPinia())` + `vi.mock`) selbst nach Vitest/Pinia-Standardmuster gewählt.
  - Vorbestehender Testfehler in `catalogApi.test.ts` sollte separat gefixt werden (nicht Teil dieses Pakets).
