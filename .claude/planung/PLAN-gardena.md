# Plan: Gardena-Integration (Multi-User, Supabase Edge Function) — Stand 2026-07-20

> Status: **freigegeben**. AP01 (Spike) ist der erste Schritt und liegt beim Nutzer
> (Developer-App + Auth-Flow einmal manuell). Danach Backend → Client.

## Kontext
Echte **GARDENA smart system**-Geräte (Ventile/Bewässerung, Sensoren) in lumi steuern/anzeigen.
Entscheidung: **Multi-User SaaS** — jeder Nutzer verbindet sein **eigenes** Gardena-Konto (OAuth
Authorization-Code), Proxy als **Supabase Edge Function**. Die Geräte-Adapter-Naht (`DeviceAdapter`,
`src/features/devices/adapters/`) ist vorbereitet — es kommt ein `GardenaAdapter` dazu, die
App-Features ändern sich nicht. Aufwand liegt in Auth (pro Nutzer), serverseitigem Token-Handling
und den harten API-Grenzen.

## Was der Nutzer besorgen/einrichten muss
1. **Husqvarna-Developer-App** (developer.husqvarnagroup.cloud): Application anlegen → **Application
   Key + Secret**; **beide** APIs verbinden („Authentication API" + „GARDENA smart system API");
   **Redirect-URL(s)** registrieren (Dev: `http://localhost:5173/mygardenapp/gardena/callback`,
   Prod: die spätere Domain). Key+Secret → Edge-Function-Secrets (Secret **nie** in den Client).
2. **Gardena smart Gateway** online + ≥1 Gerät zum Testen.
3. Später: Pro-Gating serverseitig (mit Stripe/`subscriptions`).

## Architektur
- **Auth je Nutzer:** „Gardena verbinden" → Husqvarna-`/oauth2/authorize` (unser `client_id`,
  `redirect_uri`=App-Route, `state`) → Rückleitung mit `code` auf `…/gardena/callback` → Client
  (eingeloggt) ruft Edge `POST /connect {code}` → Edge tauscht Code→Tokens (mit Secret), speichert
  je `auth.uid()`.
- **Proxy:** Edge Function `gardena` (Deno), `verify_jwt` an. Hält Husqvarna-Key/Secret +
  `service_role` als Secrets, liest/refresht Nutzer-Tokens, reicht REST durch. Client bekommt **nie** Gardena-Tokens.
- **Datenfluss (rate-limit-schonend):** REST nur für Token, `GET /locations` (1 Call), `POST
  /websocket` (kurzlebige `wss`-URL), Befehle (`PUT /command/{serviceId}`). **Live-Updates über EINEN
  WebSocket je Location** — kein Polling.
- **Adapter:** `GardenaAdapter` implementiert `DeviceAdapter`. `getState` aus internem Cache (nie
  REST je Gerät); `subscribe` öffnet EINEN geteilten WebSocket, fan-out an per-Gerät-Callbacks.

## Stolpersteine (zuerst absichern)
1. **Rate-Limits ~100/Tag, 700/Woche** (pro Gardena-Konto). Kein Polling. Reconnects mit Backoff.
2. **Browser-WebSocket ungewiss:** darf der Browser die `wss`-URL direkt öffnen (Origin)? Ja → ideal;
   Nein → Edge muss WebSocket **relayen** (lang laufend, Laufzeitgrenzen). → **Spike AP01 entscheidet**.
3. **CORS + Secret:** Proxy zwingend (Edge Function).
4. **Token-Sicherheit:** `gardena_tokens` ohne Client-Zugriff (RLS blockt alle), nur `service_role`.
5. **Token-Lebenszyklus:** Access läuft ab → Refresh; Refresh-Fehler → „neu verbinden".
6. **Service-Modell:** VALVE/VALVE_SET/SENSOR/POWER_SOCKET/COMMON/MOWER → switch/valve/sensor;
   Ventil dauerbasiert (`START_SECONDS_TO_OVERRIDE` / `STOP_UNTIL_NEXT_TASK`).
7. **Redirect-URL & BASE_URL** (`/mygardenapp/`) — registrieren, Dev/Prod getrennt.

## Arbeitspakete
### Block A — Spike
- **AP01** — Auth-Code-Flow + Browser-WebSocket manuell verifizieren (curl/Browser): authorize→code
  →token → `GET /locations` → `POST /websocket` → **Browser-WS-Verbindung testen**. Abnahme:
  dokumentiert, ob Browser-WS direkt geht (entscheidet AP08). **Liegt beim Nutzer.**

### Block B — Backend
- **AP02** — Migration `supabase/migrations/<ts>_gardena_tokens.sql`: `user_id uuid pk`,
  `access_token`, `refresh_token`, `expires_at`, `gardena_user_id`, `updated_at`; **RLS an, keine
  Client-Policies**.
- **AP03** — Edge Function `supabase/functions/gardena/index.ts` (`verify_jwt`, Secrets
  `HUSQVARNA_KEY/SECRET`, `SUPABASE_SERVICE_ROLE_KEY`); Routen `POST /connect`, `GET /status`,
  `POST /disconnect`, `GET /locations`, `POST /websocket`, `PUT /command/{serviceId}`.
- **AP04** — Token-Refresh + klare Fehlerbilder (Rate-Limit/Auth).

### Block C — Client
- **AP05** — `AdapterId 'gardena'` (`src/data/models.ts`); Route `/gardena/callback` (`router.ts` +
  `GardenaCallback.vue`); „Gardena verbinden"-Button baut authorize-URL.
- **AP06** — `src/features/devices/adapters/GardenaAdapter.ts` (+ Registrierung in `adapters/index.ts`):
  discover via Edge `/locations`, getState aus Cache, subscribe = EIN WebSocket je Location,
  setOn → Edge `/command`.
- **AP07** — `DevicesPage.vue`: Gardena-Bereich (verbinden/trennen/suchen, Status). Demo bleibt.

### Block D — Härtung
- **AP08** — WebSocket-Lifecycle: Ping-Keepalive, Reconnect-Backoff, `wss` neu holen, WS nur bei
  aktiver Geräte-Seite. Falls AP01 „Browser-WS geht nicht" → Relay-Variante.

## Kritische Dateien
`adapters/types.ts` (unverändert), `adapters/index.ts`, neu `adapters/GardenaAdapter.ts`;
`devicesStore.ts`; `DevicesPage.vue`; `src/data/models.ts` (`AdapterId`); `router.ts` +
`GardenaCallback.vue`; `supabase/functions/gardena/index.ts`; `supabase/migrations/<ts>_gardena_tokens.sql`.

## Verifikation (end-to-end)
1. AP01-Spike dokumentiert. 2. `supabase db push` + `functions deploy gardena` ok; `GET /status`
korrekt. 3. In-App verbinden → suchen → echte Geräte, Live-Status über WebSocket, Ventil schalten
(in Gardena-App gegengeprüft). 4. Rate-Limit-Budget beobachten. 5. `npm test` + Build grün; commit/push.

## Nicht in diesem Plan
Automationen/Zeitpläne, Mähroboter, Verlaufsdaten, serverseitiges Pro-Gating (mit Stripe),
Home-Assistant-Adapter (separat).
