// Datums-Helfer. Aufgaben & Tagebuch arbeiten mit reinen ISO-Datumsstrings (yyyy-mm-dd).

/** Heutiges Datum als yyyy-mm-dd (lokale Zeitzone) */
export function todayIso(): string {
  return toIsoDate(new Date())
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

/** Differenz in Tagen: isoDate - heute (negativ = überfällig) */
export function daysFromToday(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((date.getTime() - today.getTime()) / 86_400_000)
}

/** yyyy-mm-dd → dd.mm.yyyy */
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return `${d}.${m}.${y}`
}

/** Menschlich lesbare Fälligkeit ("heute", "morgen", "vor 3 Tagen", "12.05.2026") */
export function formatDue(isoDate: string): string {
  const diff = daysFromToday(isoDate)
  if (diff === 0) return 'heute'
  if (diff === 1) return 'morgen'
  if (diff === -1) return 'gestern'
  if (diff < 0) return `vor ${-diff} Tagen`
  if (diff <= 7) return `in ${diff} Tagen`
  return formatDate(isoDate)
}
