// Wählt Lumis Maskottchen-Bild + einen kurzen Kontext-Text passend zur aktuellen
// Route. Genutzt vom schwebenden FAB und vom Chat-Kopf, damit Lumi zeigt, aus
// welchem Bereich des Gartens du ihn/sie gerade geöffnet hast.
import { computed } from 'vue'
import { useRoute } from 'vue-router'

interface LumiMascot {
  /** Dateiname unter public/lumi/mascot/ (ohne Pfad/Endung). */
  file: string
  /** Kurzer Kontext-Text, z. B. für den Chat-Untertitel. */
  label: string
}

// Route-Name (aus router.ts) → Maskottchen. Detail-Routen erben über den
// Präfix-Fallback unten (z. B. 'plant-detail' → 'plants').
const BY_ROUTE: Record<string, LumiMascot> = {
  dashboard: { file: 'lumi-hero', label: 'bei dir im Garten' },
  plants: { file: 'lumi-pot', label: 'bei deinen Pflanzen' },
  beds: { file: 'lumi-hut', label: 'bei deinen Beeten' },
  tasks: { file: 'lumi-cheer', label: 'bei deinen Aufgaben' },
  diary: { file: 'lumi-sing', label: 'in deinem Tagebuch' },
  calendar: { file: 'lumi-wanderer', label: 'im Kalender' },
  sightings: { file: 'lumi-question', label: 'bei deinen Entdeckungen' },
  devices: { file: 'lumi-watering', label: 'bei deinen Geräten' },
  settings: { file: 'lumi-hug', label: 'in den Einstellungen' },
}

const FALLBACK: LumiMascot = { file: 'lumi-hero', label: 'Dein Gartenhelfer' }

function resolve(name: string | null | undefined): LumiMascot {
  if (!name) return FALLBACK
  if (BY_ROUTE[name]) return BY_ROUTE[name]
  // Detail-Routen ('plant-detail', 'bed-detail', 'diary-detail') auf ihren
  // Bereich abbilden, ohne jede Variante einzeln pflegen zu müssen.
  const base = name.split('-')[0]
  return BY_ROUTE[base] ?? FALLBACK
}

export function useLumiMascot() {
  const route = useRoute()
  const mascot = computed(() => resolve(route.name as string | null | undefined))
  const src = computed(() => `${import.meta.env.BASE_URL}lumi/mascot/${mascot.value.file}.png`)
  const label = computed(() => mascot.value.label)
  return { src, label }
}
