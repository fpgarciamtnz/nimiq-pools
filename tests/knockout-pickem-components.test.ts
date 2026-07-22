import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import KnockoutPickemBracketMatch from '../app/components/KnockoutPickemBracketMatch.vue'
import KnockoutPickemPanel from '../app/components/KnockoutPickemPanel.vue'
import LeaguePredictionReveal from '../app/components/LeaguePredictionReveal.vue'
import { buildKnockoutMatchViews } from '../shared/knockout-pickem-display'
import type {
  CompetitionPredictionRow,
  EntryDto,
  KnockoutFixtureDto,
  KnockoutPickemStateDto,
  KnockoutPickemWindowDto,
  TeamDto
} from '../shared/types'

const LEGACY_LOCAL_PICKEM_STORAGE_KEY = 'worldcup-pickem-memory'

const teams: TeamDto[] = [
  team('france', 'France', 'FRA'),
  team('japan', 'Japan', 'JPN'),
  team('spain', 'Spain', 'ESP'),
  team('ghana', 'Ghana', 'GHA')
]

beforeEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe('Knockout Pickem components', () => {
  it('renders a bracket board for open fixtures, gates submit, and preserves the API payload shape', async () => {
    const fetchMock = vi.fn(async () => ({
      entry: entry('entry-one', 'Ana', [{ fixtureId: 1, winnerTeamSlug: 'france' }])
    }))
    vi.stubGlobal('$fetch', fetchMock)
    const wrapper = mount(KnockoutPickemPanel, {
      props: {
        poolCode: 'office',
        teams,
        entries: [],
        editableEntries: [],
        knockoutPickem: pickemState([window('quarterfinal', 'Quarterfinals', [
          fixture(1, 'Quarter-finals', 'france', 'japan')
        ], { isOpen: true, isRevealed: false })])
      }
    })

    await wrapper.get('input[name="displayName"]').setValue('Ana')

    const franceButton = wrapper.get('button[aria-label="Pick France"]')
    const japanButton = wrapper.get('button[aria-label="Pick Japan"]')
    const submit = wrapper.get('button[type="submit"]')

    expect(franceButton.exists()).toBe(true)
    expect(japanButton.exists()).toBe(true)
    expect(wrapper.text()).toContain('Only this wallet’s entry will be changed.')
    expect((submit.element as HTMLButtonElement).disabled).toBe(true)

    await franceButton.trigger('click')

    expect(franceButton.attributes('aria-pressed')).toBe('true')
    expect((submit.element as HTMLButtonElement).disabled).toBe(false)

    await wrapper.get('form').trigger('submit')

    expect(fetchMock).toHaveBeenCalledWith('/api/pools/office/pickem', expect.objectContaining({
      method: 'POST',
      body: {
        displayName: 'Ana',
        picks: [{ fixtureId: 1, winnerTeamSlug: 'france' }]
      }
    }))
  })

  it('keeps revealed brackets out of the Picks panel', () => {
    const wrapper = mount(KnockoutPickemPanel, {
      props: {
        poolCode: 'office',
        teams,
        entries: [
          entry('ana', 'Ana', [
            { fixtureId: 1, winnerTeamSlug: 'france' },
            { fixtureId: 2, winnerTeamSlug: 'ghana' }
          ]),
          entry('ben', 'Ben', [
            { fixtureId: 1, winnerTeamSlug: 'japan' }
          ])
        ],
        editableEntries: [],
        knockoutPickem: pickemState([
          window('quarterfinal', 'Quarterfinals', [
            fixture(1, 'Quarter-finals', 'france', 'japan', 'france')
          ], { isOpen: false, isRevealed: true }),
          window('semifinal', 'Semifinals', [
            fixture(2, 'Semi-finals', 'spain', 'ghana', 'spain')
          ], { isOpen: false, isRevealed: true })
        ], 'locked')
      }
    })

    expect(wrapper.text()).toContain("Quarterfinals Pick'em is open until kickoff.")
    expect(wrapper.text()).not.toContain('Correct pick: France')
    expect(wrapper.text()).not.toContain('Wrong pick: Ghana')
    expect(wrapper.find('.bracket-board').exists()).toBe(false)
  })

  it('renders compact projected pickem brackets under each user on the Predictions page', () => {
    const wrapper = mount(LeaguePredictionReveal, {
      props: {
        rows: [
          predictionRow('ana', 'Ana'),
          predictionRow('ben', 'Ben')
        ],
        isPublic: true,
        predictionDeadline: '2026-06-11T18:00:00.000Z',
        teams,
        knockoutPickemStartRound: 'quarterfinal',
        entries: [
          entry('ana', 'Ana', [
            { fixtureId: 1, winnerTeamSlug: 'france' },
            { fixtureId: 2, winnerTeamSlug: 'ghana' }
          ]),
          entry('ben', 'Ben', [
            { fixtureId: 1, winnerTeamSlug: 'japan' }
          ])
        ],
        knockoutPickem: pickemState([
          window('quarterfinal', 'Quarterfinals', [
            fixture(1, 'Quarter-finals', 'france', 'japan', 'france')
          ], { isOpen: false, isRevealed: true }),
          window('semifinal', 'Semifinals', [
            fixture(2, 'Semi-finals', 'spain', 'ghana', 'spain')
          ], { isOpen: false, isRevealed: true })
        ], 'locked')
      },
      global: {
        stubs: {
          PlayerAvatar: { template: '<span />' },
          TeamFlag: { template: '<span />' }
        }
      }
    })

    const rows = wrapper.findAll('.reveal-row')

    expect(rows).toHaveLength(2)
    expect(rows[0]?.text()).toContain('T1: France')
    expect(rows[0]?.text()).toContain("Knockout Pick'em")
    expect(rows[0]?.text()).toContain('1/2 Pickem correct')
    expect(wrapper.findAll('.projection-bracket')).toHaveLength(2)
    expect(rows[0]?.find('.bracket-side.is-left').exists()).toBe(true)
    expect(rows[0]?.find('.bracket-center').exists()).toBe(true)
    expect(rows[0]?.find('.bracket-side.is-right').exists()).toBe(true)
    expect(rows[0]?.findAll('.bracket-spacer')).toHaveLength(4)
    expect(rows[0]?.get('.projection-bracket').attributes('style')).toContain('--side-lane-width: 5.15rem')
    expect(rows[0]?.findAll('.projection-match').length).toBeGreaterThan(0)
    expect(rows[0]?.findAll('.marker-correct')).toHaveLength(1)
    expect(rows[0]?.findAll('.marker-wrong')).toHaveLength(1)
    expect(rows[1]?.find('.projection-bracket').exists()).toBe(true)

    const firstBracketText = rows[0]?.get('.projection-bracket').text() ?? ''

    expect(firstBracketText).not.toContain('France')
    expect(firstBracketText).not.toContain('Japan')
    expect(firstBracketText).not.toContain('Spain')
    expect(firstBracketText).not.toContain('Ghana')
  })

  it('labels correct, wrong, pending, and missing bracket result states distinctly', () => {
    const correct = mount(KnockoutPickemBracketMatch, {
      props: {
        match: buildKnockoutMatchViews([fixture(1, 'Quarter-finals', 'france', 'japan', 'france')], [{ fixtureId: 1, winnerTeamSlug: 'france' }])[0],
        teams,
        mode: 'result'
      }
    })
    const wrong = mount(KnockoutPickemBracketMatch, {
      props: {
        match: buildKnockoutMatchViews([fixture(1, 'Quarter-finals', 'france', 'japan', 'japan')], [{ fixtureId: 1, winnerTeamSlug: 'france' }])[0],
        teams,
        mode: 'result'
      }
    })
    const pending = mount(KnockoutPickemBracketMatch, {
      props: {
        match: buildKnockoutMatchViews([fixture(1, 'Quarter-finals', 'france', 'japan')], [{ fixtureId: 1, winnerTeamSlug: 'france' }])[0],
        teams,
        mode: 'result'
      }
    })
    const missing = mount(KnockoutPickemBracketMatch, {
      props: {
        match: buildKnockoutMatchViews([fixture(1, 'Quarter-finals', 'france', 'japan', 'france')], [])[0],
        teams,
        mode: 'result'
      }
    })

    expect(correct.text()).toContain('Correct pick: France')
    expect(wrong.text()).toContain('Wrong pick: France')
    expect(wrong.text()).toContain('Actual: Japan')
    expect(pending.text()).toContain('Pending result: France')
    expect(missing.text()).toContain('No pick')
  })

  it('does not use browser-local memory as wallet identity', async () => {
    localStorage.setItem(LEGACY_LOCAL_PICKEM_STORAGE_KEY, JSON.stringify([{
      poolCode: 'office',
      displayName: 'Ana',
      fixtureIds: [1],
      picks: [{ fixtureId: 1, winnerTeamSlug: 'france' }],
      updatedAt: '2026-07-01T12:00:00.000Z'
    }]))

    const wrapper = mount(KnockoutPickemPanel, {
      props: {
        poolCode: 'office',
        teams,
        entries: [],
        editableEntries: [],
        knockoutPickem: pickemState([window('quarterfinal', 'Quarterfinals', [
          fixture(1, 'Quarter-finals', 'france', 'japan')
        ], { isOpen: true, isRevealed: false })])
      }
    })

    await nextTick()

    expect((wrapper.get('input[name="displayName"]').element as HTMLInputElement).value).toBe('')
    expect(wrapper.get('button[aria-label="Pick France"]').attributes('aria-pressed')).toBe('false')

    await wrapper.setProps({
      knockoutPickem: pickemState([window('quarterfinal', 'Quarterfinals', [
        fixture(2, 'Quarter-finals', 'spain', 'ghana')
      ], { isOpen: true, isRevealed: false })])
    })
    await nextTick()

    expect(wrapper.get('button[aria-label="Pick Spain"]').attributes('aria-pressed')).toBe('false')
  })
})

function team(slug: string, name: string, fifaCode: string): TeamDto {
  return {
    slug,
    name,
    fifaCode,
    fifaRank: 1,
    qualifiedRankOrder: 1,
    tier: 'TOP',
    finishStage: null,
    guaranteedStage: null,
    footballDataId: null,
    logoUrl: null
  }
}

function entry(id: string, displayName: string, knockoutPicks: EntryDto['knockoutPicks']): EntryDto {
  return {
    id,
    displayName,
    avatarKey: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    answers: [],
    groupPositionPicks: [],
    knockoutPicks
  }
}

function predictionRow(entryId: string, displayName: string): CompetitionPredictionRow {
  return {
    entryId,
    displayName,
    avatarKey: null,
    picks: [{
      questionKey: 'team_1',
      label: 'T1',
      team: {
        slug: 'france',
        name: 'France',
        fifaCode: 'FRA',
        flagCode: null,
        flagEmoji: '🇫🇷',
        flagUrl: null,
        logoUrl: null
      }
    }]
  }
}

function pickemState(windows: KnockoutPickemWindowDto[], status: KnockoutPickemStateDto['status'] = 'open'): KnockoutPickemStateDto {
  return {
    enabled: true,
    enabledAt: '2026-07-01T00:00:00.000Z',
    status,
    reason: "Quarterfinals Pick'em is open until kickoff.",
    activeWindow: windows.find((item) => item.isOpen) ?? windows.at(-1) ?? null,
    windows
  }
}

function window(
  roundKey: KnockoutPickemWindowDto['roundKey'],
  label: string,
  fixtures: KnockoutFixtureDto[],
  state: Pick<KnockoutPickemWindowDto, 'isOpen' | 'isRevealed'>
): KnockoutPickemWindowDto {
  return {
    roundKey,
    label,
    lockAt: '2026-07-02T12:00:00.000Z',
    isOpen: state.isOpen,
    isLocked: !state.isOpen,
    isRevealed: state.isRevealed,
    fixtures
  }
}

function fixture(
  fixtureId: number,
  leagueRound: string,
  homeTeamSlug: string,
  awayTeamSlug: string,
  winnerTeamSlug: string | null = null
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
    statusShort: winnerTeamSlug ? 'FT' : 'NS',
    winnerTeamSlug
  }
}

function titleCase(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`
}
