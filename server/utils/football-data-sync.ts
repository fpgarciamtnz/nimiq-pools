import type { H3Event } from 'h3'
import { FootballDataClient } from './football-data-client'
import type {
  FootballDataMatchesPayload,
  FootballDataStandingsPayload,
  FootballDataTeamPayload,
  FootballDataTeamsPayload
} from './football-data-mappers'
import {
  flattenStandings,
  isExcludedFixtureForCache,
  LIVE_STATUS_CODES,
  mapFixtureForCache
} from './football-data-mappers'
import { getFootballDataConfig } from './football-data-config'
import { getPrisma } from './db'

export type FootballDataSyncJob = 'daily' | 'hourly' | 'live' | 'all'
type Prisma = Awaited<ReturnType<typeof getPrisma>>

export async function runFootballDataSync(job: FootballDataSyncJob, event?: H3Event) {
  const prisma = await getPrisma(event)
  const apiConfig = getFootballDataConfig(event)
  const client = new FootballDataClient({
    apiKey: apiConfig.key,
    baseUrl: apiConfig.baseUrl
  })
  const startedAt = new Date()
  const log = await prisma.apiSyncLog.create({
    data: {
      job,
      status: 'running',
      startedAt
    }
  })

  await upsertSyncState(prisma, job, {
    status: 'running',
    lastStartedAt: startedAt,
    lastFinishedAt: null,
    requestCount: 0,
    message: `Starting ${job} sync`,
    error: null
  })

  try {
    const context = {
      client,
      competitionCode: apiConfig.competitionCode,
      season: apiConfig.season
    }
    const messages: string[] = []

    if (job === 'daily' || job === 'all') {
      messages.push(await syncDailyBootstrap(context, prisma))
    }

    if (job === 'hourly' || job === 'all') {
      messages.push(await syncHourlyTournamentState(context, prisma))
    }

    if (job === 'live' || job === 'all') {
      messages.push(await syncLiveFixtures(context, prisma))
    }

    const finishedAt = new Date()
    const message = messages.filter(Boolean).join(' ')

    await prisma.apiSyncLog.update({
      where: { id: log.id },
      data: {
        status: 'success',
        finishedAt,
        requestCount: client.requestCount,
        dailyRemaining: client.rateLimit.dailyRemaining,
        minuteLimit: client.rateLimit.minuteLimit,
        minuteRemaining: client.rateLimit.minuteRemaining,
        message
      }
    })
    await upsertSyncState(prisma, job, {
      status: 'success',
      lastStartedAt: startedAt,
      lastFinishedAt: finishedAt,
      requestCount: client.requestCount,
      message,
      error: null
    })

    return {
      ok: true,
      job,
      requestCount: client.requestCount,
      message
    }
  } catch (error) {
    const finishedAt = new Date()
    const message = error instanceof Error ? error.message : 'Unknown football-data.org sync error'

    await prisma.apiSyncLog.update({
      where: { id: log.id },
      data: {
        status: 'failed',
        finishedAt,
        requestCount: client.requestCount,
        dailyRemaining: client.rateLimit.dailyRemaining,
        minuteLimit: client.rateLimit.minuteLimit,
        minuteRemaining: client.rateLimit.minuteRemaining,
        error: message
      }
    })
    await upsertSyncState(prisma, job, {
      status: 'failed',
      lastStartedAt: startedAt,
      lastFinishedAt: finishedAt,
      requestCount: client.requestCount,
      message: null,
      error: message
    })

    throw createError({
      statusCode: 502,
      statusText: message
    })
  }
}

async function syncDailyBootstrap(context: SyncContext, prisma: Prisma) {
  const teams = await context.client.get<FootballDataTeamsPayload>(competitionPath(context, 'teams'), {
    season: context.season
  })
  const teamCount = await syncTeams(teams.data.teams, prisma)
  const fixtures = await context.client.get<FootballDataMatchesPayload>(competitionPath(context, 'matches'), {
    season: context.season
  })
  const fixtureCount = await syncFixtures(fixtures.data.matches, prisma)
  const standings = await context.client.get<FootballDataStandingsPayload>(competitionPath(context, 'standings'), {
    season: context.season
  })
  const standingCount = await syncStandings(standings.data, prisma)

  return `Daily bootstrap synced ${teamCount} teams, ${fixtureCount} fixtures, and ${standingCount} standings.`
}

async function syncHourlyTournamentState(context: SyncContext, prisma: Prisma) {
  const fixtures = await context.client.get<FootballDataMatchesPayload>(competitionPath(context, 'matches'), {
    season: context.season
  })
  const fixtureCount = await syncFixtures(fixtures.data.matches, prisma)
  const standings = await context.client.get<FootballDataStandingsPayload>(competitionPath(context, 'standings'), {
    season: context.season
  })
  const standingCount = await syncStandings(standings.data, prisma)

  return `Hourly sync cached ${fixtureCount} fixtures and ${standingCount} standings.`
}

async function syncLiveFixtures(context: SyncContext, prisma: Prisma) {
  const fixtures = await context.client.get<FootballDataMatchesPayload>(competitionPath(context, 'matches'), {
    season: context.season
  })
  const fixtureCount = await syncFixtures(fixtures.data.matches, prisma)
  const liveFixtureIds = fixtures.data.matches
    .map((fixture) => mapFixtureForCache(fixture, new Map()).statusShort)
    .map((statusShort, index) => LIVE_STATUS_CODES.has(statusShort) ? fixtures.data.matches[index]?.id : null)
    .filter((fixtureId): fixtureId is number => typeof fixtureId === 'number')

  await prisma.apiFixture.updateMany({
    where: liveFixtureIds.length > 0
      ? { isLive: true, fixtureId: { notIn: liveFixtureIds } }
      : { isLive: true },
    data: { isLive: false }
  })

  return `Live sync cached ${fixtureCount} fixtures and marked ${liveFixtureIds.length} active.`
}

export async function syncTeams(teams: FootballDataTeamPayload[], prisma: Prisma) {
  const localTeams = await prisma.team.findMany({
    select: {
      slug: true,
      fifaCode: true
    }
  })
  const teamSlugByCode = new Map(localTeams.map((team) => [team.fifaCode.toUpperCase(), team.slug]))
  let synced = 0

  for (const team of teams) {
    const code = team.tla?.toUpperCase()
    const slug = code ? teamSlugByCode.get(code) : null

    if (!slug) {
      continue
    }

    await prisma.team.update({
      where: { slug },
      data: {
        footballDataId: team.id,
        logoUrl: team.crest ?? null,
        sourceUpdatedAt: new Date()
      }
    })
    synced += 1
  }

  return synced
}

export async function syncFixtures(fixtures: FootballDataMatchesPayload['matches'], prisma: Prisma) {
  const teamSlugByProviderId = await getTeamSlugByProviderId(prisma)
  const excludedFixtureIds = fixtures
    .filter(isExcludedFixtureForCache)
    .map((fixture) => fixture.id)

  if (excludedFixtureIds.length > 0) {
    await prisma.apiSyncMilestone.deleteMany({
      where: { fixtureId: { in: excludedFixtureIds } }
    })
    await prisma.apiFixture.deleteMany({
      where: { fixtureId: { in: excludedFixtureIds } }
    })
  }

  for (const fixture of fixtures.filter((fixture) => !isExcludedFixtureForCache(fixture))) {
    const input = mapFixtureForCache(fixture, teamSlugByProviderId)

    await prisma.apiFixture.upsert({
      where: { fixtureId: input.fixtureId },
      update: input,
      create: input
    })
  }

  return fixtures.length - excludedFixtureIds.length
}

export async function syncStandings(response: FootballDataStandingsPayload, prisma: Prisma) {
  const teamSlugByProviderId = await getTeamSlugByProviderId(prisma)
  const standings = flattenStandings(response, teamSlugByProviderId)
  const groupNames = [...new Set(standings.map((standing) => standing.groupName))].sort((a, b) => a.localeCompare(b))

  for (const standing of standings) {
    await prisma.apiStanding.upsert({
      where: {
        groupName_teamName: {
          groupName: standing.groupName,
          teamName: standing.teamName
        }
      },
      update: standing,
      create: standing
    })
  }

  for (const [groupIndex, groupName] of groupNames.entries()) {
    const group = await prisma.tournamentGroup.upsert({
      where: { name: groupName },
      update: { sortOrder: groupIndex + 1 },
      create: {
        name: groupName,
        sortOrder: groupIndex + 1
      }
    })

    for (const standing of standings.filter((item) => item.groupName === groupName && item.teamSlug)) {
      await prisma.tournamentGroupTeam.upsert({
        where: {
          groupId_teamSlug: {
            groupId: group.id,
            teamSlug: standing.teamSlug as string
          }
        },
        update: {
          sortOrder: standing.rank
        },
        create: {
          groupId: group.id,
          teamSlug: standing.teamSlug as string,
          sortOrder: standing.rank
        }
      })
    }
  }

  return standings.length
}

export function competitionPath(context: Pick<SyncContext, 'competitionCode'>, resource: 'teams' | 'matches' | 'standings') {
  return `/competitions/${context.competitionCode}/${resource}`
}

async function getTeamSlugByProviderId(prisma: Prisma) {
  const teams = await prisma.team.findMany({
    where: {
      footballDataId: { not: null }
    },
    select: {
      slug: true,
      footballDataId: true
    }
  })

  return new Map(
    teams
      .filter((team) => team.footballDataId !== null)
      .map((team) => [team.footballDataId as number, team.slug])
  )
}

async function upsertSyncState(prisma: Prisma, key: string, data: {
  status: string
  lastStartedAt: Date | null
  lastFinishedAt: Date | null
  requestCount: number
  message: string | null
  error: string | null
}) {
  await prisma.apiSyncState.upsert({
    where: { key },
    update: data,
    create: {
      key,
      ...data
    }
  })
}

interface SyncContext {
  client: FootballDataClient
  competitionCode: string
  season: number
}
