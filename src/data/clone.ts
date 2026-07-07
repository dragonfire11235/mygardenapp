// IndexedDB kann keine Vue-Reactivity-Proxies klonen (DataCloneError).
// Vor dem Speichern wird deshalb jede Entität in ein reines Datenobjekt
// überführt. Blobs und Dates bleiben erhalten — die kann IndexedDB nativ.

export function toPlainObject<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  if (value instanceof Blob || value instanceof Date) return value
  if (Array.isArray(value)) return value.map((v) => toPlainObject(v)) as T
  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value)) out[key] = toPlainObject(val)
  return out as T
}
