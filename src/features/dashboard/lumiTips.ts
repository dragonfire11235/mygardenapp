// Lumi-Tipps fürs Dashboard: eine wetterbewusste, rotierende Sammlung aus
// aktuellen Hinweisen (Hitze/Regen/Frost), allgemeinen Garten-Tipps und
// sanften Tagebuch-Nudges. Reine Funktion — im Dashboard rotiert sie sich.

export interface WeatherLike {
  currentTemp?: number
  frostWarning?: boolean
  thunderstormWarning?: boolean
  hailWarning?: boolean
  rainToday?: boolean
}

/** Allgemeine Garten-Tipps (rotieren durch). */
const GENERAL_TIPS = [
  '🌱 Lumi-Tipp: Ein kurzer Blick ins Beet lohnt sich jeden Tag.',
  '🐝 Lumi-Tipp: Lass ein paar Kräuter blühen — Wildbienen danken es dir.',
  '💧 Lumi-Tipp: Lieber selten und durchdringend gießen als täglich ein bisschen.',
  '✂️ Lumi-Tipp: Verblühtes ausputzen hält viele Stauden länger in Blüte.',
  '🍅 Lumi-Tipp: Tomaten regelmäßig ausgeizen — mehr Kraft für die Früchte.',
  '🌿 Lumi-Tipp: Mulch hält den Boden feucht und spart dir das halbe Gießen.',
]

/** Tagebuch-Nudges: motivieren, mehr festzuhalten. */
const DIARY_NUDGES = [
  '📖 Lumi-Tipp: Halt fest, was heute blüht — im Tagebuch vergisst du nichts.',
  '📷 Lumi-Tipp: Ein Foto pro Woche zeigt dir im Tagebuch den Fortschritt übers Jahr.',
  '🦋 Lumi-Tipp: Insekt entdeckt? Ab damit ins Tagebuch oder in die Entdeckungen!',
]

/**
 * Baut die Tipp-Liste. Ist ein Tages-Briefing gesetzt, steht es ganz vorne;
 * danach folgt ein aktuell relevanter Wetter-Tipp (falls vorhanden) und
 * schließlich allgemeine Tipps und Tagebuch-Nudges im Wechsel.
 */
export function buildLumiTips(w: WeatherLike | null | undefined, briefing?: string | null): string[] {
  const tips: string[] = []

  if (briefing) {
    tips.push('🌱 ' + briefing)
  }

  if (w?.hailWarning) {
    tips.push('🧊 Lumi-Tipp: Hagel möglich — Kübel unters Dach, Vlies bereitlegen!')
  } else if (w?.thunderstormWarning) {
    tips.push('⛈️ Lumi-Tipp: Gewitter im Anzug — binde hohe Stauden fest.')
  } else if (w?.frostWarning) {
    tips.push('❄️ Lumi-Tipp: Nachtfrost erwartet — deck empfindliche Pflanzen ab!')
  } else if (w?.rainToday) {
    tips.push('🌧️ Lumi-Tipp: Heute ist Regen angesagt — das Gießen kann warten.')
  } else if (typeof w?.currentTemp === 'number' && w.currentTemp >= 25) {
    tips.push('💧 Lumi-Tipp: Heute wird’s warm — gieß am besten erst am Abend!')
  }

  // Allgemeine Tipps und Tagebuch-Nudges verschränken, damit die Nudges
  // regelmäßig, aber nicht gehäuft auftauchen.
  const maxLen = Math.max(GENERAL_TIPS.length, DIARY_NUDGES.length)
  for (let i = 0; i < maxLen; i++) {
    if (GENERAL_TIPS[i]) tips.push(GENERAL_TIPS[i])
    if (DIARY_NUDGES[i]) tips.push(DIARY_NUDGES[i])
  }

  return tips
}
