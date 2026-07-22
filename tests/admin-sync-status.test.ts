import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  findStates: vi.fn(),
  findLogs: vi.fn(),
  aggregateLogs: vi.fn(),
  findLatestQuotaLog: vi.fn(),
  findMilestones: vi.fn()
}))

vi.mock('../server/utils/db', () => ({
  getPrisma: vi.fn(async () => ({
    apiSyncState: {
      findMany: db.findStates
    },
    apiSyncLog: {
      findMany: db.findLogs,
      aggregate: db.aggregateLogs,
      findFirst: db.findLatestQuotaLog
    },
    apiSyncMilestone: {
      findMany: db.findMilestones
    }
  }))
}))

function installH3Globals(config = runtimeConfig()) {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('useRuntimeConfig', () => config)
  vi.stubGlobal('getHeader', (event: { headers?: Record<string, string> }, name: string) => {
    return event.headers?.[name] ?? event.headers?.[name.toLowerCase()] ?? ''
  })
  vi.stubGlobal('createError', (input: { statusCode: number; statusText: string }) => {
    return Object.assign(new Error(input.statusText), input)
  })
}

function runtimeConfig(overrides: Partial<ReturnType<typeof baseRuntimeConfig>> = {}) {
  return {
    ...baseRuntimeConfig(),
    ...overrides,
    footballData: {
      ...baseRuntimeConfig().footballData,
      ...overrides.footballData
    }
  }
}

function baseRuntimeConfig() {
  return {
    adminPin: 'secret-pin',
    footballData: {
      key: 'api-secret',
      cronSecret: 'cron-secret',
      dailyLimit: 100,
      dailyReserve: 10
    }
  }
}

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllGlobals()
  db.findStates.mockReset()
  db.findLogs.mockReset()
  db.aggregateLogs.mockReset()
  db.findLatestQuotaLog.mockReset()
  db.findMilestones.mockReset()
  db.aggregateLogs.mockResolvedValue({ _sum: { requestCount: 0 } })
  db.findLatestQuotaLog.mockResolvedValue(null)
  db.findMilestones.mockResolvedValue([])
})

describe('admin football-data.org sync status', () => {
  it('rejects missing or invalid admin PINs', async () => {
    installH3Globals()
    const { default: handler } = await import('../server/api/admin/sync/status.get')

    await expect(handler({ headers: {} })).rejects.toMatchObject({
      statusCode: 401,
      statusText: 'Invalid admin PIN'
    })
  })

  it('returns sync states, logs, and safe config booleans for admins', async () => {
    installH3Globals()
    db.findStates.mockResolvedValue([
      {
        key: 'hourly',
        status: 'success',
        lastStartedAt: new Date('2026-06-02T10:00:00.000Z'),
        lastFinishedAt: new Date('2026-06-02T10:01:00.000Z'),
        requestCount: 1,
        message: 'Synced 10 fixtures',
        error: null
      }
    ])
    db.findLogs.mockResolvedValue([
      {
        id: 'log-1',
        job: 'hourly',
        status: 'success',
        startedAt: new Date('2026-06-02T10:00:00.000Z'),
        finishedAt: new Date('2026-06-02T10:01:00.000Z'),
        requestCount: 1,
        dailyRemaining: '99',
        minuteLimit: '10',
        minuteRemaining: '9',
        message: 'Synced 10 fixtures',
        error: null
      }
    ])
    db.aggregateLogs.mockResolvedValue({ _sum: { requestCount: 5 } })
    db.findLatestQuotaLog.mockResolvedValue({ dailyRemaining: '95' })
    db.findMilestones
      .mockResolvedValueOnce([
        {
          id: 'milestone-1',
          fixtureId: 123,
          milestone: 'halftime',
          dueAt: new Date('2026-06-02T10:50:00.000Z'),
          status: 'pending',
          attempts: 0,
          lastAttemptAt: null,
          completedAt: null,
          message: null,
          error: null
        }
      ])
      .mockResolvedValueOnce([])
    const { default: handler } = await import('../server/api/admin/sync/status.get')

    const result = await handler({ headers: { 'x-admin-pin': 'secret-pin' } })

    expect(result.states).toHaveLength(1)
    expect(result.logs).toHaveLength(1)
    expect(result.budget).toEqual({
      callsToday: 5,
      dailyLimit: 100,
      latestDailyRemaining: '95'
    })
    expect(result.milestones.next).toHaveLength(1)
    expect(result.milestones.recent).toHaveLength(0)
    expect(result.config).toEqual({
      hasFootballDataKey: true,
      hasCronSecret: true,
      usesDefaultAdminPin: false
    })
    expect(JSON.stringify(result)).not.toContain('api-secret')
    expect(JSON.stringify(result)).not.toContain('cron-secret')
    expect(JSON.stringify(result)).not.toContain('secret-pin')
  })

  it('reports unsafe or missing sync configuration without exposing secrets', async () => {
    installH3Globals(runtimeConfig({
      adminPin: 'change-me',
      footballData: {
        key: '',
        cronSecret: ''
      }
    }))
    db.findStates.mockResolvedValue([])
    db.findLogs.mockResolvedValue([])
    const { default: handler } = await import('../server/api/admin/sync/status.get')

    const result = await handler({ headers: { 'x-admin-pin': 'change-me' } })

    expect(result.config).toMatchObject({
      hasFootballDataKey: false,
      hasCronSecret: false,
      usesDefaultAdminPin: true
    })
  })
})
