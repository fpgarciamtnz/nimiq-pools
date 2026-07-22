import type { H3Event } from 'h3'

export function requireAdmin(event: H3Event) {
  const adminPin = getAdminPin(event)
  const providedPin = getHeader(event, 'x-admin-pin') ?? ''

  if (!providedPin || providedPin !== adminPin) {
    throw createError({
      statusCode: 401,
      statusText: 'Invalid admin PIN'
    })
  }
}

export function getAdminPin(event: H3Event) {
  const cloudflarePin = (event.context as { cloudflare?: { env?: { NUXT_ADMIN_PIN?: string } } } | undefined)?.cloudflare?.env?.NUXT_ADMIN_PIN

  return cloudflarePin || useRuntimeConfig(event).adminPin
}
