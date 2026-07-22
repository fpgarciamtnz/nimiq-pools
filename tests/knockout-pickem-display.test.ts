import { describe, expect, it } from 'vitest'
import {
  buildKnockoutMatchViews,
  buildKnockoutProjectionBracket,
  getKnockoutPickStatus,
  splitKnockoutBracketSides
} from '../shared/knockout-pickem-display'
import type { EntryDto, KnockoutFixtureDto, KnockoutPickemWindowDto } from '../shared/types'

describe('knockout pickem display view model', () => {
  it('maps pick status from saved prediction and fixture result', () => {
    expect(getKnockoutPickStatus(fixture(1, 'france'), 'france')).toBe('correct')
    expect(getKnockoutPickStatus(fixture(1, 'france'), 'japan')).toBe('wrong')
    expect(getKnockoutPickStatus(fixture(1, null), 'france')).toBe('pending')
    expect(getKnockoutPickStatus(fixture(1, 'france'), '')).toBe('missing')
  })

  it('builds projection columns from the start round through the winner slot', () => {
    const projection = buildKnockoutProjectionBracket({
      startRoundKey: 'quarterfinal',
      entry: entry([
        { fixtureId: 1, winnerTeamSlug: 'france' }
      ]),
      windows: [window('quarterfinal', [
        fixture(1, 'france'),
        fixture(2, 'spain'),
        fixture(3, 'england'),
        fixture(4, 'portugal')
      ])]
    })

    expect(projection.columns.map((column) => column.label)).toEqual(['Quarterfinals', 'Semifinals', 'Final', 'Winner'])
    expect(projection.columns.map((column) => column.slots.length)).toEqual([8, 4, 2, 1])
    expect(projection.columns[1]?.slots[0]).toMatchObject({
      teamSlug: 'france',
      sourceFixtureId: 1,
      status: 'correct',
      isPrediction: true
    })
    expect(projection.columns[2]?.slots.every((slot) => slot.isWaiting)).toBe(true)
    expect(projection.columns[3]?.slots.every((slot) => slot.isWaiting)).toBe(true)
  })

  it('projects later-round picks independently from earlier projected entrants', () => {
    const projection = buildKnockoutProjectionBracket({
      startRoundKey: 'quarterfinal',
      entry: entry([
        { fixtureId: 1, winnerTeamSlug: 'france' },
        { fixtureId: 5, winnerTeamSlug: 'ghana' }
      ]),
      windows: [
        window('quarterfinal', [
          fixture(1, 'france'),
          fixture(2, 'spain'),
          fixture(3, 'england'),
          fixture(4, 'portugal')
        ]),
        window('semifinal', [
          fixture(5, 'spain'),
          fixture(6, 'portugal')
        ])
      ]
    })

    expect(projection.columns[2]?.slots[0]).toMatchObject({
      teamSlug: 'ghana',
      sourceFixtureId: 5,
      status: 'wrong'
    })
  })

  it('summarizes saved projection states without counting future waiting slots as missed', () => {
    const projection = buildKnockoutProjectionBracket({
      startRoundKey: 'quarterfinal',
      entry: entry([
      { fixtureId: 1, winnerTeamSlug: 'france' },
      { fixtureId: 2, winnerTeamSlug: 'ghana' },
      { fixtureId: 3, winnerTeamSlug: 'spain' }
      ]),
      windows: [window('quarterfinal', [
      fixture(1, 'france'),
      fixture(2, 'spain'),
      fixture(3, null),
      fixture(4, 'japan')
      ])]
    })

    expect(projection.columns[1]?.slots.map((slot) => slot.status)).toEqual(['correct', 'wrong', 'pending', 'missing'])
    expect(projection.summary).toMatchObject({
      correct: 1,
      wrong: 1,
      pending: 1,
      missing: 1,
      summaryLabel: '1/2 correct, 1 missed'
    })
  })

  it('sorts fixtures deterministically and splits the bracket left and right', () => {
    const matches = buildKnockoutMatchViews([
      fixture(4, null, '2026-07-02T16:00:00.000Z'),
      fixture(1, null, '2026-07-02T12:00:00.000Z'),
      fixture(3, null, '2026-07-02T14:00:00.000Z'),
      fixture(2, null, '2026-07-02T14:00:00.000Z')
    ], [])
    const lanes = splitKnockoutBracketSides(matches)

    expect(matches.map((match) => match.fixture.fixtureId)).toEqual([1, 2, 3, 4])
    expect(lanes.left.map((match) => match.fixture.fixtureId)).toEqual([1, 2])
    expect(lanes.right.map((match) => match.fixture.fixtureId)).toEqual([3, 4])
  })
})

function entry(knockoutPicks: EntryDto['knockoutPicks']): EntryDto {
  return {
    id: 'entry-one',
    displayName: 'Ana',
    avatarKey: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    answers: [],
    groupPositionPicks: [],
    knockoutPicks
  }
}

function window(roundKey: KnockoutPickemWindowDto['roundKey'], fixtures: KnockoutFixtureDto[]): KnockoutPickemWindowDto {
  return {
    roundKey,
    label: roundKey === 'semifinal' ? 'Semifinals' : 'Quarterfinals',
    lockAt: '2026-07-02T12:00:00.000Z',
    isOpen: false,
    isLocked: true,
    isRevealed: true,
    fixtures
  }
}

function fixture(
  fixtureId: number,
  winnerTeamSlug: string | null,
  kickoffAt = `2026-07-02T${String(10 + fixtureId).padStart(2, '0')}:00:00.000Z`
): KnockoutFixtureDto {
  return {
    fixtureId,
    leagueRound: 'Quarter-finals',
    kickoffAt,
    homeTeamSlug: 'france',
    awayTeamSlug: 'japan',
    homeTeamName: 'France',
    awayTeamName: 'Japan',
    homeGoals: null,
    awayGoals: null,
    penaltyHome: null,
    penaltyAway: null,
    statusShort: winnerTeamSlug ? 'FT' : 'NS',
    winnerTeamSlug
  }
}
