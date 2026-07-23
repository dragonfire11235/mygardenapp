import { defineStore } from 'pinia'
import { ref } from 'vue'
import { collectGardenContext } from './context'
import { lumiApi, LumiError, type ChatMessage, type LumiErrorCode } from './lumiApi'

/**
 * Chat-Zustand des KI-Assistenten. Bewusst session-only, keine Persistenz
 * (Architektur-Entscheidung D8) — der Kontext-String wird beim ersten Send
 * einmalig geholt und für die Dauer der Sitzung gecacht.
 */
export const useAssistantStore = defineStore('assistant', () => {
  const messages = ref<ChatMessage[]>([])
  const sending = ref(false)
  const error = ref<LumiErrorCode | null>(null)

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

  function reset() {
    messages.value = []
    error.value = null
    gardenContext = null
  }

  return { messages, sending, error, send, reset }
})
