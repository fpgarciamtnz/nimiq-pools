import { afterEach, describe, expect, it, vi } from 'vitest'

const dbState = vi.hoisted(() => ({
  predictionDeadline: new Date('2026-06-11T18:00:00.000Z'),
  knockoutPickemEnabledAt: null as Date | null,
  competitionMode: 'ballot_only',
  knockoutPickemStartRound: null as 'quarterfinal' | null,
  fixtures: [] as unknown[],
  groups: [] as unknown[],
  standings: [] as unknown[]
}))

const pool = {
  id: 'pool-one',
  code: 'office',
  title: 'Office Cup',
  imageDataUrl: null,
  createdAt: new Date('2026-05-01T00:00:00.000Z'),
  updatedAt: new Date('2026-05-01T00:00:00.000Z')
}

const teams = [
  team('france', 'France', 'FRA', 1),
  team('japan', 'Japan', 'JPN', 17),
  team('spain', 'Spain', 'ESP', 2),
  team('ghana', 'Ghana', 'GHA', 33)
]

const entry = {
  id: 'entry-one',
  displayName: 'Ana',
  displayNameKey: 'ana',
  poolId: pool.id,
  createdAt: new Date('2026-05-02T00:00:00.000Z'),
  updatedAt: new Date('2026-05-02T00:00:00.000Z'),
  answers: [
    { questionKey: 'team_1', teamSlug: 'france' },
    { questionKey: 'team_2', teamSlug: 'japan' },
    { questionKey: 'team_3', teamSlug: 'ghana' },
    { questionKey: 'team_4', teamSlug: 'spain' }
  ],
  groupPositionPicks: [],
  knockoutPicks: []
}

vi.mock('../server/utils/seed-data', () => ({
  ensureSeedData: vi.fn()
}))

vi.mock('../server/utils/db', () => ({
  getPrisma: vi.fn(async () => ({
    gameConfig: {
      findUnique: vi.fn(async () => ({
        id: 1,
        title: 'World Cup Pick Party',
        predictionDeadline: dbState.predictionDeadline,
        knockoutPickemEnabledAt: dbState.knockoutPickemEnabledAt,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z')
      }))
    },
    pool: {
      findUnique: vi.fn(async () => ({
        ...pool,
        competitionMode: dbState.competitionMode,
        knockoutPickemStartRound: dbState.knockoutPickemStartRound
      }))
    },
    team: {
      findMany: vi.fn(async () => teams)
    },
    predictionEntry: {
      findMany: vi.fn(async () => [entry])
    },
    apiFixture: {
      findMany: vi.fn(async () => dbState.fixtures)
    },
    tournamentGroup: {
      findMany: vi.fn(async () => dbState.groups)
    },
    apiStanding: {
      findMany: vi.fn(async () => dbState.standings)
    }
  }))
}))

describe('pool state shaping', () => {
  afterEach(() => {
    vi.useRealTimers()
    dbState.predictionDeadline = new Date('2026-06-11T18:00:00.000Z')
    dbState.competitionMode = 'ballot_only'
    dbState.knockoutPickemStartRound = null
    dbState.knockoutPickemEnabledAt = null
    dbState.fixtures = []
    dbState.groups = []
    dbState.standings = []
    entry.groupPositionPicks = []
    entry.knockoutPicks = []
  })

  it('exposes editable entries before the deadline while reveal rows stay hidden', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T12:00:00.000Z'))
    const { getPoolState } = await import('../server/utils/game')

    const state = await getPoolState('office', { userId: 'user-one' })

    expect(state.isPublic).toBe(false)
    expect(state.entries).toEqual([])
    expect(state.editableEntries).toHaveLength(1)
    expect(state.competition.rankings).toEqual([
      expect.objectContaining({
        entryId: 'entry-one',
        displayName: 'Ana',
        rank: 1,
        totalScore: 0,
        breakdown: []
      })
    ])
    expect(state.competition.predictions).toEqual([])
  })

  it('reveals entries after the deadline while retaining only the current wallet entry', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-12T12:00:00.000Z'))
    const { getPoolState } = await import('../server/utils/game')

    const state = await getPoolState('office', { userId: 'user-one' })

    expect(state.isPublic).toBe(true)
    expect(state.isLateEntry).toBe(false)
    expect(state.entries).toHaveLength(1)
    expect(state.editableEntries).toHaveLength(1)
    expect(state.competition.predictions).toHaveLength(1)
  })

  it('marks entries as late only after a tournament fixture has started', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-12T12:00:00.000Z'))
    dbState.fixtures = [
      fixture(1, 'Group A', '2026-06-11T18:00:00.000Z', 'france', 'japan')
    ]
    const { getPoolState } = await import('../server/utils/game')

    const state = await getPoolState('office')

    expect(state.isPublic).toBe(true)
    expect(state.isLateEntry).toBe(true)
  })

  it('keeps ballot-only leagues out of participant Pickem even when global Pickem is enabled', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-01T12:00:00.000Z'))
    dbState.knockoutPickemEnabledAt = new Date('2026-06-30T12:00:00.000Z')
    dbState.fixtures = [
      fixture(1, 'Quarter-finals', '2026-07-02T12:00:00.000Z', 'france', 'japan'),
      fixture(2, 'Quarter-finals', '2026-07-02T14:00:00.000Z', 'spain', 'japan'),
      fixture(3, 'Quarter-finals', '2026-07-03T12:00:00.000Z', 'france', 'spain'),
      fixture(4, 'Quarter-finals', '2026-07-03T14:00:00.000Z', 'japan', 'spain')
    ]
    const { getPoolState } = await import('../server/utils/game')

    const state = await getPoolState('office')

    expect(state.knockoutPickem.enabled).toBe(false)
    expect(state.leaderboard[0]?.breakdown).not.toContainEqual(expect.objectContaining({
      questionKey: 'knockout_pickem'
    }))
  })

  it('hides unrevealed knockout picks from public Pickem pool state while scoring from full entries', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-01T12:00:00.000Z'))
    dbState.competitionMode = 'ballot_pickem'
    dbState.knockoutPickemStartRound = 'quarterfinal'
    dbState.fixtures = [
      fixture(1, 'Quarter-finals', '2026-07-02T12:00:00.000Z', 'france', 'japan'),
      fixture(2, 'Quarter-finals', '2026-07-02T14:00:00.000Z', 'spain', 'japan'),
      fixture(3, 'Quarter-finals', '2026-07-03T12:00:00.000Z', 'france', 'spain'),
      fixture(4, 'Quarter-finals', '2026-07-03T14:00:00.000Z', 'japan', 'spain')
    ]
    entry.knockoutPicks = [{ fixtureId: 1, winnerTeamSlug: 'france' }]
    const { getPoolState } = await import('../server/utils/game')

    const state = await getPoolState('office')

    expect(state.knockoutPickem.enabled).toBe(true)
    expect(state.knockoutPickem.activeWindow?.roundKey).toBe('quarterfinal')
    expect(state.entries[0]?.knockoutPicks).toEqual([])
    expect(state.leaderboard[0]?.breakdown).toContainEqual(expect.objectContaining({
      questionKey: 'knockout_pickem',
      points: 0,
      maxPoints: 4
    }))
  })

  it("scores ballot, group, and knockout pick'em rows for combined-mode pools", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-03T12:00:00.000Z'))
    dbState.predictionDeadline = new Date('2026-06-12T12:00:00.000Z')
    dbState.competitionMode = 'ballot_pickem'
    dbState.knockoutPickemStartRound = 'quarterfinal'
    dbState.groups = [{
      id: 'group-a',
      name: 'Group A',
      sortOrder: 1,
      teams: [
        { teamSlug: 'france', sortOrder: 1 },
        { teamSlug: 'japan', sortOrder: 2 }
      ]
    }]
    dbState.standings = [
      { groupName: 'Group A', rank: 1, teamSlug: 'france' }
    ]
    dbState.fixtures = [
      finishedFixture(1, 'france', 'japan', 'france'),
      finishedFixture(2, 'spain', 'japan', 'spain'),
      finishedFixture(3, 'france', 'spain', 'france'),
      finishedFixture(4, 'japan', 'spain', 'japan')
    ]
    entry.groupPositionPicks = [{ groupId: 'group-a', position: 1, teamSlug: 'france' }]
    entry.knockoutPicks = [{ fixtureId: 1, winnerTeamSlug: 'france' }]
    const { getPoolState } = await import('../server/utils/game')

    const state = await getPoolState('office')

    expect(state.pool.competitionMode).toBe('ballot_pickem')
    expect(state.leaderboard[0]?.breakdown).toEqual(expect.arrayContaining([
      expect.objectContaining({
        questionKey: 'group_pickem',
        points: 1,
        maxPoints: 48
      }),
      expect.objectContaining({
        questionKey: 'knockout_pickem',
        points: 1,
        maxPoints: 4
      })
    ]))
    expect(state.leaderboard[0]?.categoryScores).toMatchObject({
      groups: 1,
      knockouts: 1
    })
  })
})

function team(slug: string, name: string, fifaCode: string, qualifiedRankOrder: number) {
  return {
    slug,
    name,
    fifaCode,
    fifaRank: qualifiedRankOrder,
    qualifiedRankOrder,
    tier: qualifiedRankOrder <= 16 ? 'TOP' : qualifiedRankOrder <= 32 ? 'MIDDLE' : 'BOTTOM',
    result: null
  }
}

function fixture(
  fixtureId: number,
  leagueRound: string,
  kickoffAt: string,
  homeTeamSlug: string,
  awayTeamSlug: string
) {
  return {
    fixtureId,
    leagueRound,
    statusShort: 'NS',
    statusLong: 'Not Started',
    elapsed: null,
    kickoffAt: new Date(kickoffAt),
    venueName: null,
    venueCity: null,
    homeTeamApiId: null,
    awayTeamApiId: null,
    homeTeamSlug,
    awayTeamSlug,
    homeTeamName: homeTeamSlug,
    awayTeamName: awayTeamSlug,
    homeGoals: null,
    awayGoals: null,
    penaltyHome: null,
    penaltyAway: null,
    isLive: false,
    sourceUpdatedAt: null,
    createdAt: new Date('2026-06-30T00:00:00.000Z'),
    updatedAt: new Date('2026-06-30T00:00:00.000Z')
  }
}

function finishedFixture(
  fixtureId: number,
  homeTeamSlug: string,
  awayTeamSlug: string,
  winnerTeamSlug: string
) {
  const item = fixture(fixtureId, 'Quarter-finals', '2026-07-02T12:00:00.000Z', homeTeamSlug, awayTeamSlug)

  return {
    ...item,
    statusShort: 'FT',
    statusLong: 'Match Finished',
    elapsed: 90,
    homeGoals: winnerTeamSlug === homeTeamSlug ? 2 : 1,
    awayGoals: winnerTeamSlug === awayTeamSlug ? 2 : 1
  }
}
