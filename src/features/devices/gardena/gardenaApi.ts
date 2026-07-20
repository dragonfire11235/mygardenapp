// Client-seitiger Zugriff auf die Gardena-Edge-Function + Bau der OAuth-Login-URL.
// Der Client kennt nur den Application Key (client_id, öffentlich); Secret + Tokens
// bleiben serverseitig in der Edge Function.

import { supabase } from '../../../data/supabase/client'

const AUTHORIZE = 'https://api.authentication.husqvarnagroup.dev/v1/oauth2/authorize'
const CLIENT_ID = import.meta.env.VITE_GARDENA_CLIENT_ID as string | undefined
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const STATE_KEY = 'gardena-oauth-state'

export const gardenaConfigured = Boolean(CLIENT_ID && SUPABASE_URL)

/** Ein Service aus den Gardena-Location-Daten (JSON:API). Attribute sind {value,timestamp}. */
export interface GardenaService {
  id: string
  type: string // COMMON | MOWER | VALVE | VALVE_SET | SENSOR | POWER_SOCKET | DEVICE | LOCATION
  relationships?: { device?: { data?: { id: string } } }
  attributes?: Record<string, { value: unknown; timestamp?: string }>
}

/** Redirect-Ziel nach dem Husqvarna-Login (muss in der Developer-App registriert sein). */
export function redirectUri(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}gardena/callback`
}

/** Baut die Login-URL und merkt sich einen CSRF-`state` in der Session. */
export function buildAuthorizeUrl(): string {
  const state = crypto.randomUUID()
  sessionStorage.setItem(STATE_KEY, state)
  const params = new URLSearchParams({
    client_id: CLIENT_ID ?? '',
    redirect_uri: redirectUri(),
    response_type: 'code',
    state,
  })
  return `${AUTHORIZE}?${params.toString()}`
}

/** Prüft den vom Callback zurückgegebenen state gegen den gemerkten. */
export function consumeState(returned: string | null): boolean {
  const saved = sessionStorage.getItem(STATE_KEY)
  sessionStorage.removeItem(STATE_KEY)
  return Boolean(saved && returned && saved === returned)
}

/** Ruft eine Route der Edge Function `gardena` mit dem aktuellen Supabase-Login auf. */
export async function callEdge<T = unknown>(
  route: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  if (!supabase) throw new Error('Nicht angemeldet.')
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Bitte zuerst in lumi anmelden.')

  const res = await fetch(`${SUPABASE_URL}/functions/v1/gardena/${route}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: ANON_KEY ?? '',
      'Content-Type': 'application/json',
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  })
  const json = (await res.json()) as T & { code?: string; message?: string }
  if (!res.ok) {
    const msg = (json as { message?: string }).message ?? (json as { code?: string }).code ?? `HTTP ${res.status}`
    throw new Error(msg)
  }
  return json
}

export interface GardenaStatus {
  connected: boolean
}

export const gardenaApi = {
  status: () => callEdge<GardenaStatus>('status'),
  connect: (code: string) => callEdge('connect', { method: 'POST', body: { code, redirectUri: redirectUri() } }),
  disconnect: () => callEdge('disconnect', { method: 'POST' }),
  /** Location-Liste (JSON:API) — minimal, für die id. */
  locations: () => callEdge<{ data?: { id: string }[] }>('locations'),
  /** Location-Detail inkl. Geräte + Services + State (JSON:API). */
  locationDetail: (id: string) =>
    callEdge<{ data?: unknown; included?: GardenaService[] }>(`locations?id=${encodeURIComponent(id)}`),
  websocketUrl: (locationId: string) =>
    callEdge<{ data?: { attributes?: { url?: string } } }>('websocket', { method: 'POST', body: { locationId } }),
  command: (serviceId: string, command: unknown) =>
    callEdge(`command/${serviceId}`, { method: 'PUT', body: command }),
}
