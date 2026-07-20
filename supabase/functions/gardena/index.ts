// Supabase Edge Function „gardena" — serverseitiger Proxy zur GARDENA smart system API.
//
// Warum: Die Gardena-API sendet kein CORS und `client_credentials`/Token brauchen das
// Application Secret → kein Direktzugriff aus dem Browser. Diese Function hält Key+Secret
// (als Secrets) und die OAuth-Tokens JE NUTZER (Tabelle gardena_tokens, nur via service_role),
// refresht sie bei Bedarf und reicht die REST-Aufrufe durch. Der Client bekommt nie Tokens.
//
// verify_jwt ist an → nur eingeloggte lumi-Nutzer. Der WebSocket wird NICHT hier relayed;
// die Function liefert nur die wss-URL, der Browser verbindet direkt (im Spike bestätigt).
//
// Secrets (via `supabase secrets set`): HUSQVARNA_KEY, HUSQVARNA_SECRET.
// Automatisch vorhanden: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const AUTH = 'https://api.authentication.husqvarnagroup.dev/v1/oauth2'
const API = 'https://api.smart.gardena.dev/v1'

const KEY = Deno.env.get('HUSQVARNA_KEY')!
const SECRET = Deno.env.get('HUSQVARNA_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// service_role-Client: einziger Weg an die Token-Tabelle (RLS lässt sonst niemanden ran)
const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

/** Gardena-Standard-Header für einen Access-Token. */
function gardenaHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'X-Api-Key': KEY,
    'Content-Type': 'application/vnd.api+json',
  }
}

/** Nutzer aus dem (bereits von der Plattform verifizierten) JWT ermitteln. */
async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization') ?? ''
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data } = await client.auth.getUser()
  return data.user?.id ?? null
}

interface TokenRow {
  user_id: string
  access_token: string
  refresh_token: string
  expires_at: string
}

/** Gültigen Access-Token liefern; refresht automatisch kurz vor Ablauf. */
async function getValidToken(userId: string): Promise<string> {
  const { data: row } = await admin
    .from('gardena_tokens')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<TokenRow>()
  if (!row) throw { code: 'NOT_CONNECTED', message: 'Kein Gardena-Konto verbunden.' }

  const expiresSoon = new Date(row.expires_at).getTime() - Date.now() < 60_000
  if (!expiresSoon) return row.access_token

  // Refresh
  const res = await fetch(`${AUTH}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: KEY,
      client_secret: SECRET,
      refresh_token: row.refresh_token,
    }),
  })
  const t = await res.json()
  if (!res.ok) {
    // Refresh gescheitert → Nutzer muss neu verbinden
    throw { code: 'REFRESH_FAILED', message: 'Verbindung abgelaufen, bitte Gardena neu verbinden.' }
  }
  const expires_at = new Date(Date.now() + (t.expires_in ?? 3600) * 1000).toISOString()
  await admin.from('gardena_tokens').update({
    access_token: t.access_token,
    refresh_token: t.refresh_token ?? row.refresh_token,
    expires_at,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)
  return t.access_token
}

/** Durchreichen an die Gardena-REST-API mit gültigem Token; Fehler sauber weitergeben. */
async function gardenaFetch(userId: string, path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getValidToken(userId)
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...gardenaHeaders(token), ...(init.headers ?? {}) },
  })
  const text = await res.text()
  const body = text ? JSON.parse(text) : null
  if (!res.ok) {
    const status = res.status === 429 ? 429 : res.status
    return json({ code: 'GARDENA_ERROR', status, body }, status)
  }
  return json(body)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const userId = await getUserId(req)
  if (!userId) return json({ code: 'UNAUTHENTICATED' }, 401)

  const url = new URL(req.url)
  // Pfad nach dem Function-Namen (…/gardena/<route>)
  const route = url.pathname.replace(/^.*\/gardena/, '').replace(/^\//, '') || ''

  try {
    // --- Konto verbinden: OAuth-Code gegen Tokens tauschen, je Nutzer speichern ---
    if (req.method === 'POST' && route === 'connect') {
      const { code, redirectUri } = await req.json()
      const res = await fetch(`${AUTH}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: KEY,
          client_secret: SECRET,
          code,
          redirect_uri: redirectUri,
        }),
      })
      const t = await res.json()
      if (!res.ok) return json({ code: 'CONNECT_FAILED', body: t }, 400)
      const expires_at = new Date(Date.now() + (t.expires_in ?? 3600) * 1000).toISOString()
      await admin.from('gardena_tokens').upsert({
        user_id: userId,
        access_token: t.access_token,
        refresh_token: t.refresh_token,
        expires_at,
        gardena_user_id: t.user_id ?? null,
        updated_at: new Date().toISOString(),
      })
      return json({ connected: true })
    }

    // --- Verbindungsstatus ---
    if (req.method === 'GET' && route === 'status') {
      const { data } = await admin.from('gardena_tokens').select('user_id').eq('user_id', userId).maybeSingle()
      return json({ connected: Boolean(data) })
    }

    // --- Verbindung trennen ---
    if (req.method === 'POST' && route === 'disconnect') {
      await admin.from('gardena_tokens').delete().eq('user_id', userId)
      return json({ connected: false })
    }

    // --- Locations (inkl. Geräte + Services + State) ---
    if (req.method === 'GET' && route === 'locations') {
      // Ohne id: Liste; mit ?id=: Detail einer Location
      const id = url.searchParams.get('id')
      return await gardenaFetch(userId, id ? `/locations/${id}` : '/locations')
    }

    // --- WebSocket-URL anfordern (Browser verbindet danach direkt) ---
    if (req.method === 'POST' && route === 'websocket') {
      const { locationId } = await req.json()
      return await gardenaFetch(userId, '/websocket', {
        method: 'POST',
        body: JSON.stringify({
          data: { type: 'WEBSOCKET', id: `lumi-${Date.now()}`, attributes: { locationId } },
        }),
      })
    }

    // --- Befehl an einen Service (z. B. Mäher START/PARK, Ventil START/STOP) ---
    if (req.method === 'PUT' && route.startsWith('command/')) {
      const serviceId = route.slice('command/'.length)
      const command = await req.json() // vom Client geformter vnd.api+json-Body
      return await gardenaFetch(userId, `/command/${serviceId}`, {
        method: 'PUT',
        body: JSON.stringify(command),
      })
    }

    return json({ code: 'NOT_FOUND', route }, 404)
  } catch (e) {
    const err = e as { code?: string; message?: string }
    const status = err.code === 'NOT_CONNECTED' || err.code === 'REFRESH_FAILED' ? 409 : 500
    return json({ code: err.code ?? 'ERROR', message: err.message ?? String(e) }, status)
  }
})
