import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import LeagueMatchesPanel from '../app/components/LeagueMatchesPanel.vue'
import type { CompetitionSupportDto, KnockoutFixtureDto, KnockoutPickemWindowDto } from '../shared/types'

describe('LeagueMatchesPanel', () => {
  it("renders only the selected Pick'em window fixtures", () => {
    const wrapper = mountPanel({
      window: windowDto('Semifinals', [
        fixture(10, 'Semi-finals', 'france', 'spain'),
        fixture(11, 'Semi-finals', 'japan', 'ghana')
      ])
    })

    expect(wrapper.text()).toContain('Semifinals')
    expect(wrapper.text()).toContain('France')
    expect(wrapper.text()).toContain('Spain')
    expect(wrapper.text()).toContain('Japan')
    expect(wrapper.text()).toContain('Ghana')
    expect(wrapper.text()).not.toContain('Brazil')
  })

  it("shows ballot and revealed Pick'em supporter emojis on matching teams", () => {
    const wrapper = mountPanel({
      window: windowDto('Quarterfinals', [
        fixture(1, 'Quarter-finals', 'france', 'spain')
      ]),
      support: {
        ballotTeams: {
          france: [{
            entryId: 'ana',
            displayName: 'Ana',
            avatarKey: 'bee',
            teamSlug: 'france',
            questionKey: 'team_1'
          }],
          spain: [{
            entryId: 'ben',
            displayName: 'Ben',
            avatarKey: 'fire',
            teamSlug: 'spain',
            questionKey: 'team_3'
          }]
        },
        pickemFixtures: {
          '1': {
            france: [{
              entryId: 'sofi',
              displayName: 'Sofi',
              avatarKey: 'star',
              fixtureId: 1,
              teamSlug: 'france'
            }]
          }
        }
      }
    })

    expect(wrapper.find('[aria-label="Ana supports France as Team 1"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Ben supports Spain as Team 3"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Sofi picked France in Pick\'em"]').exists()).toBe(true)
  })

  it("does not invent Pick'em support when the revealed support model omits it", () => {
    const wrapper = mountPanel({
      window: windowDto('Quarterfinals', [
        fixture(1, 'Quarter-finals', 'france', 'spain')
      ]),
      support: {
        ballotTeams: {
          france: [{
            entryId: 'ana',
            displayName: 'Ana',
            avatarKey: 'bee',
            teamSlug: 'france',
            questionKey: 'team_1'
          }]
        },
        pickemFixtures: {}
      }
    })

    expect(wrapper.find('[aria-label="Ana supports France as Team 1"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain("picked France in Pick'em")
  })

  it('hides support in private league state even when support data is passed', () => {
    const wrapper = mountPanel({
      isPublic: false,
      window: windowDto('Quarterfinals', [
        fixture(1, 'Quarter-finals', 'france', 'spain')
      ]),
      support: {
        ballotTeams: {
          france: [{
            entryId: 'ana',
            displayName: 'Ana',
            avatarKey: 'bee',
            teamSlug: 'france',
            questionKey: 'team_1'
          }]
        },
        pickemFixtures: {}
      }
    })

    expect(wrapper.find('[aria-label="Ana supports France as Team 1"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('No visible support')
  })

  it('renders a waiting state without a selected window', () => {
    const wrapper = mountPanel({ window: null })

    expect(wrapper.text()).toContain("Waiting for the next Pick'em round fixtures.")
  })
})

function mountPanel(options: {
  window: KnockoutPickemWindowDto | null
  support?: CompetitionSupportDto
  isPublic?: boolean
}) {
  return mount(LeagueMatchesPanel, {
    props: {
      window: options.window,
      support: options.support ?? {
        ballotTeams: {},
        pickemFixtures: {}
      },
      isPublic: options.isPublic ?? true
    },
    global: {
      stubs: {
        TeamFlag: { template: '<span data-test="team-flag" />' }
      }
    }
  })
}

function windowDto(label: string, fixtures: KnockoutFixtureDto[]): KnockoutPickemWindowDto {
  return {
    roundKey: 'quarterfinal',
    label,
    lockAt: '2026-07-02T12:00:00.000Z',
    isOpen: false,
    isLocked: true,
    isRevealed: true,
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

function titleCase(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`
}
