import { describe, expect, it } from 'vitest'
import { MAX_POOL_IMAGE_DATA_URL_LENGTH, normalizePoolImageDataUrl } from '../shared/pool-image'

describe('pool image validation', () => {
  it('normalizes empty image values to null', () => {
    expect(normalizePoolImageDataUrl(undefined)).toBeNull()
    expect(normalizePoolImageDataUrl(null)).toBeNull()
    expect(normalizePoolImageDataUrl('')).toBeNull()
  })

  it('accepts supported image data URLs', () => {
    expect(normalizePoolImageDataUrl(' data:image/webp;base64,aGVsbG8= ')).toBe('data:image/webp;base64,aGVsbG8=')
  })

  it('rejects unsupported or oversized image values', () => {
    expect(() => normalizePoolImageDataUrl('https://example.test/image.png')).toThrow()
    expect(() => normalizePoolImageDataUrl('data:image/gif;base64,aGVsbG8=')).toThrow()
    expect(() => normalizePoolImageDataUrl(`data:image/png;base64,${'a'.repeat(MAX_POOL_IMAGE_DATA_URL_LENGTH)}`)).toThrow()
  })
})
