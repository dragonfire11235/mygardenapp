// Zentrale deutsche Bezeichnungen für Datenwerte.
// (UI-Texte stehen direkt in den Komponenten; hier liegt alles,
// was an mehreren Stellen gebraucht wird.)

import type { DeviceKind, Plant, PlantCategory, SightingGroup, Sunlight, TaskType } from '../data'

export const categoryLabels: Record<PlantCategory, string> = {
  gemuese: 'Gemüse',
  obst: 'Obst',
  kraeuter: 'Kräuter',
  blumen: 'Blumen',
  strauch: 'Strauch',
  baum: 'Baum',
  sonstiges: 'Sonstiges',
}

export const sunlightLabels: Record<Sunlight, string> = {
  sonne: 'Sonne',
  halbschatten: 'Halbschatten',
  schatten: 'Schatten',
}

export const taskTypeLabels: Record<TaskType, string> = {
  giessen: 'Gießen',
  duengen: 'Düngen',
  schneiden: 'Schneiden',
  ernten: 'Ernten',
  aussaat: 'Aussaat',
  sonstiges: 'Sonstiges',
}

export const taskTypeIcons: Record<TaskType, string> = {
  giessen: '💧',
  duengen: '🧪',
  schneiden: '✂️',
  ernten: '🧺',
  aussaat: '🌱',
  sonstiges: '📌',
}

// Phosphor-Icons + Akzentfarben je Aufgabenart (lumi-Design-System).
// Farben laut Handoff: Gießen --info, Düngen --accent, Rest feste Hex-Werte.
export const taskTypePhosphor: Record<TaskType, { icon: string; color: string }> = {
  giessen: { icon: 'ph-drop', color: 'var(--info)' },
  duengen: { icon: 'ph-flask', color: 'var(--accent)' },
  schneiden: { icon: 'ph-scissors', color: '#d95f4c' },
  ernten: { icon: 'ph-basket', color: '#dba842' },
  aussaat: { icon: 'ph-plant', color: '#10b981' },
  sonstiges: { icon: 'ph-push-pin', color: '#64748b' },
}

export const deviceKindLabels: Record<DeviceKind, string> = {
  switch: 'Schalter',
  valve: 'Ventil',
  sensor: 'Sensor',
}

export const sightingGroupLabels: Record<SightingGroup, string> = {
  wildbee: 'Wildbiene',
  butterfly: 'Schmetterling',
  hoverfly: 'Schwebfliege',
  beetle: 'Käfer',
  bird: 'Vogel',
  other: 'Sonstiges',
}

export const sightingGroupIcons: Record<SightingGroup, string> = {
  wildbee: '🐝',
  butterfly: '🦋',
  hoverfly: '🪰',
  beetle: '🪲',
  bird: '🐦',
  other: '🔍',
}

export const sightingGroupOptions = (Object.keys(sightingGroupLabels) as SightingGroup[]).map((value) => ({
  label: `${sightingGroupIcons[value]} ${sightingGroupLabels[value]}`,
  value,
}))

/**
 * Durchschnittliche Wuchsbreite (Kreis-Durchmesser) in Metern je Kategorie.
 * Quellen: übliche Pflanzabstände (Kräuter 20–30 cm, Gemüse 30–70 cm,
 * Stauden 20–90 cm, Sträucher 80–150 cm, Baum mit kleiner Krone bis 4 m).
 */
export const categorySpreadM: Record<PlantCategory, number> = {
  kraeuter: 0.3,
  gemuese: 0.4,
  blumen: 0.5,
  sonstiges: 0.5,
  obst: 1.0,
  strauch: 1.2,
  baum: 2.5,
}

/** Effektive Wuchsbreite einer Pflanze: eigener Wert oder Kategorie-Standard. */
export function plantSpreadM(plant: Plant): number {
  return plant.spreadM ?? categorySpreadM[plant.category]
}

/** Kreisfarben im Beetplaner je Kategorie */
export const categoryColors: Record<PlantCategory, string> = {
  gemuese: '#f59e0b',
  obst: '#ef4444',
  kraeuter: '#10b981',
  blumen: '#d946ef',
  strauch: '#8b5cf6',
  baum: '#15803d',
  sonstiges: '#64748b',
}

export const monthNamesShort = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
]

export const monthOptions = monthNamesShort.map((label, i) => ({ label, value: i + 1 }))

export function formatMonths(months: number[]): string {
  return months.length ? months.map((m) => monthNamesShort[m - 1]).join(', ') : '–'
}
