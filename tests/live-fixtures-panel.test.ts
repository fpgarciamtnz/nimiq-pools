import { mount } from '@vue/test-utils'
import { shallowRef } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LiveFixturesPanel from '../app/components/LiveFixturesPanel.vue'
import type { CompetitionSupportDto, LiveFixtureDto } from '../shared/types'

const liveState = vi.hoisted(() => ({
  fixtures: [] as LiveFixtureDto[],
  generatedAt: '2026-07-02T13:00:00.000Z',
  pending: false,
  error: null as string | null
}))

beforeEach(() => {
  liveState.fixtures = [fixture()]
  liveState.generatedAt = '2026-07-02T13:00:00.000Z'
  liveState.pending = false
  liveState.error = null
  vi.stubGlobal('useLiveFixtures', () => ({
    fixtures: shallowRef(liveState.fixtures),
    generatedAt: shallowRef(liveState.generatedAt),
    pending: shallowRef(liveState.pending),
    error: shallowRef(liveState.error)
  }))
})

describe('LiveFixturesPanel', () => {
  it('renders live fixtures with the emphasized live treatment and update label', () => {
    liveState.fixtures = [
      fixture({
        fixtureId: 2,
        homeTeamName: 'Brazil',
        awayTeamName: 'Japan',
        homeTeamSlug: 'brazil',
        awayTeamSlug: 'japan',
        homeGoals: 2,
        awayGoals: 1,
        statusShort: 'LIVE',
        statusLong: 'Second Half',
        elapsed: 62,
        isLive: true,
        kickoffAt: '2026-07-02T12:00:00.000Z'
      }),
      fixture({
        fixtureId: 1,
        kickoffAt: '2026-07-02T18:00:00.000Z'
      })
    ]

    const wrapper = mount(LiveFixturesPanel, {
      global: {
        stubs: {
          TeamFlag: { template: '<span data-test="team-flag" />' }
        }
      }
    })

    expect(wrapper.find('.fixture-card-live').exists()).toBe(true)
    expect(wrapper.text()).toContain("Live 62'")
    expect(wrapper.text()).toContain('2 - 1')
    expect(wrapper.text()).toContain('Updated')
    expect(wrapper.text()).toContain('Brazil')
    expect(wrapper.text()).not.toContain('France')
  })

  it('falls back to quiet upcoming fixtures when no game is live', () => {
    liveState.fixtures = [
      fixture({ fixtureId: 1, kickoffAt: '2026-07-02T18:00:00.000Z' }),
      fixture({
        fixtureId: 2,
        homeTeamName: 'Brazil',
        awayTeamName: 'Japan',
        homeTeamSlug: 'brazil',
        awayTeamSlug: 'japan',
        kickoffAt: '2026-07-02T12:00:00.000Z'
      })
    ]

    const wrapper = mount(LiveFixturesPanel, {
      global: {
        stubs: {
          TeamFlag: { template: '<span data-test="team-flag" />' }
        }
      }
    })

    expect(wrapper.find('.fixture-card-live').exists()).toBe(false)
    expect(wrapper.text().indexOf('Brazil')).toBeLessThan(wrapper.text().indexOf('France'))
    expect(wrapper.text()).toContain('NS')
  })

  it('renders ballot hearts and Pickem thumbs-up on the matching team', () => {
    const wrapper = mount(LiveFixturesPanel, {
      props: {
        support: {
          ballotTeams: {
            france: [
              {
                entryId: 'ana',
                displayName: 'Ana',
                avatarKey: 'bee',
                teamSlug: 'france',
                questionKey: 'team_1'
              }
            ],
            spain: [
              {
                entryId: 'maxi',
                displayName: 'Maxi',
                avatarKey: 'trophy',
                teamSlug: 'spain',
                questionKey: 'team_2'
              },
              {
                entryId: 'ben',
                displayName: 'Ben',
                avatarKey: 'fire',
                teamSlug: 'spain',
                questionKey: 'team_3'
              }
            ]
          },
          pickemFixtures: {
            '1': {
              france: [
                {
                  entryId: 'sofi',
                  displayName: 'Sofi',
                  avatarKey: 'star',
                  fixtureId: 1,
                  teamSlug: 'france'
                }
              ]
            }
          }
        } satisfies CompetitionSupportDto
      },
      global: {
        stubs: {
          TeamFlag: { template: '<span data-test="team-flag" />' }
        }
      }
    })

    expect(wrapper.find('[aria-label="Ana supports France as Team 1"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Maxi supports Spain as Team 2"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Ben supports Spain as Team 3"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Sofi picked France in Pick\'em"]').exists()).toBe(true)
  })
})

function fixture(overrides: Partial<LiveFixtureDto> = {}): LiveFixtureDto {
  return {
    fixtureId: 1,
    leagueRound: 'Quarter-finals',
    statusShort: 'NS',
    statusLong: 'Not Started',
    elapsed: null,
    kickoffAt: '2026-07-02T12:00:00.000Z',
    homeTeamSlug: 'france',
    awayTeamSlug: 'spain',
    homeTeamName: 'France',
    awayTeamName: 'Spain',
    homeGoals: null,
    awayGoals: null,
    penaltyHome: null,
    penaltyAway: null,
    isLive: false,
    sourceUpdatedAt: null,
    updatedAt: '2026-07-02T11:00:00.000Z',
    ...overrides
  }
}
