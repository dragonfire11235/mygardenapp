# AP09 — Einkaufsberater (Etikett fotografieren im Gartencenter)

## Kontext
Projekt: `C:\Users\Drago\MyGardenApp` — Garten-PWA „lumi". Der Chat kann Fotos erkennen (`/identify`, `mode:'identify'`, AP07). Dieses Paket ergänzt den Einkaufsmodus: Nutzer steht im Gartencenter, fotografiert Pflanzenetikett oder Pflanze, Lumi berät anhand des eigenen Gartens, ob sich der Kauf lohnt. Bewusst KEIN QR-Decoder (EU-Pflanzenpass-QR enthält nur Registrierungsdaten, keinen Pflanzennamen — die Bild-KI liest das Etikett direkt).
Lies zuerst: `supabase/functions/lumi/index.ts` (Route `/identify`, Modus-Konstanten aus AP07), `src/features/assistant/{assistantStore.ts,LumiChatOverlay.vue}` (Kamera-Flow `sendImage` aus AP07).

## Aufgabe
1. **Edge Function — Modus `shopping`** in `/identify` aktivieren. System-Prompt (Konstante, deutsch): „Der Nutzer steht im Gartencenter und fotografiert ein Pflanzenetikett oder eine Pflanze. 1) Erkenne die Pflanze (Etikett-Text bevorzugen: deutscher + botanischer Name, Sorte falls lesbar). 2) Berate ehrlich anhand des Gartens im Kontext: Lohnt der Kauf? In welches Beet passt sie (Licht, Platz — Wuchsbreite beachten)? Welche vorhandenen Pflanzen sind gute/schlechte Nachbarn? Wie hoch ist der Pflegeaufwand verglichen mit den vorhandenen Pflanzen? Rate auch mal ab, wenn es nicht passt. Max. 7 Sätze, einfaches Markdown, am Ende ein klares Fazit-Emoji (✅ / ⚠️ / ❌)."
2. **`assistantStore.ts`:** `sendImage(file, question?, mode: 'identify' | 'shopping' = 'identify')` — Modus an `lumiApi.identify` durchreichen (Signatur erweitern, Aufrufer aus AP07 bleiben kompatibel).
3. **`LumiChatOverlay.vue`:** über der Eingabezeile eine Chip-Zeile, sichtbar wenn der Chat leer ist (Muster: kleine Glas-Pillen wie `.chip` in `BedPlanner.vue`): Chip „🛒 Einkaufsberater" → öffnet denselben versteckten Kamera-Input, aber mit `mode:'shopping'`; Chip „📷 Pflanze erkennen" → bestehender `identify`-Flow. Zusätzlich merkt sich der Kamera-Button den zuletzt gewählten Modus NICHT — Standard bleibt `identify`.
4. Vor dem Versand im Shopping-Modus eine kurze User-Bubble „🛒 Einkaufscheck: …" statt nur des Bildes (kleine Beschriftung an der Bild-Bubble reicht).

## Regeln
- Kein QR-/Barcode-Code, keine neue Dependency (dokumentierte Entscheidung — nicht „verbessern").
- Nicht ändern: `identify`-/`species-only`-Prompts, `/chat`, `/briefing`, Kamera-/Resize-Helfer.
- Stil des umgebenden Codes; UI-Texte deutsch; auf Deutsch berichten.

## Abnahme
- [x] Chip „🛒 Einkaufsberater" im leeren Chat sichtbar; Foto eines Pflanzenetiketts (Testbild mit lesbarem Namen, z. B. Lavendel-Etikett aus dem Netz) → Antwort nennt die Pflanze, referenziert mindestens ein echtes Beet/eine echte Pflanze des Nutzers und endet mit ✅/⚠️/❌.
- [x] Normaler Kamera-Button verhält sich unverändert (`identify`).
- [x] `npm test` + `npm run build` grün.

## Verifikation — selbst ausführen, BEVOR du fertig meldest
```bash
npm test && npm run build
npx supabase functions deploy lumi
npm run dev   # leeren Chat öffnen → Einkaufsberater-Chip → Etikett-Testbild
```
**Umgebung:** Braucht deployte Function + Allowlist + API-Key-Secret; sonst Client-Pfade mit Mock verifizieren und Deploy als offenen Schritt dokumentieren. Der echte Gartencenter-Test am iPhone bleibt beim User — im Bericht vermerken.

## Selbstcheck vor Abgabe
- [x] Alle Abnahme-Kriterien selbst verifiziert oder ehrlich als offen dokumentiert
- [x] Nichts außerhalb des Auftrags geändert
- [x] Umsetzungsbericht unten ausgefüllt und Status in `../PLAN.md` (Tabelle „Lumi-KI-Assistent") auf `umgesetzt` gesetzt

## Umsetzungsbericht (vom Bearbeiter ans Ende DIESER Datei schreiben)
- Geänderte Dateien:
  - `supabase/functions/lumi/index.ts` — `SHOPPING_SYSTEM_PROMPT` (Text aus Aufgabe 1) statt Platzhalter; `route === 'identify'` akzeptiert jetzt `mode === 'shopping'` und wählt den passenden System-Prompt.
  - `src/features/assistant/assistantStore.ts` — `sendImage(file, question?, mode: 'identify' | 'shopping' = 'identify')`, reicht `mode` an `lumiApi.identify` durch; User-Bubble im Shopping-Modus mit „🛒 Einkaufscheck: …"-Präfix.
  - `src/features/assistant/LumiChatOverlay.vue` — Chip-Zeile (`.lumi-chip-row`, `.chip`-Stil wie `BedPlanner.vue`) sichtbar bei leerem Chat: „🛒 Einkaufsberater" (mode shopping) und „📷 Pflanze erkennen" (mode identify), beide über `openPhotoInput(mode)` → gleicher versteckter Datei-Input, Modus wird nur für den nächsten Foto-Versand gemerkt (`pendingPhotoMode`, danach zurück auf `identify`). Normaler Kamera-Button ruft weiterhin `openPhotoInput('identify')` auf, kein Standardwechsel.
  - `lumiApi.ts`/`IdentifyPayload` bereits `mode: 'identify' | 'shopping' | 'species-only'` (aus AP07/AP08) — keine Änderung nötig.
- Verifikations-Ergebnisse wörtlich:
  - `npm test` → `Test Files 21 passed (21)`, `Tests 158 passed (158)`.
  - `npm run build` → `✓ built in 871ms` (nur bestehende Chunk-Size-Warnung, nicht paketbezogen).
  - `npx supabase functions deploy lumi` → `{"project_ref":"vqcoacpusktyeszhcmfw","functions":["lumi"],"message":"Deployed Functions."}`.
  - Browser-Test (laufender Dev-Server, `npm run dev` bereits aktiv): leeren Chat geöffnet → beide Chips sichtbar → „🛒 Einkaufsberater" geklickt → synthetisches Etikett-Testbild („Lavendel, Lavandula angustifolia 'Hidcote', Wuchsbreite 40-50 cm") per simuliertem Datei-Input gesendet → Bild-Bubble zeigt „🛒 Einkaufscheck:" → Antwort erkennt „Lavendel 'Hidcote' (Lavandula angustifolia 'Hidcote')", referenziert echte Beete des Nutzers (Hochbeet, Pergola vorne, Brunnen-Halbkreis), nennt Nachbarn (Salbei, Katzenminze) und Pflegeaufwand, endet mit „Fazit: ✅". Danach Chat zurückgesetzt und regulären Kamera-Button (`identify`) separat getestet — unverändertes Verhalten (Antwort ohne 🛒-Präfix, referenziert ebenfalls echte Beete).
- Offene Punkte/Überraschungen:
  - Der echte Gartencenter-Test am iPhone (reale Kamera, echtes Etikett) bleibt beim User.
  - Datei-Input-Test lief über eine simulierte `DataTransfer`/`change`-Injektion (Browser-Automatisierung kann keinen echten OS-Datei-Dialog bedienen); Verhalten des Codes selbst ist unverändert zum echten Kamera-Flow aus AP07.
  - Deploy-Befehl wurde initial vom Sandbox-Klassifikator blockiert, nach Rückfrage beim User (Freigabe erteilt) erfolgreich ausgeführt.
