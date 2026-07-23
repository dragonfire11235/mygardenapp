import { describe, expect, it } from 'vitest'
import { hailExpected, thunderstormExpected, type DayForecast } from './weatherApi'

// Kleiner Fixture-Helfer: baut einen Tag mit gegebenem WMO-Code.
const day = (code: number): DayForecast => ({
  date: '2026-07-23',
  code,
  tempMax: 24,
  tempMin: 14,
  precipProbability: 20,
})

describe('thunderstormExpected / hailExpected', () => {
  it('Code 96 heute → Gewitter und Hagel', () => {
    const days = [day(96), day(1), day(1), day(1)]
    expect(thunderstormExpected(days)).toBe(true)
    expect(hailExpected(days)).toBe(true)
  })

  it('Code 95 morgen → nur Gewitter, kein Hagel', () => {
    const days = [day(1), day(95), day(1), day(1)]
    expect(thunderstormExpected(days)).toBe(true)
    expect(hailExpected(days)).toBe(false)
  })

  it('Code 95 erst am Tag 3 → beide false (außerhalb heute/morgen)', () => {
    const days = [day(1), day(1), day(95), day(1)]
    expect(thunderstormExpected(days)).toBe(false)
    expect(hailExpected(days)).toBe(false)
  })

  it('Codes < 95 → beide false', () => {
    const days = [day(3), day(61), day(80), day(2)]
    expect(thunderstormExpected(days)).toBe(false)
    expect(hailExpected(days)).toBe(false)
  })
})
