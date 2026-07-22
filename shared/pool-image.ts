export const MAX_POOL_IMAGE_DATA_URL_LENGTH = 250_000

const SUPPORTED_POOL_IMAGE_PATTERN = /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/]+=*$/i

export function normalizePoolImageDataUrl(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (typeof value !== 'string') {
    throw new Error('League image must be a data URL')
  }

  const imageDataUrl = value.trim()

  if (imageDataUrl.length > MAX_POOL_IMAGE_DATA_URL_LENGTH) {
    throw new Error('League image is too large')
  }

  if (!SUPPORTED_POOL_IMAGE_PATTERN.test(imageDataUrl)) {
    throw new Error('League image must be a PNG, JPEG, or WebP data URL')
  }

  return imageDataUrl
}
