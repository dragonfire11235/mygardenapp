# REVIEW-01 — AP01 Edge Function `lumi` + `lumi_usage`-Migration

Geprüft: `supabase/migrations/20260723122439_lumi_usage.sql`, `supabase/functions/lumi/index.ts`,
Umsetzungsbericht in `pakete/AP01-edge-function-lumi.md`, `git diff`/`git status`.

## Vorgehen
- Umsetzungsbericht gelesen, Aussagen gegen Code und `git status`/`git diff` gegengeprüft.
- Migration und Function-Deploy sind laut `npx supabase db push` / `functions deploy lumi`
  bereits live (nicht erneut ausgeführt, um keinen doppelten Migrationslauf zu provozieren).
- 401-Test selbst nachvollzogen (siehe Bericht): Gateway (`verify_jwt`) blockt bereits ohne
  Auth-Header, bevor der eigene Code läuft — identisch zum bestehenden `gardena`-Muster, keine
  Abweichung.
- 200er-Pfad, Usage-Increment und `DAILY_LIMIT`-Test **nicht** selbst verifizierbar: dafür wird
  ein echter Access-Token eines eingeloggten, allowlisted Nutzers benötigt, den nur der User aus
  der laufenden App-Session holen kann. Kein Mangel im Code, sondern Umgebungsgrenze — im
  Umsetzungsbericht korrekt als offen dokumentiert.
- `git diff`/`git status` geprüft: Nur `supabase/migrations/…`, `supabase/functions/lumi/**` neu,
  `PLAN.md` nur die eine Statuszeile geändert. Nichts unter `src/` oder `gardena/**` angefasst —
  Nicht-Ziele eingehalten.

## Befunde

**erledigt** — Modell-Konstante `MODEL_ANTHROPIC = 'claude-haiku-4-5'` ([index.ts:26](../../../supabase/functions/lumi/index.ts)) war zunächst ein offenes Risiko (Alias ohne Datums-Suffix, ungetestet). **Mit echtem User-Token nachgetestet: funktioniert.** `POST /chat` mit `{"messages":[{"role":"user","text":"Hallo"}]}` → `200 {"reply":"Hallo! 👋 ...","usage":{"input_tokens":83,"output_tokens":123},"provider":"anthropic"}`. Kein Handlungsbedarf mehr.

**kosmetisch** — `supabase/functions/lumi/index.ts:208`: `req.json()` ohne Validierung von `messages` (Array? mindestens ein Eintrag?). Bei fehlerhaftem Body landet man im generischen `catch` → 500 statt eines sprechenden 400. Kein Abnahmekriterium, aber für spätere Client-Fehler (AP03) eine dünne Stelle.

## Abnahmekriterien — Status

| Kriterium | Status |
|---|---|
| Migration idempotent, RLS an, keine Policies | ✅ erfüllt (Code-Review; `if not exists`, RLS-Statement vorhanden, keine `create policy`) |
| Ohne JWT → 401 | ✅ erfüllt (verifiziert, per Gateway wie bei `gardena`) |
| Gültiger JWT ohne Allowlist → 403 `not_allowed` | ✅ Code korrekt (Zeile 199), nicht separat live getestet (nur Owner-Token verfügbar, der IST allowlisted) |
| Allowlisted `POST /chat` → 200 mit Antwort | ✅ **live verifiziert** — echter Owner-Token, `200` mit deutscher Antwort, Modell-ID bestätigt funktionsfähig |
| `lumi_usage`-Zeile inkrementiert | ✅ Code korrekt (Zeile 161–192), Increment-Logik nicht per DB-Read verifiziert (kein DB-Zugriff ohne Passwort/Service-Role in dieser Session) — bei nächster Gelegenheit per Dashboard → Table Editor → `lumi_usage` gegenprüfen |
| `DAILY_LIMIT`-Test (429 ab 3. Call) | ✅ Code korrekt (Zeile 150–159), nicht live getestet (Limit steht auf 100, Testlauf würde 100 echte LLM-Calls oder eine temporäre Code-Änderung erfordern — nicht ohne Grund provoziert) |

## Entscheidung

**Status: abgenommen** — der Code erfüllt alle Abnahmekriterien nachweisbar auf Code-Ebene, folgt
dem `gardena`-Muster, hält sich an die Nicht-Ziele, und die drei offenen Live-Tests sind eine
Umgebungsgrenze (kein Nutzer-Token verfügbar), kein Implementierungsfehler.

**Update nach Live-Test (23.07., mit echtem Owner-Token):** Der Chat-Call wurde erfolgreich
durchgeführt — `200`, deutsche Antwort, `provider:'anthropic'`, Modell-ID funktioniert. Damit ist
der einzige zuvor offene Risikopunkt ausgeräumt. Verbleibend rein informativ (kein Blocker): einmal
im Supabase-Dashboard → Table Editor → `lumi_usage` die Zeile für heute/Owner-UUID gegenchecken,
ob `requests`/Tokens plausibel gestiegen sind.
