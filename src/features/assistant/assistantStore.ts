import { defineStore } from 'pinia'
import { ref } from 'vue'
import { storage } from '../../data'
import { todayIso } from '../../shared/dates'
import { useAuthStore } from '../auth/authStore'
import { collectGardenContext } from './context'
import { fileToLumiImage } from './imageUtil'
import { lumiApi, LumiError, type ChatMessage, type LumiErrorCode } from './lumiApi'

interface BriefingCache {
  date: string
  text: string
}

/**
 * Chat-Zustand des KI-Assistenten. Bewusst session-only, keine Persistenz
 * (Architektur-Entscheidung D8) — der Kontext-String wird beim ersten Send
 * einmalig geholt und für die Dauer der Sitzung gecacht.
 */
export const useAssistantStore = defineStore('assistant', () => {
  const messages = ref<ChatMessage[]>([])
  const sending = ref(false)
  const error = ref<LumiErrorCode | null>(null)
  const briefing = ref<string | null>(null)

  let gardenContext: string | null = null

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return

    messages.value.push({ role: 'user', text: trimmed })
    error.value = null
    sending.value = true

    try {
      if (gardenContext === null) {
        try {
          gardenContext = await collectGardenContext()
        } catch {
          gardenContext = ''
        }
      }

      const response = await lumiApi.chat(messages.value, gardenContext)
      messages.value.push({ role: 'assistant', text: response.reply })
    } catch (e) {
      error.value = e instanceof LumiError ? e.code : 'error'
    } finally {
      sending.value = false
    }
  }

  /** Fotografierte Pflanze erkennen lassen — eigener Modus, kein Verlauf wie bei send(). */
  async function sendImage(file: File, question?: string, mode: 'identify' | 'shopping' = 'identify') {
    const trimmedQuestion = question?.trim()
    const imageUrl = URL.createObjectURL(file)
    const bubbleText = mode === 'shopping' ? `🛒 Einkaufscheck: ${trimmedQuestion ?? ''}`.trim() : trimmedQuestion ?? ''

    messages.value.push({ role: 'user', text: bubbleText, imageUrl })
    error.value = null
    sending.value = true

    try {
      if (gardenContext === null) {
        try {
          gardenContext = await collectGardenContext()
        } catch {
          gardenContext = ''
        }
      }

      const { imageBase64, mediaType } = await fileToLumiImage(file)
      const response = await lumiApi.identify({
        imageBase64,
        mediaType,
        mode,
        question: trimmedQuestion,
        context: gardenContext,
      })
      messages.value.push({ role: 'assistant', text: response.reply })
    } catch (e) {
      error.value = e instanceof LumiError ? e.code : 'error'
    } finally {
      sending.value = false
    }
  }

  /**
   * Lädt das Tages-Briefing: 1×/Tag via Edge Function, danach aus dem Settings-Cache.
   * Alle Fehler werden still geschluckt — ohne Allowlist/Login/Netz bleiben die
   * statischen Tipps stehen, kein Toast, kein Error-State.
   */
  async function loadBriefing() {
    try {
      const cached = await storage.getSetting<BriefingCache>('lumiBriefing')
      if (cached && cached.date === todayIso()) {
        briefing.value = cached.text
        return
      }

      const auth = useAuthStore()
      if (!auth.isAuthenticated || !navigator.onLine) return

      const context = await collectGardenContext()
      const response = await lumiApi.briefing(context)
      const text = response.reply.trim()
      if (!text) return

      briefing.value = text
      await storage.setSetting('lumiBriefing', { date: todayIso(), text })
    } catch {
      // still schlucken — Nutzer sieht einfach die statischen Tipps
    }
  }

  function reset() {
    messages.value = []
    error.value = null
    gardenContext = null
  }

  return { messages, sending, error, briefing, send, sendImage, loadBriefing, reset }
})
