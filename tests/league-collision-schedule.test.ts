import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import LeagueCollisionSchedule from '../app/components/LeagueCollisionSchedule.vue'
import type { CompetitionCollision, TeamDisplayDto } from '../shared/types'

describe('LeagueCollisionSchedule', () => {
  it('renders collision cards as player rivalries instead of fixture drama copy', () => {
    const wrapper = mount(LeagueCollisionSchedule, {
      props: {
        isPublic: true,
        collisions: [
          collision({
            homeUser: 'Ana',
            awayUser: 'Ben',
            homeTeam: team('bosnia', 'Bosnia', 'BIH'),
            awayTeam: team('canada', 'Canada', 'CAN')
          })
        ]
      },
      global: {
        stubs: {
          TeamFlag: { template: '<span data-test="team-flag" />' }
        }
      }
    })

    expect(wrapper.text()).not.toContain('Upcoming drama')
    expect(wrapper.text()).not.toContain('Fixtures where league picks are on both sides.')
    expect(wrapper.text()).toContain('Ana')
    expect(wrapper.text()).toContain('Ben')
    expect(wrapper.text()).toContain('Bosnia')
    expect(wrapper.text()).toContain('Canada')
    expect(wrapper.text()).toContain('2 picks')
    expect(wrapper.text()).toContain('8 pts gap')
  })
})

function team(slug: string, name: string, fifaCode: string): TeamDisplayDto {
  return {
    slug,
    name,
    fifaCode,
    flagCode: fifaCode.toLowerCase(),
    flagEmoji: '',
    flagUrl: null
  }
}

function collision(input: {
  homeUser: string
  awayUser: string
  homeTeam: TeamDisplayDto
  awayTeam: TeamDisplayDto
}): CompetitionCollision {
  return {
    type: 'team_fixture_collision',
    title: `${input.homeTeam.name} vs ${input.awayTeam.name}`,
    text: `${input.homeUser} vs ${input.awayUser}`,
    fixtureId: 901,
    fixtureLabel: `${input.homeTeam.name} vs ${input.awayTeam.name}`,
    kickoffAt: '2026-06-18T18:00:00.000Z',
    statusShort: 'NS',
    isLive: false,
    home: {
      team: input.homeTeam,
      supporters: [{
        entryId: 'ana',
        displayName: input.homeUser,
        avatarKey: 'rocket',
        teamSlug: input.homeTeam.slug,
        questionKey: 'team_1'
      }]
    },
    away: {
      team: input.awayTeam,
      supporters: [{
        entryId: 'ben',
        displayName: input.awayUser,
        avatarKey: 'fire',
        teamSlug: input.awayTeam.slug,
        questionKey: 'team_2'
      }]
    },
    entryIds: ['ana', 'ben'],
    teamSlugs: [input.homeTeam.slug, input.awayTeam.slug],
    totalSupporters: 2,
    scoreGap: 8,
    bestRank: 1,
    source: 'fixtures',
    reason: 'test collision'
  }
}
