import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CompetitionShell from '../app/components/CompetitionShell.vue'
import type {
  CompetitionViewDto,
  EntryDto,
  KnockoutPickemStateDto,
  PoolDto,
  QuestionDto,
  TeamDto
} from '../shared/types'

describe('CompetitionShell navigation', () => {
  it('defaults to picks when a ballot selection is open', () => {
    const wrapper = mountShell({ isPublic: false, isLocked: false })

    expect(wrapper.get('[aria-current="page"]').text()).toContain('Picks')
  })

  it('defaults to rankings when the competition is locked and waiting', () => {
    const wrapper = mountShell({ isPublic: false, isLocked: true })

    expect(wrapper.get('[aria-current="page"]').text()).toContain('Rankings')
    expect(wrapper.get('[data-competition-page="rankings"]').text()).toContain("What's going on")
  })

  it('includes the scoring guide in the league pager', () => {
    const wrapper = mountShell({ isPublic: false, isLocked: true })

    expect(wrapper.get('[data-competition-page="scoring"]').text()).toContain('How guide')
    expect(wrapper.findAll('button').some((button) => button.text().includes('Scoring'))).toBe(true)
  })

  it('defaults to picks while a knockout pickem window is open', () => {
    const wrapper = mountShell({
      isPublic: true,
      isLocked: true,
      knockoutPickem: pickemState(true)
    })

    expect(wrapper.get('[aria-current="page"]').text()).toContain('Picks')
  })

  it('uses revealed wording instead of late-join wording before play starts', () => {
    const wrapper = mountShell({
      isPublic: true,
      isLocked: true,
      isLateEntry: false
    })

    expect(wrapper.text()).toContain('Revealed')
    expect(wrapper.text()).not.toContain('Join late')
  })

  it('uses managed-entry wording after play has started', () => {
    const wrapper = mountShell({
      isPublic: true,
      isLocked: true,
      isLateEntry: true
    })

    expect(wrapper.text()).toContain('Managed entries')
  })

  it('defaults to final rankings when tournament is complete even if a pickem window is open', () => {
    const wrapper = mountShell({
      isPublic: true,
      isLocked: true,
      knockoutPickem: pickemState(true),
      competition: completeCompetition
    })

    expect(wrapper.get('[aria-current="page"]').text()).toContain('Rankings')
    expect(wrapper.get('[aria-current="page"]').text()).toContain('Winner podium')
  })

  it('shows final podium and ranking board without battles or moments after tournament completion', () => {
    const wrapper = mountShell({
      isPublic: true,
      isLocked: true,
      competition: completeCompetition
    })
    const rankingsPage = wrapper.get('[data-competition-page="rankings"]')

    expect(rankingsPage.find('[data-test="winner-podium"]').exists()).toBe(true)
    expect(rankingsPage.find('[data-test="ranking-board"]').exists()).toBe(true)
    expect(rankingsPage.find('[data-test="league-battles"]').exists()).toBe(false)
    expect(rankingsPage.find('[data-test="league-moments"]').exists()).toBe(false)
  })

  it("includes the matches page in the league pager when Pick'em is enabled", () => {
    const wrapper = mountShell({ isPublic: false, isLocked: false })

    expect(wrapper.findAll('button').some((button) => button.text().includes('Matches'))).toBe(true)
    expect(wrapper.find('[data-competition-page="matches"]').exists()).toBe(true)
  })

  it("does not include the matches page when Pick'em is disabled", () => {
    const wrapper = mountShell({
      isPublic: false,
      isLocked: false,
      knockoutPickem: disabledPickemState
    })

    expect(wrapper.findAll('button').some((button) => button.text().includes('Matches'))).toBe(false)
    expect(wrapper.find('[data-competition-page="matches"]').exists()).toBe(false)
  })
})

function mountShell(options: {
  isPublic: boolean
  isLocked: boolean
  isLateEntry?: boolean
  knockoutPickem?: KnockoutPickemStateDto
  competition?: CompetitionViewDto
}) {
  return mount(CompetitionShell, {
    props: {
      pool,
      predictionDeadline: '2026-06-11T18:00:00.000Z',
      isLocked: options.isLocked,
      isPublic: options.isPublic,
      isLateEntry: options.isLateEntry ?? false,
      questions,
      teams,
      entries,
      editableEntries: entries,
      knockoutPickem: options.knockoutPickem ?? pickemState(false),
      competition: options.competition ?? competition
    },
    global: {
      stubs: {
        LeagueHero: { template: '<section data-test="league-hero" />' },
        LeagueEntryCard: { template: '<section data-test="entry-card">Entry card</section>' },
        KnockoutPickemPanel: { template: '<section data-test="pickem-panel">Pickem panel</section>' },
        LeagueBattles: { template: '<section data-test="league-battles">Battles</section>' },
        LeagueMatchesPanel: { template: '<section data-test="league-matches">Matches panel</section>' },
        LeagueMoments: { template: '<section data-test="league-moments">What\'s going on</section>' },
        LeagueWinnerPodium: { template: '<section data-test="winner-podium">Winner podium</section>' },
        LeagueRankingBoard: { template: '<section data-test="ranking-board">Ranking board</section>' },
        LeaguePredictionReveal: { template: '<section data-test="prediction-reveal">Prediction reveal</section>' },
        HowItWorksGuide: { template: '<section data-test="how-guide">How guide</section>' },
        ChevronLeft: { template: '<span />' },
        ChevronRight: { template: '<span />' }
      }
    }
  })
}

const pool: PoolDto = {
  code: 'office',
  title: 'Office League',
  imageDataUrl: null,
  competitionMode: 'ballot_pickem',
  knockoutPickemStartRound: 'quarterfinal',
  createdAt: '2026-06-01T00:00:00.000Z'
}

const questions: QuestionDto[] = [
  { key: 'team_1', label: 'Team 1', description: '', points: 0 }
]

const teams: TeamDto[] = [
  {
    slug: 'france',
    name: 'France',
    fifaCode: 'FRA',
    fifaRank: 1,
    qualifiedRankOrder: 1,
    tier: 'TOP',
    finishStage: null,
    guaranteedStage: null
  }
]

const entries: EntryDto[] = [
  {
    id: 'entry-one',
    displayName: 'Ana',
    avatarKey: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    answers: [],
    groupPositionPicks: [],
    knockoutPicks: []
  }
]

const competition: CompetitionViewDto = {
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
  rankings: [],
  predictions: [],
  winnerPodium: []
}

const completeCompetition: CompetitionViewDto = {
  ...competition,
  status: {
    isPublic: true,
    predictionDeadline: '2026-06-11T18:00:00.000Z',
    isTournamentComplete: true
  },
  rankings: [{
    entryId: 'entry-one',
    rank: 1,
    displayName: 'Ana',
    avatarKey: 'blue',
    totalScore: 42,
    breakdown: []
  }],
  winnerPodium: [{
    entryId: 'entry-one',
    rank: 1,
    displayName: 'Ana',
    totalScore: 42
  }]
}

function pickemState(isOpen: boolean): KnockoutPickemStateDto {
  return {
    enabled: true,
    enabledAt: '2026-06-01T00:00:00.000Z',
    status: isOpen ? 'open' : 'locked',
    reason: isOpen ? "Quarterfinals Pick'em is open." : "Quarterfinals Pick'em is locked.",
    activeWindow: isOpen ? pickemWindow : null,
    windows: [{
      ...pickemWindow,
      isOpen,
      isLocked: !isOpen
    }]
  }
}

const pickemWindow: KnockoutPickemStateDto['windows'][number] = {
  roundKey: 'quarterfinal',
  label: 'Quarterfinals',
  lockAt: '2026-07-02T12:00:00.000Z',
  isOpen: true,
  isLocked: false,
  isRevealed: false,
  fixtures: []
}

const disabledPickemState: KnockoutPickemStateDto = {
  enabled: false,
  enabledAt: null,
  status: 'disabled',
  reason: "Knockout Pick'em is disabled.",
  activeWindow: null,
  windows: []
}
