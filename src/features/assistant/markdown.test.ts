import { describe, expect, it } from 'vitest'
import { renderLumiMarkdown } from './markdown'

describe('renderLumiMarkdown', () => {
  it('escaped rohes HTML statt es durchzulassen', () => {
    expect(renderLumiMarkdown('<script>alert(1)</script>')).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
    )
  })

  it('rendert **fett** und *kursiv*', () => {
    expect(renderLumiMarkdown('**fett** und *kursiv*')).toBe('<p><strong>fett</strong> und <em>kursiv</em></p>')
  })

  it('rendert eine ungeordnete Liste', () => {
    expect(renderLumiMarkdown('- Gießen\n- Düngen')).toBe('<ul><li>Gießen</li><li>Düngen</li></ul>')
  })

  it('rendert eine geordnete Liste', () => {
    expect(renderLumiMarkdown('1. Erst das\n2. Dann das')).toBe('<ol><li>Erst das</li><li>Dann das</li></ol>')
  })

  it('trennt Absätze bei Leerzeile und macht aus einfachem Umbruch <br>', () => {
    expect(renderLumiMarkdown('Zeile eins\nZeile zwei\n\nNeuer Absatz')).toBe(
      '<p>Zeile eins<br>Zeile zwei</p><p>Neuer Absatz</p>',
    )
  })
})
