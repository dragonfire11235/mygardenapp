// Reichert Nützlingswerte je botanischem Namen aus GloBI an
// (globalbioticinteractions.org). Ein Request pro Pflanze holt ALLE
// Interaktionen; daraus werden 5 Gruppen klassifiziert und zu Teil-Scores
// (0–3) + Gesamt-Score (0–5) verdichtet. Ergebnis gecacht (resumierbar).
// Dev-only:  node scripts/enrich-beneficials-globi.mjs
//
// build-catalog.mjs faltet den Cache anschließend in garten-de.json ein.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { readSourceList } from './lib.mjs'

const CACHE = 'scripts/.cache/globi-beneficials.json'
const UA = 'MyGardenApp/0.9 (Gartenkatalog Nützlinge; github.com/dragonfire11235/mygardenapp)'
const CONCURRENCY = 5

function loadCache() {
  if (!existsSync(CACHE)) return {}
  try { return JSON.parse(readFileSync(CACHE, 'utf8')) } catch { return {} }
}
function saveCache(c) {
  mkdirSync(dirname(CACHE), { recursive: true })
  writeFileSync(CACHE, JSON.stringify(c))
}

// Interaktionstypen: Blütenbesuch (Bestäuber) vs. Fraß (Raupenfutter) vs. Vogelnutzung
const FLOWER = /pollinatedBy|flowersVisitedBy|visitedBy/i
const HERBIVORY = /eatenBy|hasHost|hostOf|preyedUponBy/i
const BIRD_INTERACTION = /eatenBy|interactsWith/i

/** Distinkte Arten je Gruppe → Teil-Score 0–3. */
function scoreFromCount(n) {
  if (n >= 10) return 3
  if (n >= 3) return 2
  if (n >= 1) return 1
  return 0
}

async function fetchBeneficials(name) {
  const params = new URLSearchParams({
    sourceTaxon: name,
    fields: 'interaction_type,target_taxon_name,target_taxon_path',
    type: 'json',
    limit: '3000',
  })
  const res = await fetch(`https://api.globalbioticinteractions.org/interaction?${params}`, {
    headers: { 'User-Agent': UA },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const rows = json.data ?? []

  const g = { wildbees: new Set(), butterflies: new Set(), caterpillarHost: new Set(), hoverflies: new Set(), beetles: new Set(), birds: new Set() }
  for (const [itype, tname, path] of rows) {
    const p = path || ''
    if (FLOWER.test(itype)) {
      if (p.includes('Anthophila') && !/\bApis\b/.test(p)) g.wildbees.add(tname) // Wildbienen (ohne Honigbiene)
      if (p.includes('Syrphidae')) g.hoverflies.add(tname)
      if (p.includes('Lepidoptera')) g.butterflies.add(tname)
      if (p.includes('Coleoptera')) g.beetles.add(tname)
    }
    if (HERBIVORY.test(itype) && p.includes('Lepidoptera')) g.caterpillarHost.add(tname)
    if (BIRD_INTERACTION.test(itype) && p.includes('Aves')) g.birds.add(tname) // Vögel (Beeren/Samen/Insekten an der Pflanze)
  }
  const sub = {}
  for (const k of Object.keys(g)) sub[k] = scoreFromCount(g[k].size)
  return sub
}

async function main() {
  const names = [...new Set(readSourceList().map((r) => r.botanicalName).filter(Boolean))]
  const cache = loadCache()
  // Fehlt ein Name ganz ODER hat der Cache-Eintrag noch kein "birds" (ältere Läufe vor AP07) → neu abfragen.
  const todo = names.filter((n) => !(n in cache) || !('birds' in cache[n]))
  console.log(`${names.length} Namen, ${todo.length} offen (Rest im Cache). Concurrency ${CONCURRENCY}.`)

  let done = 0
  let idx = 0
  async function worker() {
    while (idx < todo.length) {
      const name = todo[idx++]
      try {
        cache[name] = await fetchBeneficials(name)
      } catch (e) {
        console.error(`  ✗ ${name}: ${e.message} (später erneut)`)
      }
      done++
      if (done % 25 === 0) { saveCache(cache); console.log(`  ${done}/${todo.length}`) }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  saveCache(cache)

  const withAny = names.filter((n) => cache[n] && Object.values(cache[n]).some((v) => v > 0)).length
  console.log(`✅ Fertig. ${withAny}/${names.length} mit Nützlingsdaten. Cache: ${CACHE}`)
  console.log('   Jetzt "node scripts/build-catalog.mjs" ausführen.')
}

main()
