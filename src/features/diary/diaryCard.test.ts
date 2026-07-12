import { describe, expect, it } from 'vitest'
import { wrapText } from './diaryCard'

// measure = Zeichenanzahl → maxWidth ist "Zeichen pro Zeile"
const byLength = (s: string) => s.length

describe('wrapText', () => {
  it('bricht an Wortgrenzen um', () => {
    expect(wrapText('die Tomaten wachsen prächtig', byLength, 12)).toEqual([
      'die Tomaten',
      'wachsen',
      'prächtig',
    ])
  })

  it('behält kurze Texte in einer Zeile', () => {
    expect(wrapText('Hallo Garten', byLength, 20)).toEqual(['Hallo Garten'])
  })

  it('erhält Absätze (Zeilenumbrüche im Text)', () => {
    expect(wrapText('Zeile eins\n\nZeile zwei', byLength, 20)).toEqual([
      'Zeile eins',
      '',
      'Zeile zwei',
    ])
  })

  it('trennt überlange Wörter hart', () => {
    const lines = wrapText('Donaudampfschifffahrt', byLength, 10)
    expect(lines.every((l) => l.length <= 10)).toBe(true)
    expect(lines.join('')).toBe('Donaudampfschifffahrt')
  })

  it('liefert für leeren Text keine Zeilen', () => {
    expect(wrapText('', byLength, 10)).toEqual([])
  })
})
