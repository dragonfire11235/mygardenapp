// Online-Pflanzensuche über Trefle.io.
//
// Trefle sendet keine CORS-Header, daher gehen die Aufrufe über den
// Vite-Proxy (/api/trefle → https://trefle.io/api/v1, siehe vite.config.ts).
// Das funktioniert mit `npm run dev` und `npm run preview`. Wird die App
// später statisch gehostet, braucht es einen kleinen Proxy (z. B.
// Cloudflare Worker) oder das künftige Backend.
//
// Der Access-Token wird auf der Einstellungsseite eingegeben und in der
// lokalen Datenbank gespeichert — er steht nie im Code.

import type { PlantDraft } from './plantsStore'
import { emptyPlantDraft } from './plantsStore'

export interface TrefleResult {
  id: number
  commonName: string
  scientificName: string
  imageUrl: string
  family: string
}

interface TrefleApiPlant {
  id: number
  common_name: string | null
  scientific_name: string
  image_url: string | null
  family_common_name: string | null
  family: string | null
}

export async function searchTrefle(query: string, token: string): Promise<TrefleResult[]> {
  if (!token) throw new Error('Kein Trefle-Token hinterlegt. Bitte in den Einstellungen eintragen.')

  const url = `/api/trefle/plants/search?q=${encodeURIComponent(query)}&token=${encodeURIComponent(token)}`
  let response: Response
  try {
    response = await fetch(url)
  } catch {
    throw new Error('Trefle ist nicht erreichbar. Läuft die App über „npm run dev"? (Der Proxy funktioniert nur dort.)')
  }

  if (response.status === 401) throw new Error('Trefle hat den Token abgelehnt. Bitte in den Einstellungen prüfen.')
  if (!response.ok) throw new Error(`Trefle-Fehler (HTTP ${response.status}). Bitte später erneut versuchen.`)

  const json: { data?: TrefleApiPlant[] } = await response.json()
  return (json.data ?? []).map((p) => ({
    id: p.id,
    commonName: p.common_name ?? '',
    scientificName: p.scientific_name,
    imageUrl: p.image_url ?? '',
    family: p.family_common_name ?? p.family ?? '',
  }))
}

/** Übernimmt ein Trefle-Ergebnis als Entwurf für die eigene Bibliothek. */
export function trefleResultToDraft(result: TrefleResult): PlantDraft {
  return {
    ...emptyPlantDraft(),
    name: result.commonName || result.scientificName,
    botanicalName: result.scientificName,
    imageUrl: result.imageUrl,
    trefleId: result.id,
    notes: result.family ? `Familie: ${result.family}` : '',
  }
}
