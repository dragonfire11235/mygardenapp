import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAssistantStore } from './assistantStore'
import { LumiError } from './lumiApi'

vi.mock('./context', () => ({
  collectGardenContext: vi.fn().mockResolvedValue('## Garten\nKontext'),
}))

const chat = vi.fn()
vi.mock('./lumiApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lumiApi')>()
  return { ...actual, lumiApi: { chat: (...args: unknown[]) => chat(...args) } }
})

beforeEach(() => {
  setActivePinia(createPinia())
  chat.mockReset()
})

describe('assistantStore', () => {
  it('hängt bei Erfolg User- und Assistant-Nachricht an', async () => {
    chat.mockResolvedValue({ reply: 'Hallo zurück', usage: { input_tokens: 1, output_tokens: 1 }, provider: 'anthropic' })
    const store = useAssistantStore()

    await store.send('Hallo')

    expect(store.messages).toEqual([
      { role: 'user', text: 'Hallo' },
      { role: 'assistant', text: 'Hallo zurück' },
    ])
    expect(store.sending).toBe(false)
    expect(store.error).toBeNull()
  })

  it('setzt error=not_allowed bei 403, User-Message bleibt erhalten', async () => {
    chat.mockRejectedValue(new LumiError('not_allowed', 'nicht erlaubt'))
    const store = useAssistantStore()

    await store.send('Hallo')

    expect(store.error).toBe('not_allowed')
    expect(store.sending).toBe(false)
    expect(store.messages).toEqual([{ role: 'user', text: 'Hallo' }])
  })

  it('setzt error=offline bei Netzfehler', async () => {
    chat.mockRejectedValue(new LumiError('offline', 'keine Verbindung'))
    const store = useAssistantStore()

    await store.send('Hallo')

    expect(store.error).toBe('offline')
  })
})
