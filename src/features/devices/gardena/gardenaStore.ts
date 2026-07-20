import { defineStore } from 'pinia'
import { ref } from 'vue'
import { buildAuthorizeUrl, consumeState, gardenaApi, gardenaConfigured } from './gardenaApi'
import { useAuthStore } from '../../auth/authStore'

/**
 * Verbindungszustand zum Gardena-Konto (pro lumi-Nutzer, serverseitig gespeichert).
 * `connected` sagt nur, ob Tokens hinterlegt sind — die Geräte selbst holt der GardenaAdapter.
 */
export const useGardenaStore = defineStore('gardena', () => {
  const available = ref(gardenaConfigured)
  const connected = ref(false)
  const busy = ref(false)
  const errorMsg = ref('')

  /** Verbindungsstatus vom Server holen (nur wenn in lumi angemeldet). */
  async function refresh() {
    const auth = useAuthStore()
    if (!available.value || !auth.isAuthenticated) {
      connected.value = false
      return
    }
    try {
      const { connected: c } = await gardenaApi.status()
      connected.value = c
    } catch {
      // stiller Fehler — Status bleibt „nicht verbunden"
    }
  }

  /** Startet den OAuth-Login (verlässt die App Richtung Husqvarna). */
  function startConnect() {
    window.location.assign(buildAuthorizeUrl())
  }

  /** Vom Callback aufgerufen: state prüfen, Code gegen Tokens tauschen. */
  async function completeConnect(code: string, state: string | null) {
    errorMsg.value = ''
    if (!consumeState(state)) {
      errorMsg.value = 'Sicherheitsprüfung fehlgeschlagen (state). Bitte erneut verbinden.'
      return false
    }
    busy.value = true
    try {
      await gardenaApi.connect(code)
      connected.value = true
      return true
    } catch (e) {
      errorMsg.value = e instanceof Error ? e.message : String(e)
      return false
    } finally {
      busy.value = false
    }
  }

  async function disconnect() {
    busy.value = true
    try {
      await gardenaApi.disconnect()
      connected.value = false
    } catch (e) {
      errorMsg.value = e instanceof Error ? e.message : String(e)
    } finally {
      busy.value = false
    }
  }

  return { available, connected, busy, errorMsg, refresh, startConnect, completeConnect, disconnect }
})
