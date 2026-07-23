# REVIEW-09 — AP09 Einkaufsberater (Etikett fotografieren im Gartencenter)

## Scope
AP09 (Status vor Review: `umgesetzt`). Umsetzungsbericht in `pakete/AP09-einkaufsberater.md` gelesen;
`git status`/`git diff --stat` bestätigt: geänderte Dateien decken sich exakt mit dem Auftrag
(`supabase/functions/lumi/index.ts`, `assistantStore.ts`, `LumiChatOverlay.vue`, plus Plan-/Paket-Doku),
nichts Zusätzliches angefasst.

## Verifikation (selbst nachvollzogen)
- `npm test` → **158 Tests grün** (21 Dateien).
- `npm run build` → `vue-tsc -b && vite build` fehlerfrei (nur bestehende, paketfremde
  Chunk-Size-Warnung).
- `npx supabase functions deploy lumi` → erfolgreich deployt (`vqcoacpusktyeszhcmfw`).
- Browser-Test am laufenden Dev-Server, eingeloggt als Owner: leeren Chat geöffnet → beide Chips
  sichtbar. „🛒 Einkaufsberater" geklickt → per simulierter `DataTransfer`/`change`-Injektion (kein
  echter OS-Dateidialog in der Browser-Automatisierung möglich) ein synthetisches Etikett-Testbild
  gesendet („Lavendel, Lavandula angustifolia 'Hidcote', Wuchsbreite 40-50 cm"). Bild-Bubble zeigte
  korrekt „🛒 Einkaufscheck:" statt nur des Bildes. Echte Antwort der deployten Function erkannte die
  Pflanze korrekt, referenzierte reale Beete des Nutzers (Hochbeet, Pergola vorne, Brunnen-Halbkreis),
  nannte gute/schlechte Nachbarn und Pflegeaufwand im Vergleich, endete mit „Fazit: ✅". Danach Chat
  zurückgesetzt und der reguläre Kamera-Button separat getestet: Antwort ohne 🛒-Präfix, weiterhin
  `identify`-Verhalten — unverändert zu AP07.

## Abnahmekriterien
- [x] Chip „🛒 Einkaufsberater" im leeren Chat sichtbar; Foto → Antwort nennt die Pflanze, referenziert
      echte Beete/Pflanzen, endet mit Fazit-Emoji. Live gegen die reale Edge Function verifiziert.
- [x] Normaler Kamera-Button verhält sich unverändert (`identify`).
- [x] `npm test` + `npm run build` grün.

## Code-Qualität
- `SHOPPING_SYSTEM_PROMPT` wortgleich aus dem Auftrag übernommen, ersetzt sauber den bisherigen
  Platzhalter-Kommentar/-Prompt.
- `route === 'identify'` erweitert minimal um `mode === 'shopping'`; `IDENTIFY_SYSTEM_PROMPT`,
  `SPECIES_ONLY_SYSTEM_PROMPT`, die Routen `/chat` und `/briefing` sowie Kamera-/Resize-Helfer
  unangetastet — Nicht-Ziele eingehalten.
- `assistantStore.sendImage` bekommt den neuen Parameter mit Default `'identify'` — der einzige
  bestehende Aufrufer (`LumiChatOverlay.vue`) bleibt ohne Bruch kompatibel, kein zweiter Aufrufer
  vorhanden (verifiziert per Grep).
- `pendingPhotoMode` in `LumiChatOverlay.vue` ist reiner lokaler Zustand (kein Store/Persistenz) und
  wird nach jedem erfolgreichen Versand zurück auf `'identify'` gesetzt — entspricht der Vorgabe „der
  Kamera-Button merkt sich den zuletzt gewählten Modus NICHT". Randfall geprüft: bricht der Nutzer den
  Dateidialog nach Chip-Klick ab (kein `file`), bleibt `pendingPhotoMode` zwar auf `'shopping'` stehen,
  aber jeder weitere Foto-Trigger (Chip oder Kamera-Button) setzt den Modus explizit neu, bevor der
  Dialog erneut geöffnet wird — kein beobachtbarer Fehlerzustand.
- Chip-Styling (`.chip`, `.lumi-chip-row`) folgt bewusst dem Muster aus `BedPlanner.vue` (Glas-Pillen),
  an die Chat-Bubble-Tokens angepasst (`var(--border-soft)` statt harter Kategorie-Farbe, da hier keine
  Kategorie-Farbcodierung wie im Beetplaner nötig ist) — im Sinne des Auftrags („Muster: kleine
  Glas-Pillen wie `.chip`"), keine 1:1-Kopie nötig.
- Keine neue Abhängigkeit, kein QR-/Barcode-Code — beides wie gefordert.

## Befunde
Keine kritischen, wichtigen oder kosmetischen Befunde.

## Entscheidung
**Abgenommen.** Alle Abnahmekriterien objektiv erfüllt und gegen die echte, deployte Function
verifiziert. Offen bleibt nur der im Umsetzungsbericht dokumentierte reale Gartencenter-Test am
iPhone (echte Kamera, echtes Etikett) — das liegt laut Auftrag ausdrücklich beim Nutzer.
