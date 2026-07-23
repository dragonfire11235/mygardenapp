import { describe, expect, it } from 'vitest'
import { buildLumiTips } from './lumiTips'

describe('buildLumiTips', () => {
  it('stellt bei Frost den Frost-Tipp voran', () => {
    expect(buildLumiTips({ frostWarning: true })[0]).toContain('Nachtfrost')
  })

  it('stellt bei Hagel den Hagel-Tipp voran — auch vor Frost', () => {
    expect(buildLumiTips({ hailWarning: true, frostWarning: true })[0]).toContain('Hagel')
  })

  it('stellt bei Gewitter den Gewitter-Tipp voran', () => {
    expect(buildLumiTips({ thunderstormWarning: true })[0]).toContain('Gewitter')
  })

  it('stellt bei Regen den Regen-Tipp voran', () => {
    expect(buildLumiTips({ rainToday: true })[0]).toContain('Regen')
  })

  it('stellt bei Hitze (>=25°) den Gieß-Tipp voran', () => {
    expect(buildLumiTips({ currentTemp: 28 })[0]).toContain('warm')
  })

  it('ohne relevantes Wetter startet mit einem allgemeinen Tipp (kein Wetter-Tipp)', () => {
    const tips = buildLumiTips({ currentTemp: 18 })
    expect(tips[0]).not.toContain('Nachtfrost')
    expect(tips[0]).not.toContain('Regen')
    expect(tips[0]).not.toContain('warm')
  })

  it('funktioniert ohne Wetterdaten und liefert immer Tipps', () => {
    const tips = buildLumiTips(null)
    expect(tips.length).toBeGreaterThan(3)
  })

  it('enthält Tagebuch-Nudges', () => {
    const tips = buildLumiTips(null)
    expect(tips.some((t) => t.toLowerCase().includes('tagebuch'))).toBe(true)
  })
})
