import { describe, expect, it } from 'vitest'
import { buildKnockoutPickemState, normalizeKnockoutRound } from '../shared/knockout-pickem'

describe('knockout pickem windows', () => {
  it('normalizes all winner-pick knockout rounds', () => {
    expect(normalizeKnockoutRound('Round of 32')).toBe('round_of_32')
    expect(normalizeKnockoutRound('Round of 16')).toBe('round_of_16')
    expect(normalizeKnockoutRound('Quarter-finals')).toBe('quarterfinal')
    expect(normalizeKnockoutRound('Semi-finals')).toBe('semifinal')
    expect(normalizeKnockoutRound('Final')).toBe('final')
    expect(normalizeKnockoutRound('Third place')).toBeNull()
  })

  it('opens the next complete unplayed eligible round', () => {
    const state = buildKnockoutPickemState({
      startRoundKey: 'quarterfinal',
      now: '2026-07-02T00:00:00.000Z',
      fixtures: [
        fixture(1, 'Quarter-finals', '2026-07-03T10:00:00.000Z', 'france', 'japan'),
        fixture(2, 'Quarter-finals', '2026-07-03T12:00:00.000Z', 'spain', 'ghana'),
        fixture(3, 'Quarter-finals', '2026-07-04T10:00:00.000Z', 'brazil', 'morocco'),
        fixture(4, 'Quarter-finals', '2026-07-04T12:00:00.000Z', 'england', 'portugal')
      ]
    })

    expect(state.status).toBe('open')
    expect(state.activeWindow?.roundKey).toBe('quarterfinal')
    expect(state.activeWindow?.fixtures).toHaveLength(4)
  })

  it('opens Round of 32 when it is the configured start round', () => {
    const state = buildKnockoutPickemState({
      startRoundKey: 'round_of_32',
      now: '2026-06-25T00:00:00.000Z',
      fixtures: Array.from({ length: 16 }, (_, index) => fixture(
        index + 1,
        'Round of 32',
        `2026-06-${String(26 + Math.floor(index / 4)).padStart(2, '0')}T12:00:00.000Z`,
        `home-${index + 1}`,
        `away-${index + 1}`
      ))
    })

    expect(state.status).toBe('open')
    expect(state.activeWindow?.roundKey).toBe('round_of_32')
    expect(state.activeWindow?.fixtures).toHaveLength(16)
  })

  it('skips earlier knockout rounds before the configured start round', () => {
    const state = buildKnockoutPickemState({
      startRoundKey: 'round_of_16',
      now: '2026-06-30T00:00:00.000Z',
      fixtures: [
        ...Array.from({ length: 16 }, (_, index) => fixture(
          index + 1,
          'Round of 32',
          '2026-06-28T12:00:00.000Z',
          `home-32-${index + 1}`,
          `away-32-${index + 1}`
        )),
        ...Array.from({ length: 8 }, (_, index) => fixture(
          index + 17,
          'Round of 16',
          '2026-07-01T12:00:00.000Z',
          `home-16-${index + 1}`,
          `away-16-${index + 1}`
        ))
      ]
    })

    expect(state.status).toBe('open')
    expect(state.activeWindow?.roundKey).toBe('round_of_16')
    expect(state.windows.some((window) => window.roundKey === 'round_of_32')).toBe(false)
  })

  it('skips a round that started before enablement and waits for the next full round', () => {
    const state = buildKnockoutPickemState({
      enabledAt: '2026-07-03T11:00:00.000Z',
      now: '2026-07-03T11:30:00.000Z',
      fixtures: [
        fixture(1, 'Quarter-finals', '2026-07-03T10:00:00.000Z', 'france', 'japan'),
        fixture(2, 'Quarter-finals', '2026-07-03T12:00:00.000Z', 'spain', 'ghana'),
        fixture(3, 'Quarter-finals', '2026-07-04T10:00:00.000Z', 'brazil', 'morocco'),
        fixture(4, 'Quarter-finals', '2026-07-04T12:00:00.000Z', 'england', 'portugal'),
        fixture(5, 'Semi-finals', '2026-07-07T12:00:00.000Z', 'france', 'spain'),
        fixture(6, 'Semi-finals', '2026-07-08T12:00:00.000Z', 'brazil', 'england')
      ]
    })

    expect(state.status).toBe('open')
    expect(state.activeWindow?.roundKey).toBe('semifinal')
  })

  it('waits when a round is incomplete or teams are unknown', () => {
    const incomplete = buildKnockoutPickemState({
      enabledAt: '2026-07-01T00:00:00.000Z',
      now: '2026-07-02T00:00:00.000Z',
      fixtures: [
        fixture(1, 'Quarter-finals', '2026-07-03T10:00:00.000Z', 'france', 'japan')
      ]
    })
    const unknownTeams = buildKnockoutPickemState({
      enabledAt: '2026-07-01T00:00:00.000Z',
      now: '2026-07-02T00:00:00.000Z',
      fixtures: [
        fixture(1, 'Quarter-finals', '2026-07-03T10:00:00.000Z', null, 'japan'),
        fixture(2, 'Quarter-finals', '2026-07-03T12:00:00.000Z', 'spain', 'ghana'),
        fixture(3, 'Quarter-finals', '2026-07-04T10:00:00.000Z', 'brazil', 'morocco'),
        fixture(4, 'Quarter-finals', '2026-07-04T12:00:00.000Z', 'england', 'portugal')
      ]
    })

    expect(incomplete.status).toBe('pending')
    expect(unknownTeams.status).toBe('pending')
  })
})

function fixture(
  fixtureId: number,
  leagueRound: string,
  kickoffAt: string,
  homeTeamSlug: string | null,
  awayTeamSlug: string | null
) {
  return {
    fixtureId,
    leagueRound,
    kickoffAt,
    homeTeamSlug,
    awayTeamSlug,
    homeTeamName: homeTeamSlug ?? 'TBD',
    awayTeamName: awayTeamSlug ?? 'TBD',
    homeGoals: null,
    awayGoals: null,
    penaltyHome: null,
    penaltyAway: null,
    statusShort: 'NS'
  }
}
