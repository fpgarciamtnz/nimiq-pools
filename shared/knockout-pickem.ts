import type {
  KnockoutFixtureDto,
  KnockoutPickemRoundKey,
  KnockoutPickemStateDto,
  KnockoutPickemWindowDto
} from './types'

export const KNOCKOUT_PICKEM_ROUNDS: Array<{
  key: KnockoutPickemRoundKey
  label: string
  expectedFixtures: number
  sortOrder: number
}> = [
  { key: 'round_of_32', label: 'Round of 32', expectedFixtures: 16, sortOrder: 1 },
  { key: 'round_of_16', label: 'Round of 16', expectedFixtures: 8, sortOrder: 2 },
  { key: 'quarterfinal', label: 'Quarterfinals', expectedFixtures: 4, sortOrder: 3 },
  { key: 'semifinal', label: 'Semifinals', expectedFixtures: 2, sortOrder: 4 },
  { key: 'final', label: 'Final', expectedFixtures: 1, sortOrder: 5 }
]

const FINISHED_STATUS_CODES = new Set(['FT', 'AET', 'PEN'])
const roundByKey = new Map(KNOCKOUT_PICKEM_ROUNDS.map((round) => [round.key, round]))

export interface KnockoutPickemFixtureRecord {
  fixtureId: number
  leagueRound: string | null
  kickoffAt: Date | string
  homeTeamSlug: string | null
  awayTeamSlug: string | null
  homeTeamName: string
  awayTeamName: string
  homeGoals: number | null
  awayGoals: number | null
  penaltyHome: number | null
  penaltyAway: number | null
  statusShort: string
}

export function buildKnockoutPickemState(input: {
  enabledAt?: Date | string | null
  startRoundKey?: KnockoutPickemRoundKey | null
  fixtures: KnockoutPickemFixtureRecord[]
  now?: Date | string
}): KnockoutPickemStateDto {
  if (!input.enabledAt && !input.startRoundKey) {
    return {
      enabled: false,
      enabledAt: null,
      status: 'disabled',
      reason: "Knockout Pick'em is disabled.",
      activeWindow: null,
      windows: []
    }
  }

  const enabledAt = input.enabledAt ? toDate(input.enabledAt) : null
  const now = input.now ? toDate(input.now) : new Date()
  const startRoundKey = input.startRoundKey ?? 'quarterfinal'
  const eligibleRounds = getEligibleRounds(startRoundKey)
  const windows = buildEligibleWindows(input.fixtures, eligibleRounds, enabledAt, now)
  const openWindow = windows.find((window) => window.isOpen) ?? null
  const futureRound = eligibleRounds.find((round) => {
    const window = windows.find((item) => item.roundKey === round.key)
    return !window || !window.isLocked
  })
  const enabledAtLabel = enabledAt?.toISOString() ?? null

  if (openWindow) {
    return {
      enabled: true,
      enabledAt: enabledAtLabel,
      status: 'open',
      reason: `${openWindow.label} Pick'em is open until kickoff.`,
      activeWindow: openWindow,
      windows
    }
  }

  if (windows.length > 0 && windows.every((window) => window.isLocked)) {
    return {
      enabled: true,
      enabledAt: enabledAtLabel,
      status: 'locked',
      reason: "All known Pick'em windows are locked.",
      activeWindow: windows[windows.length - 1] ?? null,
      windows
    }
  }

  return {
    enabled: true,
    enabledAt: enabledAtLabel,
    status: 'pending',
    reason: pendingReason(input.fixtures, enabledAt, now, futureRound?.key ?? startRoundKey),
    activeWindow: null,
    windows
  }
}

export function getOpenPickemWindow(state: KnockoutPickemStateDto) {
  return state.windows.find((window) => window.isOpen) ?? null
}

export function normalizeKnockoutRound(value: string | null): KnockoutPickemRoundKey | null {
  const round = (value ?? '').toLocaleLowerCase()

  if (round.includes('third') || round.includes('3rd')) {
    return null
  }

  if (round.includes('round of 32') || round.includes('1/16')) {
    return 'round_of_32'
  }

  if (round.includes('round of 16') || round.includes('1/8')) {
    return 'round_of_16'
  }

  if (round.includes('quarter') || round.includes('1/4')) {
    return 'quarterfinal'
  }

  if (round.includes('semi') || round.includes('1/2')) {
    return 'semifinal'
  }

  if (round.includes('final') && !round.includes('round')) {
    return 'final'
  }

  return null
}

export function determineFixtureWinner(fixture: Pick<KnockoutFixtureDto, 'homeTeamSlug' | 'awayTeamSlug' | 'homeGoals' | 'awayGoals' | 'penaltyHome' | 'penaltyAway' | 'statusShort'>) {
  if (!FINISHED_STATUS_CODES.has(fixture.statusShort)) {
    return null
  }

  if (typeof fixture.homeGoals !== 'number' || typeof fixture.awayGoals !== 'number') {
    return null
  }

  if (fixture.homeGoals > fixture.awayGoals) {
    return fixture.homeTeamSlug
  }

  if (fixture.awayGoals > fixture.homeGoals) {
    return fixture.awayTeamSlug
  }

  if (typeof fixture.penaltyHome !== 'number' || typeof fixture.penaltyAway !== 'number') {
    return null
  }

  if (fixture.penaltyHome > fixture.penaltyAway) {
    return fixture.homeTeamSlug
  }

  if (fixture.penaltyAway > fixture.penaltyHome) {
    return fixture.awayTeamSlug
  }

  return null
}

export function toKnockoutFixtureDto(fixture: KnockoutPickemFixtureRecord): KnockoutFixtureDto {
  const dto = {
    fixtureId: fixture.fixtureId,
    leagueRound: fixture.leagueRound,
    kickoffAt: toDate(fixture.kickoffAt).toISOString(),
    homeTeamSlug: fixture.homeTeamSlug,
    awayTeamSlug: fixture.awayTeamSlug,
    homeTeamName: fixture.homeTeamName,
    awayTeamName: fixture.awayTeamName,
    homeGoals: fixture.homeGoals,
    awayGoals: fixture.awayGoals,
    penaltyHome: fixture.penaltyHome,
    penaltyAway: fixture.penaltyAway,
    statusShort: fixture.statusShort,
    winnerTeamSlug: null as string | null
  }

  return {
    ...dto,
    winnerTeamSlug: determineFixtureWinner(dto)
  }
}

function getEligibleRounds(startRoundKey: KnockoutPickemRoundKey) {
  const startRound = roundByKey.get(startRoundKey) ?? KNOCKOUT_PICKEM_ROUNDS[0]

  return KNOCKOUT_PICKEM_ROUNDS.filter((round) => round.sortOrder >= startRound.sortOrder)
}

function buildEligibleWindows(
  fixtures: KnockoutPickemFixtureRecord[],
  eligibleRounds: typeof KNOCKOUT_PICKEM_ROUNDS,
  enabledAt: Date | null,
  now: Date
): KnockoutPickemWindowDto[] {
  return eligibleRounds.flatMap((round) => {
    const roundFixtures = fixtures
      .filter((fixture) => normalizeKnockoutRound(fixture.leagueRound) === round.key)
      .sort((a, b) => toDate(a.kickoffAt).getTime() - toDate(b.kickoffAt).getTime())

    if (roundFixtures.length !== round.expectedFixtures) {
      return []
    }

    if (roundFixtures.some((fixture) => !fixture.homeTeamSlug || !fixture.awayTeamSlug)) {
      return []
    }

    const kickoffTimes = roundFixtures.map((fixture) => toDate(fixture.kickoffAt).getTime())
    const lockAtTime = Math.min(...kickoffTimes)

    if (!Number.isFinite(lockAtTime)) {
      return []
    }

    if (enabledAt && kickoffTimes.some((time) => time <= enabledAt.getTime())) {
      return []
    }

    const lockAt = new Date(lockAtTime)

    return [{
      roundKey: round.key,
      label: round.label,
      lockAt: lockAt.toISOString(),
      isOpen: now.getTime() < lockAtTime,
      isLocked: now.getTime() >= lockAtTime,
      isRevealed: now.getTime() >= lockAtTime,
      fixtures: roundFixtures.map(toKnockoutFixtureDto)
    }]
  })
}

function pendingReason(
  fixtures: KnockoutPickemFixtureRecord[],
  enabledAt: Date | null,
  now: Date,
  nextRoundKey: KnockoutPickemRoundKey
) {
  const round = roundByKey.get(nextRoundKey) ?? KNOCKOUT_PICKEM_ROUNDS[0]
  const roundFixtures = fixtures.filter((fixture) => normalizeKnockoutRound(fixture.leagueRound) === round.key)

  if (roundFixtures.length < round.expectedFixtures) {
    return `Waiting for complete ${round.label.toLocaleLowerCase()} fixtures.`
  }

  if (roundFixtures.some((fixture) => !fixture.homeTeamSlug || !fixture.awayTeamSlug)) {
    return `Waiting for confirmed ${round.label.toLocaleLowerCase()} teams.`
  }

  if (enabledAt && roundFixtures.some((fixture) => toDate(fixture.kickoffAt).getTime() <= enabledAt.getTime())) {
    return `${round.label} already started before Pick'em was enabled; waiting for the next eligible round.`
  }

  if (roundFixtures.every((fixture) => toDate(fixture.kickoffAt).getTime() <= now.getTime())) {
    return `${round.label} is locked; waiting for the next eligible round.`
  }

  return `Waiting for the next eligible Pick'em round.`
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value)
}
