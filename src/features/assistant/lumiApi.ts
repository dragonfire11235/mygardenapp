// Client-seitiger Zugriff auf die `lumi`-Edge-Function (KI-Gartenassistent).
// Nach dem Muster von gardenaApi.ts (`callEdge`), aber mit typisierten Fehlern,
// damit der Store dem Nutzer gezielte Meldungen zeigen kann (offline/limit/…).

import { supabase } from '../../data/supabase/client'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export type LumiErrorCode = 'offline' | 'not_allowed' | 'limit_reached' | 'unauthenticated' | 'error'

export class LumiError extends Error {
  code: LumiErrorCode

  constructor(code: LumiErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

function codeForStatus(status: number): LumiErrorCode {
  if (status === 403) return 'not_allowed'
  if (status === 429) return 'limit_reached'
  if (status === 401) return 'unauthenticated'
  return 'error'
}

/** Ruft eine Route der Edge Function `lumi` mit dem aktuellen Supabase-Login auf. */
async function callLumi<T = unknown>(route: string, body: unknown): Promise<T> {
  if (!supabase) throw new LumiError('unauthenticated', 'Nicht angemeldet.')
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new LumiError('unauthenticated', 'Bitte zuerst in lumi anmelden.')

  let res: Response
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/lumi/${route}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: ANON_KEY ?? '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw new LumiError('offline', 'Keine Verbindung zum Server.')
  }

  const json = (await res.json()) as T & { code?: string; message?: string }
  if (!res.ok) {
    const msg = (json as { message?: string }).message ?? (json as { code?: string }).code ?? `HTTP ${res.status}`
    throw new LumiError(codeForStatus(res.status), msg)
  }
  return json
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

export interface ChatResponse {
  reply: string
  usage: { input_tokens: number; output_tokens: number }
  provider: string
}

export const lumiApi = {
  chat: (messages: ChatMessage[], context: string) => callLumi<ChatResponse>('chat', { messages, context }),
  briefing: (context: string) => callLumi<ChatResponse>('briefing', { context }),
}
