// Supabase Edge Function „lumi" — serverseitiger Proxy zum LLM (KI-Gartenassistent).
//
// Warum: Der LLM-API-Key darf nicht in den Client (VITE_-Variablen wären öffentlich).
// Diese Function hält den Key als Secret, prüft eine Nutzer-Allowlist und limitiert
// den Verbrauch pro Nutzer/Tag (Tabelle lumi_usage, nur via service_role).
//
// Secrets (via `supabase secrets set`):
//   ANTHROPIC_API_KEY, MISTRAL_API_KEY (optional), LUMI_PROVIDER (anthropic|mistral, Default anthropic),
//   LUMI_ALLOWED_USER_IDS (Komma-getrennte UUIDs).
// Automatisch vorhanden: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY') ?? ''
const LUMI_PROVIDER = Deno.env.get('LUMI_PROVIDER') ?? 'anthropic'
const ALLOWED_USER_IDS = (Deno.env.get('LUMI_ALLOWED_USER_IDS') ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)

const MODEL_ANTHROPIC = 'claude-haiku-4-5'
const MODEL_MISTRAL = 'mistral-small-latest'
const MODEL_MISTRAL_VISION = 'pixtral-large-latest'

const DAILY_LIMIT = 100

const SYSTEM_PROMPT =
  'Du bist Lumi, ein freundlicher, knapper Gartenassistent der App „lumi". ' +
  'Du antwortest auf Deutsch und nutzt NUR einfaches Markdown (fett, Listen). ' +
  'Gartendaten des Nutzers folgen ggf. als zusätzlicher Kontext.'

const BRIEFING_SYSTEM_PROMPT =
  'Du bist Lumi, ein freundlicher Gartenassistent der App „lumi". ' +
  'Nenne die 2–3 wichtigsten Dinge für heute im Garten in max. 3 kurzen Sätzen. ' +
  'Beginne mit der dringendsten Sache. Erwähne Wetterwarnungen (Frost/Hagel/Gewitter) zuerst, falls vorhanden. ' +
  'Kein Markdown, keine Aufzählung — fließender, freundlicher Text. ' +
  'Gartendaten des Nutzers folgen als Kontext.'

const IDENTIFY_SYSTEM_PROMPT =
  'Bestimme die Pflanze auf dem Foto (deutscher + botanischer Name, Sicherheit hoch/mittel/niedrig). ' +
  'Danach: Passt sie in den Garten des Nutzers (Kontext unten)? Welches Beet (Sonne/Platz), welche vorhandenen ' +
  'Pflanzen sind gute/schlechte Nachbarn, wie aufwendig die Pflege? Max. 6 Sätze, einfaches Markdown. ' +
  'Wenn kein Pflanzenfoto: sag es freundlich.'

// Platzhalter für kommendes Paket (AP09) — noch nicht verdrahtet, siehe route === 'identify'.
const SHOPPING_SYSTEM_PROMPT =
  'Du bist Lumi. Einkaufs-Modus: noch nicht verfügbar.'

const SPECIES_ONLY_SYSTEM_PROMPT =
  'Bestimme das Lebewesen/die Pflanze auf dem Foto. Antworte NUR mit JSON: ' +
  '{"group": "wildbee|butterfly|hoverfly|beetle|bird|other", "species": "deutscher Artname", "confidence": "high|medium|low"} ' +
  '— kein weiterer Text. Bei Unkenntlichkeit: {"group":"other","species":null,"confidence":"low"}.'

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

// service_role-Client: einziger Weg an die Usage-Tabelle (RLS lässt sonst niemanden ran)
const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

/** Nutzer aus dem (bereits von der Plattform verifizierten) JWT ermitteln. */
async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization') ?? ''
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data } = await client.auth.getUser()
  return data.user?.id ?? null
}

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  imageBase64?: string
  mediaType?: string
}

interface LlmOpts {
  system: string
  messages: ChatMessage[]
  maxTokens: number
}

interface LlmResult {
  reply: string
  inputTokens: number
  outputTokens: number
}

/** LLM-Call, provider-neutral. Roher fetch, kein SDK. */
async function callLlm(opts: LlmOpts): Promise<LlmResult> {
  if (LUMI_PROVIDER === 'mistral') return callMistral(opts)
  return callAnthropic(opts)
}

async function callAnthropic(opts: LlmOpts): Promise<LlmResult> {
  const messages = opts.messages.map((m) => {
    const content: unknown[] = []
    if (m.imageBase64 && m.mediaType) {
      content.push({ type: 'image', source: { type: 'base64', media_type: m.mediaType, data: m.imageBase64 } })
    }
    content.push({ type: 'text', text: m.text })
    return { role: m.role, content }
  })

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL_ANTHROPIC, max_tokens: opts.maxTokens, system: opts.system, messages }),
  })
  const t = await res.json()
  if (!res.ok) throw { code: 'LLM_ERROR', message: t?.error?.message ?? 'Anthropic-Fehler', status: res.status }

  const reply = (t.content ?? []).map((b: { type: string; text?: string }) => (b.type === 'text' ? b.text ?? '' : '')).join('')
  return { reply, inputTokens: t.usage?.input_tokens ?? 0, outputTokens: t.usage?.output_tokens ?? 0 }
}

async function callMistral(opts: LlmOpts): Promise<LlmResult> {
  const hasImage = opts.messages.some((m) => m.imageBase64)
  const model = hasImage ? MODEL_MISTRAL_VISION : MODEL_MISTRAL

  const messages = [
    { role: 'system', content: opts.system },
    ...opts.messages.map((m) => {
      if (m.imageBase64 && m.mediaType) {
        return {
          role: m.role,
          content: [
            { type: 'text', text: m.text },
            { type: 'image_url', image_url: `data:${m.mediaType};base64,${m.imageBase64}` },
          ],
        }
      }
      return { role: m.role, content: m.text }
    }),
  ]

  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${MISTRAL_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: opts.maxTokens, messages }),
  })
  const t = await res.json()
  if (!res.ok) throw { code: 'LLM_ERROR', message: t?.message ?? 'Mistral-Fehler', status: res.status }

  const reply = t.choices?.[0]?.message?.content ?? ''
  return { reply, inputTokens: t.usage?.prompt_tokens ?? 0, outputTokens: t.usage?.completion_tokens ?? 0 }
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Prüft das Tageslimit; wirft bei Überschreitung. */
async function checkUsageLimit(userId: string): Promise<void> {
  const { data } = await admin
    .from('lumi_usage')
    .select('requests')
    .eq('user_id', userId)
    .eq('day', today())
    .maybeSingle<{ requests: number }>()
  if ((data?.requests ?? 0) >= DAILY_LIMIT) throw { code: 'limit_reached', status: 429 }
}

/** Erhöht den Tageszähler nach einem erfolgreichen Call (einfaches select→insert/update). */
async function incrementUsage(userId: string, inputTokens: number, outputTokens: number): Promise<void> {
  const day = today()
  const { data } = await admin
    .from('lumi_usage')
    .select('requests, input_tokens, output_tokens')
    .eq('user_id', userId)
    .eq('day', day)
    .maybeSingle<{ requests: number; input_tokens: number; output_tokens: number }>()

  if (!data) {
    await admin.from('lumi_usage').insert({
      user_id: userId,
      day,
      requests: 1,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      updated_at: new Date().toISOString(),
    })
  } else {
    await admin
      .from('lumi_usage')
      .update({
        requests: data.requests + 1,
        input_tokens: data.input_tokens + inputTokens,
        output_tokens: data.output_tokens + outputTokens,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('day', day)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const userId = await getUserId(req)
  if (!userId) return json({ code: 'UNAUTHENTICATED' }, 401)
  if (!ALLOWED_USER_IDS.includes(userId)) return json({ code: 'not_allowed' }, 403)

  const url = new URL(req.url)
  const route = url.pathname.replace(/^.*\/lumi/, '').replace(/^\//, '') || ''

  try {
    if (req.method === 'POST' && route === 'chat') {
      await checkUsageLimit(userId)

      const { messages, context } = (await req.json()) as { messages: ChatMessage[]; context?: string }
      const system = context ? `${SYSTEM_PROMPT}\n\n${context}` : SYSTEM_PROMPT

      const { reply, inputTokens, outputTokens } = await callLlm({ system, messages, maxTokens: 1024 })
      await incrementUsage(userId, inputTokens, outputTokens)

      return json({ reply, usage: { input_tokens: inputTokens, output_tokens: outputTokens }, provider: LUMI_PROVIDER })
    }

    if (req.method === 'POST' && route === 'briefing') {
      await checkUsageLimit(userId)

      const { context } = (await req.json()) as { context?: string }
      const system = context ? `${BRIEFING_SYSTEM_PROMPT}\n\n${context}` : BRIEFING_SYSTEM_PROMPT
      const messages: ChatMessage[] = [{ role: 'user', text: 'Was sind heute die wichtigsten Dinge in meinem Garten?' }]

      const { reply, inputTokens, outputTokens } = await callLlm({ system, messages, maxTokens: 512 })
      await incrementUsage(userId, inputTokens, outputTokens)

      return json({ reply, usage: { input_tokens: inputTokens, output_tokens: outputTokens }, provider: LUMI_PROVIDER })
    }

    if (req.method === 'POST' && route === 'identify') {
      const { imageBase64, mediaType, mode, question, context } = (await req.json()) as {
        imageBase64: string
        mediaType: string
        mode: 'identify' | 'shopping' | 'species-only'
        question?: string
        context?: string
      }

      if (mode === 'species-only') {
        await checkUsageLimit(userId)

        const messages: ChatMessage[] = [
          { role: 'user', text: 'Was ist das für ein Lebewesen/eine Pflanze?', imageBase64, mediaType },
        ]

        const { reply, inputTokens, outputTokens } = await callLlm({
          system: SPECIES_ONLY_SYSTEM_PROMPT,
          messages,
          maxTokens: 256,
        })
        await incrementUsage(userId, inputTokens, outputTokens)

        return json({ reply, usage: { input_tokens: inputTokens, output_tokens: outputTokens }, provider: LUMI_PROVIDER })
      }

      if (mode !== 'identify') return json({ code: 'mode_not_ready' }, 400)

      await checkUsageLimit(userId)

      const system = context ? `${IDENTIFY_SYSTEM_PROMPT}\n\n${context}` : IDENTIFY_SYSTEM_PROMPT
      const messages: ChatMessage[] = [
        { role: 'user', text: question?.trim() || 'Was ist das für eine Pflanze?', imageBase64, mediaType },
      ]

      const { reply, inputTokens, outputTokens } = await callLlm({ system, messages, maxTokens: 1024 })
      await incrementUsage(userId, inputTokens, outputTokens)

      return json({ reply, usage: { input_tokens: inputTokens, output_tokens: outputTokens }, provider: LUMI_PROVIDER })
    }

    return json({ code: 'NOT_FOUND', route }, 404)
  } catch (e) {
    const err = e as { code?: string; message?: string; status?: number }
    const status = err.status ?? (err.code === 'limit_reached' ? 429 : 500)
    return json({ code: err.code ?? 'ERROR', message: err.message ?? String(e) }, status)
  }
})
