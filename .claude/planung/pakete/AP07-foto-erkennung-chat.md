# AP07 — Foto-Pflanzenerkennung im Chat (`/identify`)

## Kontext
Projekt: `C:\Users\Drago\MyGardenApp` — Garten-PWA „lumi". Chat mit Garten-Kontext läuft (AP01–AP06). Dieses Paket: Nutzer fotografiert im Chat eine Pflanze, Lumi erkennt sie (Vision-Modell) und berät mit Blick auf den echten Garten (welches Beet, Nachbarn, Pflege). Der `callLlm`-Helper der Edge Function unterstützt Bilder bereits (AP01).
Lies zuerst: `supabase/functions/lumi/index.ts` (`callLlm` mit `imageBase64`/`mediaType`, Routen-Muster), `src/features/assistant/{lumiApi.ts,assistantStore.ts,LumiChatOverlay.vue}`, `src/shared/photos.ts` (`resizeImage(file)` → `{blob, mimeType}`, max 1600px JPEG), `src/shared/PhotoPicker.vue` (verstecktes `<input type="file" accept="image/*">`-Muster).

## Aufgabe
1. **Edge Function — Route `POST /identify`:** Body `{imageBase64: string, mediaType: string, mode: 'identify' | 'shopping' | 'species-only', question?: string, context?: string}`. Gleicher Allowlist-/Usage-Guard wie `/chat`. System-Prompt je Modus (Konstanten):
   - `identify`: „Bestimme die Pflanze auf dem Foto (deutscher + botanischer Name, Sicherheit hoch/mittel/niedrig). Danach: Passt sie in den Garten des Nutzers (Kontext unten)? Welches Beet (Sonne/Platz), welche vorhandenen Pflanzen sind gute/schlechte Nachbarn, wie aufwendig die Pflege? Max. 6 Sätze, einfaches Markdown. Wenn kein Pflanzenfoto: sag es freundlich."
   - `shopping` und `species-only`: Platzhalter-Konstanten anlegen, aber in diesem Paket nur `identify` verdrahten — andere Modi → 400 `{code:'mode_not_ready'}` (kommen in AP08/AP09).
   - Bild-Message via `callLlm` (`imageBase64` + `question`/Standardfrage als Text im selben User-Turn), `max_tokens: 1024`, `context` ans System anhängen.
2. **`lumiApi.ts`:** `identify: (payload) => callLumi<{reply,…}>('identify', payload)`.
3. **`src/features/assistant/imageUtil.ts`:** `fileToLumiImage(file: File): Promise<{imageBase64, mediaType}>` — `resizeImage(file)` aus `src/shared/photos.ts` nutzen (kein Eigenbau!), Blob per `FileReader.readAsDataURL` → base64 ohne `data:`-Präfix.
4. **`assistantStore.ts`:** `ChatMessage` um optionales `imageUrl?: string` erweitern; `async sendImage(file: File, question?: string)`: Objekt-URL für die Bubble erzeugen, User-Message (Bild + optionale Frage) anhängen, Kontext wie bei `send` sicherstellen, `lumiApi.identify({…, mode:'identify', question, context})`, Antwort anhängen; Fehler-Mapping wie `send`.
5. **`LumiChatOverlay.vue`:** Kamera-Button (`ph-camera`) neben der Eingabe → verstecktes `<input type="file" accept="image/*" capture="environment">`; nach Auswahl direkt `sendImage(file)`. User-Bubbles mit `imageUrl` zeigen das Bild (max. 200px, `--radius-m`).

## Regeln
- Bild IMMER durch `resizeImage` (Payload < 1 MB base64); Original nie hochladen.
- Nicht ändern: `/chat`- und `/briefing`-Verhalten, `photos.ts`, PhotoPicker.
- Keine neuen npm-Dependencies; kein getUserMedia/Live-Viewfinder (bewusste Entscheidung). Auf Deutsch berichten.

## Abnahme
- [ ] Foto einer bekannten Pflanze (Testbild, z. B. Tomate aus dem Netz lokal gespeichert) → Antwort nennt deutschen + botanischen Namen und referenziert mindestens ein echtes Beet oder eine echte Pflanze des Nutzers aus dem Kontext.
- [ ] base64-Payload eines 4000px-Fotos < 1 MB (Konsole loggen und im Bericht notieren).
- [ ] Nicht-Pflanzen-Foto (z. B. Tasse) → höfliche „kein Pflanzenfoto"-Antwort, kein Fehler.
- [ ] Bild-Bubble erscheint im Chat; `npm test` + `npm run build` grün.

## Verifikation — selbst ausführen, BEVOR du fertig meldest
```bash
npm test && npm run build
npx supabase functions deploy lumi
npm run dev   # Chat → Kamera-Button → Testbild wählen → Antwort prüfen
```
**Umgebung:** Braucht deployte Function + Allowlist + API-Key-Secret; am Desktop öffnet `capture="environment"` den Dateidialog (okay). iPhone-Verhalten (PWA, echte Kamera) kann nur der User testen → im Bericht als User-Test-Schritt vermerken. Fehlt der Deploy-Zugang: Client-Teil lokal mit gemocktem `lumiApi` verifizieren, Rest dokumentieren.

## Selbstcheck vor Abgabe
- [ ] Alle Abnahme-Kriterien selbst verifiziert oder ehrlich als offen dokumentiert
- [ ] Nichts außerhalb des Auftrags geändert
- [ ] Umsetzungsbericht unten ausgefüllt und Status in `../PLAN.md` (Tabelle „Lumi-KI-Assistent") auf `umgesetzt` gesetzt

## Umsetzungsbericht (vom Bearbeiter ans Ende DIESER Datei schreiben)
- Geänderte/neue Dateien: …
- Verifikations-Ergebnisse wörtlich (Befehl → Ergebnis): …
- Offene Punkte/Überraschungen: …
