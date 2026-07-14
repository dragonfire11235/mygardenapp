// Kuratiertes Mischkultur-Overlay: gute/schlechte Nachbarn je Gartenpflanze.
// Keys + Referenzen = botanischer Name GENAU wie im Katalog. Nach etablierten
// deutschen Mischkultur-Tabellen. Das Matching in der App ist bidirektional —
// eine Beziehung muss also nur auf einer Seite stehen (die andere zieht nach).

// Gruppen (mehrere Katalog-Einträge zur selben Kulturart)
const BOHNEN = ['Phaseolus vulgaris', 'Phaseolus vulgaris var. nanus', 'Phaseolus coccineus']
const ALLIUM = ['Allium cepa', 'Allium porrum', 'Allium schoenoprasum']
const KOHL = [
  'Brassica oleracea var. botrytis',
  'Br.ol.var. capitata f. alba',
  'Br.ol.var. capitata f. rubra',
  'Br.ol.var. capit. var. sabauda',
  'Br.ol.var. gemmifera',
  'Br.ol.var. acephala f. crispa',
]

const TOMATE = 'Lycopersicon esculentum'
const KARTOFFEL = 'Solanum tuberosum'
const MOEHRE = 'Daucus carota'
const ERBSE = 'Pisum sativum'
const SALAT = 'Lactuca sativa'
const SELLERIE = 'Apium graevolens'
const ROTEBETE = 'Beta vulgaris ssp. vulgaris var. conditiva'
const MANGOLD = 'Beta vulgaris var. cicla'
const KUERBIS = 'Cucurbita'
const ZUCCHINI = 'Cucurb. pepo convar. giromont.'
const MAIS = 'Zea mays'
const FENCHEL = 'Foenicum vulgare'
const KOHLRABI = 'Br.ol.var. aceph. var. gongyl.'
const BASILIKUM = 'Ocimum basilicum'
const PETERSILIE = 'Petroselinum crispum'
const DILL = 'Anethum graveolens'
const KAPUZINER = 'Tropaeolum majus'
const KAMILLE = 'Matricaria recutita'
const PFEFFERMINZE = 'Mentha piperita'
const SALBEI = 'Salvia officinalis'
const ROSMARIN = 'Rosmarinus officinale'
const THYMIAN = 'Thymus vulgaris'
const MEERRETTICH = 'Armoracia rusticana'
const PAPRIKA = 'Capsicum annuum'
const AUBERGINE = 'Solanum melongena'
const SPARGEL = 'Asparagus officinalis'

/** Fügt einen Eintrag (oder mehrere Keys) mit good/bad hinzu. */
function set(map, keys, good = [], bad = []) {
  for (const k of [].concat(keys)) {
    const cur = map[k] ?? { good: [], bad: [] }
    cur.good = [...new Set([...cur.good, ...good])]
    cur.bad = [...new Set([...cur.bad, ...bad])]
    map[k] = cur
  }
}

const m = {}

set(m, TOMATE, [BASILIKUM, PETERSILIE, SALAT, MOEHRE, ...ALLIUM, SELLERIE, KAPUZINER, ...KOHL], [KARTOFFEL, ERBSE, FENCHEL])
set(m, KARTOFFEL, [...BOHNEN, ...KOHL, MAIS, MEERRETTICH, KAPUZINER], [TOMATE, 'Allium cepa', SELLERIE, KUERBIS, ZUCCHINI, ERBSE])
set(m, MOEHRE, [...ALLIUM, SALAT, TOMATE, ERBSE, ROSMARIN, SALBEI, MANGOLD, DILL], [ROTEBETE])
set(m, BOHNEN, [MOEHRE, ...KOHL, SALAT, SELLERIE, MANGOLD, KARTOFFEL, KUERBIS, ZUCCHINI, MAIS], [...ALLIUM, ERBSE, FENCHEL])
set(m, ERBSE, [MOEHRE, KOHLRABI, SALAT, ZUCCHINI, KUERBIS, MAIS], [...BOHNEN, ...ALLIUM, KARTOFFEL, TOMATE])
set(m, SALAT, [MOEHRE, 'Allium cepa', ...BOHNEN, ...KOHL, TOMATE, DILL, KOHLRABI], [PETERSILIE, SELLERIE])
set(m, SELLERIE, [TOMATE, ...BOHNEN, ...KOHL, 'Allium porrum'], [KARTOFFEL, MAIS, SALAT])
set(m, ROTEBETE, ['Allium cepa', KOHLRABI, 'Phaseolus vulgaris var. nanus', SALAT], [MANGOLD, KARTOFFEL, 'Allium porrum'])
set(m, MANGOLD, [MOEHRE, ...BOHNEN], [ROTEBETE])
set(m, [KUERBIS, ZUCCHINI], [...BOHNEN, MAIS, KAPUZINER], [KARTOFFEL])
set(m, MAIS, [...BOHNEN, KUERBIS, ZUCCHINI, KARTOFFEL])
set(m, FENCHEL, [SALAT, ERBSE], [TOMATE, ...BOHNEN])
set(m, KOHLRABI, [SALAT, ERBSE, ROTEBETE, TOMATE, ...ALLIUM])
set(m, KOHL, [SELLERIE, ...BOHNEN, ERBSE, KARTOFFEL, SALAT, TOMATE, DILL, KAPUZINER, PFEFFERMINZE, ROSMARIN, SALBEI, THYMIAN, KAMILLE])
set(m, BASILIKUM, [TOMATE, PAPRIKA, AUBERGINE, ZUCCHINI, KUERBIS])
set(m, PETERSILIE, [TOMATE, MOEHRE], [SALAT, 'Allium schoenoprasum'])
set(m, DILL, [MOEHRE, ...KOHL, SALAT, 'Allium cepa'])
set(m, KAPUZINER, [TOMATE, ...KOHL, KUERBIS, ZUCCHINI, KARTOFFEL])
set(m, KAMILLE, ['Allium cepa', ...KOHL])
set(m, MEERRETTICH, [KARTOFFEL])
set(m, [PAPRIKA, AUBERGINE], [BASILIKUM])
set(m, SPARGEL, [TOMATE, PETERSILIE])

export const companionsOverlay = m
