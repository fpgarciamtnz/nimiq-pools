import type { H3Event } from 'h3'
import type { FootballDataRateLimit } from './football-data-client'
import { FootballDataClient } from './football-data-client'
import type { FootballDataMatchesPayload, FootballDataTeamsPayload } from './football-data-mappers'
import { getPrisma } from './db'
import { competitionPath, syncFixtures, syncTeams } from './football-data-sync'
import { getFootballDataConfig } from './football-data-config'
import type { ApiSyncMilestoneKey } from '../../shared/types'

type Prisma = Awaited<ReturnType<typeof getPrisma>>

const HOUR_IN_MS = 60 * 60 * 1000
const MINUTE_IN_MS = 60 * 1000
const DAY_IN_MS = 24 * HOUR_IN_MS
const SCHEDULE_REFRESH_WINDOW_MS = DAY_IN_MS
const SCHEDULE_RETRY_WINDOW_MS = HOUR_IN_MS
const MAX_MILESTONE_ATTEMPTS = 3
const LIVE_WATCH_INTERVAL_MS = 15 * MINUTE_IN_MS
const LATE_SETTLEMENT_INTERVAL_MS = 30 * MINUTE_IN_MS
const MILESTONE_OFFSETS: Array<{ milestone: ApiSyncMilestoneKey; minutes: number }> = [
  { milestone: 'pregame_check', minutes: -20 },
  { milestone: 'kickoff_check', minutes: 5 },
  { milestone: 'halftime', minutes: 50 },
  { milestone: 'fulltime', minutes: 115 },
  { milestone: 'final_backup', minutes: 135 }
]
const FINAL_PROVIDER_STATUSES = new Set(['FINISHED', 'AWARDED'])
const LIVE_PROVIDER_STATUSES = new Set(['IN_PLAY', 'PAUSED', 'EXTRA_TIME', 'PENALTY_SHOOTOUT'])
const LATE_SETTLEMENT_PROVIDER_STATUSES = new Set(['SUSPENDED', 'DELAYED'])

interface SmartSyncClient {
  requestCount: number
  rateLimit: FootballDataRateLimit
  get<T>(path: string, params?: Record<string, string | number | boolean | undefined | null>): Promise<{ data: T; rateLimit: FootballDataRateLimit }>
}

interface SmartSyncOptions {
  now?: Date
  client?: SmartSyncClient
}

interface FixtureForMilestones {
  fixtureId: number
  kickoffAt: Date
}

interface DueMilestone {
  id: string
  fixtureId: number
  milestone: string
}

interface FixtureForDueMilestone {
  fixtureId: number
  kickoffAt: Date
}

export function calculateFixtureMilestones(fixture: FixtureForMilestones) {
  return MILESTONE_OFFSETS.map((item) => ({
    fixtureId: fixture.fixtureId,
    milestone: item.milestone,
    dueAt: new Date(fixture.kickoffAt.getTime() + item.minutes * 60 * 1000)
  }))
}

export async function runFootballDataSmartSync(event?: H3Event, options: SmartSyncOptions = {}) {
  const prisma = await getPrisma(event)
  const apiConfig = getFootballDataConfig(event)
  const now = options.now ?? new Date()
  const client = options.client ?? new FootballDataClient({
    apiKey: apiConfig.key,
    baseUrl: apiConfig.baseUrl
  })
  const startedAt = now
  const log = await prisma.apiSyncLog.create({
    data: {
      job: 'smart',
      status: 'running',
      startedAt
    }
  })

  await upsertSmartSyncState(prisma, {
    status: 'running',
    lastStartedAt: startedAt,
    lastFinishedAt: null,
    requestCount: 0,
    message: 'Checking fixture milestones',
    error: null
  })

  try {
    const scheduleRefresh = await ensureFixtureScheduleFresh(prisma, client, {
      competitionCode: apiConfig.competitionCode,
      season: apiConfig.season
    }, now)

    await ensureUpcomingMilestones(prisma, now)

    const dueMilestones = await prisma.apiSyncMilestone.findMany({
      where: {
        dueAt: { lte: now },
        status: { in: ['pending', 'failed'] },
        attempts: { lt: MAX_MILESTONE_ATTEMPTS }
      },
      orderBy: { dueAt: 'asc' },
      take: 24
    }) as DueMilestone[]

    if (dueMilestones.length === 0) {
      const finishedAt = new Date()
      const message = scheduleRefresh.refreshed
        ? `${scheduleRefresh.message} No fixture milestones are due.`
        : 'No fixture milestones are due.'

      await finishSmartSync(prisma, log.id, {
        status: 'success',
        startedAt,
        finishedAt,
        requestCount: client.requestCount,
        rateLimit: client.rateLimit,
        message,
        error: null
      })

      return {
        ok: true,
        dueCount: 0,
        apiRequestCount: client.requestCount,
        dailyRemaining: client.rateLimit.dailyRemaining,
        message
      }
    }

    const dueFixtureIds = [...new Set(dueMilestones.map((milestone) => milestone.fixtureId))]
    const fixtures = await prisma.apiFixture.findMany({
      where: {
        fixtureId: {
          in: dueFixtureIds
        }
      },
      select: {
        fixtureId: true,
        kickoffAt: true
      }
    }) as FixtureForDueMilestone[]
    const runnablePlan = await buildRunnableMilestonePlan(prisma, client, {
      dailyLimit: apiConfig.dailyLimit,
      dailyReserve: apiConfig.dailyReserve
    }, dueMilestones, fixtures, now)
    const skippedLiveIds = runnablePlan.skipped.map((milestone) => milestone.id)

    if (skippedLiveIds.length > 0) {
      await prisma.apiSyncMilestone.updateMany({
        where: { id: { in: skippedLiveIds } },
        data: {
          dueAt: new Date(now.getTime() + LIVE_WATCH_INTERVAL_MS),
          message: 'Skipped live watch to preserve the football-data.org daily reserve.',
          error: null
        }
      })
    }

    if (runnablePlan.runnable.length === 0) {
      const finishedAt = new Date()
      const message = `Skipped ${skippedLiveIds.length} live-watch ${skippedLiveIds.length === 1 ? 'milestone' : 'milestones'} to preserve the football-data.org daily reserve.`

      await finishSmartSync(prisma, log.id, {
        status: 'success',
        startedAt,
        finishedAt,
        requestCount: client.requestCount,
        rateLimit: client.rateLimit,
        message,
        error: null
      })

      return {
        ok: true,
        dueCount: dueMilestones.length,
        apiRequestCount: client.requestCount,
        dailyRemaining: client.rateLimit.dailyRemaining,
        message
      }
    }

    const dueIds = runnablePlan.runnable.map((milestone) => milestone.id)
    await prisma.apiSyncMilestone.updateMany({
      where: { id: { in: dueIds } },
      data: {
        status: 'running',
        attempts: { increment: 1 },
        lastAttemptAt: startedAt,
        error: null
      }
    })

    const runnableFixtureIds = new Set(runnablePlan.runnable.map((milestone) => milestone.fixtureId))
    const runnableFixtures = fixtures.filter((fixture) => runnableFixtureIds.has(fixture.fixtureId))
    const dates = uniqueUtcDates(runnableFixtures.map((fixture) => fixture.kickoffAt))
    const teamMappingRefresh = dates.length > 0
      ? await ensureTeamMappingFresh(prisma, client, {
          competitionCode: apiConfig.competitionCode,
          season: apiConfig.season
        }, now)
      : { refreshed: false, message: 'Team mapping cache is ready.' }
    let syncedFixtures = 0
    const refreshedMatchesByFixtureId = new Map<number, FootballDataMatchesPayload['matches'][number]>()

    for (const date of dates) {
      const result = await client.get<FootballDataMatchesPayload>(competitionPath(apiConfig, 'matches'), {
        season: apiConfig.season,
        dateFrom: date,
        dateTo: nextUtcDate(date)
      })
      for (const match of result.data.matches) {
        refreshedMatchesByFixtureId.set(match.id, match)
      }
      syncedFixtures += await syncFixtures(result.data.matches, prisma)
    }

    const finishedAt = new Date()
    const message = [
      scheduleRefresh.refreshed ? scheduleRefresh.message : '',
      teamMappingRefresh.refreshed ? teamMappingRefresh.message : '',
      `Smart sync completed ${runnablePlan.runnable.length} milestone checks across ${dates.length} match ${dates.length === 1 ? 'date' : 'dates'} and cached ${syncedFixtures} fixtures.`,
      skippedLiveIds.length > 0 ? `Skipped ${skippedLiveIds.length} low-priority live-watch ${skippedLiveIds.length === 1 ? 'milestone' : 'milestones'}.` : ''
    ].filter(Boolean).join(' ')

    await prisma.apiSyncMilestone.updateMany({
      where: { id: { in: dueIds } },
      data: {
        status: 'success',
        completedAt: finishedAt,
        message,
        error: null
      }
    })

    await rescheduleAdaptiveMilestones(prisma, runnablePlan.runnable, refreshedMatchesByFixtureId, now, finishedAt)
    await finishSmartSync(prisma, log.id, {
      status: 'success',
      startedAt,
      finishedAt,
      requestCount: client.requestCount,
      rateLimit: client.rateLimit,
      message,
      error: null
    })

    return {
      ok: true,
      dueCount: dueMilestones.length,
      apiRequestCount: client.requestCount,
      dailyRemaining: client.rateLimit.dailyRemaining,
      message
    }
  } catch (error) {
    const finishedAt = new Date()
    const message = error instanceof Error ? error.message : 'Unknown football-data.org smart sync error'

    await prisma.apiSyncMilestone.updateMany({
      where: { status: 'running', lastAttemptAt: startedAt },
      data: {
        status: 'failed',
        error: message
      }
    })
    await finishSmartSync(prisma, log.id, {
      status: 'failed',
      startedAt,
      finishedAt,
      requestCount: client.requestCount,
      rateLimit: client.rateLimit,
      message: null,
      error: message
    })

    throw createError({
      statusCode: 502,
      statusText: message
    })
  }
}

async function buildRunnableMilestonePlan(
  prisma: Prisma,
  client: SmartSyncClient,
  config: { dailyLimit: number; dailyReserve: number },
  dueMilestones: DueMilestone[],
  fixtures: FixtureForDueMilestone[],
  now: Date
) {
  const quota = await getSmartSyncQuota(prisma, client, config, now)

  if (quota.remaining > config.dailyReserve) {
    return {
      runnable: dueMilestones,
      skipped: [] as DueMilestone[]
    }
  }

  const fixtureDateById = new Map(fixtures.map((fixture) => [fixture.fixtureId, utcDate(fixture.kickoffAt)]))
  const mandatoryMilestones = dueMilestones.filter((milestone) => milestone.milestone !== 'live_watch')
  const mandatoryDates = new Set(
    mandatoryMilestones
      .map((milestone) => fixtureDateById.get(milestone.fixtureId))
      .filter((value): value is string => Boolean(value))
  )
  const runnable = dueMilestones.filter((milestone) => {
    if (milestone.milestone !== 'live_watch') {
      return true
    }

    const fixtureDate = fixtureDateById.get(milestone.fixtureId)
    return Boolean(fixtureDate && mandatoryDates.has(fixtureDate))
  })
  const runnableIds = new Set(runnable.map((milestone) => milestone.id))

  return {
    runnable,
    skipped: dueMilestones.filter((milestone) => !runnableIds.has(milestone.id))
  }
}

async function getSmartSyncQuota(
  prisma: Prisma,
  client: SmartSyncClient,
  config: { dailyLimit: number },
  now: Date
) {
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const [budget, latestQuotaLog] = await Promise.all([
    prisma.apiSyncLog.aggregate({
      where: {
        startedAt: { gte: todayStart }
      },
      _sum: {
        requestCount: true
      }
    }),
    prisma.apiSyncLog.findFirst({
      where: {
        dailyRemaining: { not: null }
      },
      orderBy: { startedAt: 'desc' }
    })
  ])
  const providerRemaining = readNullableNumber(client.rateLimit.dailyRemaining)
    ?? readNullableNumber(latestQuotaLog?.dailyRemaining)
  const callsToday = budget._sum.requestCount ?? 0
  const fallbackRemaining = Math.max(0, config.dailyLimit - callsToday - client.requestCount)

  return {
    callsToday,
    remaining: providerRemaining ?? fallbackRemaining
  }
}

async function rescheduleAdaptiveMilestones(
  prisma: Prisma,
  dueMilestones: DueMilestone[],
  refreshedMatchesByFixtureId: Map<number, FootballDataMatchesPayload['matches'][number]>,
  now: Date,
  finishedAt: Date
) {
  for (const milestone of dueMilestones) {
    const match = refreshedMatchesByFixtureId.get(milestone.fixtureId)

    if (!match) {
      continue
    }

    if (FINAL_PROVIDER_STATUSES.has(match.status)) {
      await prisma.apiSyncMilestone.updateMany({
        where: {
          fixtureId: milestone.fixtureId,
          status: { in: ['pending', 'failed'] }
        },
        data: {
          status: 'success',
          completedAt: finishedAt,
          message: 'Fixture settled; future sync milestones closed.',
          error: null
        }
      })
      continue
    }

    if (LIVE_PROVIDER_STATUSES.has(match.status)) {
      await upsertAdaptiveMilestone(prisma, {
        fixtureId: milestone.fixtureId,
        milestone: 'live_watch',
        dueAt: new Date(now.getTime() + LIVE_WATCH_INTERVAL_MS)
      })
      continue
    }

    if (
      milestone.milestone === 'final_backup'
      || milestone.milestone === 'late_settlement'
      || LATE_SETTLEMENT_PROVIDER_STATUSES.has(match.status)
    ) {
      await upsertAdaptiveMilestone(prisma, {
        fixtureId: milestone.fixtureId,
        milestone: 'late_settlement',
        dueAt: new Date(now.getTime() + LATE_SETTLEMENT_INTERVAL_MS)
      })
    }
  }
}

async function upsertAdaptiveMilestone(prisma: Prisma, milestone: {
  fixtureId: number
  milestone: ApiSyncMilestoneKey
  dueAt: Date
}) {
  await prisma.apiSyncMilestone.upsert({
    where: {
      fixtureId_milestone: {
        fixtureId: milestone.fixtureId,
        milestone: milestone.milestone
      }
    },
    update: {
      dueAt: milestone.dueAt,
      status: 'pending',
      attempts: 0,
      lastAttemptAt: null,
      completedAt: null,
      message: null,
      error: null
    },
    create: milestone
  })
}

async function ensureFixtureScheduleFresh(
  prisma: Prisma,
  client: SmartSyncClient,
  config: { competitionCode: string; season: number },
  now: Date
) {
  const [state, upcomingFixtures] = await Promise.all([
    prisma.apiSyncState.findUnique({
      where: { key: 'fixture_schedule' }
    }),
    prisma.apiFixture.findMany({
      where: {
        kickoffAt: {
          gte: new Date(now.getTime() - 3 * HOUR_IN_MS),
          lte: new Date(now.getTime() + 14 * DAY_IN_MS)
        }
      },
      select: {
        fixtureId: true
      },
      take: 1
    })
  ])
  const lastFinishedAt = state?.lastFinishedAt ?? null
  const elapsedSinceFinish = lastFinishedAt ? now.getTime() - lastFinishedAt.getTime() : null
  const isFresh = Boolean(
    state?.status === 'success'
    && elapsedSinceFinish !== null
    && elapsedSinceFinish < SCHEDULE_REFRESH_WINDOW_MS
  )
  const isRetryCoolingDown = Boolean(
    state?.status === 'failed'
    && elapsedSinceFinish !== null
    && elapsedSinceFinish < SCHEDULE_RETRY_WINDOW_MS
  )

  if (upcomingFixtures.length > 0 && (isFresh || isRetryCoolingDown)) {
    return {
      refreshed: false,
      message: isFresh ? 'Fixture schedule cache is fresh.' : 'Fixture schedule retry is cooling down.'
    }
  }

  await upsertFixtureScheduleState(prisma, {
    status: 'running',
    lastStartedAt: now,
    lastFinishedAt: null,
    requestCount: 0,
    message: upcomingFixtures.length === 0 ? 'Refreshing empty fixture schedule cache' : 'Refreshing stale fixture schedule cache',
    error: null
  })

  try {
    const teamMappingRefresh = await ensureTeamMappingFresh(prisma, client, config, now)
    const result = await client.get<FootballDataMatchesPayload>(competitionPath(config, 'matches'), {
      season: config.season
    })
    const syncedFixtures = await syncFixtures(result.data.matches, prisma)
    const finishedAt = new Date()
    const message = [
      teamMappingRefresh.refreshed ? teamMappingRefresh.message : '',
      `Fixture schedule refresh cached ${syncedFixtures} fixtures.`
    ].filter(Boolean).join(' ')

    await upsertFixtureScheduleState(prisma, {
      status: 'success',
      lastStartedAt: now,
      lastFinishedAt: finishedAt,
      requestCount: client.requestCount,
      message,
      error: null
    })

    return {
      refreshed: true,
      message
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown fixture schedule refresh error'

    await upsertFixtureScheduleState(prisma, {
      status: 'failed',
      lastStartedAt: now,
      lastFinishedAt: new Date(),
      requestCount: client.requestCount,
      message: null,
      error: message
    })

    throw error
  }
}

async function ensureUpcomingMilestones(prisma: Prisma, now: Date) {
  const fixtures = await prisma.apiFixture.findMany({
    where: {
      kickoffAt: {
        gte: new Date(now.getTime() - 6 * HOUR_IN_MS),
        lte: new Date(now.getTime() + 2 * DAY_IN_MS)
      }
    },
    select: {
      fixtureId: true,
      kickoffAt: true
    }
  })

  for (const fixture of fixtures) {
    for (const milestone of calculateFixtureMilestones(fixture)) {
      await prisma.apiSyncMilestone.upsert({
        where: {
          fixtureId_milestone: {
            fixtureId: milestone.fixtureId,
            milestone: milestone.milestone
          }
        },
        update: {
          dueAt: milestone.dueAt
        },
        create: {
          fixtureId: milestone.fixtureId,
          milestone: milestone.milestone,
          dueAt: milestone.dueAt
        }
      })
    }
  }
}

async function ensureTeamMappingFresh(
  prisma: Prisma,
  client: SmartSyncClient,
  config: { competitionCode: string; season: number },
  now: Date
) {
  const mappedTeamCount = await prisma.team.count({
    where: {
      footballDataId: { not: null }
    }
  })

  if (mappedTeamCount > 0) {
    return {
      refreshed: false,
      message: 'Team mapping cache is ready.'
    }
  }

  await upsertTeamMappingState(prisma, {
    status: 'running',
    lastStartedAt: now,
    lastFinishedAt: null,
    requestCount: 0,
    message: 'Refreshing football-data.org team mapping',
    error: null
  })

  try {
    const result = await client.get<FootballDataTeamsPayload>(competitionPath(config, 'teams'), {
      season: config.season
    })
    const syncedTeams = await syncTeams(result.data.teams, prisma)
    const finishedAt = new Date()
    const message = `Team mapping refresh synced ${syncedTeams} teams.`

    await upsertTeamMappingState(prisma, {
      status: 'success',
      lastStartedAt: now,
      lastFinishedAt: finishedAt,
      requestCount: client.requestCount,
      message,
      error: null
    })

    return {
      refreshed: true,
      message
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown team mapping refresh error'

    await upsertTeamMappingState(prisma, {
      status: 'failed',
      lastStartedAt: now,
      lastFinishedAt: new Date(),
      requestCount: client.requestCount,
      message: null,
      error: message
    })

    throw error
  }
}

function uniqueUtcDates(values: Date[]) {
  return [...new Set(values.map(utcDate))].sort()
}

function utcDate(value: Date) {
  return value.toISOString().slice(0, 10)
}

function nextUtcDate(value: string) {
  const next = new Date(`${value}T00:00:00.000Z`)
  next.setUTCDate(next.getUTCDate() + 1)

  return next.toISOString().slice(0, 10)
}

function readNullableNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

async function finishSmartSync(prisma: Prisma, logId: string, result: {
  status: 'success' | 'failed'
  startedAt: Date
  finishedAt: Date
  requestCount: number
  rateLimit: FootballDataRateLimit
  message: string | null
  error: string | null
}) {
  await prisma.apiSyncLog.update({
    where: { id: logId },
    data: {
      status: result.status,
      finishedAt: result.finishedAt,
      requestCount: result.requestCount,
      dailyRemaining: result.rateLimit.dailyRemaining,
      minuteLimit: result.rateLimit.minuteLimit,
      minuteRemaining: result.rateLimit.minuteRemaining,
      message: result.message,
      error: result.error
    }
  })
  await upsertSmartSyncState(prisma, {
    status: result.status,
    lastStartedAt: result.startedAt,
    lastFinishedAt: result.finishedAt,
    requestCount: result.requestCount,
    message: result.message,
    error: result.error
  })
}

async function upsertSmartSyncState(prisma: Prisma, data: {
  status: string
  lastStartedAt: Date | null
  lastFinishedAt: Date | null
  requestCount: number
  message: string | null
  error: string | null
}) {
  await prisma.apiSyncState.upsert({
    where: { key: 'smart' },
    update: data,
    create: {
      key: 'smart',
      ...data
    }
  })
}

async function upsertFixtureScheduleState(prisma: Prisma, data: {
  status: string
  lastStartedAt: Date | null
  lastFinishedAt: Date | null
  requestCount: number
  message: string | null
  error: string | null
}) {
  await prisma.apiSyncState.upsert({
    where: { key: 'fixture_schedule' },
    update: data,
    create: {
      key: 'fixture_schedule',
      ...data
    }
  })
}

async function upsertTeamMappingState(prisma: Prisma, data: {
  status: string
  lastStartedAt: Date | null
  lastFinishedAt: Date | null
  requestCount: number
  message: string | null
  error: string | null
}) {
  await prisma.apiSyncState.upsert({
    where: { key: 'team_mapping' },
    update: data,
    create: {
      key: 'team_mapping',
      ...data
    }
  })
}
