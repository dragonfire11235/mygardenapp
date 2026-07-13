// Reichert Commons-Bild-URLs je botanischem Namen aus Wikidata an.
// Ergebnis wird in scripts/.cache/wikidata-images.json gecacht (resumierbar);
// build-catalog.mjs faltet den Cache beim nächsten Lauf ein. Dev-only.
//
//   node scripts/enrich-images-wikidata.mjs
//
// Nutzt gebündelte SPARQL-Abfragen (taxon name P225 → Bild P18) per POST.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { readSourceList, IMAGE_CACHE } from './lib.mjs'

const ENDPOINT = 'https://query.wikidata.org/sparql'
const UA = 'MyGardenApp/0.9 (Gartenkatalog-Build; contact via github.com/dragonfire11235/mygardenapp)'
const BATCH = 60
const THUMB_WIDTH = 320

function loadCache() {
  if (!existsSync(IMAGE_CACHE)) return {}
  try { return JSON.parse(readFileSync(IMAGE_CACHE, 'utf8')) } catch { return {} }
}
function saveCache(cache) {
  mkdirSync(dirname(IMAGE_CACHE), { recursive: true })
  writeFileSync(IMAGE_CACHE, JSON.stringify(cache, null, 0))
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
  const names = [...new Set(readSourceList().map((r) => r.botanicalName).filter(Boolean))]
  const cache = loadCache()
  const todo = names.filter((n) => !(n in cache))
  console.log(`${names.length} Namen, ${todo.length} noch offen (Rest im Cache).`)

  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH)
    try {
      const found = await queryBatch(batch)
      for (const n of batch) cache[n] = found[n] ?? null // null = geprüft, kein Bild
      saveCache(cache)
      const hits = batch.filter((n) => cache[n]).length
      console.log(`  Batch ${i / BATCH + 1}: ${hits}/${batch.length} mit Bild (gesamt ${i + batch.length}/${todo.length})`)
    } catch (e) {
      console.error(`  Batch ${i / BATCH + 1} fehlgeschlagen: ${e.message} — später erneut ausführen (resumierbar).`)
    }
  }
  const total = names.filter((n) => cache[n]).length
  console.log(`✅ Fertig. ${total}/${names.length} mit Bild. Cache: ${IMAGE_CACHE}`)
  console.log('   Jetzt "node scripts/build-catalog.mjs" ausführen, um die Bilder einzufalten.')
}

main()
