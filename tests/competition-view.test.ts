import { describe, expect, it } from 'vitest'
import {
  buildCompetitionBattles,
  buildCompetitionCollisions,
  buildCompetitionMoments,
  buildCompetitionPredictionRows,
  buildCompetitionRankingRows,
  buildCompetitionSupport,
  buildCompetitionView,
  getTeamFlagEmoji
} from '../shared/competition-view'
import { avatarKeyForDisplayName } from '../shared/player-avatars'
import type {
  EntryDto,
  KnockoutFixtureDto,
  KnockoutPickemStateDto,
  KnockoutPickemWindowDto,
  LeaderboardRow,
  LiveFixtureDto,
  QuestionDto,
  TeamDto
} from '../shared/types'

const questions: QuestionDto[] = [
  { key: 'team_1', label: 'Team 1', description: '', points: 0 },
  { key: 'team_2', label: 'Team 2', description: '', points: 0 },
  { key: 'team_3', label: 'Team 3', description: '', points: 0 },
  { key: 'team_4', label: 'Team 4', description: '', points: 0 }
]

const teams: TeamDto[] = [
  team('france', 'France', 'FRA'),
  team('ghana', 'Ghana', 'GHA'),
  team('england', 'England', 'ENG'),
  team('netherlands', 'Netherlands', 'NED'),
  team('japan', 'Japan', 'JPN'),
  team('spain', 'Spain', 'ESP'),
  team('brazil', 'Brazil', 'BRA'),
  team('portugal', 'Portugal', 'POR')
]

const entries: EntryDto[] = [
  entry('entry-one', 'Ana', {
    team_1: 'france',
    team_2: 'ghana',
    team_3: 'england',
    team_4: 'portugal'
  }),
  entry('entry-two', 'Maxi', {
    team_1: 'spain',
    team_2: 'japan',
    team_3: 'netherlands',
    team_4: 'brazil'
  }),
  entry('entry-three', 'Sofi', {
    team_1: 'france',
    team_2: 'ghana',
    team_3: 'netherlands',
    team_4: 'portugal'
  })
]

const leaderboard: LeaderboardRow[] = [
  leaderboardRow('entry-one', 'Ana', 1, 29, [
    breakdown('team_1', 'Team 1', 'France', 12, 'Champion', '12/12 pts'),
    breakdown('team_2', 'Team 2', 'Ghana', 5, 'Quarterfinal', '5/12 pts'),
    breakdown('team_3', 'Team 3', 'England', 12, 'Group stage', '12/12 pts'),
    breakdown('team_4', 'Team 4', 'Portugal', 0, null, 'Pending result')
  ]),
  leaderboardRow('entry-two', 'Maxi', 2, 26, [
    breakdown('team_1', 'Team 1', 'Spain', 8, 'Runner-up', '8/12 pts'),
    breakdown('team_2', 'Team 2', 'Japan', 6, 'Losing semifinalist', '6/12 pts'),
    breakdown('team_3', 'Team 3', 'Netherlands', 12, 'Group stage', '12/12 pts'),
    breakdown('team_4', 'Team 4', 'Brazil', 0, null, 'Pending result')
  ]),
  leaderboardRow('entry-three', 'Sofi', 3, 26, [
    breakdown('team_1', 'Team 1', 'France', 12, 'Champion', '12/12 pts'),
    breakdown('team_2', 'Team 2', 'Ghana', 5, 'Quarterfinal', '5/12 pts'),
    breakdown('team_3', 'Team 3', 'Netherlands', 12, 'Group stage', '12/12 pts'),
    breakdown('team_4', 'Team 4', 'Portugal', 0, null, 'Pending result')
  ])
]

function team(slug: string, name: string, fifaCode: string, finishStage: TeamDto['finishStage'] = null): TeamDto {
  return {
    slug,
    name,
    fifaCode,
    fifaRank: 1,
    qualifiedRankOrder: 1,
    tier: 'TOP',
    finishStage,
    guaranteedStage: finishStage
  }
}

function entry(
  id: string,
  displayName: string,
  answers: Record<string, string>,
  knockoutPicks: EntryDto['knockoutPicks'] = []
): EntryDto {
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
    knockoutPicks
  }
}

function leaderboardRow(
  entryId: string,
  displayName: string,
  rank: number,
  totalScore: number,
  rowBreakdown: LeaderboardRow['breakdown']
): LeaderboardRow {
  return {
    entryId,
    displayName,
    avatarKey: avatarKeyForDisplayName(displayName),
    rank,
    totalScore,
    categoryScores: {
      ballot: totalScore,
      groups: 0,
      knockouts: 0
    },
    breakdown: rowBreakdown
  }
}

function breakdown(
  questionKey: LeaderboardRow['breakdown'][number]['questionKey'],
  label: string,
  prediction: string,
  points: number,
  result: string | null,
  status: string
): LeaderboardRow['breakdown'][number] {
  return {
    questionKey,
    label,
    points,
    maxPoints: 12,
    prediction,
    result,
    status
  }
}

describe('competition UI view models', () => {
  it('maps ranking rows with compact labels, score labels, team evidence, and flags', () => {
    const rows = buildCompetitionRankingRows([leaderboard[0]], entries, teams)

    expect(rows).toEqual([{
      entryId: 'entry-one',
      displayName: 'Ana',
      avatarKey: avatarKeyForDisplayName('Ana'),
      rank: 1,
      totalScore: 29,
      breakdown: [
        expect.objectContaining({
          questionKey: 'team_1',
          shortLabel: 'T1',
          scoreLabel: '+12',
          team: expect.objectContaining({ slug: 'france', name: 'France', flagCode: 'fr', flagUrl: 'https://flagcdn.com/fr.svg' }),
          isPending: false
        }),
        expect.objectContaining({
          questionKey: 'team_2',
          shortLabel: 'T2',
          scoreLabel: '+5',
          team: expect.objectContaining({ slug: 'ghana', name: 'Ghana', flagCode: 'gh', flagUrl: 'https://flagcdn.com/gh.svg' })
        }),
        expect.objectContaining({
          questionKey: 'team_3',
          shortLabel: 'T3',
          scoreLabel: '+12',
          team: expect.objectContaining({ slug: 'england', name: 'England', flagCode: 'gb-eng', flagUrl: 'https://flagcdn.com/gb-eng.svg' })
        }),
        expect.objectContaining({
          questionKey: 'team_4',
          shortLabel: 'T4',
          scoreLabel: '+0',
          team: expect.objectContaining({ slug: 'portugal', name: 'Portugal', flagCode: 'pt', flagUrl: 'https://flagcdn.com/pt.svg' })
        })
      ]
    }])
  })

  it('maps prediction rows in fixed question order with flags', () => {
    expect(buildCompetitionPredictionRows([entries[0]], questions, teams)).toEqual([{
      entryId: 'entry-one',
      displayName: 'Ana',
      avatarKey: avatarKeyForDisplayName('Ana'),
      picks: [
        { questionKey: 'team_1', label: 'T1', team: expect.objectContaining({ name: 'France', flagCode: 'fr' }) },
        { questionKey: 'team_2', label: 'T2', team: expect.objectContaining({ name: 'Ghana', flagCode: 'gh' }) },
        { questionKey: 'team_3', label: 'T3', team: expect.objectContaining({ name: 'England', flagCode: 'gb-eng' }) },
        { questionKey: 'team_4', label: 'T4', team: expect.objectContaining({ name: 'Portugal', flagCode: 'pt' }) }
      ]
    }])
  })

  it('derives score-fact moments with evidence fields', () => {
    const moments = buildCompetitionMoments(buildCompetitionRankingRows(leaderboard, entries, teams))

    expect(moments).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'leader',
        entryIds: ['entry-one'],
        source: 'leaderboard',
        reason: 'First row after leaderboard sorting by total score'
      }),
      expect.objectContaining({
        type: 'tight_race',
        entryIds: ['entry-one', 'entry-two'],
        source: 'leaderboard'
      }),
      expect.objectContaining({
        type: 'tie',
        entryIds: ['entry-two', 'entry-three'],
        source: 'leaderboard'
      }),
      expect.objectContaining({
        type: 'best_team_2',
        entryIds: ['entry-two'],
        teamSlugs: ['japan'],
        source: 'breakdown'
      }),
      expect.objectContaining({
        type: 'best_team_3',
        entryIds: ['entry-one', 'entry-two', 'entry-three'],
        teamSlugs: ['england', 'netherlands'],
        source: 'breakdown'
      })
    ]))
  })

  it('adds a pending swing moment when selected teams have no finish-stage result', () => {
    const rows = buildCompetitionRankingRows([
      leaderboardRow('entry-one', 'Ana', 1, 12, [
        breakdown('team_1', 'Team 1', 'France', 12, 'Champion', '12/12 pts'),
        breakdown('team_2', 'Team 2', 'Ghana', 0, null, 'Pending result'),
        breakdown('team_3', 'Team 3', 'England', 0, null, 'Pending result'),
        breakdown('team_4', 'Team 4', 'Portugal', 0, null, 'Pending result')
      ])
    ], entries, teams)

    expect(buildCompetitionMoments(rows)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'pending_swing',
        entryIds: ['entry-one'],
        teamSlugs: ['ghana', 'england', 'portugal'],
        source: 'results'
      })
    ]))
  })

  it('derives ballot support from four team answers', () => {
    const support = buildCompetitionSupport(entries)

    expect(support.ballotTeams.france).toEqual([
      expect.objectContaining({
        entryId: 'entry-one',
        displayName: 'Ana',
        questionKey: 'team_1'
      }),
      expect.objectContaining({
        entryId: 'entry-three',
        displayName: 'Sofi',
        questionKey: 'team_1'
      })
    ])
    expect(support.ballotTeams.ghana).toEqual([
      expect.objectContaining({
        entryId: 'entry-one',
        displayName: 'Ana',
        questionKey: 'team_2'
      }),
      expect.objectContaining({
        entryId: 'entry-three',
        displayName: 'Sofi',
        questionKey: 'team_2'
      })
    ])
    expect(support.ballotTeams.england).toEqual([
      expect.objectContaining({
        entryId: 'entry-one',
        displayName: 'Ana',
        questionKey: 'team_3'
      })
    ])
    expect(support.ballotTeams.netherlands).toEqual([
      expect.objectContaining({
        entryId: 'entry-two',
        displayName: 'Maxi',
        questionKey: 'team_3'
      }),
      expect.objectContaining({
        entryId: 'entry-three',
        displayName: 'Sofi',
        questionKey: 'team_3'
      })
    ])
    expect(support.ballotTeams.portugal).toEqual([
      expect.objectContaining({
        entryId: 'entry-one',
        displayName: 'Ana',
        questionKey: 'team_4'
      }),
      expect.objectContaining({
        entryId: 'entry-three',
        displayName: 'Sofi',
        questionKey: 'team_4'
      })
    ])
  })

  it("derives Pick'em support only from revealed fixture picks", () => {
    const pickemEntries = [
      entry('entry-one', 'Ana', { team_1: 'france' }, [{ fixtureId: 12, winnerTeamSlug: 'france' }]),
      entry('entry-two', 'Maxi', { team_1: 'spain' }, [{ fixtureId: 12, winnerTeamSlug: 'spain' }])
    ]

    const support = buildCompetitionSupport(pickemEntries, pickemState([
      pickemWindow([fixture(12, 'Semi-finals', 'france', 'spain')], { isRevealed: true })
    ]))

    expect(support.pickemFixtures['12']?.france).toEqual([
      expect.objectContaining({
        entryId: 'entry-one',
        displayName: 'Ana',
        fixtureId: 12,
        teamSlug: 'france'
      })
    ])
    expect(support.pickemFixtures['12']?.spain).toEqual([
      expect.objectContaining({
        entryId: 'entry-two',
        displayName: 'Maxi',
        fixtureId: 12,
        teamSlug: 'spain'
      })
    ])
  })

  it("does not derive Pick'em support from unrevealed fixture picks", () => {
    const support = buildCompetitionSupport([
      entry('entry-one', 'Ana', { team_1: 'france' }, [{ fixtureId: 12, winnerTeamSlug: 'france' }])
    ], pickemState([
      pickemWindow([fixture(12, 'Semi-finals', 'france', 'spain')], { isRevealed: false })
    ]))

    expect(support.pickemFixtures).toEqual({})
  })

  it('adds support moments from the same support model', () => {
    const support = buildCompetitionSupport([
      entry('entry-one', 'Ana', { team_1: 'france' }, [{ fixtureId: 12, winnerTeamSlug: 'france' }]),
      entry('entry-two', 'Maxi', { team_1: 'spain' }, [{ fixtureId: 12, winnerTeamSlug: 'spain' }])
    ], pickemState([
      pickemWindow([fixture(12, 'Semi-finals', 'france', 'spain')], { isRevealed: true })
    ]))
    const moments = buildCompetitionMoments(buildCompetitionRankingRows(leaderboard, entries, teams), support, new Map(teams.map((team) => [team.slug, team])))

    expect(moments).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'support_wave',
        source: 'support'
      }),
      expect.objectContaining({
        type: 'pickem_split',
        source: 'support',
        teamSlugs: ['france', 'spain']
      })
    ]))
  })

  it('builds selected-team fixture battles from players backing teams that face each other', () => {
    const battleEntries = [
      entry('entry-one', 'Ana', { team_2: 'france' }),
      entry('entry-two', 'Maxi', { team_4: 'spain' })
    ]
    const rows = buildCompetitionRankingRows([
      leaderboardRow('entry-one', 'Ana', 1, 30, [breakdown('team_1', 'Team 1', 'France', 12, 'Champion', '12/12 pts')]),
      leaderboardRow('entry-two', 'Maxi', 2, 29, [breakdown('team_1', 'Team 1', 'Spain', 8, 'Runner-up', '8/12 pts')])
    ], battleEntries, teams)

    expect(buildCompetitionBattles(rows, battleEntries, teams, pickemState([
      pickemWindow([fixture(11, 'Quarter-finals', 'france', 'spain')], { isRevealed: false })
    ]))).toEqual([
      expect.objectContaining({
        type: 'selected_team_fixture',
        entryIds: ['entry-one', 'entry-two'],
        teamSlugs: ['france', 'spain'],
        fixtureId: 11,
        scoreGap: 1,
        source: 'fixtures'
      })
    ])
  })

  it('builds selected-team versus pickem battles from revealed opponent picks', () => {
    const battleEntries = [
      entry('entry-one', 'Ana', { team_3: 'france' }),
      entry('entry-two', 'Maxi', { team_1: 'ghana' }, [{ fixtureId: 12, winnerTeamSlug: 'spain' }])
    ]
    const rows = buildCompetitionRankingRows([
      leaderboardRow('entry-one', 'Ana', 1, 30, [breakdown('team_1', 'Team 1', 'France', 12, 'Champion', '12/12 pts')]),
      leaderboardRow('entry-two', 'Maxi', 2, 28, [breakdown('team_1', 'Team 1', 'Ghana', 0, null, 'Pending result')])
    ], battleEntries, teams)

    expect(buildCompetitionBattles(rows, battleEntries, teams, pickemState([
      pickemWindow([fixture(12, 'Semi-finals', 'france', 'spain')], { isRevealed: true })
    ]))).toEqual([
      expect.objectContaining({
        type: 'selected_team_vs_pickem',
        entryIds: ['entry-one', 'entry-two'],
        teamSlugs: ['france', 'spain'],
        fixtureId: 12,
        source: 'pickem'
      })
    ])
  })

  it('builds collision schedule rows from all four selected team slots', () => {
    const collisionEntries = [
      entry('cat', 'Kat', { team_2: 'colombia' }),
      entry('will', 'Will', { team_4: 'uzbekistan' })
    ]
    const collisionTeams = [
      team('colombia', 'Colombia', 'COL'),
      team('uzbekistan', 'Uzbekistan', 'UZB')
    ]
    const rows = buildCompetitionRankingRows([
      leaderboardRow('cat', 'Kat', 1, 12, [breakdown('team_2', 'Team 2', 'Colombia', 7, '2W, 5 GF, 0 GA', '7 pts')]),
      leaderboardRow('will', 'Will', 2, 10, [breakdown('team_4', 'Team 4', 'Uzbekistan', 5, '1W, 4 GF, 0 GA', '5 pts')])
    ], collisionEntries, collisionTeams)
    const support = buildCompetitionSupport(collisionEntries)

    expect(buildCompetitionCollisions(rows, support, collisionTeams, [
      liveFixture(701, 'Group Stage - 1', 'colombia', 'uzbekistan', '2026-06-17T18:00:00.000Z')
    ], new Date('2026-06-17T12:00:00.000Z'))).toEqual([
      expect.objectContaining({
        type: 'team_fixture_collision',
        fixtureId: 701,
        entryIds: ['cat', 'will'],
        teamSlugs: ['colombia', 'uzbekistan'],
        totalSupporters: 2,
        scoreGap: 2,
        home: expect.objectContaining({
          supporters: [expect.objectContaining({ displayName: 'Kat', questionKey: 'team_2' })]
        }),
        away: expect.objectContaining({
          supporters: [expect.objectContaining({ displayName: 'Will', questionKey: 'team_4' })]
        })
      })
    ])
  })

  it('does not build a collision when only one fixture side has support', () => {
    const rows = buildCompetitionRankingRows([leaderboard[0]], [entries[0]], teams)
    const support = buildCompetitionSupport([entries[0]])

    expect(buildCompetitionCollisions(rows, support, teams, [
      liveFixture(702, 'Group Stage - 1', 'france', 'spain', '2026-06-17T18:00:00.000Z')
    ], new Date('2026-06-17T12:00:00.000Z'))).toEqual([])
  })

  it('prioritizes live collisions, then kickoff time, support count, and score gap', () => {
    const collisionEntries = [
      entry('one', 'Ana', { team_1: 'france', team_2: 'ghana' }),
      entry('two', 'Maxi', { team_1: 'spain' }),
      entry('three', 'Sofi', { team_1: 'japan' }),
      entry('four', 'Ben', { team_1: 'england' })
    ]
    const rows = buildCompetitionRankingRows([
      leaderboardRow('one', 'Ana', 1, 30, [breakdown('team_1', 'Team 1', 'France', 12, 'Champion', '12/12 pts')]),
      leaderboardRow('two', 'Maxi', 2, 29, [breakdown('team_1', 'Team 1', 'Spain', 8, 'Runner-up', '8/12 pts')]),
      leaderboardRow('three', 'Sofi', 3, 20, [breakdown('team_1', 'Team 1', 'Japan', 4, 'Round of 16', '4/12 pts')]),
      leaderboardRow('four', 'Ben', 4, 19, [breakdown('team_1', 'Team 1', 'England', 4, 'Round of 16', '4/12 pts')])
    ], collisionEntries, teams)
    const support = buildCompetitionSupport(collisionEntries)

    expect(buildCompetitionCollisions(rows, support, teams, [
      liveFixture(801, 'Group Stage - 1', 'france', 'spain', '2026-06-18T18:00:00.000Z'),
      liveFixture(802, 'Group Stage - 1', 'japan', 'england', '2026-06-17T18:00:00.000Z'),
      liveFixture(803, 'Group Stage - 1', 'ghana', 'spain', '2026-06-19T18:00:00.000Z', true)
    ], new Date('2026-06-17T12:00:00.000Z')).map((collision) => collision.fixtureId)).toEqual([
      803,
      802,
      801
    ])
  })

  it('builds opposite pickem battles from revealed opposing knockout predictions', () => {
    const battleEntries = [
      entry('entry-one', 'Ana', { team_1: 'ghana' }, [{ fixtureId: 13, winnerTeamSlug: 'france' }]),
      entry('entry-two', 'Maxi', { team_1: 'japan' }, [{ fixtureId: 13, winnerTeamSlug: 'spain' }])
    ]
    const rows = buildCompetitionRankingRows([
      leaderboardRow('entry-one', 'Ana', 1, 30, [breakdown('team_1', 'Team 1', 'Ghana', 0, null, 'Pending result')]),
      leaderboardRow('entry-two', 'Maxi', 2, 30, [breakdown('team_1', 'Team 1', 'Japan', 0, null, 'Pending result')])
    ], battleEntries, teams)

    expect(buildCompetitionBattles(rows, battleEntries, teams, pickemState([
      pickemWindow([fixture(13, 'Final', 'france', 'spain')], { isRevealed: true })
    ]))).toEqual([
      expect.objectContaining({
        type: 'opposite_pickem',
        entryIds: ['entry-one', 'entry-two'],
        teamSlugs: ['france', 'spain'],
        scoreGap: 0,
        source: 'pickem'
      })
    ])
  })

  it('prioritizes closer ranking gaps before higher-ranked conflicts', () => {
    const battleEntries = [
      entry('entry-one', 'Ana', { team_1: 'france' }),
      entry('entry-two', 'Maxi', { team_1: 'spain' }),
      entry('entry-three', 'Sofi', { team_1: 'ghana' }),
      entry('entry-four', 'Ben', { team_1: 'japan' })
    ]
    const rows = buildCompetitionRankingRows([
      leaderboardRow('entry-one', 'Ana', 1, 40, [breakdown('team_1', 'Team 1', 'France', 12, 'Champion', '12/12 pts')]),
      leaderboardRow('entry-two', 'Maxi', 2, 30, [breakdown('team_1', 'Team 1', 'Spain', 8, 'Runner-up', '8/12 pts')]),
      leaderboardRow('entry-three', 'Sofi', 3, 26, [breakdown('team_1', 'Team 1', 'Ghana', 5, 'Quarterfinal', '5/12 pts')]),
      leaderboardRow('entry-four', 'Ben', 4, 25, [breakdown('team_1', 'Team 1', 'Japan', 6, 'Losing semifinalist', '6/12 pts')])
    ], battleEntries, teams)

    expect(buildCompetitionBattles(rows, battleEntries, teams, pickemState([
      pickemWindow([
        fixture(14, 'Quarter-finals', 'france', 'spain'),
        fixture(15, 'Quarter-finals', 'ghana', 'japan')
      ], { isRevealed: false })
    ])).map((battle) => battle.entryIds)).toEqual([
      ['entry-three', 'entry-four'],
      ['entry-one', 'entry-two']
    ])
  })

  it('does not build pickem battles from unrevealed knockout picks', () => {
    const battleEntries = [
      entry('entry-one', 'Ana', { team_1: 'ghana' }, [{ fixtureId: 16, winnerTeamSlug: 'france' }]),
      entry('entry-two', 'Maxi', { team_1: 'japan' }, [{ fixtureId: 16, winnerTeamSlug: 'spain' }])
    ]
    const rows = buildCompetitionRankingRows([
      leaderboardRow('entry-one', 'Ana', 1, 30, [breakdown('team_1', 'Team 1', 'Ghana', 0, null, 'Pending result')]),
      leaderboardRow('entry-two', 'Maxi', 2, 30, [breakdown('team_1', 'Team 1', 'Japan', 0, null, 'Pending result')])
    ], battleEntries, teams)

    expect(buildCompetitionBattles(rows, battleEntries, teams, pickemState([
      pickemWindow([fixture(16, 'Final', 'france', 'spain')], { isRevealed: false })
    ]))).toEqual([])
  })

  it('shows private ranking placeholders before public reveal and exposes scored data after reveal', () => {
    const hidden = buildCompetitionView({
      isPublic: false,
      predictionDeadline: '2026-06-11T18:00:00.000Z',
      entries,
      leaderboard,
      questions,
      teams
    })

    expect(hidden).toEqual({
      status: {
        isPublic: false,
        predictionDeadline: '2026-06-11T18:00:00.000Z',
        isTournamentComplete: false
      },
      support: {
        ballotTeams: {},
        pickemFixtures: {}
      },
      battles: [],
      collisions: [],
      moments: [],
      rankings: [
        {
          entryId: 'entry-one',
          rank: 1,
          displayName: 'Ana',
          avatarKey: avatarKeyForDisplayName('Ana'),
          totalScore: 0,
          breakdown: []
        },
        {
          entryId: 'entry-two',
          rank: 2,
          displayName: 'Maxi',
          avatarKey: avatarKeyForDisplayName('Maxi'),
          totalScore: 0,
          breakdown: []
        },
        {
          entryId: 'entry-three',
          rank: 3,
          displayName: 'Sofi',
          avatarKey: avatarKeyForDisplayName('Sofi'),
          totalScore: 0,
          breakdown: []
        }
      ],
      predictions: [],
      winnerPodium: []
    })

    const visible = buildCompetitionView({
      isPublic: true,
      predictionDeadline: '2026-06-11T18:00:00.000Z',
      entries,
      leaderboard,
      questions,
      teams
    })

    expect(visible.rankings).toHaveLength(3)
    expect(visible.predictions).toHaveLength(3)
    expect(visible.support.ballotTeams.france).toHaveLength(2)
    expect(visible.battles).toEqual([])
    expect(visible.moments.length).toBeGreaterThan(0)
  })

  it('builds a final winner podium from the top three ranking rows when a champion exists', () => {
    const complete = buildCompetitionView({
      isPublic: true,
      predictionDeadline: '2026-06-11T18:00:00.000Z',
      entries,
      leaderboard,
      questions,
      teams: [
        team('france', 'France', 'FRA', 'champion'),
        ...teams.filter((item) => item.slug !== 'france')
      ]
    })

    expect(complete.status.isTournamentComplete).toBe(true)
    expect(complete.winnerPodium).toEqual([
      { entryId: 'entry-one', rank: 1, displayName: 'Ana', totalScore: 29 },
      { entryId: 'entry-two', rank: 2, displayName: 'Maxi', totalScore: 26 },
      { entryId: 'entry-three', rank: 3, displayName: 'Sofi', totalScore: 26 }
    ])
  })

  it('does not build a final podium before the public completed state', () => {
    const privateComplete = buildCompetitionView({
      isPublic: false,
      predictionDeadline: '2026-06-11T18:00:00.000Z',
      entries,
      leaderboard,
      questions,
      teams: [
        team('france', 'France', 'FRA', 'champion'),
        ...teams.filter((item) => item.slug !== 'france')
      ]
    })
    const publicIncomplete = buildCompetitionView({
      isPublic: true,
      predictionDeadline: '2026-06-11T18:00:00.000Z',
      entries,
      leaderboard,
      questions,
      teams
    })

    expect(privateComplete.status.isTournamentComplete).toBe(false)
    expect(privateComplete.winnerPodium).toEqual([])
    expect(publicIncomplete.status.isTournamentComplete).toBe(false)
    expect(publicIncomplete.winnerPodium).toEqual([])
  })

  it('maps known FIFA codes to emoji flags and falls back safely', () => {
    expect(getTeamFlagEmoji('NED')).toBe(flagEmoji('nl'))
    expect(getTeamFlagEmoji('GER')).toBe(flagEmoji('de'))
    expect(getTeamFlagEmoji('ENG')).toBe('\uD83C\uDFF4')
    expect(getTeamFlagEmoji('???')).toBe('\u26BD')
  })
})

function flagEmoji(countryCode: string) {
  return [...countryCode.toUpperCase()]
    .map((char) => String.fromCodePoint(char.charCodeAt(0) + 127397))
    .join('')
}

function pickemState(windows: KnockoutPickemWindowDto[]): KnockoutPickemStateDto {
  return {
    enabled: true,
    enabledAt: '2026-07-01T00:00:00.000Z',
    status: 'locked',
    reason: "Knockout Pick'em is locked.",
    activeWindow: windows.at(-1) ?? null,
    windows
  }
}

function pickemWindow(
  fixtures: KnockoutFixtureDto[],
  state: Pick<KnockoutPickemWindowDto, 'isRevealed'>
): KnockoutPickemWindowDto {
  return {
    roundKey: 'quarterfinal',
    label: 'Quarterfinals',
    lockAt: '2026-07-02T12:00:00.000Z',
    isOpen: false,
    isLocked: true,
    isRevealed: state.isRevealed,
    fixtures
  }
}

function fixture(
  fixtureId: number,
  leagueRound: string,
  homeTeamSlug: string,
  awayTeamSlug: string
): KnockoutFixtureDto {
  return {
    fixtureId,
    leagueRound,
    kickoffAt: '2026-07-02T12:00:00.000Z',
    homeTeamSlug,
    awayTeamSlug,
    homeTeamName: titleCase(homeTeamSlug),
    awayTeamName: titleCase(awayTeamSlug),
    homeGoals: null,
    awayGoals: null,
    penaltyHome: null,
    penaltyAway: null,
    statusShort: 'NS',
    winnerTeamSlug: null
  }
}

function liveFixture(
  fixtureId: number,
  leagueRound: string,
  homeTeamSlug: string,
  awayTeamSlug: string,
  kickoffAt: string,
  isLive = false
): LiveFixtureDto {
  return {
    fixtureId,
    leagueRound,
    statusShort: isLive ? '1H' : 'NS',
    statusLong: isLive ? 'First Half' : 'Not Started',
    elapsed: isLive ? 23 : null,
    kickoffAt,
    homeTeamSlug,
    awayTeamSlug,
    homeTeamName: titleCase(homeTeamSlug),
    awayTeamName: titleCase(awayTeamSlug),
    homeGoals: null,
    awayGoals: null,
    penaltyHome: null,
    penaltyAway: null,
    isLive,
    sourceUpdatedAt: null,
    updatedAt: '2026-06-17T11:00:00.000Z'
  }
}

function titleCase(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`
}
