import { beforeEach, describe, expect, it, vi } from 'vitest'
import { calculateFixtureMilestones, runFootballDataSmartSync } from '../server/utils/football-data-milestones'

const db = vi.hoisted(() => ({
  createLog: vi.fn(),
  updateLog: vi.fn(),
  aggregateLogs: vi.fn(),
  findLatestQuotaLog: vi.fn(),
  upsertState: vi.fn(),
  findState: vi.fn(),
  findFixtures: vi.fn(),
  upsertMilestone: vi.fn(),
  findMilestones: vi.fn(),
  updateMilestones: vi.fn(),
  countTeams: vi.fn(),
  findTeams: vi.fn(),
  updateTeam: vi.fn(),
  upsertFixture: vi.fn()
}))

vi.mock('../server/utils/db', () => ({
  getPrisma: vi.fn(async () => ({
    apiSyncLog: {
      create: db.createLog,
      update: db.updateLog,
      aggregate: db.aggregateLogs,
      findFirst: db.findLatestQuotaLog
    },
    apiSyncState: {
      findUnique: db.findState,
      upsert: db.upsertState
    },
    apiSyncMilestone: {
      findMany: db.findMilestones,
      updateMany: db.updateMilestones,
      upsert: db.upsertMilestone
    },
    apiFixture: {
      findMany: db.findFixtures,
      upsert: db.upsertFixture
    },
    team: {
      count: db.countTeams,
      update: db.updateTeam,
      findMany: db.findTeams
    }
  }))
}))

function installH3Globals() {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('useRuntimeConfig', () => ({
    footballData: {
      key: 'api-secret',
      baseUrl: 'https://example.test',
      competitionCode: 'WC',
      season: 2026,
      cronSecret: 'cron-secret',
      dailyLimit: 100,
      dailyReserve: 10
    }
  }))
  vi.stubGlobal('getHeader', (event: { headers?: Record<string, string> }, name: string) => {
    return event.headers?.[name] ?? event.headers?.[name.toLowerCase()] ?? ''
  })
  vi.stubGlobal('createError', (input: { statusCode: number; statusText: string }) => {
    return Object.assign(new Error(input.statusText), input)
  })
}

function matchPayload(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    utcDate: '2026-06-11T19:00:00Z',
    status: 'PAUSED',
    minute: 45,
    stage: 'GROUP_STAGE',
    group: 'GROUP_A',
    homeTeam: { id: 1, name: 'Argentina', tla: 'ARG' },
    awayTeam: { id: 2, name: 'France', tla: 'FRA' },
    score: {
      winner: 'HOME_TEAM',
      duration: 'REGULAR',
      fullTime: { home: 1, away: 0 },
      penalties: { home: null, away: null }
    },
    ...overrides
  }
}

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllGlobals()

  for (const mock of Object.values(db)) {
    mock.mockReset()
  }

  installH3Globals()
  db.createLog.mockResolvedValue({ id: 'log-1' })
  db.updateLog.mockResolvedValue({})
  db.aggregateLogs.mockResolvedValue({ _sum: { requestCount: 0 } })
  db.findLatestQuotaLog.mockResolvedValue(null)
  db.upsertState.mockResolvedValue({})
  db.findState.mockResolvedValue({
    status: 'success',
    lastFinishedAt: new Date('2026-06-11T17:30:00.000Z')
  })
  db.upsertMilestone.mockResolvedValue({})
  db.updateMilestones.mockResolvedValue({})
  db.countTeams.mockResolvedValue(2)
  db.findTeams.mockResolvedValue([
    { slug: 'argentina', fifaCode: 'ARG', footballDataId: 1 },
    { slug: 'france', fifaCode: 'FRA', footballDataId: 2 }
  ])
  db.updateTeam.mockResolvedValue({})
  db.upsertFixture.mockResolvedValue({})
})

describe('football-data.org smart sync milestones', () => {
  it('calculates the configured fixture milestones from kickoff', () => {
    const milestones = calculateFixtureMilestones({
      fixtureId: 123,
      kickoffAt: new Date('2026-06-11T19:00:00.000Z')
    })

    expect(milestones).toEqual([
      { fixtureId: 123, milestone: 'pregame_check', dueAt: new Date('2026-06-11T18:40:00.000Z') },
      { fixtureId: 123, milestone: 'kickoff_check', dueAt: new Date('2026-06-11T19:05:00.000Z') },
      { fixtureId: 123, milestone: 'halftime', dueAt: new Date('2026-06-11T19:50:00.000Z') },
      { fixtureId: 123, milestone: 'fulltime', dueAt: new Date('2026-06-11T20:55:00.000Z') },
      { fixtureId: 123, milestone: 'final_backup', dueAt: new Date('2026-06-11T21:15:00.000Z') }
    ])
  })

  it('does not call football-data.org when the fixture schedule cache is fresh and no milestones are due', async () => {
    const client = {
      requestCount: 0,
      rateLimit: { dailyRemaining: null, minuteLimit: null, minuteRemaining: null },
      get: vi.fn()
    }
    db.findFixtures
      .mockResolvedValueOnce([{ fixtureId: 123 }])
      .mockResolvedValueOnce([])
    db.findMilestones.mockResolvedValue([])

    const result = await runFootballDataSmartSync(undefined, {
      now: new Date('2026-06-11T18:00:00.000Z'),
      client
    })

    expect(result).toMatchObject({
      ok: true,
      dueCount: 0,
      apiRequestCount: 0
    })
    expect(client.get).not.toHaveBeenCalled()
  })

  it('refreshes the fixture schedule once when the cache is stale and no milestones are due', async () => {
    const client = {
      requestCount: 0,
      rateLimit: { dailyRemaining: '99', minuteLimit: null, minuteRemaining: '9' },
      get: vi.fn(async () => {
        client.requestCount = 1

        return {
          data: { matches: [matchPayload(123)] },
          rateLimit: { dailyRemaining: '99', minuteLimit: null, minuteRemaining: '9' }
        }
      })
    }
    db.findState.mockResolvedValue({
      status: 'success',
      lastFinishedAt: new Date('2026-06-10T17:30:00.000Z')
    })
    db.findFixtures
      .mockResolvedValueOnce([{ fixtureId: 123 }])
      .mockResolvedValueOnce([])
    db.findMilestones.mockResolvedValue([])

    const result = await runFootballDataSmartSync(undefined, {
      now: new Date('2026-06-11T18:00:00.000Z'),
      client
    })

    expect(client.get).toHaveBeenCalledTimes(1)
    expect(client.get).toHaveBeenCalledWith('/competitions/WC/matches', {
      season: 2026
    })
    expect(result).toMatchObject({
      ok: true,
      dueCount: 0,
      apiRequestCount: 1
    })
  })

  it('retries a failed fixture schedule refresh after the cooldown', async () => {
    const client = {
      requestCount: 0,
      rateLimit: { dailyRemaining: '99', minuteLimit: null, minuteRemaining: '9' },
      get: vi.fn(async () => {
        client.requestCount = 1

        return {
          data: { matches: [matchPayload(123)] },
          rateLimit: { dailyRemaining: '99', minuteLimit: null, minuteRemaining: '9' }
        }
      })
    }
    db.findState.mockResolvedValue({
      status: 'failed',
      lastFinishedAt: new Date('2026-06-11T16:30:00.000Z')
    })
    db.findFixtures
      .mockResolvedValueOnce([{ fixtureId: 123 }])
      .mockResolvedValueOnce([])
    db.findMilestones.mockResolvedValue([])

    const result = await runFootballDataSmartSync(undefined, {
      now: new Date('2026-06-11T18:00:00.000Z'),
      client
    })

    expect(client.get).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      ok: true,
      apiRequestCount: 1
    })
  })

  it('does not hammer the provider while a failed schedule refresh is cooling down', async () => {
    const client = {
      requestCount: 0,
      rateLimit: { dailyRemaining: null, minuteLimit: null, minuteRemaining: null },
      get: vi.fn()
    }
    db.findState.mockResolvedValue({
      status: 'failed',
      lastFinishedAt: new Date('2026-06-11T17:30:00.000Z')
    })
    db.findFixtures
      .mockResolvedValueOnce([{ fixtureId: 123 }])
      .mockResolvedValueOnce([])
    db.findMilestones.mockResolvedValue([])

    const result = await runFootballDataSmartSync(undefined, {
      now: new Date('2026-06-11T18:00:00.000Z'),
      client
    })

    expect(client.get).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      ok: true,
      apiRequestCount: 0
    })
  })

  it('hydrates team mapping before refreshing a stale fixture schedule when provider ids are missing', async () => {
    const client = {
      requestCount: 0,
      rateLimit: { dailyRemaining: '98', minuteLimit: null, minuteRemaining: '8' },
      get: vi.fn(async (path: string) => {
        client.requestCount += 1

        if (path === '/competitions/WC/teams') {
          return {
            data: {
              teams: [
                { id: 1, name: 'Argentina', tla: 'ARG', crest: 'arg.png' },
                { id: 2, name: 'France', tla: 'FRA', crest: 'fra.png' }
              ]
            },
            rateLimit: { dailyRemaining: '99', minuteLimit: null, minuteRemaining: '9' }
          }
        }

        return {
          data: { matches: [matchPayload(123)] },
          rateLimit: { dailyRemaining: '98', minuteLimit: null, minuteRemaining: '8' }
        }
      })
    }
    db.countTeams.mockResolvedValue(0)
    db.findState.mockResolvedValue({
      status: 'success',
      lastFinishedAt: new Date('2026-06-10T17:30:00.000Z')
    })
    db.findTeams
      .mockResolvedValueOnce([
        { slug: 'argentina', fifaCode: 'ARG' },
        { slug: 'france', fifaCode: 'FRA' }
      ])
      .mockResolvedValueOnce([
        { slug: 'argentina', footballDataId: 1 },
        { slug: 'france', footballDataId: 2 }
      ])
    db.findFixtures
      .mockResolvedValueOnce([{ fixtureId: 123 }])
      .mockResolvedValueOnce([])
    db.findMilestones.mockResolvedValue([])

    const result = await runFootballDataSmartSync(undefined, {
      now: new Date('2026-06-11T18:00:00.000Z'),
      client
    })

    expect(client.get).toHaveBeenNthCalledWith(1, '/competitions/WC/teams', {
      season: 2026
    })
    expect(client.get).toHaveBeenNthCalledWith(2, '/competitions/WC/matches', {
      season: 2026
    })
    expect(db.updateTeam).toHaveBeenCalledWith(expect.objectContaining({
      where: { slug: 'argentina' },
      data: expect.objectContaining({ footballDataId: 1 })
    }))
    expect(result).toMatchObject({
      ok: true,
      dueCount: 0,
      apiRequestCount: 2
    })
  })

  it('groups due milestones by match date and completes them once', async () => {
    const client = {
      requestCount: 1,
      rateLimit: { dailyRemaining: '99', minuteLimit: null, minuteRemaining: '9' },
      get: vi.fn(async () => ({
        data: { matches: [matchPayload(123)] },
        rateLimit: { dailyRemaining: '99', minuteLimit: null, minuteRemaining: '9' }
      }))
    }
    db.findFixtures
      .mockResolvedValueOnce([{ fixtureId: 123 }])
      .mockResolvedValueOnce([
        { fixtureId: 123, kickoffAt: new Date('2026-06-11T19:00:00.000Z') }
      ])
      .mockResolvedValueOnce([
        { fixtureId: 123, kickoffAt: new Date('2026-06-11T19:00:00.000Z') }
      ])
    db.findMilestones.mockResolvedValue([
      {
        id: 'milestone-1',
        fixtureId: 123,
        milestone: 'halftime',
        dueAt: new Date('2026-06-11T19:50:00.000Z'),
        status: 'pending',
        attempts: 0
      }
    ])

    const result = await runFootballDataSmartSync(undefined, {
      now: new Date('2026-06-11T19:55:00.000Z'),
      client
    })

    expect(client.get).toHaveBeenCalledWith('/competitions/WC/matches', {
      season: 2026,
      dateFrom: '2026-06-11',
      dateTo: '2026-06-12'
    })
    expect(db.updateMilestones).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: ['milestone-1'] } },
      data: expect.objectContaining({ status: 'running' })
    }))
    expect(db.updateMilestones).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: ['milestone-1'] } },
      data: expect.objectContaining({ status: 'success' })
    }))
    expect(result).toMatchObject({
      ok: true,
      dueCount: 1,
      apiRequestCount: 1,
      dailyRemaining: '99'
    })
  })

  it('reschedules live-watch milestones when a refreshed fixture is still live', async () => {
    const client = {
      requestCount: 0,
      rateLimit: { dailyRemaining: '99', minuteLimit: null, minuteRemaining: '9' },
      get: vi.fn(async () => {
        client.requestCount += 1

        return {
          data: { matches: [matchPayload(123, { status: 'IN_PLAY', minute: 62 })] },
          rateLimit: { dailyRemaining: '99', minuteLimit: null, minuteRemaining: '9' }
        }
      })
    }
    db.findFixtures
      .mockResolvedValueOnce([{ fixtureId: 123 }])
      .mockResolvedValueOnce([
        { fixtureId: 123, kickoffAt: new Date('2026-06-11T19:00:00.000Z') }
      ])
      .mockResolvedValueOnce([
        { fixtureId: 123, kickoffAt: new Date('2026-06-11T19:00:00.000Z') }
      ])
    db.findMilestones.mockResolvedValue([
      {
        id: 'milestone-1',
        fixtureId: 123,
        milestone: 'halftime',
        dueAt: new Date('2026-06-11T19:50:00.000Z'),
        status: 'pending',
        attempts: 0
      }
    ])

    await runFootballDataSmartSync(undefined, {
      now: new Date('2026-06-11T20:05:00.000Z'),
      client
    })

    expect(db.upsertMilestone).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        fixtureId_milestone: {
          fixtureId: 123,
          milestone: 'live_watch'
        }
      },
      update: expect.objectContaining({
        dueAt: new Date('2026-06-11T20:20:00.000Z'),
        status: 'pending'
      })
    }))
  })

  it('closes future pending milestones when a fixture settles final', async () => {
    const client = {
      requestCount: 0,
      rateLimit: { dailyRemaining: '99', minuteLimit: null, minuteRemaining: '9' },
      get: vi.fn(async () => {
        client.requestCount += 1

        return {
          data: { matches: [matchPayload(123, { status: 'FINISHED', minute: null })] },
          rateLimit: { dailyRemaining: '99', minuteLimit: null, minuteRemaining: '9' }
        }
      })
    }
    db.findFixtures
      .mockResolvedValueOnce([{ fixtureId: 123 }])
      .mockResolvedValueOnce([
        { fixtureId: 123, kickoffAt: new Date('2026-06-11T19:00:00.000Z') }
      ])
      .mockResolvedValueOnce([
        { fixtureId: 123, kickoffAt: new Date('2026-06-11T19:00:00.000Z') }
      ])
    db.findMilestones.mockResolvedValue([
      {
        id: 'milestone-1',
        fixtureId: 123,
        milestone: 'fulltime',
        dueAt: new Date('2026-06-11T20:55:00.000Z'),
        status: 'pending',
        attempts: 0
      }
    ])

    await runFootballDataSmartSync(undefined, {
      now: new Date('2026-06-11T20:56:00.000Z'),
      client
    })

    expect(db.updateMilestones).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        fixtureId: 123,
        status: { in: ['pending', 'failed'] }
      },
      data: expect.objectContaining({
        status: 'success',
        message: 'Fixture settled; future sync milestones closed.'
      })
    }))
  })

  it('skips low-priority live-watch calls when the daily reserve is reached', async () => {
    const client = {
      requestCount: 0,
      rateLimit: { dailyRemaining: null, minuteLimit: null, minuteRemaining: null },
      get: vi.fn()
    }
    db.aggregateLogs.mockResolvedValue({ _sum: { requestCount: 90 } })
    db.findFixtures
      .mockResolvedValueOnce([{ fixtureId: 123 }])
      .mockResolvedValueOnce([
        { fixtureId: 123, kickoffAt: new Date('2026-06-11T19:00:00.000Z') }
      ])
      .mockResolvedValueOnce([
        { fixtureId: 123, kickoffAt: new Date('2026-06-11T19:00:00.000Z') }
      ])
    db.findMilestones.mockResolvedValue([
      {
        id: 'milestone-1',
        fixtureId: 123,
        milestone: 'live_watch',
        dueAt: new Date('2026-06-11T20:10:00.000Z'),
        status: 'pending',
        attempts: 0
      }
    ])

    const result = await runFootballDataSmartSync(undefined, {
      now: new Date('2026-06-11T20:10:00.000Z'),
      client
    })

    expect(client.get).not.toHaveBeenCalled()
    expect(db.updateMilestones).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: ['milestone-1'] } },
      data: expect.objectContaining({
        dueAt: new Date('2026-06-11T20:25:00.000Z'),
        message: 'Skipped live watch to preserve the football-data.org daily reserve.'
      })
    }))
    expect(result).toMatchObject({
      ok: true,
      dueCount: 1,
      apiRequestCount: 0
    })
  })

  it('still runs settlement milestones when the daily reserve is reached', async () => {
    const client = {
      requestCount: 0,
      rateLimit: { dailyRemaining: null, minuteLimit: null, minuteRemaining: null },
      get: vi.fn(async () => {
        client.requestCount += 1

        return {
          data: { matches: [matchPayload(123, { status: 'FINISHED', minute: null })] },
          rateLimit: { dailyRemaining: '9', minuteLimit: null, minuteRemaining: '9' }
        }
      })
    }
    db.aggregateLogs.mockResolvedValue({ _sum: { requestCount: 90 } })
    db.findFixtures
      .mockResolvedValueOnce([{ fixtureId: 123 }])
      .mockResolvedValueOnce([
        { fixtureId: 123, kickoffAt: new Date('2026-06-11T19:00:00.000Z') }
      ])
      .mockResolvedValueOnce([
        { fixtureId: 123, kickoffAt: new Date('2026-06-11T19:00:00.000Z') }
      ])
    db.findMilestones.mockResolvedValue([
      {
        id: 'milestone-1',
        fixtureId: 123,
        milestone: 'final_backup',
        dueAt: new Date('2026-06-11T21:15:00.000Z'),
        status: 'pending',
        attempts: 0
      }
    ])

    const result = await runFootballDataSmartSync(undefined, {
      now: new Date('2026-06-11T21:16:00.000Z'),
      client
    })

    expect(client.get).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      ok: true,
      dueCount: 1,
      apiRequestCount: 1
    })
  })
})

describe('football-data.org smart sync cron endpoint', () => {
  it('is disabled after the tournament ends', async () => {
    const { default: handler } = await import('../server/api/cron/football-data-smart-sync.post')

    expect(() => handler({ headers: {} })).toThrow(expect.objectContaining({
      statusCode: 410,
      statusText: 'Tournament sync is disabled because the tournament has ended'
    }))
  })
})
