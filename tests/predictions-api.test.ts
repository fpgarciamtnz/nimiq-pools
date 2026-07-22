import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  assertSameOrigin: vi.fn(),
  requireAuthUser: vi.fn(async () => ({ id: 'user-one' }))
}))
const predictions = vi.hoisted(() => ({ saveUserPrediction: vi.fn() }))

vi.mock('../server/utils/nimiq-auth', () => auth)
vi.mock('../server/utils/predictions', () => predictions)

const body = {
  poolCode: 'office',
  displayName: 'Ana',
  answers: [
    { questionKey: 'team_1', teamSlug: 'france' },
    { questionKey: 'team_2', teamSlug: 'japan' },
    { questionKey: 'team_3', teamSlug: 'spain' },
    { questionKey: 'team_4', teamSlug: 'ghana' }
  ]
}

function installH3Globals(params = { id: 'entry-one' }) {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('readValidatedBody', async (_event: unknown, validator: (value: unknown) => unknown) => validator(body))
  vi.stubGlobal('getValidatedRouterParams', async (_event: unknown, validator: (value: unknown) => unknown) => validator(params))
}

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllGlobals()
  auth.assertSameOrigin.mockClear()
  auth.requireAuthUser.mockClear()
  predictions.saveUserPrediction.mockReset()
  predictions.saveUserPrediction.mockResolvedValue({ id: 'entry-one', displayName: 'Ana' })
})

describe('wallet-owned prediction API', () => {
  it('creates or upserts only the authenticated wallet entry', async () => {
    installH3Globals()
    const event = {}
    const { default: handler } = await import('../server/api/predictions.post')

    const result = await handler(event)

    expect(auth.assertSameOrigin).toHaveBeenCalledWith(event)
    expect(predictions.saveUserPrediction).toHaveBeenCalledWith('user-one', body, event)
    expect(result.entry).toMatchObject({ id: 'entry-one', displayName: 'Ana' })
  })

  it('passes the requested id to the ownership-enforcing update service', async () => {
    installH3Globals({ id: 'entry-one' })
    const event = {}
    const { default: handler } = await import('../server/api/predictions/[id].put')

    await handler(event)

    expect(predictions.saveUserPrediction).toHaveBeenCalledWith('user-one', body, event, 'entry-one')
  })
})
