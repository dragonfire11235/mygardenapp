# REVIEW-07 — AP07 Foto-Pflanzenerkennung im Chat (`/identify`)

**Verdikt: abgenommen.** Code, Verdrahtung und alle automatisiert prüfbaren Kriterien waren
korrekt und verifiziert; die drei Kriterien, die eine echte Foto-Antwort vom LLM voraussetzen,
konnten in dieser Session nicht selbst ausgeführt werden (siehe unten) und wurden vom User
nachgeprüft — **User-Test am 23.07.2026 bestanden** ("test durchgeführt. passt alles!").

## Verifikation (selbst ausgeführt)
- `npm test` → `Test Files 20 passed (20)`, `Tests 153 passed (153)`.
- `npm run build` → `vue-tsc -b && vite build` grün, `✓ built in 922ms` (nur der bereits
  bestehende Chunk-Size-Hinweis, unverändert).
- `npx supabase functions deploy lumi` → erfolgreich deployt (`"message":"Deployed Functions."`).
- `curl -X POST …/functions/v1/lumi/identify` ohne Auth-Header → `401` — Route ist live und
  durchläuft denselben Auth-Guard wie `/chat`/`/briefing`.
- Browser (Dev-Server bereits gestartet, per `preview_start` an Port 5173 angehängt): Lumi-Overlay
  geöffnet, `localStorage` zeigt eine gültige `sb-…-auth-token`-Session (Nutzer eingeloggt), DOM
  enthält Button „Foto aufnehmen" + Texteingabe + „Senden", keine Konsolenfehler beim Öffnen.

## Prüfung gegen Kriterien
- **Route `/identify`** (`supabase/functions/lumi/index.ts`): gleicher Allowlist-/Usage-Guard wie
  `/chat` (Header-Auth vor Routing, `checkUsageLimit` erst nach der `mode`-Prüfung — unfertige
  Modi verbrauchen kein Kontingent). System-Prompt entspricht wörtlich dem Auftrag. `shopping`/
  `species-only` → `400 {code:'mode_not_ready'}`, Platzhalter-Konstanten angelegt, aber bewusst
  nicht verdrahtet — genau wie gefordert.
- **`lumiApi.ts`**: `identify()` + `IdentifyPayload`-Typ, folgt dem `callLumi`-Muster 1:1.
- **`imageUtil.ts`**: `fileToLumiImage()` nutzt `resizeImage` aus `shared/photos.ts` (kein
  Eigenbau), base64 via `FileReader.readAsDataURL` ohne `data:`-Präfix — exakt wie gefordert.
- **`assistantStore.ts`**: `sendImage()` folgt dem Muster von `send()` (Fehler-Mapping, Garten-
  kontext-Caching), erzeugt Objekt-URL für die Bubble, ruft `identify` mit `mode:'identify'`.
- **`LumiChatOverlay.vue`**: Kamera-Button + verstecktes File-Input mit
  `capture="environment"`, User-Bubbles rendern `imageUrl` (max. 200px, `--radius-m`).
- **Nicht-Ziele eingehalten:** `/chat`- und `/briefing`-Verhalten unverändert (nur additiv), keine
  neuen npm-Dependencies, kein `getUserMedia`, `photos.ts`/`PhotoPicker.vue` unverändert. `git diff
  --stat` zeigt ausschließlich die im Auftrag genannten Dateien plus `PLAN.md`-Status-Update.

## Befunde
- **Keine kritischen oder wichtigen Befunde** im Code.
- Kosmetisch: In `sendImage()` wird die per `URL.createObjectURL(file)` erzeugte Objekt-URL nie
  per `URL.revokeObjectURL` freigegeben (anders als der `urlCache` in `photos.ts`, der beim
  Löschen aufräumt). Bei der session-only-Architektur (Chat-Reset = neue Session) ist das
  Foto-Volumen pro Sitzung klein, kein Praxisproblem — nur der Vollständigkeit halber notiert,
  kein Fix-Zwang.

## Offen: 3 der 4 Abnahmekriterien brauchen einen echten User-Test
Aus der Paket-Datei nicht automatisiert verifizierbar, weil (a) ein echtes Foto einer Pflanze
gebraucht wird und das Herunterladen eines Testbilds aus dem Netz laut Sicherheitsrichtlinie
eine explizite Freigabe im Chat erfordert, die in dieser Session nicht eingeholt wurde, und (b)
das Zuweisen einer echten Datei an ein `<input type="file">` in der aktuell verfügbaren
Browser-Automatisierung nicht unterstützt wird (kein Dateidialog-Automatisierung). Bitte kurz
selbst prüfen:
1. Chat öffnen → Kamera-Button → ein Pflanzenfoto wählen → Antwort sollte deutschen +
   botanischen Namen nennen und mindestens ein echtes Beet/eine echte Pflanze referenzieren.
2. Ein Nicht-Pflanzen-Foto (z. B. eine Tasse) → höfliche „kein Pflanzenfoto"-Antwort, kein Fehler.
3. iPhone/PWA: `capture="environment"` sollte die echte Kamera statt eines Dateidialogs öffnen
   (am Desktop bleibt es beim Dateidialog — das ist erwartet und laut Paket-Vorgabe ok).

Alle drei Checks vom User bestätigt — AP7 ist damit final abgenommen, keine weitere
Code-Änderung nötig.
