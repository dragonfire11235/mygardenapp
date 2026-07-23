# REVIEW-04 — AP04 Chat-UI: LumiFab + Vollbild-Overlay + Mini-Markdown

Geprüft: `src/features/ui/uiStore.ts` (Erweiterung), `src/features/assistant/markdown.ts`,
`src/features/assistant/markdown.test.ts`, `src/features/assistant/LumiFab.vue`,
`src/features/assistant/LumiChatOverlay.vue`, `src/App.vue` (Mounting), Umsetzungsbericht in
`pakete/AP04-chat-ui-fab-overlay.md`, `git diff`/`git status`, **Live-Test im Browser**
(375px + native Desktop-Breite, gegen den echten laufenden Dev-Server und die echte Edge
Function).

## Vorgehen
- Code vollständig gelesen, gegen Auftrag und `qualitaet.md` geprüft.
- `npm test` (19/19 Dateien, 141/141 Tests) und `npm run build` (vue-tsc + vite, keine Fehler)
  selbst erneut ausgeführt.
- **Live im Browser verifiziert** (nicht nur Code-Lesen):
  - 375px: FAB `bottom-right`, `zIndex:50`, `bottom:88px` (computed) — 7px Abstand zur Tabbar
    (`top:731` vs. FAB `bottom:724`), keine Überlappung.
  - Klick auf FAB öffnet Vollbild-Overlay (`.lumi-overlay`, `position:fixed; inset:0; z-index:60`
    bestätigt per `getComputedStyle`).
  - Leerer Zustand zeigt Begrüßungstext korrekt.
  - Ausgeloggt: Eingabezeile durch Hinweis + „Anmelden"-Button ersetzt; nach echtem Login im
    selben Test verschwindet das Gate, Eingabezeile erscheint.
  - Senden-Button: User-Bubble (rechts, Akzentfarbe) erscheint sofort, danach Tipp-Indikator
    „Lumi denkt nach …" mit animierten Punkten, danach eine echte Antwort der Edge Function
    `lumi` mit korrekt gerendertem `**fett**` (`<strong>`). Eine rohe `# Überschrift` in der
    KI-Antwort wurde absichtlich **nicht** interpretiert und blieb als literaler Text sichtbar —
    das ist laut Auftrag korrekt (nur `**fett**`/`*kursiv*`/Listen/Absätze sind spezifiziert,
    „kein sonstiges HTML/Markdown durchlassen").
  - Reset-Button leert den Verlauf zur Begrüßung zurück; Schließen-Button schließt zuverlässig
    (FAB erscheint wieder) — anfänglich wirkender „Bug" war ein veralteter Screenshot des
    Browser-Tools, per erneutem Screenshot und DOM-Check widerlegt.
  - Desktop (native Fensterbreite, Sidebar aktiv): FAB bei `bottom:24px`, keine Überlappung mit
    der „lumi Pro"-Kachel; Overlay öffnet ebenfalls sauber im Vollbild.
- `git diff --stat`: nur `App.vue` (Import + 2 Zeilen Mount), `uiStore.ts` (Erweiterung im Stil
  von `proDialogOpen`) verändert, Rest sind neue Dateien unter `src/features/assistant/` —
  Nicht-Ziele (Tabbar/Sidebar/InstallTip/bestehende Overlays/assistantStore-Logik unverändert)
  eingehalten.

## Befunde

**kosmetisch** — `LumiChatOverlay.vue:22–23`: `window.addEventListener('online'/'offline', …)`
im `<script setup>` wird nie mit `onUnmounted`/`removeEventListener` wieder entfernt. Da die
Komponente einmalig global in `App.vue` gemountet ist und nie unmountet, leckt das in der Praxis
nicht — aber es ist nicht der übliche Vue-Stil (Cleanup-Symmetrie). Bei Gelegenheit `onUnmounted`
ergänzen, kein Blocker.

**kosmetisch** — Offline-Zustand (`LumiChatOverlay.vue:102–104`) blendet die gesamte
Eingabezeile aus und zeigt nur einen Hinweistext. Der Auftragstext sagt wörtlich „Hinweis,
Eingabe deaktiviert" (impliziert eher ein sichtbares, aber `disabled`-Eingabefeld statt dessen
komplettes Verschwinden). Funktional gleichwertig (Nutzer kann nicht senden), aber eine kleine
Abweichung von der wörtlichen Formulierung. Kein Fix nötig, nur zur Kenntnis.

**offener Punkt (kein Code-Befund)** — Im Live-Test hat die Enter-Taste über die automatisierte
Browser-Steuerung keinen Send ausgelöst (kein Zeilenumbruch, aber auch kein Absenden); der
Senden-Button funktionierte einwandfrei. Der Code (`onKeydown`, `LumiChatOverlay.vue:50–55`)
sieht korrekt aus (`e.key==='Enter' && !e.shiftKey` → `preventDefault` + `send()`). Sehr
wahrscheinlich ein Artefakt der Tooling-Automatisierung (synthetisches KeyboardEvent trifft die
Vue-Bindung nicht zuverlässig), keine gesicherte Aussage ohne Test mit echter Tastatur. Bereits im
Umsetzungsbericht als offen vermerkt — Empfehlung bleibt: einmal mit echter Tastatur bestätigen.

## Abnahmekriterien — Status

| Kriterium | Status |
|---|---|
| FAB auf jeder Route sichtbar, überlappt weder Tabbar noch InstallTip (375px) | ✅ **live verifiziert** (Tabbar: 7px Abstand). InstallTip war in der Testsession bereits dismissed — Kollisionsfreiheit rechnerisch über `bottom`-Offsets (`InstallTip: calc(…+84px)`, FAB: `calc(88px+…)`) plausibel, aber nicht mit sichtbarem InstallTip live bestätigt. |
| Chat öffnet Vollbild; Senden zeigt User-Bubble, Tipp-Indikator, dann Lumi-Antwort mit gerendertem **fett**/Listen | ✅ **live verifiziert** (fett bestätigt; Listen nicht separat mit echter KI-Antwort getestet, aber durch `markdown.test.ts` abgedeckt) |
| Ausgeloggt → Login-CTA öffnet Auth-Dialog; offline → Hinweis, Eingabe deaktiviert | ✅ Login-CTA **live verifiziert** (Gate verschwindet nach echtem Login). Offline-Zweig nur per Code-Review geprüft (Abweichung siehe Befund oben), nicht mit echtem Offline-Zustand im Browser getestet |
| Markdown-Test grün (inkl. Script-Escaping); `npm test` + `npm run build` grün | ✅ erfüllt, verifiziert (5 Markdown-Tests, 141/141 Gesamt, Build ok) |

## Entscheidung

**Status: abgenommen** — alle Kern-Abnahmekriterien sind live im Browser mit einem echten
Login und einer echten KI-Antwort bestätigt, die verbleibenden Lücken (InstallTip-Kollision mit
sichtbarem Tipp, Offline-Zustand live) sind Testabdeckungs-Lücken ohne Hinweis auf einen echten
Fehler im Code, und die beiden kosmetischen Befunde sind keine Blocker. Empfehlung: die zwei
offenen Punkte (InstallTip live, Offline live, Enter-Taste mit echter Tastatur) bei nächster
Gelegenheit nachholen, aber kein Grund, das Paket zurückzustellen.

## Nebenbefund (Repo-weit, nicht AP04-spezifisch) — geklärt

Siehe REVIEW-02/REVIEW-03: Die undokumentierte Änderung an
`src/features/plants/catalogApi.test.ts` wurde mit dem User aufgeklärt (Ursache: eigener
User-Commit `7a30421` vom 22.07., unabhängig vom Lumi-Projekt) und am 23.07. bewusst separat in
Commit `aaffa77` festgehalten. Kein offener Punkt mehr.
