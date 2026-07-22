import { describe, expect, it } from 'vitest'
import {
  buildLeaderboard,
  buildTeamMatchStats,
  deriveResults,
  QUESTIONS,
  normalizeDisplayName,
  scoreGroupPositionPicks,
  scoreKnockoutPicks,
  scorePick
} from '../shared/scoring'
import type { EntryDto, FinishStage, KnockoutWindowDto, TeamDto, TeamTier, TournamentGroupDto } from '../shared/types'

const teamStats = [
  teamStat('france', 3, 8, 2, 3),
  teamStat('japan', 2, 5, 4, 3),
  teamStat('ghana', 1, 4, 5, 3),
  teamStat('spain', 2, 6, 2, 3, 0, true, true),
  teamStat('new-zealand', 0, 1, 6, 3)
]

const groupStandings = [
  standing('france', 3, 8, 2, 1),
  standing('japan', 2, 5, 4, 2),
  standing('ghana', 1, 4, 5, 3),
  standing('spain', 2, 6, 2, 4),
  standing('new-zealand', 0, 1, 6, 5)
]

const teams = [
  team('france', 'France', 1, 'TOP', 'champion'),
  team('spain', 'Spain', 2, 'TOP', 'runner_up'),
  team('england', 'England', 4, 'TOP', 'group'),
  team('japan', 'Japan', 17, 'MIDDLE', 'round_of_16'),
  team('ghana', 'Ghana', 33, 'BOTTOM', 'semifinalist'),
  team('new-zealand', 'New Zealand', 48, 'BOTTOM', null)
]

function team(
  slug: string,
  name: string,
  qualifiedRankOrder: number,
  tier: TeamTier,
  finishStage: FinishStage | null,
  guaranteedStage: FinishStage | null = finishStage
): TeamDto {
  return {
    slug,
    name,
    fifaCode: slug.slice(0, 3).toUpperCase(),
    fifaRank: qualifiedRankOrder,
    qualifiedRankOrder,
    tier,
    finishStage,
    guaranteedStage
  }
}

function standing(teamSlug: string, win: number, goalsFor: number, goalsAgainst: number, rank: number) {
  return {
    groupName: 'Group A',
    rank,
    teamSlug,
    win,
    goalsFor,
    goalsAgainst
  }
}

function teamStat(
  teamSlug: string,
  wins: number,
  goalsFor: number,
  goalsAgainst: number,
  played: number,
  draws = 0,
  reachedSemifinal = false,
  reachedFinal = false
) {
  return {
    teamSlug,
    wins,
    draws,
    goalsFor,
    goalsAgainst,
    reachedSemifinal,
    reachedFinal,
    played
  }
}

function entry(id: string, displayName: string, answers: Record<string, string>): EntryDto {
  return {
    id,
    displayName,
    avatarKey: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    answers: Object.entries(answers).map(([questionKey, teamSlug]) => ({
      questionKey: questionKey as EntryDto['answers'][number]['questionKey'],
      teamSlug
    })),
    groupPositionPicks: [],
    knockoutPicks: []
  }
}

describe('beta fixture scoring', () => {
  it('normalizes typed display names for duplicate guards and local edit matching', () => {
    expect(normalizeDisplayName('  Ana   Maria  ')).toBe('ana maria')
    expect(normalizeDisplayName('ANA MARIA')).toBe(normalizeDisplayName('ana maria'))
  })

  it('scores wins, non-shootout goals, and round bonuses without subtracting goals against', () => {
    expect(scorePick('team_1', teams[0], 'ballot_only', teamStats).points).toBe(17)
    expect(scorePick('team_2', teams[3], 'ballot_only', teamStats).points).toBe(11)
    expect(scorePick('team_4', teams[1], 'ballot_only', teamStats).points).toBe(14)
  })

  it('does not award draw points and awards one point for each semifinal and final reached', () => {
    const stats = [teamStat('france', 1, 3, 2, 2, 1, true, true)]

    expect(scorePick('team_1', teams[0], 'ballot_only', stats)).toMatchObject({
      points: 8,
      result: '1W, 1D, 3 GF, 2 GA, 2 round bonus'
    })
  })

  it('keeps positive goal-for points even when a team concedes more goals', () => {
    const rows = buildLeaderboard([
      entry('one', 'Ana', {
        team_1: 'france',
        team_2: 'japan',
        team_3: 'new-zealand'
      })
    ], QUESTIONS, teams, { teamStats })

    expect(scorePick('team_3', teams[5], 'ballot_only', teamStats).points).toBe(1)
    expect(rows[0]?.totalScore).toBe(29)
    expect(rows[0]?.breakdown).toEqual(expect.arrayContaining([
      expect.objectContaining({ questionKey: 'team_1', points: 17 }),
      expect.objectContaining({ questionKey: 'team_2', points: 11 }),
      expect.objectContaining({ questionKey: 'team_3', points: 1 })
    ]))
  })

  it('does not add TeamDto finish-stage or guaranteed-stage bonuses', () => {
    const picked = team('ghana', 'Ghana', 33, 'BOTTOM', null, 'quarterfinal')

    expect(scorePick('team_3', teams[4], 'ballot_only', teamStats).points).toBe(7)
    expect(scorePick('team_3', picked, 'ballot_only', teamStats).points).toBe(7)
  })

  it('keeps a selected pick pending until finished fixture stats exist', () => {
    const score = scorePick('team_3', team('cabo-verde', 'Cabo Verde', 44, 'BOTTOM', null), 'ballot_only', teamStats)

    expect(score.points).toBe(0)
    expect(score.status).toBe('Pending match results')
  })

  it('allows any team tier in any slot', () => {
    expect(scorePick('team_1', team('france', 'France', 1, 'TOP', null), 'ballot_only', teamStats).status).not.toBe('Ineligible team')
    expect(scorePick('team_2', team('japan', 'Japan', 17, 'MIDDLE', null), 'ballot_only', teamStats).status).not.toBe('Ineligible team')
    expect(scorePick('team_3', team('ghana', 'Ghana', 33, 'BOTTOM', null), 'ballot_only', teamStats).status).not.toBe('Ineligible team')
    expect(scorePick('team_4', team('france', 'France', 1, 'TOP', null), 'ballot_only', teamStats).status).not.toBe('Ineligible team')
  })

  it('builds leaderboards from the four beta team slots', () => {
    const rows = buildLeaderboard([
      entry('one', 'Ana', {
        team_1: 'france',
        team_2: 'japan',
        team_3: 'ghana',
        team_4: 'spain'
      }),
      entry('two', 'Ben', {
        team_1: 'spain',
        team_2: 'japan',
        team_3: 'new-zealand',
        team_4: 'france'
      })
    ], QUESTIONS, teams, { teamStats })

    expect(rows.map((row) => ({ name: row.displayName, rank: row.rank, score: row.totalScore }))).toEqual([
      { name: 'Ana', rank: 1, score: 49 },
      { name: 'Ben', rank: 2, score: 43 }
    ])
    expect(rows[0]?.breakdown).toEqual([
      expect.objectContaining({ questionKey: 'team_1', points: 17, result: '3W, 0D, 8 GF, 2 GA' }),
      expect.objectContaining({ questionKey: 'team_2', points: 11, result: '2W, 0D, 5 GF, 4 GA' }),
      expect.objectContaining({ questionKey: 'team_3', points: 7 }),
      expect.objectContaining({ questionKey: 'team_4', points: 14 })
    ])
    expect(rows[1]?.breakdown).toEqual([
      expect.objectContaining({ questionKey: 'team_1', points: 14 }),
      expect.objectContaining({ questionKey: 'team_2', points: 11 }),
      expect.objectContaining({ questionKey: 'team_3', points: 1 }),
      expect.objectContaining({ questionKey: 'team_4', points: 17 })
    ])
  })

  it('derives result readiness from finished fixture stats for the four questions', () => {
    expect(deriveResults(teams, teamStats).complete).toEqual({
      team_1: true,
      team_2: true,
      team_3: true,
      team_4: true
    })
  })

  it('builds team stats only from completed fixtures and ignores shootout goals', () => {
    expect(buildTeamMatchStats([
      scoringFixture('FT', 'france', 'japan', 2, 1),
      scoringFixture('NS', 'france', 'spain', null, null),
      scoringFixture('PEN', 'ghana', 'spain', 1, 1, 4, 5),
      scoringFixture('FT', 'ghana', 'japan', 1, 1)
    ])).toEqual([
      teamStat('france', 1, 2, 1, 1),
      teamStat('ghana', 0, 2, 2, 2, 1),
      teamStat('japan', 0, 2, 3, 2, 1),
      teamStat('spain', 1, 1, 1, 1)
    ])
  })

  it('ignores the France vs England third-place game for ballot team scoring', () => {
    expect(buildTeamMatchStats([
      scoringFixture('FT', 'france', 'england', 4, 3, null, null, 'Third Place'),
      scoringFixture('FT', 'spain', 'japan', 2, 1, null, null, 'Final')
    ])).toEqual([
      teamStat('japan', 0, 1, 2, 1, 0, true, true),
      teamStat('spain', 1, 2, 1, 1, 0, true, true)
    ])
  })

  it('does not award points from live fixture scores before the game is final', () => {
    expect(buildTeamMatchStats([
      scoringFixture('LIVE', 'france', 'japan', 3, 2),
      scoringFixture('HT', 'ghana', 'spain', 1, 1)
    ])).toEqual([])
  })

  it('awards the winner points and keeps pre-shootout goals while excluding shootout goals', () => {
    const stats = buildTeamMatchStats([
      scoringFixture('PEN', 'ghana', 'spain', 2, 2, 4, 5),
      scoringFixture('PEN', 'japan', 'france', 5, 4, 3, 2),
      scoringFixture('PEN', 'england', 'argentina', null, null, 6, 7)
    ])

    expect(stats).toEqual([
      teamStat('argentina', 1, 0, 0, 1),
      teamStat('england', 0, 0, 0, 1),
      teamStat('france', 0, 4, 5, 1),
      teamStat('ghana', 0, 2, 2, 1),
      teamStat('japan', 1, 5, 4, 1),
      teamStat('spain', 1, 2, 2, 1)
    ])
  })

  it('awards exactly one three-point win for a penalty-shootout result', () => {
    const stats = buildTeamMatchStats([
      scoringFixture('PEN', 'england', 'argentina', null, null, 6, 7)
    ])
    const argentina = team('argentina', 'Argentina', 3, 'TOP', null)

    expect(scorePick('team_1', argentina, 'ballot_only', stats).points).toBe(3)
  })

  it('tracks draws and knockout reach flags from cached fixtures', () => {
    expect(buildTeamMatchStats([
      scoringFixture('FT', 'france', 'japan', 2, 2),
      scoringFixture('NS', 'france', 'spain', null, null, null, null, 'Semi-finals'),
      scoringFixture('NS', 'spain', 'japan', null, null, null, null, 'Final')
    ])).toEqual([
      teamStat('france', 0, 2, 2, 1, 1, true),
      teamStat('japan', 0, 2, 2, 1, 1, true, true),
      teamStat('spain', 0, 0, 0, 0, 0, true, true)
    ])
  })

  it("scores group-position pick'em one point per exact position and tolerates partial picks", () => {
    const groups: TournamentGroupDto[] = [{
      id: 'group-a',
      name: 'Group A',
      sortOrder: 1,
      teams: [
        { teamSlug: 'france', sortOrder: 1 },
        { teamSlug: 'spain', sortOrder: 2 },
        { teamSlug: 'england', sortOrder: 3 },
        { teamSlug: 'japan', sortOrder: 4 }
      ]
    }]

    expect(scoreGroupPositionPicks([
      { groupId: 'group-a', position: 1, teamSlug: 'france' },
      { groupId: 'group-a', position: 2, teamSlug: 'england' }
    ], groups, [
      { groupName: 'Group A', rank: 1, teamSlug: 'france' },
      { groupName: 'Group A', rank: 2, teamSlug: 'spain' }
    ])).toMatchObject({
      points: 1,
      correct: 1,
      completed: 2
    })
  })

  it("scores knockout pick'em one point per correct winner", () => {
    const windows: KnockoutWindowDto[] = [
      window('round_of_32', 3, [
        fixture(1, 'france'),
        fixture(2, 'spain')
      ]),
      window('round_of_16', 3, [fixture(3, 'england')]),
      window('quarterfinal', 4, [fixture(4, 'japan')]),
      window('semifinalist', 6, [fixture(5, 'ghana')]),
      window('champion', 8, [fixture(6, 'france')])
    ]

    expect(scoreKnockoutPicks([
      { fixtureId: 1, winnerTeamSlug: 'france' },
      { fixtureId: 2, winnerTeamSlug: 'spain' },
      { fixtureId: 3, winnerTeamSlug: 'england' },
      { fixtureId: 4, winnerTeamSlug: 'japan' },
      { fixtureId: 5, winnerTeamSlug: 'ghana' },
      { fixtureId: 6, winnerTeamSlug: 'france' }
    ], windows)).toMatchObject({
      points: 6,
      maxPoints: 6,
      correct: 6
    })
  })

  it('builds combined leaderboards from ballot, group, and knockout scores', () => {
    const group: TournamentGroupDto = {
      id: 'group-a',
      name: 'Group A',
      sortOrder: 1,
      teams: [
        { teamSlug: 'france', sortOrder: 1 },
        { teamSlug: 'spain', sortOrder: 2 }
      ]
    }
    const rows = buildLeaderboard([
      {
        ...entry('one', 'Ana', {
          team_1: 'france',
          team_2: 'japan',
          team_3: 'ghana',
          team_4: 'spain'
        }),
        groupPositionPicks: [{ groupId: 'group-a', position: 1, teamSlug: 'france' }],
        knockoutPicks: [{ fixtureId: 1, winnerTeamSlug: 'france' }]
      },
      entry('two', 'Ben', {
        team_1: 'spain',
        team_2: 'japan',
        team_3: 'new-zealand',
        team_4: 'france'
      })
    ], QUESTIONS, teams, {
      competitionMode: 'ballot_pickem',
      groups: [group],
      groupStandings,
      teamStats,
      knockoutWindows: [window('champion', 8, [fixture(1, 'france')])]
    })

    expect(rows[0]?.displayName).toBe('Ana')
    expect(rows[0]?.categoryScores).toEqual({ ballot: 49, groups: 1, knockouts: 1 })
  })
})

function fixture(fixtureId: number, winnerTeamSlug: string): KnockoutWindowDto['fixtures'][number] {
  return {
    fixtureId,
    leagueRound: 'Final',
    kickoffAt: '2026-07-01T00:00:00.000Z',
    homeTeamSlug: winnerTeamSlug,
    awayTeamSlug: 'spain',
    homeTeamName: winnerTeamSlug,
    awayTeamName: 'Spain',
    homeGoals: 1,
    awayGoals: 0,
    penaltyHome: null,
    penaltyAway: null,
    statusShort: 'FT',
    winnerTeamSlug
  }
}

function scoringFixture(
  statusShort: string,
  homeTeamSlug: string,
  awayTeamSlug: string,
  homeGoals: number | null,
  awayGoals: number | null,
  penaltyHome: number | null = null,
  penaltyAway: number | null = null,
  leagueRound: string | null = 'Group Stage - 1'
) {
  return {
    leagueRound,
    statusShort,
    homeTeamSlug,
    awayTeamSlug,
    homeGoals,
    awayGoals,
    penaltyHome,
    penaltyAway
  }
}

function window(key: KnockoutWindowDto['key'], cap: number, fixtures: KnockoutWindowDto['fixtures']): KnockoutWindowDto {
  return {
    key,
    label: key,
    cap,
    lockAt: '2026-07-01T00:00:00.000Z',
    isLocked: true,
    isRevealed: true,
    fixtures
  }
}
