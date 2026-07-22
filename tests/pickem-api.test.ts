import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  entryCreate: vi.fn(),
  entryFindUnique: vi.fn(),
  entryUpdate: vi.fn(),
  entryFindUniqueOrThrow: vi.fn(),
  membershipUpsert: vi.fn(),
  knockoutPickUpsert: vi.fn()
}))
const auth = vi.hoisted(() => ({
  assertSameOrigin: vi.fn(),
  requireAuthUser: vi.fn(async () => ({ id: 'user-one' }))
}))
const game = vi.hoisted(() => ({
  pool: {
    id: 'pool-one', code: 'office', competitionMode: 'ballot_pickem', knockoutPickemStartRound: 'quarterfinal'
  },
  pickemState: {
    enabled: true,
    status: 'open',
    reason: "Quarterfinals Pick'em is open until kickoff.",
    activeWindow: null,
    windows: [{
      roundKey: 'quarterfinal',
      label: 'Quarterfinals',
      lockAt: '2026-07-02T12:00:00.000Z',
      isOpen: true,
      isLocked: false,
      isRevealed: false,
      fixtures: [{
        fixtureId: 1,
        kickoffAt: '2026-07-02T12:00:00.000Z',
        leagueRound: 'Quarter-finals',
        homeTeamSlug: 'france',
        awayTeamSlug: 'japan',
        homeTeamName: 'France',
        awayTeamName: 'Japan',
        homeGoals: null,
        awayGoals: null,
        penaltyHome: null,
        penaltyAway: null,
        statusShort: 'NS',
        winnerTeamSlug: null
      }]
    }]
  }
}))

vi.mock('../server/utils/nimiq-auth', () => auth)
vi.mock('../server/utils/db', () => ({
  getPrisma: vi.fn(async () => ({
    predictionEntry: {
      create: db.entryCreate,
      findUnique: db.entryFindUnique,
      update: db.entryUpdate,
      findUniqueOrThrow: db.entryFindUniqueOrThrow
    },
    poolMembership: { upsert: db.membershipUpsert },
    knockoutPick: { upsert: db.knockoutPickUpsert }
  }))
}))
vi.mock('../server/utils/game', () => ({
  getKnockoutPickemState: vi.fn(async () => game.pickemState),
  getPoolByCode: vi.fn(async () => game.pool)
}))

function record(picks: Array<{ fixtureId: number; winnerTeamSlug: string }> = []) {
  return {
    id: 'entry-one',
    displayName: 'Ana',
    avatarKey: null,
    answers: [],
    groupPositionPicks: [],
    knockoutPicks: picks,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z')
  }
}

function installH3Globals(body: unknown) {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('getValidatedRouterParams', async (_event: unknown, validator: (value: unknown) => unknown) => validator({ code: 'office' }))
  vi.stubGlobal('readValidatedBody', async (_event: unknown, validator: (value: unknown) => unknown) => validator(body))
  vi.stubGlobal('createError', (input: { statusCode: number; statusText: string }) => Object.assign(new Error(input.statusText), input))
}

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllGlobals()
  for (const mock of Object.values(db)) mock.mockReset()
  auth.assertSameOrigin.mockClear()
  auth.requireAuthUser.mockClear()
  game.pickemState.windows[0].isOpen = true
  db.entryFindUnique.mockResolvedValue(null)
  db.entryCreate.mockResolvedValue(record())
  db.entryUpdate.mockResolvedValue(record())
  db.entryFindUniqueOrThrow.mockResolvedValue(record([{ fixtureId: 1, winnerTeamSlug: 'france' }]))
})

describe('wallet-owned pool Pickem API', () => {
  it('creates an entry for the authenticated wallet and saves membership', async () => {
    installH3Globals({ displayName: ' Ana ', picks: [{ fixtureId: 1, winnerTeamSlug: 'france' }] })
    const event = {}
    const { default: handler } = await import('../server/api/pools/[code]/pickem.post')

    const result = await handler(event)

    expect(db.entryFindUnique).toHaveBeenCalledWith({
      where: { poolId_userId: { poolId: 'pool-one', userId: 'user-one' } },
      include: { answers: true, groupPositionPicks: true, knockoutPicks: true }
    })
    expect(db.entryCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ displayName: 'Ana', displayNameKey: 'ana', poolId: 'pool-one', userId: 'user-one' })
    }))
    expect(db.membershipUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { poolId_userId: { poolId: 'pool-one', userId: 'user-one' } }
    }))
    expect(result.entry.knockoutPicks).toEqual([{ fixtureId: 1, winnerTeamSlug: 'france' }])
  })

  it('updates only the entry found by pool and authenticated wallet', async () => {
    installH3Globals({
      entryId: 'someone-elses-entry',
      displayName: 'Imposter',
      avatarKey: 'bee',
      picks: [{ fixtureId: 1, winnerTeamSlug: 'japan' }]
    })
    db.entryFindUnique.mockResolvedValue(record())
    db.entryFindUniqueOrThrow.mockResolvedValue(record([{ fixtureId: 1, winnerTeamSlug: 'japan' }]))
    const { default: handler } = await import('../server/api/pools/[code]/pickem.post')

    const result = await handler({})

    expect(db.entryUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'entry-one' }, data: { avatarKey: 'bee' }
    }))
    expect(db.entryCreate).not.toHaveBeenCalled()
    expect(db.knockoutPickUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { entryId_fixtureId: { entryId: 'entry-one', fixtureId: 1 } },
      update: { winnerTeamSlug: 'japan' }
    }))
    expect(result.entry.knockoutPicks[0].winnerTeamSlug).toBe('japan')
  })

  it('rejects a duplicate display name for a new wallet entry', async () => {
    installH3Globals({ displayName: 'Ana', picks: [{ fixtureId: 1, winnerTeamSlug: 'france' }] })
    db.entryCreate.mockRejectedValue({ code: 'P2002' })
    const { default: handler } = await import('../server/api/pools/[code]/pickem.post')

    await expect(handler({})).rejects.toMatchObject({ statusCode: 409 })
    expect(db.knockoutPickUpsert).not.toHaveBeenCalled()
  })

  it('rejects submissions when no Pickem round is open', async () => {
    installH3Globals({ displayName: 'Ana', picks: [{ fixtureId: 1, winnerTeamSlug: 'france' }] })
    game.pickemState.windows[0].isOpen = false
    const { default: handler } = await import('../server/api/pools/[code]/pickem.post')

    await expect(handler({})).rejects.toMatchObject({ statusCode: 409, statusText: 'No Pickem round is open' })
  })
})
