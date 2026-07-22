import { randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'
import { buildCompetitionView } from '../../shared/competition-view'
import { buildKnockoutPickemState } from '../../shared/knockout-pickem'
import { buildLeaderboard, buildTeamMatchStats, deriveResults, QUESTIONS } from '../../shared/scoring'
import type { CompetitionMode, EntryDto, KnockoutPickemRoundKey, KnockoutPickemStateDto } from '../../shared/types'
import { summarizePoolState } from '../../shared/pool-summary'
import { getPrisma } from './db'
import { mapEntry, mapLiveFixture, mapPool, mapTeam, mapTournamentGroup } from './mappers'
import { ensureSeedData } from './seed-data'

export async function getGameConfig(event?: H3Event) {
  const prisma = await getPrisma(event)
  await ensureSeedData(prisma)
  const existing = await prisma.gameConfig.findUnique({ where: { id: 1 } })

  if (existing) {
    return existing
  }

  return prisma.gameConfig.create({
    data: {
      id: 1,
      title: 'World Cup Pick Party',
      predictionDeadline: new Date('2026-06-11T18:00:00.000Z')
    }
  })
}

export function getVisibility(deadline: Date) {
  const now = new Date()
  const isLocked = now >= deadline

  return {
    isLocked,
    isPublic: isLocked
  }
}

interface CreatePoolOptions {
  imageDataUrl?: string | null
  competitionMode?: CompetitionMode
  knockoutPickemStartRound?: KnockoutPickemRoundKey | null
}

export async function createPool(title: string, userId: string, options: CreatePoolOptions = {}, event?: H3Event) {
  const prisma = await getPrisma(event)
  const competitionMode = options.competitionMode ?? 'ballot_only'

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generatePoolCode()

    try {
      const pool = await prisma.pool.create({
        data: {
          code,
          title,
          ownerId: userId,
          imageDataUrl: options.imageDataUrl ?? null,
          competitionMode,
          knockoutPickemStartRound: competitionMode === 'ballot_pickem'
            ? options.knockoutPickemStartRound ?? null
            : null,
          memberships: {
            create: { userId, role: 'owner' }
          }
        }
      })

      return pool
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error
      }
    }
  }

  throw createError({
    statusCode: 500,
    statusText: 'Pool code could not be created'
  })
}

export async function getPoolByCode(code: string, event?: H3Event) {
  const prisma = await getPrisma(event)
  const pool = await prisma.pool.findUnique({
    where: { code }
  })

  if (!pool) {
    throw createError({
      statusCode: 404,
      statusText: 'Pool not found'
    })
  }

  return pool
}

export async function getTeams(event?: H3Event) {
  const prisma = await getPrisma(event)
  const teams = await prisma.team.findMany({
    orderBy: [{ qualifiedRankOrder: 'asc' }]
  })

  return teams.map(mapTeam)
}

export async function getEntries(poolId: string, event?: H3Event) {
  const prisma = await getPrisma(event)
  const entries = await prisma.predictionEntry.findMany({
    where: { poolId },
    include: {
      answers: {
        orderBy: { questionKey: 'asc' }
      },
      groupPositionPicks: {
        orderBy: [{ groupId: 'asc' }, { position: 'asc' }]
      },
      knockoutPicks: {
        orderBy: { fixtureId: 'asc' }
      }
    },
    orderBy: [{ createdAt: 'asc' }]
  })

  return entries.map(mapEntry)
}

export async function getTournamentGroups(event?: H3Event) {
  const prisma = await getPrisma(event)
  const groups = await prisma.tournamentGroup.findMany({
    include: {
      teams: {
        orderBy: { sortOrder: 'asc' }
      }
    },
    orderBy: { sortOrder: 'asc' }
  })

  return groups.map(mapTournamentGroup)
}

export async function getGroupStandings(event?: H3Event) {
  const prisma = await getPrisma(event)
  return prisma.apiStanding.findMany({
    orderBy: [{ groupName: 'asc' }, { rank: 'asc' }],
    select: {
      groupName: true,
      rank: true,
      teamSlug: true,
      win: true,
      goalsFor: true,
      goalsAgainst: true
    }
  })
}

export async function getTeamMatchStats(event?: H3Event) {
  const prisma = await getPrisma(event)
  const fixtures = await prisma.apiFixture.findMany({
    select: {
      leagueRound: true,
      statusShort: true,
      homeTeamSlug: true,
      awayTeamSlug: true,
      homeGoals: true,
      awayGoals: true,
      penaltyHome: true,
      penaltyAway: true
    }
  })

  return buildTeamMatchStats(fixtures)
}

export async function getKnockoutPickemState(
  options: Date | string | null | undefined | {
    enabledAt?: Date | string | null
    startRoundKey?: KnockoutPickemRoundKey | null
  },
  event?: H3Event,
  now = new Date()
) {
  const prisma = await getPrisma(event)
  const fixtures = await prisma.apiFixture.findMany({
    orderBy: [{ kickoffAt: 'asc' }]
  })
  const config = normalizeKnockoutPickemOptions(options)

  return buildKnockoutPickemState({
    enabledAt: config.enabledAt,
    startRoundKey: config.startRoundKey,
    fixtures,
    now
  })
}

export async function getPoolState(code: string, options: { includePrivateEntries?: boolean; userId?: string } = {}, event?: H3Event) {
  const config = await getGameConfig(event)
  const pool = await getPoolByCode(code, event)
  const visibility = getVisibility(config.predictionDeadline)
  const teams = await getTeams(event)
  const isLateEntry = await getIsLateEntry(event)
  const poolDto = mapPool(pool)
  const showEntries = visibility.isPublic || options.includePrivateEntries
  const allEntries = showEntries ? await getEntries(pool.id, event) : []
  const editableEntries = !options.userId ? [] : await getUserEntries(pool.id, options.userId, event)
  const knockoutPickem = await getKnockoutPickemState({
    startRoundKey: poolDto.competitionMode === 'ballot_pickem' ? poolDto.knockoutPickemStartRound : null
  }, event)
  const competitionFixtures = await getCompetitionFixtures(event)
  const scoringOptions = await getPoolScoringOptions(poolDto.competitionMode, knockoutPickem, event)
  const entries = sanitizeHiddenPickemPicks(allEntries, knockoutPickem)
  const competitionEntries = visibility.isPublic ? entries : editableEntries
  const leaderboard = showEntries
    ? buildLeaderboard(allEntries, QUESTIONS, teams, scoringOptions)
    : []
  const predictionDeadline = config.predictionDeadline.toISOString()

  return {
    title: config.title,
    predictionDeadline,
    ...visibility,
    isLateEntry,
    pool: poolDto,
    questions: QUESTIONS,
    teams,
    results: deriveResults(teams, scoringOptions.teamStats),
    entries,
    editableEntries,
    leaderboard,
    knockoutPickem,
    competition: buildCompetitionView({
      isPublic: visibility.isPublic,
      predictionDeadline,
      entries: competitionEntries,
      leaderboard,
      questions: QUESTIONS,
      teams,
      fixtures: competitionFixtures,
      knockoutPickem
    })
  }
}

async function getIsLateEntry(event?: H3Event, now = new Date()) {
  const prisma = await getPrisma(event)
  const fixtures = await prisma.apiFixture.findMany({
    orderBy: [{ kickoffAt: 'asc' }]
  })

  return fixtures.some((fixture) => hasFixtureStarted(fixture, now))
}

function hasFixtureStarted(fixture: { kickoffAt: Date; statusShort: string }, now: Date) {
  if (fixture.kickoffAt.getTime() <= now.getTime()) {
    return true
  }

  return !['NS', 'TBD', 'PST', 'CANC', 'ABD'].includes(fixture.statusShort.toUpperCase())
}

export async function getCompetitionFixtures(event?: H3Event, now = new Date()) {
  const prisma = await getPrisma(event)
  const windowStart = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  const windowEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
  const fixtures = await prisma.apiFixture.findMany({
    where: {
      OR: [
        { isLive: true },
        {
          kickoffAt: {
            gte: windowStart,
            lte: windowEnd
          }
        }
      ]
    },
    orderBy: [
      { isLive: 'desc' },
      { kickoffAt: 'asc' }
    ]
  })

  return fixtures.map(mapLiveFixture)
}

export async function getPoolSummaries(codes: string[], event?: H3Event) {
  const prisma = await getPrisma(event)
  const uniqueCodes = [...new Set(codes.map((code) => code.trim().toLowerCase()).filter(Boolean))]
  const config = await getGameConfig(event)
  const visibility = getVisibility(config.predictionDeadline)
  const teams = await getTeams(event)
  const pools = await prisma.pool.findMany({
    where: { code: { in: uniqueCodes } },
    orderBy: { createdAt: 'asc' }
  })
  const poolByCode = new Map(pools.map((pool) => [pool.code, pool]))
  const summaries = []

  for (const code of uniqueCodes) {
    const pool = poolByCode.get(code)

    if (!pool) {
      continue
    }

    const entries = visibility.isPublic ? await getEntries(pool.id, event) : []
    const poolDto = mapPool(pool)
    const knockoutPickem = await getKnockoutPickemState({
      startRoundKey: poolDto.competitionMode === 'ballot_pickem' ? poolDto.knockoutPickemStartRound : null
    }, event)
    const scoringOptions = await getPoolScoringOptions(poolDto.competitionMode, knockoutPickem, event)
    const leaderboard = visibility.isPublic
      ? buildLeaderboard(entries, QUESTIONS, teams, scoringOptions)
      : []

    summaries.push(summarizePoolState({
      pool: poolDto,
      isPublic: visibility.isPublic,
      entries,
      leaderboard
    }))
  }

  return summaries
}

export async function getUserPoolSummaries(userId: string, event?: H3Event) {
  const prisma = await getPrisma(event)
  const memberships = await prisma.poolMembership.findMany({
    where: { userId },
    select: { pool: { select: { code: true } } },
    orderBy: { createdAt: 'asc' }
  })

  return getPoolSummaries(memberships.map(({ pool }) => pool.code), event)
}

async function getUserEntries(poolId: string, userId: string, event?: H3Event) {
  const prisma = await getPrisma(event)
  const entries = await prisma.predictionEntry.findMany({
    where: { poolId, userId },
    include: {
      answers: { orderBy: { questionKey: 'asc' } },
      groupPositionPicks: { orderBy: [{ groupId: 'asc' }, { position: 'asc' }] },
      knockoutPicks: { orderBy: { fixtureId: 'asc' } }
    }
  })
  return entries.map(mapEntry)
}

function normalizeKnockoutPickemOptions(
  options: Date | string | null | undefined | {
    enabledAt?: Date | string | null
    startRoundKey?: KnockoutPickemRoundKey | null
  }
) {
  if (typeof options === 'object' && options !== null && !(options instanceof Date)) {
    return {
      enabledAt: options.enabledAt ?? null,
      startRoundKey: options.startRoundKey ?? (options.enabledAt ? 'quarterfinal' : null)
    }
  }

  return {
    enabledAt: options ?? null,
    startRoundKey: options ? 'quarterfinal' as const : null
  }
}

export async function getGameState(event?: H3Event) {
  const config = await getGameConfig(event)
  const visibility = getVisibility(config.predictionDeadline)
  const teams = await getTeams(event)
  const teamStats = await getTeamMatchStats(event)
  const knockoutPickem = await getKnockoutPickemState(config.knockoutPickemEnabledAt, event)

  return {
    title: config.title,
    predictionDeadline: config.predictionDeadline.toISOString(),
    ...visibility,
    questions: QUESTIONS,
    teams,
    results: deriveResults(teams, teamStats),
    knockoutPickem
  }
}

function sanitizeHiddenPickemPicks(entries: EntryDto[], knockoutPickem: KnockoutPickemStateDto): EntryDto[] {
  const hiddenFixtureIds = new Set(
    knockoutPickem.windows
      .filter((window) => !window.isRevealed)
      .flatMap((window) => window.fixtures.map((fixture) => fixture.fixtureId))
  )

  if (hiddenFixtureIds.size === 0) {
    return entries
  }

  return entries.map((entry) => ({
    ...entry,
    knockoutPicks: entry.knockoutPicks.filter((pick) => !hiddenFixtureIds.has(pick.fixtureId))
  }))
}

async function getPoolScoringOptions(
  competitionMode: CompetitionMode,
  knockoutPickem: KnockoutPickemStateDto,
  event?: H3Event
) {
  const [groupStandings, teamStats] = await Promise.all([
    getGroupStandings(event),
    getTeamMatchStats(event)
  ])

  if (competitionMode !== 'ballot_pickem') {
    return {
      competitionMode,
      teamStats,
      groupStandings,
      knockoutWindows: knockoutPickem.windows
    }
  }

  const groups = await getTournamentGroups(event)

  return {
    competitionMode,
    groups,
    teamStats,
    groupStandings,
    knockoutWindows: knockoutPickem.windows
  }
}

function generatePoolCode() {
  return randomBytes(5).toString('base64url').toLowerCase()
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}
