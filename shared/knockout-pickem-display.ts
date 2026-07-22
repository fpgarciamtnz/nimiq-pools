import { KNOCKOUT_PICKEM_ROUNDS } from './knockout-pickem'
import type { EntryDto, KnockoutFixtureDto, KnockoutPickDto, KnockoutPickemRoundKey, KnockoutPickemWindowDto } from './types'

export type KnockoutPickemPickStatus = 'correct' | 'wrong' | 'pending' | 'missing'
export type KnockoutPickemProjectedRoundKey = KnockoutPickemRoundKey | 'champion'

export interface KnockoutPickemMatchView {
  fixture: KnockoutFixtureDto
  winnerTeamSlug: string
  status: KnockoutPickemPickStatus
  actualWinnerTeamSlug: string | null
}

export interface KnockoutPickemSummary {
  total: number
  correct: number
  wrong: number
  pending: number
  missing: number
  decided: number
  summaryLabel: string
}

export interface KnockoutPickemProjectionSlot {
  id: string
  teamSlug: string | null
  sourceFixtureId: number | null
  status: KnockoutPickemPickStatus
  isPrediction: boolean
  isWaiting: boolean
}

export interface KnockoutPickemProjectionColumn {
  key: KnockoutPickemProjectedRoundKey
  label: string
  slots: KnockoutPickemProjectionSlot[]
}

export interface KnockoutPickemProjectionBracket {
  entry: EntryDto
  columns: KnockoutPickemProjectionColumn[]
  summary: KnockoutPickemSummary
}

export function getKnockoutPickStatus(
  fixture: Pick<KnockoutFixtureDto, 'winnerTeamSlug'>,
  winnerTeamSlug: string
): KnockoutPickemPickStatus {
  if (!winnerTeamSlug) {
    return 'missing'
  }

  if (!fixture.winnerTeamSlug) {
    return 'pending'
  }

  return fixture.winnerTeamSlug === winnerTeamSlug ? 'correct' : 'wrong'
}

export function buildKnockoutMatchViews(
  fixtures: KnockoutFixtureDto[],
  picks: KnockoutPickDto[] | Record<number, string>
): KnockoutPickemMatchView[] {
  const pickByFixtureId = Array.isArray(picks)
    ? new Map(picks.map((pick) => [pick.fixtureId, pick.winnerTeamSlug]))
    : new Map(Object.entries(picks).map(([fixtureId, winnerTeamSlug]) => [Number(fixtureId), winnerTeamSlug]))

  return sortFixtures(fixtures).map((fixture) => {
    const winnerTeamSlug = pickByFixtureId.get(fixture.fixtureId) ?? ''

    return {
      fixture,
      winnerTeamSlug,
      status: getKnockoutPickStatus(fixture, winnerTeamSlug),
      actualWinnerTeamSlug: fixture.winnerTeamSlug
    }
  })
}

export function summarizeKnockoutMatchViews(matches: KnockoutPickemMatchView[]): KnockoutPickemSummary {
  const summary = matches.reduce((counts, match) => {
    counts[match.status] += 1
    return counts
  }, {
    correct: 0,
    wrong: 0,
    pending: 0,
    missing: 0
  })
  const decided = summary.correct + summary.wrong
  const total = matches.length
  const suffix = summary.missing > 0 ? `, ${summary.missing} missed` : ''
  const summaryLabel = decided > 0
    ? `${summary.correct}/${decided} correct${suffix}`
    : summary.missing === total
      ? 'No picks saved'
      : `0/0 correct${suffix}`

  return {
    total,
    correct: summary.correct,
    wrong: summary.wrong,
    pending: summary.pending,
    missing: summary.missing,
    decided,
    summaryLabel
  }
}

export function buildKnockoutProjectionBracket(input: {
  entry: EntryDto
  windows: KnockoutPickemWindowDto[]
  startRoundKey?: KnockoutPickemRoundKey | null
}): KnockoutPickemProjectionBracket {
  const startRoundKey = input.startRoundKey ?? input.windows[0]?.roundKey ?? 'quarterfinal'
  const startRound = KNOCKOUT_PICKEM_ROUNDS.find((round) => round.key === startRoundKey) ?? KNOCKOUT_PICKEM_ROUNDS[0]
  const rounds = KNOCKOUT_PICKEM_ROUNDS.filter((round) => round.sortOrder >= startRound.sortOrder)
  const windowByRound = new Map(input.windows.map((window) => [window.roundKey, window]))
  const pickByFixtureId = new Map(input.entry.knockoutPicks.map((pick) => [pick.fixtureId, pick.winnerTeamSlug]))
  const columns: KnockoutPickemProjectionColumn[] = []

  const firstWindow = windowByRound.get(startRound.key)
  const firstFixtures = sortFixtures(firstWindow?.fixtures ?? [])
  columns.push({
    key: startRound.key,
    label: startRound.label,
    slots: padSlots(firstFixtures.flatMap((fixture) => [
      teamInputSlot(`${fixture.fixtureId}-home`, fixture.homeTeamSlug),
      teamInputSlot(`${fixture.fixtureId}-away`, fixture.awayTeamSlug)
    ]), startRound.expectedFixtures * 2, `${startRound.key}-team`)
  })

  for (let index = 1; index < rounds.length; index += 1) {
    const round = rounds[index]
    const previousRound = rounds[index - 1]
    const previousWindow = windowByRound.get(previousRound.key)
    const previousFixtures = sortFixtures(previousWindow?.fixtures ?? [])

    columns.push({
      key: round.key,
      label: round.label,
      slots: padSlots(previousFixtures.map((fixture) => {
        const winnerTeamSlug = pickByFixtureId.get(fixture.fixtureId) ?? ''

        return predictionSlot({
          id: `${fixture.fixtureId}-prediction`,
          fixture,
          winnerTeamSlug
        })
      }), previousRound.expectedFixtures, `${round.key}-prediction`)
    })
  }

  const finalRound = rounds[rounds.length - 1]
  const finalWindow = finalRound ? windowByRound.get(finalRound.key) : null
  const finalFixtures = sortFixtures(finalWindow?.fixtures ?? [])
  columns.push({
    key: 'champion',
    label: 'Winner',
    slots: padSlots(finalFixtures.map((fixture) => {
      const winnerTeamSlug = pickByFixtureId.get(fixture.fixtureId) ?? ''

      return predictionSlot({
        id: `${fixture.fixtureId}-champion`,
        fixture,
        winnerTeamSlug
      })
    }), 1, 'champion-prediction')
  })

  const scoredSlots = columns
    .flatMap((column) => column.slots)
    .filter((slot) => slot.isPrediction && slot.sourceFixtureId !== null)
    .map((slot) => ({
      status: slot.status
    } as KnockoutPickemMatchView))

  return {
    entry: input.entry,
    columns,
    summary: summarizeKnockoutMatchViews(scoredSlots)
  }
}

export function splitKnockoutBracketSides<T extends { fixture: KnockoutFixtureDto }>(matches: T[]) {
  const sorted = [...matches].sort(compareMatchFixture)

  if (sorted.length <= 1) {
    return {
      left: sorted,
      right: [] as T[]
    }
  }

  const midpoint = Math.ceil(sorted.length / 2)

  return {
    left: sorted.slice(0, midpoint),
    right: sorted.slice(midpoint)
  }
}

function sortFixtures(fixtures: KnockoutFixtureDto[]) {
  return [...fixtures].sort((first, second) => {
    const kickoffDiff = new Date(first.kickoffAt).getTime() - new Date(second.kickoffAt).getTime()

    if (kickoffDiff !== 0) {
      return kickoffDiff
    }

    return first.fixtureId - second.fixtureId
  })
}

function teamInputSlot(id: string, teamSlug: string | null): KnockoutPickemProjectionSlot {
  return {
    id,
    teamSlug,
    sourceFixtureId: null,
    status: 'pending',
    isPrediction: false,
    isWaiting: !teamSlug
  }
}

function predictionSlot(input: {
  id: string
  fixture: KnockoutFixtureDto
  winnerTeamSlug: string
}): KnockoutPickemProjectionSlot {
  return {
    id: input.id,
    teamSlug: input.winnerTeamSlug || null,
    sourceFixtureId: input.fixture.fixtureId,
    status: getKnockoutPickStatus(input.fixture, input.winnerTeamSlug),
    isPrediction: true,
    isWaiting: !input.winnerTeamSlug
  }
}

function padSlots(slots: KnockoutPickemProjectionSlot[], count: number, prefix: string) {
  return [
    ...slots,
    ...Array.from({ length: Math.max(0, count - slots.length) }, (_, index) => ({
      id: `${prefix}-waiting-${index}`,
      teamSlug: null,
      sourceFixtureId: null,
      status: 'missing' as KnockoutPickemPickStatus,
      isPrediction: true,
      isWaiting: true
    }))
  ]
}

function compareMatchFixture<T extends { fixture: KnockoutFixtureDto }>(first: T, second: T) {
  const kickoffDiff = new Date(first.fixture.kickoffAt).getTime() - new Date(second.fixture.kickoffAt).getTime()

  if (kickoffDiff !== 0) {
    return kickoffDiff
  }

  return first.fixture.fixtureId - second.fixture.fixtureId
}
