import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = {
  loadSession: vi.fn(),
  loggedIn: { value: false }
}
const navigateTo = vi.fn((target: unknown) => target)

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllGlobals()
  auth.loadSession.mockReset().mockResolvedValue(null)
  auth.loggedIn.value = false
  navigateTo.mockClear()
  vi.stubGlobal('defineNuxtRouteMiddleware', (handler: unknown) => handler)
  vi.stubGlobal('useWalletAuth', () => auth)
  vi.stubGlobal('navigateTo', navigateTo)
})

describe('wallet login gate', () => {
  it('redirects unauthenticated app navigation to login', async () => {
    const { default: middleware } = await import('../app/middleware/auth.global')

    await middleware({ path: '/invite/office', fullPath: '/invite/office', query: {} } as never, {} as never)

    expect(auth.loadSession).toHaveBeenCalledOnce()
    expect(navigateTo).toHaveBeenCalledWith({
      path: '/login',
      query: { redirect: '/invite/office' }
    })
  })

  it('returns a signed-in wallet to a safe in-app destination', async () => {
    auth.loggedIn.value = true
    const { default: middleware } = await import('../app/middleware/auth.global')

    await middleware({ path: '/login', fullPath: '/login?redirect=//outside', query: { redirect: '//outside' } } as never, {} as never)

    expect(navigateTo).toHaveBeenCalledWith('/')
  })
})
