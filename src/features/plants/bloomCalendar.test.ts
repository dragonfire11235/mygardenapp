import { describe, expect, it } from 'vitest'
import { createEntity, type Plant } from '../../data'
import { bloomCountByMonth, bloomGaps, bloomRows, bloomsInRange, monthRows, monthsCovered } from './bloomCalendar'

function makePlant(name: string, bloomMonths: number[], pruningMonths: number[] = []): Plant {
  return createEntity<Plant>({
    name,
    botanicalName: '',
    category: 'blumen',
    imageUrl: '',
    photoId: null,
    wateringIntervalDays: null,
    fertilizingIntervalDays: null,
    wateringStartDate: null,
    spreadM: null,
    sowingMonths: [],
    harvestMonths: [],
    bloomMonths,
    pruningMonths,
    sunlight: null,
    notes: '',
    trefleId: null,
  })
}

describe('bloomRows', () => {
  it('nimmt nur Pflanzen mit Blütemonaten auf', () => {
    const rows = bloomRows([makePlant('Rose', [6, 7]), makePlant('Efeu', [])])
    expect(rows.map((r) => r.plant.name)).toEqual(['Rose'])
  })

  it('sortiert nach erstem Blütemonat, dann Name', () => {
    const rows = bloomRows([
      makePlant('Aster', [9, 10]),
      makePlant('Krokus', [2, 3]),
      makePlant('Akelei', [5]),
    ])
    expect(rows.map((r) => r.plant.name)).toEqual(['Krokus', 'Akelei', 'Aster'])
  })

  it('erzeugt 12 Monats-Bools', () => {
    const [row] = bloomRows([makePlant('Tulpe', [4, 5])])
    expect(row.months.length).toBe(12)
    expect(row.months[3]).toBe(true) // April
    expect(row.months[4]).toBe(true) // Mai
    expect(row.months[0]).toBe(false)
  })

  it('ignoriert fehlendes bloomMonths (Altdaten) ohne Absturz', () => {
    const legacy = makePlant('Alt', [])
    // @ts-expect-error simuliert alten Datensatz ohne Feld
    delete legacy.bloomMonths
    expect(bloomRows([legacy])).toEqual([])
  })
})

describe('bloomCountByMonth / bloomGaps', () => {
  it('zählt blühende Pflanzen je Monat', () => {
    const counts = bloomCountByMonth([makePlant('A', [6]), makePlant('B', [6, 7])])
    expect(counts[5]).toBe(2) // Juni
    expect(counts[6]).toBe(1) // Juli
  })

  it('findet Blühlücken (Monate ohne Blüte)', () => {
    // Blüte nur im Sommer 6–8 → Lücken Jan–Mai + Sep–Dez
    const gaps = bloomGaps([makePlant('Sommerblume', [6, 7, 8])])
    expect(gaps).toEqual([1, 2, 3, 4, 5, 9, 10, 11, 12])
  })
})

describe('bloomsInRange', () => {
  it('true, wenn ein Blütemonat im Intervall liegt', () => {
    expect(bloomsInRange([7, 8, 9], 6, 8)).toBe(true) // 7,8 im Bereich
    expect(bloomsInRange([5], 5, 5)).toBe(true) // Randmonat = Einzelmonat
  })

  it('false außerhalb des Intervalls', () => {
    expect(bloomsInRange([7, 8], 3, 5)).toBe(false)
  })

  it('ordnet from/to selbst (Reihenfolge egal)', () => {
    expect(bloomsInRange([7], 8, 6)).toBe(true)
  })

  it('false ohne Blütemonate', () => {
    expect(bloomsInRange([], 1, 12)).toBe(false)
    expect(bloomsInRange(undefined, 1, 12)).toBe(false)
  })
})

describe('monthsCovered', () => {
  it('12 Bools, true wo mindestens eine Pflanze aktiv ist', () => {
    const cov = monthsCovered([makePlant('A', [3, 4]), makePlant('B', [4, 10])], (p) => p.bloomMonths)
    expect(cov.length).toBe(12)
    expect(cov[2]).toBe(true) // März (A)
    expect(cov[3]).toBe(true) // April (A+B)
    expect(cov[9]).toBe(true) // Oktober (B)
    expect(cov[0]).toBe(false) // Januar
  })
})

describe('monthRows (generisch, z. B. Schnittmonate)', () => {
  it('nutzt das gewählte Monatsfeld (pruningMonths)', () => {
    const rows = monthRows(
      [makePlant('Apfel', [], [1, 2]), makePlant('Rose', [6], [])],
      (p) => p.pruningMonths,
    )
    expect(rows.map((r) => r.plant.name)).toEqual(['Apfel']) // nur mit Schnittmonaten
    expect(rows[0].months[0]).toBe(true) // Januar
    expect(rows[0].months[1]).toBe(true) // Februar
    expect(rows[0].months[5]).toBe(false)
  })
})
