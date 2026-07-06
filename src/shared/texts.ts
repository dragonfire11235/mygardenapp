// Zentrale deutsche Bezeichnungen für Datenwerte.
// (UI-Texte stehen direkt in den Komponenten; hier liegt alles,
// was an mehreren Stellen gebraucht wird.)

import type { DeviceKind, PlantCategory, Sunlight, TaskType } from '../data'

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

export const deviceKindLabels: Record<DeviceKind, string> = {
  switch: 'Schalter',
  valve: 'Ventil',
  sensor: 'Sensor',
}

export const monthNamesShort = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
]

export const monthOptions = monthNamesShort.map((label, i) => ({ label, value: i + 1 }))

export function formatMonths(months: number[]): string {
  return months.length ? months.map((m) => monthNamesShort[m - 1]).join(', ') : '–'
}
