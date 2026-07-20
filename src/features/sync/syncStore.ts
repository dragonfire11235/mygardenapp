import { defineStore } from 'pinia'
import { ref } from 'vue'
import { storage } from '../../data'
import { isSupabaseConfigured } from '../../data/supabase/client'
import { useAuthStore } from '../auth/authStore'
import { runSync } from './syncEngine'
import { usePlantsStore } from '../plants/plantsStore'
import { useBedsStore } from '../beds/bedsStore'
import { useTasksStore } from '../tasks/tasksStore'
import { useDiaryStore } from '../diary/diaryStore'
import { useDevicesStore } from '../devices/devicesStore'
import { useSightingsStore } from '../sightings/sightingsStore'

/**
 * Steuert den Geräte-Sync. Additiv: Ohne Supabase/Login passiert nichts.
 * `lastSyncedAt` liegt gerätelokal in den Settings (wird NICHT mitsynchronisiert).
 */
export type SyncStatus = 'idle' | 'syncing' | 'error'

/** Zieht eine lesbare Meldung aus Error ODER Supabase-Fehlerobjekten ({message,details,code}). */
function errText(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object') {
    const o = e as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }
    const parts = [o.message, o.details, o.hint, o.code].filter((p) => typeof p === 'string' && p)
    if (parts.length) return parts.join(' · ')
  }
  return String(e)
}

export const useSyncStore = defineStore('sync', () => {
  const status = ref<SyncStatus>('idle')
  const lastSyncedAt = ref<string | null>(null)
  const errorMsg = ref('')

  async function loadMeta() {
    lastSyncedAt.value = (await storage.getSetting<string>('lastSyncedAt')) ?? null
  }

  /** Voller Abgleich. Guard: nur angemeldet, konfiguriert und nicht schon laufend. */
  async function syncNow() {
    const auth = useAuthStore()
    if (!isSupabaseConfigured || !auth.isAuthenticated || status.value === 'syncing') return

    status.value = 'syncing'
    errorMsg.value = ''
    try {
      const { changedLocal } = await runSync()
      if (changedLocal) {
        // Nach lokalem Schreiben die betroffenen Stores neu laden (beds lädt Plantings mit).
        await Promise.all([
          usePlantsStore().load(),
          useBedsStore().load(),
          useTasksStore().load(),
          useDiaryStore().load(),
          useDevicesStore().load(),
          useSightingsStore().load(),
        ])
      }
      const now = new Date().toISOString()
      lastSyncedAt.value = now
      await storage.setSetting('lastSyncedAt', now)
      status.value = 'idle'
    } catch (e) {
      errorMsg.value = errText(e)
      status.value = 'error'
    }
  }

  return { status, lastSyncedAt, errorMsg, loadMeta, syncNow }
})
