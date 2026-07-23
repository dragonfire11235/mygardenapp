# AP06 — Tages-Briefing („3 wichtigste Dinge heute")

## Kontext
Projekt: `C:\Users\Drago\MyGardenApp` — Garten-PWA „lumi". Edge Function `lumi` (AP01), Kontext-Builder (AP02), `assistantStore` (AP03), Chat-UI (AP04) und Wetterwarnungen (AP05) existieren. Dieses Paket: Lumi begrüßt den Nutzer 1×/Tag mit einem kurzen Briefing (wichtigste Aufgaben + Wetterwarnung) — in der Dashboard-Hero-Sprechblase und als Chat-Begrüßung.
Lies zuerst: `supabase/functions/lumi/index.ts` (Route-Muster `/chat`, `callLlm`, Usage-Guard), `src/features/assistant/{assistantStore.ts,context.ts,lumiApi.ts}`, `src/features/dashboard/lumiTips.ts` + `DashboardPage.vue` (Tipp-Rotation alle 8 s), `src/App.vue` (`onMounted`-Ladefolge), `src/data/storage.ts` (`getSetting`/`setSetting`).

## Aufgabe
1. **Edge Function — Route `POST /briefing`** in `supabase/functions/lumi/index.ts`: Body `{context: string}`. Eigener System-Prompt (Konstante, deutsch): „Du bist Lumi … Nenne die 2–3 wichtigsten Dinge für heute im Garten in max. 3 kurzen Sätzen. Beginne mit der dringendsten Sache. Erwähne Wetterwarnungen (Frost/Hagel/Gewitter) zuerst, falls vorhanden. Kein Markdown, keine Aufzählung — fließender, freundlicher Text." `max_tokens: 512`, gleicher Allowlist-/Usage-Guard wie `/chat` (nichts duplizieren — gemeinsame Prüf-Logik wiederverwenden). Antwort `{reply, usage, provider}`.
2. **`lumiApi.ts`:** `briefing: (context) => callLumi<{reply,…}>('briefing', {context})`.
3. **`assistantStore.ts`:** `briefing = ref<string | null>(null)` + `async loadBriefing()`:
   - Cache lesen: `storage.getSetting<{date: string, text: string}>('lumiBriefing')`; ist `date === todayIso()` → `briefing` setzen, **kein** Netz-Call.
   - Sonst: nur wenn `authStore.isAuthenticated` und `navigator.onLine`; `collectGardenContext()` → `lumiApi.briefing(context)` → Cache schreiben (`setSetting`) + `briefing` setzen.
   - **Alle Fehler still schlucken** (kein Toast, kein Error-State) — Nutzer ohne Allowlist/offline sehen einfach die statischen Tipps.
4. **`App.vue`:** in `onMounted` NACH dem bestehenden Store-Laden/`syncCareTasks`: `void assistant.loadBriefing()` (nicht awaiten — darf den Start nicht bremsen).
5. **`lumiTips.ts`:** Signatur `buildLumiTips(w: WeatherLike | null | undefined, briefing?: string | null)`; ist `briefing` gesetzt → als **erster** Eintrag (`'🌱 ' + briefing`) vor allem anderen. `DashboardPage.vue` übergibt `assistant.briefing`.
6. **`LumiChatOverlay.vue`:** ist der Chat leer und `briefing` vorhanden → Begrüßungsbubble zeigt das Briefing statt des generischen Grußes.
7. **Tests:** `lumiTips.test.ts` erweitern (Briefing steht vorn); Store-Test: `loadBriefing` mit gemocktem Setting von heute macht keinen fetch (fetch-Mock zählt Aufrufe), mit altem Datum genau einen.

## Regeln
- Briefing strukturell max. 1 LLM-Call/Tag (Cache im Settings-KV, Key `lumiBriefing`).
- Nicht ändern: `/chat`-Verhalten, `buildLumiTips`-Bestandslogik (nur voranstellen), App-Startreihenfolge im Übrigen.
- Keine neuen npm-Dependencies; auf Deutsch berichten.

## Abnahme
- [ ] Erster App-Start des Tages (eingeloggt, allowlisted, online) → genau 1 `/briefing`-Request (Netzwerk-Tab); Reload danach → 0 Requests, Briefing kommt aus dem Cache.
- [ ] Briefing erscheint als erster Lumi-Tipp in der Dashboard-Hero-Bubble und als Chat-Begrüßung.
- [ ] Ausgeloggt/offline/nicht allowlisted → keine Fehlermeldung, statische Tipps wie bisher.
- [ ] `npm test` + `npm run build` grün.

## Verifikation — selbst ausführen, BEVOR du fertig meldest
```bash
npm test && npm run build
npx supabase functions deploy lumi   # falls Zugang fehlt: im Bericht vermerken
npm run dev   # DevTools: Setting 'lumiBriefing' in IndexedDB löschen, Reload ×2, Netzwerk-Tab beobachten
```
**Umgebung:** Echter Briefing-Text braucht deployte Function + Allowlist + `ANTHROPIC_API_KEY`-Secret. Fehlt das: Cache-/Fallback-Pfade lokal verifizieren (fetch mocken), Deploy als offenen Schritt dokumentieren. Echte Nutzerdaten (localhost) außer dem Setting `lumiBriefing` nicht anfassen.

## Selbstcheck vor Abgabe
- [ ] Alle Abnahme-Kriterien selbst verifiziert oder ehrlich als offen dokumentiert
- [ ] Nichts außerhalb des Auftrags geändert
- [ ] Umsetzungsbericht unten ausgefüllt und Status in `../PLAN.md` (Tabelle „Lumi-KI-Assistent") auf `umgesetzt` gesetzt

## Umsetzungsbericht (vom Bearbeiter ans Ende DIESER Datei schreiben)
- Geänderte/neue Dateien: …
- Verifikations-Ergebnisse wörtlich (Befehl → Ergebnis): …
- Offene Punkte/Überraschungen: …
