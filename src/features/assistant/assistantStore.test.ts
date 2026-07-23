import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { todayIso } from '../../shared/dates'
import { useAssistantStore } from './assistantStore'
import { LumiError } from './lumiApi'

vi.mock('./context', () => ({
  collectGardenContext: vi.fn().mockResolvedValue('## Garten\nKontext'),
}))

const chat = vi.fn()
const briefing = vi.fn()
vi.mock('./lumiApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lumiApi')>()
  return {
    ...actual,
    lumiApi: {
      chat: (...args: unknown[]) => chat(...args),
      briefing: (...args: unknown[]) => briefing(...args),
    },
  }
})

const getSetting = vi.fn()
const setSetting = vi.fn()
vi.mock('../../data', () => ({
  storage: {
    getSetting: (...args: unknown[]) => getSetting(...args),
    setSetting: (...args: unknown[]) => setSetting(...args),
  },
}))

let authenticated = true
vi.mock('../auth/authStore', () => ({
  useAuthStore: () => ({ get isAuthenticated() { return authenticated } }),
}))

beforeEach(() => {
  setActivePinia(createPinia())
  chat.mockReset()
  briefing.mockReset()
  getSetting.mockReset()
  setSetting.mockReset()
  authenticated = true
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
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

  describe('loadBriefing', () => {
    it('nutzt den Cache von heute und macht keinen Netz-Call', async () => {
      getSetting.mockResolvedValue({ date: todayIso(), text: 'Gieß die Tomaten.' })
      const store = useAssistantStore()

      await store.loadBriefing()

      expect(briefing).not.toHaveBeenCalled()
      expect(store.briefing).toBe('Gieß die Tomaten.')
      expect(setSetting).not.toHaveBeenCalled()
    })

    it('holt bei altem Cache genau einen Briefing-Call und schreibt den Cache', async () => {
      getSetting.mockResolvedValue({ date: '2000-01-01', text: 'Alt' })
      briefing.mockResolvedValue({ reply: 'Heute Frostschutz nicht vergessen.', usage: { input_tokens: 1, output_tokens: 1 }, provider: 'anthropic' })
      const store = useAssistantStore()

      await store.loadBriefing()

      expect(briefing).toHaveBeenCalledTimes(1)
      expect(store.briefing).toBe('Heute Frostschutz nicht vergessen.')
      expect(setSetting).toHaveBeenCalledWith('lumiBriefing', { date: todayIso(), text: 'Heute Frostschutz nicht vergessen.' })
    })

    it('macht ohne Login keinen Netz-Call und schluckt still', async () => {
      getSetting.mockResolvedValue(undefined)
      authenticated = false
      const store = useAssistantStore()

      await store.loadBriefing()

      expect(briefing).not.toHaveBeenCalled()
      expect(store.briefing).toBeNull()
    })

    it('schluckt Fehler des Briefing-Calls still', async () => {
      getSetting.mockResolvedValue(undefined)
      briefing.mockRejectedValue(new LumiError('not_allowed', 'nicht erlaubt'))
      const store = useAssistantStore()

      await store.loadBriefing()

      expect(store.briefing).toBeNull()
      expect(store.error).toBeNull()
    })
  })
})
