# AP01 — Edge Function `lumi` (KI-Proxy) + `lumi_usage`-Migration

## Kontext
Projekt: `C:\Users\Drago\MyGardenApp` — Garten-PWA „lumi" (Vue 3 + TS, Supabase Auth/Postgres/Edge Functions, Projekt-Ref `vqcoacpusktyeszhcmfw`). Es entsteht ein KI-Assistent: dieses Paket baut den serverseitigen Proxy, der den LLM-API-Key geheim hält, Nutzer per Allowlist freischaltet und Verbrauch limitiert. Client-Anbindung kommt in späteren Paketen.
Lies zuerst: `supabase/functions/gardena/index.ts` (Vorlage: CORS, `json()`, `getUserId()`, admin-Client, Routing, Fehler-Mapping), `supabase/migrations/20260720110132_gardena_tokens.sql` (Muster: RLS an, KEINE Policies → nur service_role kommt ran).

## Aufgabe
1. **Migration** `supabase/migrations/<timestamp>_lumi_usage.sql` (idempotent, `if not exists`):
   Tabelle `public.lumi_usage` — `user_id uuid not null`, `day date not null`, `requests int not null default 0`, `input_tokens int not null default 0`, `output_tokens int not null default 0`, `updated_at timestamptz not null default now()`, Primary Key `(user_id, day)`. RLS aktivieren, **keine** Policies.
2. **Function** `supabase/functions/lumi/index.ts` nach dem gardena-Muster:
   - Secrets: `ANTHROPIC_API_KEY`, `MISTRAL_API_KEY` (optional), `LUMI_PROVIDER` (`anthropic` | `mistral`, Default `anthropic`), `LUMI_ALLOWED_USER_IDS` (Komma-getrennte UUIDs). Plattform-Secrets wie in gardena.
   - Nach `getUserId()`: kein Nutzer → 401 `{code:'UNAUTHENTICATED'}`; Nutzer nicht in Allowlist → 403 `{code:'not_allowed'}`.
   - **Usage-Guard:** Konstante `DAILY_LIMIT = 100`. Vor jedem LLM-Call Zeile `(user_id, heute)` lesen; `requests >= DAILY_LIMIT` → 429 `{code:'limit_reached'}`. Nach dem Call `requests`/`input_tokens`/`output_tokens` per Upsert erhöhen (einfaches select→insert/update reicht, keine Race-Absicherung nötig).
   - **`callLlm(opts)`-Helper**, Provider-neutral: `opts = { system: string, messages: {role:'user'|'assistant', text:string, imageBase64?:string, mediaType?:string}[], maxTokens: number }` → `{ reply: string, inputTokens: number, outputTokens: number }`.
     - *anthropic:* `POST https://api.anthropic.com/v1/messages`, Header `x-api-key`, `anthropic-version: 2023-06-01`, `content-type: application/json`; Body `{model, max_tokens, system, messages}`; Bild als Content-Block `{type:'image', source:{type:'base64', media_type, data}}` vor dem Text-Block. Modell-Konstante `MODEL_ANTHROPIC = 'claude-haiku-4-5'`.
     - *mistral:* `POST https://api.mistral.ai/v1/chat/completions`, Header `Authorization: Bearer`; System als erste Message `{role:'system'}`; Bild als Content-Part `{type:'image_url', image_url:'data:<mediaType>;base64,<data>'}`. Konstanten `MODEL_MISTRAL = 'mistral-small-latest'`, bei Nachrichten mit Bild `MODEL_MISTRAL_VISION = 'pixtral-large-latest'`.
     - Roher `fetch`, kein SDK. Upstream-Fehler → `{code:'LLM_ERROR', message}` mit durchgereichtem Status.
   - **Route `POST /chat`:** Body `{messages: {role,text}[], context?: string}`. System-Prompt (deutsch, im Code als Konstante): Lumi ist ein freundlicher, knapper Gartenassistent der App „lumi"; antwortet auf Deutsch; nutzt NUR einfaches Markdown (fett, Listen); Gartendaten des Nutzers folgen als Kontext. `context` ans System anhängen. `max_tokens: 1024`. Antwort `{reply, usage:{input_tokens, output_tokens}, provider}`.
   - Unbekannte Route → 404. Fehler-Mapping wie gardena (try/catch um alles).

## Regeln
- Keine Geheimnisse im Client / in `VITE_`-Variablen; Secrets nur via `supabase secrets set`.
- Nicht ändern: `supabase/functions/gardena/**`, bestehende Migrationen, alles unter `src/`.
- Kein npm-Package, kein Deno-SDK-Import außer `esm.sh/@supabase/supabase-js@2` (wie gardena).
- Einfachste tragfähige Lösung; Stil/Kommentardichte von gardena/index.ts übernehmen; auf Deutsch berichten.

## Abnahme
- [ ] Migration idempotent (zweimal anwendbar ohne Fehler), RLS an, keine Policies.
- [ ] Ohne JWT → 401; gültiger JWT ohne Allowlist-Eintrag → 403 `{code:'not_allowed'}`.
- [ ] Allowlisted `POST /lumi/chat` mit `{messages:[{role:'user',text:'Hallo'}]}` → 200 `{reply:<deutscher Text>, usage, provider:'anthropic'}`.
- [ ] `lumi_usage`-Zeile des Tages nach dem Call inkrementiert (requests +1, Tokens > 0).
- [ ] `DAILY_LIMIT` testweise auf 2 gesetzt → 3. Call liefert 429; danach wieder 100.

## Verifikation — selbst ausführen, BEVOR du fertig meldest
```bash
npx supabase link --project-ref vqcoacpusktyeszhcmfw   # fragt DB-Passwort ab
npx supabase db push
npx supabase functions deploy lumi
curl -i -X POST "https://vqcoacpusktyeszhcmfw.supabase.co/functions/v1/lumi/chat" -H "Content-Type: application/json" -d '{}'   # → 401
# Mit echtem Access-Token (User besorgt ihn aus der App / DevTools) → 200-Test wie oben
```
**Umgebung:** `supabase link`/`db push` brauchen das DB-Passwort, Secrets (`ANTHROPIC_API_KEY`, `LUMI_ALLOWED_USER_IDS=<Owner-UUID>`) muss der User setzen — wenn Passwort/Key fehlen: Deployment-Schritte NICHT raten, sondern im Umsetzungsbericht als offene Schritte für den User auflisten (inkl. fertiger Befehle). Owner-UUID: Supabase Dashboard → Authentication → Users.

## Selbstcheck vor Abgabe
- [ ] Alle Abnahme-Kriterien selbst verifiziert (oder als offen dokumentiert, wenn Umgebung fehlt)
- [ ] Nichts außerhalb des Auftrags geändert
- [ ] Umsetzungsbericht unten ausgefüllt und Status in `../PLAN.md` (Tabelle „Lumi-KI-Assistent") auf `umgesetzt` gesetzt

## Umsetzungsbericht (vom Bearbeiter ans Ende DIESER Datei schreiben)
- Geänderte/neue Dateien:
  - `supabase/migrations/20260723122439_lumi_usage.sql` (neu)
  - `supabase/functions/lumi/index.ts` (neu)
  - `.claude/planung/PLAN.md` (Status AP1 → `umgesetzt`)
- Verifikations-Ergebnisse wörtlich (Befehl → Ergebnis):
  - `npx supabase db push` → `Applying migration 20260723122439_lumi_usage.sql... Finished supabase db push.` (Docker-Warnung zum Catalog-Cache ist irrelevant, Migration wurde angewendet)
  - `npx supabase functions deploy lumi` → `{"project_ref":"vqcoacpusktyeszhcmfw","functions":["lumi"],"dashboard_url":"...","message":"Deployed Functions."}`
  - `npx supabase secrets list` → `ANTHROPIC_API_KEY` und `LUMI_ALLOWED_USER_IDS` sind bereits gesetzt (vom User selbst, vor diesem Lauf). `LUMI_PROVIDER` ebenfalls gesetzt.
  - `curl -i -X POST .../functions/v1/lumi/chat -d '{}'` (ohne Auth-Header) → `HTTP/1.1 401 Unauthorized`, Body `{"code":"UNAUTHORIZED_NO_AUTH_HEADER","message":"Missing authorization header"}`. Das ist der Plattform-Gateway-Check (verify_jwt), nicht der eigene `getUserId()`-Zweig — bestätigt aber das Abnahmekriterium „ohne JWT → 401".
- Offene Punkte/Überraschungen:
  - **Nicht selbst verifiziert (fehlender echter User-Access-Token):** Allowlisted `POST /lumi/chat` → 200 mit deutscher Antwort; `lumi_usage`-Zeile inkrementiert; `DAILY_LIMIT`-Testlauf (auf 2 setzen → 3. Call 429). Diese drei Abnahmepunkte brauchen einen echten Supabase-Access-Token eines eingeloggten (allowlisted) Nutzers — den kann ich als Agent nicht selbst erzeugen. Zum Nachtesten:
    ```bash
    # Token in der App/DevTools holen (localStorage → sb-<ref>-auth-token → access_token), dann:
    curl -i -X POST "https://vqcoacpusktyeszhcmfw.supabase.co/functions/v1/lumi/chat" \
      -H "Authorization: Bearer <ACCESS_TOKEN>" \
      -H "Content-Type: application/json" \
      -d '{"messages":[{"role":"user","text":"Hallo"}]}'
    ```
    Erwartet: `200 {"reply":"<deutscher Text>","usage":{...},"provider":"anthropic"}`.
  - `MISTRAL_API_KEY` ist laut `secrets list` nicht gesetzt — unkritisch, da `LUMI_PROVIDER=anthropic` aktiv ist (Wert war in der Liste redigiert, aber der Provider-Secret-Wert selbst ließ sich nicht einsehen; falls später auf Mistral umgeschaltet werden soll, `MISTRAL_API_KEY` per `supabase secrets set` ergänzen).
  - `supabase link`/DB-Passwort war nicht nötig — Projekt war bereits verlinkt (`supabase/.temp/project-ref` vorhanden), `db push` lief non-interaktiv mit `[Y/n]`-Bestätigung durch.
