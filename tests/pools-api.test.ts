import { beforeEach, describe, expect, it, vi } from 'vitest'

const game = vi.hoisted(() => ({
  createPool: vi.fn()
}))
const auth = vi.hoisted(() => ({
  assertSameOrigin: vi.fn(),
  requireAuthUser: vi.fn(async () => ({ id: 'user-one' }))
}))

vi.mock('../server/utils/game', () => ({
  createPool: game.createPool
}))
vi.mock('../server/utils/nimiq-auth', () => auth)

function installH3Globals(body: unknown) {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('readValidatedBody', async (_event: unknown, validator: (value: unknown) => unknown) => validator(body))
  vi.stubGlobal('createError', (input: { statusCode: number; statusText: string }) => {
    return Object.assign(new Error(input.statusText), input)
  })
}

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllGlobals()
  game.createPool.mockReset()
  game.createPool.mockImplementation(async (title: string, _userId: string, options: {
    imageDataUrl: string | null
    competitionMode: string
    knockoutPickemStartRound: string | null
  }) => ({
    id: 'pool-one',
    code: 'office',
    title,
    imageDataUrl: options.imageDataUrl,
    competitionMode: options.competitionMode,
    knockoutPickemStartRound: options.knockoutPickemStartRound,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z')
  }))
})

describe('pool creation API', () => {
  it('creates a ballot-only league by default', async () => {
    installH3Globals({ title: ' Office Cup ' })
    const event = {}
    const { default: handler } = await import('../server/api/pools.post')

    const result = await handler(event)

    expect(game.createPool).toHaveBeenCalledWith('Office Cup', 'user-one', {
      imageDataUrl: null,
      competitionMode: 'ballot_only',
      knockoutPickemStartRound: null
    }, event)
    expect(result.pool).toMatchObject({
      code: 'office',
      title: 'Office Cup',
      competitionMode: 'ballot_only',
      knockoutPickemStartRound: null
    })
  })

  it('creates a Pickem league with the required start round', async () => {
    installH3Globals({
      title: 'Office Cup',
      competitionMode: 'ballot_pickem',
      knockoutPickemStartRound: 'round_of_16'
    })
    const event = {}
    const { default: handler } = await import('../server/api/pools.post')

    const result = await handler(event)

    expect(game.createPool).toHaveBeenCalledWith('Office Cup', 'user-one', {
      imageDataUrl: null,
      competitionMode: 'ballot_pickem',
      knockoutPickemStartRound: 'round_of_16'
    }, event)
    expect(result.pool.knockoutPickemStartRound).toBe('round_of_16')
  })

  it('rejects Pickem leagues without a start round', async () => {
    installH3Globals({
      title: 'Office Cup',
      competitionMode: 'ballot_pickem'
    })
    const { default: handler } = await import('../server/api/pools.post')

    await expect(handler({})).rejects.toThrow()
    expect(game.createPool).not.toHaveBeenCalled()
  })

  it('rejects invalid start rounds', async () => {
    installH3Globals({
      title: 'Office Cup',
      competitionMode: 'ballot_pickem',
      knockoutPickemStartRound: 'group'
    })
    const { default: handler } = await import('../server/api/pools.post')

    await expect(handler({})).rejects.toThrow()
    expect(game.createPool).not.toHaveBeenCalled()
  })
})
