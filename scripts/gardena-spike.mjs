// Gardena-Spike (AP01) — dev-only, prüft VOR dem Backend-Bau die zwei Unbekannten:
//   1. Funktioniert der OAuth-Authorization-Code-Flow mit deiner Developer-App?
//   2. Darf der BROWSER die zurückgegebene wss-URL direkt öffnen? (sonst Edge-Relay nötig)
//
// Dein Application Secret bleibt lokal (Umgebungsvariable), es geht nie in den Chat/das Repo.
//
// Nutzung (zwei Schritte), im Projektordner:
//   1) URL zum Anmelden erzeugen:
//        GARDENA_KEY=<key> node scripts/gardena-spike.mjs auth
//      → die ausgegebene URL im Browser öffnen, mit Gardena-Konto anmelden/zustimmen.
//        Der Browser landet auf der Redirect-URL (…/gardena/callback?code=XXXX&state=…).
//        Kopiere den Wert von ?code= aus der Adresszeile.
//   2) Mit dem Code Token holen, Location + WebSocket-URL abrufen, Test-HTML schreiben:
//        GARDENA_KEY=<key> GARDENA_SECRET=<secret> node scripts/gardena-spike.mjs token <code>
//      → öffnet-Anleitung: die erzeugte Datei scripts/.gardena-ws-test.html SOFORT im Browser
//        öffnen (die wss-URL ist nur kurz gültig). Zeigt „✅ OPEN" oder „❌ …".
//
// Env optional: REDIRECT_URI (muss exakt einer in der Husqvarna-App registrierten URL entsprechen).
// Default: http://localhost:5173/mygardenapp/gardena/callback

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const AUTH = 'https://api.authentication.husqvarnagroup.dev/v1/oauth2'
const API = 'https://api.smart.gardena.dev/v1'
const REDIRECT = process.env.REDIRECT_URI || 'http://localhost:5173/mygardenapp/gardena/callback'
const KEY = process.env.GARDENA_KEY
const SECRET = process.env.GARDENA_SECRET
const __dirname = dirname(fileURLToPath(import.meta.url))

function need(name, val) {
  if (!val) {
    console.error(`\nFehlt: ${name} (als Umgebungsvariable setzen).`)
    process.exit(1)
  }
}

const mode = (process.argv[2] || '').toLowerCase()

if (mode === 'auth') {
  need('GARDENA_KEY', KEY)
  const url =
    `${AUTH}/authorize?client_id=${encodeURIComponent(KEY)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT)}` +
    `&response_type=code&state=spike-${Date.now()}`
  console.log('\n1) Diese URL im Browser öffnen, anmelden, zustimmen:\n')
  console.log(url)
  console.log('\n2) Nach der Weiterleitung den ?code=… aus der Adresszeile kopieren und dann:')
  console.log('   GARDENA_KEY=<key> GARDENA_SECRET=<secret> node scripts/gardena-spike.mjs token <code>\n')
  process.exit(0)
}

if (mode === 'token') {
  need('GARDENA_KEY', KEY)
  need('GARDENA_SECRET', SECRET)
  let code = process.argv[3]
  need('<code> (als Argument)', code)
  // Toleranz: falls versehentlich „?code=…&state=…" oder eine ganze URL übergeben wurde
  const m = String(code).match(/code=([^&\s]+)/)
  if (m) code = m[1]

  // Schritt A: Code → Access-Token
  const tokenRes = await fetch(`${AUTH}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: KEY,
      client_secret: SECRET,
      code,
      redirect_uri: REDIRECT,
    }),
  })
  const token = await tokenRes.json()
  if (!tokenRes.ok) {
    console.error('\n❌ Token-Fehler:', tokenRes.status, JSON.stringify(token, null, 2))
    process.exit(1)
  }
  console.log('\n✅ Token erhalten. expires_in =', token.expires_in, 's')

  const authHeaders = {
    Authorization: `Bearer ${token.access_token}`,
    'X-Api-Key': KEY,
    'Content-Type': 'application/vnd.api+json',
  }

  // Schritt B: Locations
  const locRes = await fetch(`${API}/locations`, { headers: authHeaders })
  const locations = await locRes.json()
  if (!locRes.ok) {
    console.error('\n❌ /locations-Fehler:', locRes.status, JSON.stringify(locations, null, 2))
    process.exit(1)
  }
  const first = locations.data?.[0]
  if (!first) {
    console.error('\n❌ Keine Location gefunden (ist ein Gateway online?).', JSON.stringify(locations, null, 2))
    process.exit(1)
  }
  console.log(`✅ Location: „${first.attributes?.name}" (id ${first.id})`)

  // Schritt C: WebSocket-URL anfordern
  const wsRes = await fetch(`${API}/websocket`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      data: { type: 'WEBSOCKET', id: `spike-${Date.now()}`, attributes: { locationId: first.id } },
    }),
  })
  const ws = await wsRes.json()
  if (!wsRes.ok) {
    console.error('\n❌ /websocket-Fehler:', wsRes.status, JSON.stringify(ws, null, 2))
    process.exit(1)
  }
  const wssUrl = ws.data?.attributes?.url
  console.log('✅ WebSocket-URL erhalten (nur kurz gültig!).')

  // Schritt D: Browser-Test-HTML schreiben — die eigentliche Kernfrage
  const html = `<!doctype html><meta charset="utf-8"><title>Gardena WS-Test</title>
<body style="font-family:sans-serif;padding:2rem;font-size:18px">
<h2>Gardena Browser-WebSocket-Test</h2>
<p>Verbinde… <b id="s">…</b></p>
<pre id="log" style="background:#f0f0f0;padding:1rem;border-radius:8px"></pre>
<script>
  const log = (m) => { document.getElementById('log').textContent += m + "\\n"; };
  const set = (m) => { document.getElementById('s').textContent = m; };
  try {
    const ws = new WebSocket(${JSON.stringify(wssUrl)});
    ws.onopen = () => { set('✅ OPEN — Browser darf direkt verbinden!'); log('open'); };
    ws.onmessage = (e) => log('message: ' + String(e.data).slice(0,200));
    ws.onerror = (e) => { set('❌ ERROR — vermutlich vom Browser blockiert (Relay nötig)'); log('error'); };
    ws.onclose = (e) => log('close code=' + e.code + ' reason=' + e.reason);
  } catch (e) { set('❌ Exception: ' + e.message); }
</script>`
  const out = join(__dirname, '.gardena-ws-test.html')
  writeFileSync(out, html)
  console.log('\n👉 JETZT SOFORT im Browser öffnen (URL läuft schnell ab):')
  console.log('   ' + out)
  console.log('\n   „✅ OPEN" = Direkt-WebSocket geht (einfacher Weg).')
  console.log('   „❌ ERROR/CLOSE" = Browser blockiert → wir brauchen ein Edge-Relay.\n')
  process.exit(0)
}

console.error('Unbekannter Modus. Nutze: node scripts/gardena-spike.mjs auth | token <code>')
process.exit(1)
