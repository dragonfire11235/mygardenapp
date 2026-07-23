import { describe, expect, it, vi } from 'vitest'
import { LumiIdentifier } from './LumiIdentifier'

vi.mock('./imageUtil', () => ({
  fileToLumiImage: vi.fn().mockResolvedValue({ imageBase64: 'AAA', mediaType: 'image/jpeg' }),
}))

const identify = vi.fn()
vi.mock('./lumiApi', () => ({
  lumiApi: { identify: (...args: unknown[]) => identify(...args) },
}))

const blob = new Blob(['x'], { type: 'image/jpeg' })

describe('LumiIdentifier', () => {
  it('mappt gültiges JSON auf ein IdentificationResult', async () => {
    identify.mockResolvedValue({
      reply: JSON.stringify({ group: 'butterfly', species: 'Kleiner Fuchs', confidence: 'high' }),
    })
    const result = await new LumiIdentifier().suggest(blob)

    expect(result).toEqual({ group: 'butterfly', species: 'Kleiner Fuchs' })
  })

  it('entfernt Markdown-Codefences vor dem Parsen', async () => {
    identify.mockResolvedValue({
      reply: '```json\n{"group": "hoverfly", "species": "Hainschwebfliege", "confidence": "high"}\n```',
    })
    const result = await new LumiIdentifier().suggest(blob)

    expect(result).toEqual({ group: 'hoverfly', species: 'Hainschwebfliege' })
  })

  it('gibt null bei kaputtem JSON zurück', async () => {
    identify.mockResolvedValue({ reply: 'kein JSON' })
    const result = await new LumiIdentifier().suggest(blob)

    expect(result).toBeNull()
  })

  it('gibt null bei confidence low zurück', async () => {
    identify.mockResolvedValue({
      reply: JSON.stringify({ group: 'other', species: null, confidence: 'low' }),
    })
    const result = await new LumiIdentifier().suggest(blob)

    expect(result).toBeNull()
  })

  it('gibt null zurück, wenn die Edge Function fehlschlägt', async () => {
    identify.mockRejectedValue(new Error('offline'))
    const result = await new LumiIdentifier().suggest(blob)

    expect(result).toBeNull()
  })
})
