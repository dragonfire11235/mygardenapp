// Baut public/catalog/garten-de.json aus der Quell-Liste + Pflege-Overlay
// (+ Wikidata-Bild-Cache, falls vorhanden). Dev-only.
//
//   node scripts/build-catalog.mjs
//
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { readSourceList, normalize, OUT_JSON, IMAGE_CACHE } from './lib.mjs'
import { careOverlay, genusCategory } from './care-overlay.mjs'
import { companionsOverlay } from './companions-overlay.mjs'

const BENEFICIALS_CACHE = 'scripts/.cache/globi-beneficials.json'

const VALID_CATEGORIES = new Set(['gemuese', 'obst', 'kraeuter', 'blumen', 'strauch', 'baum', 'sonstiges'])
const VALID_SUNLIGHT = new Set(['sonne', 'halbschatten', 'schatten'])
const MONTH_FIELDS = ['sowingMonths', 'harvestMonths', 'bloomMonths', 'pruningMonths']
const CARE_FIELDS = ['sunlight', 'wateringIntervalDays', 'fertilizingIntervalDays', 'spreadM', ...MONTH_FIELDS]

function loadCacheFile(path) {
  if (!existsSync(path)) return {}
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return {}
  }
}

/** Gesamt-Score 0–5 aus den fünf Teil-Scores (0–3): Summe/3, gedeckelt auf 5. */
function overallScore(sub) {
  const sum = Object.values(sub).reduce((a, b) => a + (b || 0), 0)
  return Math.min(5, Math.round(sum / 3))
}

function validateEntry(e, errors) {
  if (!e.name) errors.push(`${e.id}: name fehlt`)
  if (!e.botanicalName) errors.push(`${e.id}: botanicalName fehlt`)
  if (!VALID_CATEGORIES.has(e.category)) errors.push(`${e.id}: ungültige category "${e.category}"`)
  if (e.sunlight && !VALID_SUNLIGHT.has(e.sunlight)) errors.push(`${e.id}: ungültiger sunlight "${e.sunlight}"`)
  for (const f of MONTH_FIELDS) {
    if (e[f] && e[f].some((m) => !Number.isInteger(m) || m < 1 || m > 12)) {
      errors.push(`${e.id}: ${f} enthält Monat außerhalb 1–12`)
    }
  }
  for (const f of ['wateringIntervalDays', 'fertilizingIntervalDays', 'spreadM']) {
    if (e[f] != null && (typeof e[f] !== 'number' || e[f] <= 0)) errors.push(`${e.id}: ${f} unplausibel`)
  }
}

function build() {
  const base = readSourceList()
  const images = loadCacheFile(IMAGE_CACHE)
  const beneficials = loadCacheFile(BENEFICIALS_CACHE)
  const errors = []
  const catCount = {}
  let withCare = 0, withLink = 0, withImage = 0, withBeneficials = 0, withCompanions = 0

  const entries = base.map((rec) => {
    const entry = { ...rec }
    const overlay = careOverlay[rec.botanicalName]
    const sources = {}

    if (overlay) {
      entry.category = overlay.category
      for (const f of CARE_FIELDS) if (overlay[f] !== undefined) entry[f] = overlay[f]
      sources.care = 'kuratiert'
      withCare++
    } else {
      const genus = normalize(rec.botanicalName).split(/[^a-z]+/)[0]
      entry.category = genusCategory[genus] ?? 'sonstiges'
    }

    if (entry.infoUrl) { sources.info = 'pflanzenliebe.de'; withLink++ }

    const img = images[rec.botanicalName]
    if (img) { entry.imageUrl = img; sources.image = 'wikidata'; withImage++ }

    const ben = beneficials[rec.botanicalName]
    if (ben && Object.values(ben).some((v) => v > 0)) {
      entry.beneficials = ben
      entry.beneficialScore = overallScore(ben)
      sources.beneficials = 'globi'
      withBeneficials++
    }

    const comp = companionsOverlay[rec.botanicalName]
    if (comp) {
      const good = comp.good.filter((n) => n !== rec.botanicalName)
      const bad = comp.bad.filter((n) => n !== rec.botanicalName)
      if (good.length) entry.companionsGood = good
      if (bad.length) entry.companionsBad = bad
      if (good.length || bad.length) { sources.companions = 'kuratiert'; withCompanions++ }
    }

    if (Object.keys(sources).length) entry.sources = sources
    catCount[entry.category] = (catCount[entry.category] ?? 0) + 1
    validateEntry(entry, errors)
    return entry
  })

  if (errors.length) {
    console.error(`\n❌ ${errors.length} Validierungsfehler:`)
    errors.slice(0, 30).forEach((e) => console.error('  -', e))
    process.exit(1)
  }

  const file = { generatedAt: new Date().toISOString(), count: entries.length, entries }
  mkdirSync(dirname(OUT_JSON), { recursive: true })
  const json = JSON.stringify(file)
  writeFileSync(OUT_JSON, json)

  console.log(`✅ ${OUT_JSON} geschrieben`)
  console.log(`   Einträge:      ${entries.length}`)
  console.log(`   mit Pflege:    ${withCare}`)
  console.log(`   mit Info-Link: ${withLink}`)
  console.log(`   mit Bild:      ${withImage}`)
  console.log(`   mit Nützlingen:${withBeneficials}`)
  console.log(`   mit Mischkultur:${withCompanions}`)
  console.log(`   Größe:         ${(json.length / 1024).toFixed(1)} KB`)
  console.log(`   Kategorien:    ${JSON.stringify(catCount)}`)
}

build()
