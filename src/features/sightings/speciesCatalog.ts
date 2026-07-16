// Kuratierte Artenlisten je Sichtungsgruppe (gängige mitteleuropäische
// Garten-Arten) — Autocomplete im Sichtungs-Dialog und "noch zu entdecken"
// im Album. Kein GloBI-Bezug (das ist der Nützlingswert je Pflanze, siehe
// beneficials.ts) — reine Namenslisten mit kurzem Erkennungs-/Vorkommens-Hinweis.
import type { SightingGroup } from '../../data'

export interface CuratedSpecies {
  name: string
  hint: string
}

const WILDBEES: CuratedSpecies[] = [
  { name: 'Gehörnte Mauerbiene', hint: 'früh im Jahr, nistet in Insektenhotels' },
  { name: 'Rostrote Mauerbiene', hint: 'häufigster Insektenhotel-Gast' },
  { name: 'Garten-Wollbiene', hint: 'Männchen verteidigen Blüten territorial' },
  { name: 'Blattschneiderbiene', hint: 'schneidet runde Stücke aus Blättern' },
  { name: 'Ackerhummel', hint: 'lange Zunge, an tiefen Blüten' },
  { name: 'Steinhummel', hint: 'schwarz mit orangerotem Hinterleib' },
  { name: 'Erdhummel', hint: 'häufigste Hummel, nistet unterirdisch' },
  { name: 'Gartenhummel', hint: 'sehr lange Zunge, an Fingerhut & Co.' },
  { name: 'Baumhummel', hint: 'nistet oft in Vogelnistkästen' },
  { name: 'Wiesenhummel', hint: 'klein, früh im Jahr aktiv' },
  { name: 'Sandbiene', hint: 'gräbt Nistgänge in offenen Bodenstellen' },
  { name: 'Furchenbiene', hint: 'sehr klein, oft übersehen' },
  { name: 'Pelzbiene', hint: 'schwirrt wie eine kleine Hummel' },
  { name: 'Seidenbiene', hint: 'kleidet Nistgänge mit seidiger Folie aus' },
  { name: 'Maskenbiene', hint: 'kaum behaart, wespenähnlich schlank' },
]

const BUTTERFLIES: CuratedSpecies[] = [
  { name: 'Tagpfauenauge', hint: 'große Augenflecken auf rotbraunem Grund' },
  { name: 'Kleiner Fuchs', hint: 'orange mit schwarzen Flecken, an Brennnesseln' },
  { name: 'Distelfalter', hint: 'Wanderfalter, orange-schwarz-weiß gemustert' },
  { name: 'Admiral', hint: 'schwarz mit roten Binden, Wanderfalter' },
  { name: 'Zitronenfalter', hint: 'leuchtend gelb, überwintert als Falter' },
  { name: 'Landkärtchen', hint: 'Flügelzeichnung wie eine Landkarte' },
  { name: 'C-Falter', hint: 'gezackte Flügelränder, weißes C auf der Unterseite' },
  { name: 'Schachbrett', hint: 'schwarz-weißes Schachbrettmuster' },
  { name: 'Großes Ochsenauge', hint: 'braun mit auffälligem Augenfleck' },
  { name: 'Kleiner Kohlweißling', hint: 'weiß, an Kohlgewächsen' },
  { name: 'Großer Kohlweißling', hint: 'größer als der Kleine Kohlweißling' },
  { name: 'Aurorafalter', hint: 'Männchen mit orangen Flügelspitzen' },
  { name: 'Schwalbenschwanz', hint: 'gelb-schwarz mit „Schwänzchen"' },
  { name: 'Taubenschwänzchen', hint: 'schwirrt wie ein Kolibri vor Blüten' },
]

const HOVERFLIES: CuratedSpecies[] = [
  { name: 'Hainschwebfliege', hint: 'häufigste Art, schwarz-orange gestreift' },
  { name: 'Gemeine Feldschwebfliege', hint: 'schlank, an offenen Blüten' },
  { name: 'Große Winterschwebfliege', hint: 'bienenähnlich, auch im Herbst aktiv' },
  { name: 'Ballonschwebfliege', hint: 'hummelähnlich, schwirrt stationär' },
  { name: 'Hornissenschwebfliege', hint: 'groß, ahmt Hornissen nach (harmlos)' },
  { name: 'Bienenschwebfliege', hint: 'pelzig, ahmt Hummeln nach' },
  { name: 'Sumpfschwebfliege', hint: 'gestreift, an feuchten Standorten' },
  { name: 'Sichelschwebfliege', hint: 'gelb-schwarz, sichelförmige Zeichnung' },
  { name: 'Gemeine Waldschwebfliege', hint: 'im Halbschatten an Waldrändern' },
  { name: 'Stiftschwebfliege', hint: 'schmal, oft an Doldenblütlern' },
]

const BEETLES: CuratedSpecies[] = [
  { name: 'Siebenpunkt-Marienkäfer', hint: 'rot mit sieben schwarzen Punkten' },
  { name: 'Asiatischer Marienkäfer', hint: 'sehr variable Fleckenzahl, eingeschleppt' },
  { name: 'Zweipunkt-Marienkäfer', hint: 'rot mit nur zwei Punkten' },
  { name: 'Rotgelber Weichkäfer', hint: '„Soldatenkäfer", häufig an Doldenblütlern' },
  { name: 'Goldglänzender Rosenkäfer', hint: 'metallisch grün glänzend' },
  { name: 'Gefleckter Schmalbock', hint: 'gelb-schwarz, an Blüten im Sommer' },
  { name: 'Schwarzer Moderkäfer', hint: 'nachtaktiv, unter Laub und Totholz' },
  { name: 'Gemeiner Laufkäfer', hint: 'nachtaktiver Nützling gegen Schnecken' },
  { name: 'Junikäfer', hint: 'schwirrt an Sommerabenden umher' },
  { name: 'Feuerkäfer', hint: 'leuchtend rot mit schwarzem Kopf' },
]

const BIRDS: CuratedSpecies[] = [
  { name: 'Amsel', hint: 'lockt mit Beeren & Insekten' },
  { name: 'Blaumeise', hint: 'lockt mit Insekten, nistet in Höhlen' },
  { name: 'Kohlmeise', hint: 'lockt mit Insekten & Samen, nistet in Höhlen' },
  { name: 'Haussperling', hint: 'lockt mit Samen, brütet in Nischen' },
  { name: 'Feldsperling', hint: 'lockt mit Samen, brütet in Höhlen' },
  { name: 'Rotkehlchen', hint: 'lockt mit Insekten & Beeren' },
  { name: 'Zaunkönig', hint: 'lockt mit Insekten im dichten Gebüsch' },
  { name: 'Buchfink', hint: 'lockt mit Samen & Insekten' },
  { name: 'Grünfink', hint: 'lockt mit Sämereien' },
  { name: 'Stieglitz', hint: 'liebt Disteln und andere Sämereien' },
  { name: 'Erlenzeisig', hint: 'liebt Samen, oft im Winter am Futterhaus' },
  { name: 'Girlitz', hint: 'kleiner Fink, liebt Sämereien' },
  { name: 'Hausrotschwanz', hint: 'lockt mit Insekten, brütet in Nischen' },
  { name: 'Gartenrotschwanz', hint: 'lockt mit Insekten, brütet in Höhlen' },
  { name: 'Star', hint: 'lockt mit Beeren & Insekten, brütet in Höhlen' },
  { name: 'Singdrossel', hint: 'lockt mit Beeren & Insekten' },
  { name: 'Wacholderdrossel', hint: 'liebt Beeren, oft im Trupp' },
  { name: 'Heckenbraunelle', hint: 'lockt mit Insekten im Unterholz' },
  { name: 'Bachstelze', hint: 'jagt Insekten am Boden' },
  { name: 'Elster', hint: 'Allesfresser, Insekten & Beeren' },
  { name: 'Eichelhäher', hint: 'liebt Samen & Beeren, vergräbt Vorräte' },
  { name: 'Ringeltaube', hint: 'liebt Samen & Beeren' },
  { name: 'Türkentaube', hint: 'liebt Sämereien' },
  { name: 'Buntspecht', hint: 'lockt mit Insekten, brütet in Höhlen' },
  { name: 'Grünspecht', hint: 'jagt Ameisen, oft am Boden' },
  { name: 'Mauersegler', hint: 'jagt Insekten im Flug, nistet in Nischen' },
  { name: 'Rauchschwalbe', hint: 'jagt Insekten im Flug, brütet an Gebäuden' },
  { name: 'Mehlschwalbe', hint: 'jagt Insekten im Flug, baut Lehmnester' },
  { name: 'Kleiber', hint: 'lockt mit Insekten & Samen, nistet in Höhlen' },
]

const CATALOG: Partial<Record<SightingGroup, CuratedSpecies[]>> = {
  wildbee: WILDBEES,
  butterfly: BUTTERFLIES,
  hoverfly: HOVERFLIES,
  beetle: BEETLES,
  bird: BIRDS,
}

/** Kuratierte Liste einer Gruppe, oder leer (z. B. für "Sonstiges"). */
export function speciesForGroup(group: SightingGroup): CuratedSpecies[] {
  return CATALOG[group] ?? []
}

/** Präfix-Treffer vor Teilstring-Treffern, unabhängig von Groß-/Kleinschreibung. */
export function searchSpecies(group: SightingGroup, query: string, limit = 10): CuratedSpecies[] {
  const list = speciesForGroup(group)
  const q = query.trim().toLowerCase()
  if (!q) return list.slice(0, limit)
  const starts = list.filter((s) => s.name.toLowerCase().startsWith(q))
  const contains = list.filter((s) => !s.name.toLowerCase().startsWith(q) && s.name.toLowerCase().includes(q))
  return [...starts, ...contains].slice(0, limit)
}

/** Noch nicht fotografierte Arten der Gruppe (nach Name aus den Sichtungen abgeglichen). */
export function undiscoveredSpecies(group: SightingGroup, sightedSpecies: string[]): CuratedSpecies[] {
  const sighted = new Set(sightedSpecies.map((s) => s.trim().toLowerCase()))
  return speciesForGroup(group).filter((s) => !sighted.has(s.name.toLowerCase()))
}
