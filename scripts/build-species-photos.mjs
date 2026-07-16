// Lädt Foto-URLs für die kuratierten Sichtungs-Arten (Insekten/Vögel) aus
// Wikidata (taxon name P225 → Bild P18), analog zu enrich-images-wikidata.mjs
// für den Pflanzenkatalog. Cache resumierbar; schreibt danach
// public/catalog/species-photos.json (wissenschaftlicher Name → Thumbnail-URL).
// Dev-only:  node scripts/build-species-photos.mjs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const SOURCE = 'src/features/sightings/speciesCatalog.data.json'
const CACHE = 'scripts/.cache/species-photos.json'
const OUT_JSON = 'public/catalog/species-photos.json'
const ENDPOINT = 'https://query.wikidata.org/sparql'
const UA = 'MyGardenApp/0.9 (Garten-Entdeckungen-Build; contact via github.com/dragonfire11235/mygardenapp)'
const BATCH = 40
const THUMB_WIDTH = 320

function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback
  try { return JSON.parse(readFileSync(path, 'utf8')) } catch { return fallback }
}
function saveJson(path, data) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data))
}

/** Special:FilePath-URL → schlankes Thumbnail. */
function toThumb(url) {
  if (!url) return null
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}width=${THUMB_WIDTH}`
}

async function queryBatch(names) {
  const values = names.map((n) => `"${n.replace(/"/g, '\\"')}"`).join(' ')
  const sparql = `SELECT ?taxonName ?image WHERE {
    VALUES ?taxonName { ${values} }
    ?item wdt:P225 ?taxonName .
    OPTIONAL { ?item wdt:P18 ?image . }
  }`
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/sparql-results+json',
      'User-Agent': UA,
    },
    body: 'query=' + encodeURIComponent(sparql),
  })
  if (!res.ok) throw new Error(`SPARQL HTTP ${res.status}`)
  const json = await res.json()
  const found = {}
  for (const b of json.results.bindings) {
    const name = b.taxonName?.value
    const img = b.image?.value
    if (name && img && !found[name]) found[name] = toThumb(img)
  }
  return found
}

async function main() {
  const data = loadJson(SOURCE, {})
  const names = [...new Set(Object.values(data).flat().map((s) => s.scientificName).filter(Boolean))]
  const cache = loadJson(CACHE, {})
  const todo = names.filter((n) => !(n in cache))
  console.log(`${names.length} Arten, ${todo.length} noch offen (Rest im Cache).`)

  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH)
    try {
      const found = await queryBatch(batch)
      for (const n of batch) cache[n] = found[n] ?? null // null = geprüft, kein Bild
      saveJson(CACHE, cache)
      const hits = batch.filter((n) => cache[n]).length
      console.log(`  Batch ${i / BATCH + 1}: ${hits}/${batch.length} mit Bild (gesamt ${i + batch.length}/${todo.length})`)
    } catch (e) {
      console.error(`  Batch ${i / BATCH + 1} fehlgeschlagen: ${e.message} — später erneut ausführen (resumierbar).`)
    }
  }

  const photos = {}
  for (const n of names) if (cache[n]) photos[n] = cache[n]
  saveJson(OUT_JSON, photos)

  console.log(`✅ ${OUT_JSON} geschrieben. ${Object.keys(photos).length}/${names.length} Arten mit Foto.`)
}

main()
