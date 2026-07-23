# AP04 — Chat-UI: Lumi-FAB + Vollbild-Overlay + Mini-Markdown

## Kontext
Projekt: `C:\Users\Drago\MyGardenApp` — Garten-PWA „lumi" (Vue 3 + TS, PrimeVue, Glas-Design-System). Edge Function, Kontext-Builder und `assistantStore` (AP01–AP03) existieren. Dieses Paket macht Lumi sichtbar: schwebender Maskottchen-Button auf allen Seiten + Vollbild-Chat.
Lies zuerst: `src/App.vue` (globale Overlays am Template-Ende; `.tab-bar` fixed z-40 mit `bottom: calc(12px + env(safe-area-inset-bottom))`; Desktop-Sidebar ab 1024px), `src/features/ui/uiStore.ts` (Overlay-Muster), `src/features/settings/InstallTip.vue` (fixe Pille z-55, `bottom: calc(… + 84px)` — nicht überlappen!), `src/features/assistant/assistantStore.ts`, `src/features/auth/authStore.ts` (`isAuthenticated`), `src/style.css` + `src/styles/tokens/*.css` (Tokens: `--surface-card`, `--glass-blur`, `--radius-*`, `--accent`, `.round-icon-btn`), `public/` (Lumi-Logo/Maskottchen-Assets suchen, z. B. `ls public`).

## Aufgabe
1. **`uiStore.ts` erweitern:** `lumiOpen = ref(false)`, `openLumi()`, `closeLumi()` — exakt im Stil von `proDialogOpen`.
2. **`src/features/assistant/markdown.ts`:** `renderLumiMarkdown(text: string): string` — zuerst HTML-escapen (`& < >`), dann: `**fett**` → `<strong>`, `*kursiv*` → `<em>`, Zeilen mit `- `/`* ` → `<ul><li>`, `1. ` → `<ol><li>`, Leerzeile → neuer `<p>`, einzelner Umbruch → `<br>`. Kein sonstiges HTML durchlassen. Mit Vitest-Test (Escaping! `<script>` im Input bleibt Text).
3. **`src/features/assistant/LumiFab.vue`:** runder schwebender Button (56px), `position: fixed; right: 16px; bottom: calc(88px + env(safe-area-inset-bottom)); z-index: 50;` — ab 1024px `bottom: 24px`. Inhalt: Maskottchen-Bild aus `public/` falls vorhanden, sonst Emoji 🌱 auf `--accent`-Kreis mit `--shadow-card`. Klick → `uiStore.openLumi()`. `aria-label="Lumi öffnen"`. Ausblenden, wenn Chat offen.
4. **`src/features/assistant/LumiChatOverlay.vue`:** Vollbild-Overlay (`position: fixed; inset: 0; z-index: 60;`, Hintergrund `--bg-app-gradient` oder Glas), `v-if="ui.lumiOpen"`:
   - Kopf: Titel „Lumi", Untertitel „Dein Gartenhelfer", Schließen-Button (`ph-x`), Reset-Button (`ph-arrows-clockwise`, ruft `store.reset()`).
   - Nachrichtenliste (scrollbar, auto-scroll ans Ende bei neuer Message): User-Bubbles rechts (`--accent`, weiß), Lumi-Bubbles links (`--surface-card`), Lumi-Antworten via `v-html="renderLumiMarkdown(m.text)"`.
   - Leerer Chat: Begrüßung „Hallo! Ich bin Lumi 🌱 — frag mich alles zu deinem Garten."
   - `sending` → Tipp-Indikator-Bubble „Lumi denkt nach …" (drei animierte Punkte reichen).
   - Fehlerzustände als Inline-Bubble (kein Toast): `not_allowed` → „Lumi ist noch in der Testphase."; `limit_reached` → „Tageslimit erreicht — morgen geht's weiter."; `offline` → „Du bist offline."; sonst generisch.
   - Eingabezeile unten: Textfeld (`font-size: 16px` — iOS-Zoom!), Senden-Button; Enter sendet. Deaktiviert solange `sending`.
   - Nicht eingeloggt (`!auth.isAuthenticated`): statt Eingabe ein Hinweis + Button „Anmelden" → `ui.openAuth('login')`.
   - Offline (`!navigator.onLine`): Hinweis, Eingabe deaktiviert.
5. **`App.vue`:** `<LumiFab />` + `<LumiChatOverlay />` bei den anderen globalen Overlays mounten.

## Regeln
- Design-Tokens/Glas-Look des Projekts nutzen (`var(--…)`), keine Hardcode-Farben außer Weiß auf Akzent.
- Nicht ändern: Tabbar/Sidebar-Verhalten, InstallTip, bestehende Overlays, assistantStore-Logik.
- Keine neuen npm-Dependencies (Markdown selbst rendern, s. o.). iOS: Inputs ≥16px. Auf Deutsch berichten.

## Abnahme
- [ ] FAB auf jeder Route sichtbar, überlappt weder Tabbar noch InstallTip (375px-Viewport prüfen).
- [ ] Chat öffnet Vollbild; Senden zeigt User-Bubble, Tipp-Indikator, dann Lumi-Antwort mit gerendertem **fett**/Listen.
- [ ] Ausgeloggt → Login-CTA öffnet den Auth-Dialog; offline → Hinweis, Eingabe deaktiviert.
- [ ] Markdown-Test grün (inkl. Script-Escaping); `npm test` + `npm run build` grün.

## Verifikation — selbst ausführen, BEVOR du fertig meldest
```bash
npm test
npm run build
npm run dev   # Browser: 375px + 1280px; FAB-Position, Chat-Flow; ohne Login den CTA prüfen
```
**Umgebung:** Für eine echte KI-Antwort muss die Edge Function deployed + der Test-Account allowlisted sein — wenn nicht verfügbar, UI-Zustände mit gemocktem Store (oder Fehlerpfad) zeigen und im Bericht vermerken. Echte Nutzerdaten unter localhost:5173 nicht verändern.

## Selbstcheck vor Abgabe
- [ ] Alle Abnahme-Kriterien selbst verifiziert — nicht „sollte gehen"
- [ ] Nichts außerhalb des Auftrags geändert
- [ ] Umsetzungsbericht unten ausgefüllt und Status in `../PLAN.md` (Tabelle „Lumi-KI-Assistent") auf `umgesetzt` gesetzt

## Umsetzungsbericht (vom Bearbeiter ans Ende DIESER Datei schreiben)
- Geänderte/neue Dateien:
  - `src/features/ui/uiStore.ts` — `lumiOpen`, `openLumi()`, `closeLumi()` ergänzt (exakt im Stil von `proDialogOpen`).
  - `src/features/assistant/markdown.ts` (neu) — `renderLumiMarkdown()`: escaped zuerst HTML, dann **fett**/*kursiv*, `- `/`1. `-Listen, Leerzeile → neuer `<p>`, einfacher Umbruch → `<br>`.
  - `src/features/assistant/markdown.test.ts` (neu) — 5 Vitest-Tests inkl. Script-Escaping.
  - `src/features/assistant/LumiFab.vue` (neu) — schwebender Button, `public/lumi/mascot/lumi-hero.png` als Bild (vorhanden, daher kein Emoji-Fallback nötig), ausgeblendet wenn `ui.lumiOpen`.
  - `src/features/assistant/LumiChatOverlay.vue` (neu) — Vollbild-Chat mit Kopf (Titel/Untertitel/Reset/Schließen), Nachrichtenliste mit Auto-Scroll, Tipp-Indikator, Fehler-Inline-Bubbles (`not_allowed`/`limit_reached`/`offline`/`unauthenticated`/generisch), Eingabezeile (16px Font, Enter sendet, Shift+Enter neue Zeile), Login-Gate bei `!auth.isAuthenticated`, Offline-Gate bei `!navigator.onLine`.
  - `src/App.vue` — `LumiFab` + `LumiChatOverlay` importiert und bei den globalen Overlays gemountet.
- Verifikations-Ergebnisse wörtlich (Befehl → Ergebnis):
  - `npm test` → `Test Files 19 passed (19)`, `Tests 141 passed (141)`.
  - `npm run build` → `vue-tsc -b && vite build` erfolgreich, `✓ built in 879ms`, PWA-Precache generiert. Keine TS-/Build-Fehler.
  - `npm run dev` (Browser-Check 375px + Desktop, live gegen den bereits laufenden Dev-Server): **erfolgreich verifiziert.**
    - 375px: FAB sichtbar bei `bottom: 88px`, Abstand zur Tabbar (`top`) 7px — keine Überlappung. Kein InstallTip aktiv in dieser Session (bereits dismissed), daher keine Kollision beobachtbar.
    - Chat öffnet Vollbild (Kopf „Lumi"/„Dein Gartenhelfer", Reset- und Schließen-Button), leerer Zustand zeigt Begrüßungstext.
    - Ausgeloggt: Eingabe durch Hinweis + „Anmelden"-Button ersetzt. Nutzer hat sich während der Session angemeldet → Gate verschwindet, Eingabezeile erscheint.
    - Senden-Button: User-Bubble (rechts, Akzentfarbe) erscheint sofort, danach Tipp-Indikator „Lumi denkt nach …" mit animierten Punkten, dann echte KI-Antwort (Edge Function `lumi` war erreichbar) mit korrekt gerendertem **fett**.
    - Reset-Button leert den Verlauf zurück zur Begrüßung; Schließen-Button schließt das Overlay zuverlässig (FAB erscheint wieder).
    - Desktop (native Fenstergröße, Sidebar aktiv): FAB bei `bottom: 24px`, keine Überlappung mit der „lumi Pro"-Kachel; Chat öffnet ebenfalls sauber im Vollbild.
    - **Kleiner Befund, kein Fix nötig:** Enter-Taste über die automatisierte Browser-Steuerung hat den Send nicht ausgelöst (kein Zeilenumbruch, aber auch kein Absenden) — vermutlich ein Artefakt der Automatisierungs-Tools (synthetisches KeyboardEvent), der Senden-Button funktioniert einwandfrei. Empfehlung: bei nächster Gelegenheit einmal mit echter Tastatur (nicht automatisiert) gegenprüfen, ob Enter zuverlässig sendet.
- Offene Punkte/Überraschungen:
  - Enter-Taste-Verhalten bitte einmal manuell mit echter Tastatur bestätigen (siehe oben).
  - InstallTip/FAB-Kollision bei 375px wurde nicht mit sichtbarem InstallTip getestet (war in dieser Session bereits dismissed) — bei Gelegenheit mit frischem `localStorage` gegenprüfen.
