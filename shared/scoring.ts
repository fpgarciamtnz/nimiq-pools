import type {
  CompetitionMode,
  DerivedResultsDto,
  EntryDto,
  FinishStage,
  GroupPositionPickDto,
  KnockoutFixtureDto,
  KnockoutWindowDto,
  KnockoutPickemWindowDto,
  LeaderboardRow,
  QuestionDto,
  QuestionKey,
  TournamentGroupDto,
  TeamDto
} from './types'
import { resolvePlayerAvatarKey } from './player-avatars'
import { normalizeKnockoutRound } from './knockout-pickem'

export const QUESTION_ORDER = [
  'team_1',
  'team_2',
  'team_3',
  'team_4'
] as const satisfies readonly QuestionKey[]

export const QUESTIONS: QuestionDto[] = [
  {
    key: 'team_1',
    label: 'Team 1',
    description: 'Scores 3 per win, 1 per non-shootout goal, plus 1 for reaching each of the semifinal and final. Goals against do not remove points.',
    points: 0
  },
  {
    key: 'team_2',
    label: 'Team 2',
    description: 'Scores 3 per win, 1 per non-shootout goal, plus 1 for reaching each of the semifinal and final. Goals against do not remove points.',
    points: 0
  },
  {
    key: 'team_3',
    label: 'Team 3',
    description: 'Scores 3 per win, 1 per non-shootout goal, plus 1 for reaching each of the semifinal and final. Goals against do not remove points.',
    points: 0
  },
  {
    key: 'team_4',
    label: 'Team 4',
    description: 'Scores 3 per win, 1 per non-shootout goal, plus 1 for reaching each of the semifinal and final. Goals against do not remove points.',
    points: 0
  }
]

export const FINISH_STAGES: Array<{ key: FinishStage; label: string; rank: number; points: number }> = [
  { key: 'group', label: 'Group stage', rank: 1, points: 0 },
  { key: 'round_of_32', label: 'Round of 32', rank: 2, points: 0 },
  { key: 'round_of_16', label: 'Round of 16', rank: 3, points: 0 },
  { key: 'quarterfinal', label: 'Quarterfinal', rank: 4, points: 0 },
  { key: 'semifinalist', label: 'Losing semifinalist', rank: 5, points: 0 },
  { key: 'runner_up', label: 'Runner-up', rank: 6, points: 0 },
  { key: 'champion', label: 'Champion', rank: 7, points: 0 }
]

export const FINISH_STAGE_KEYS = FINISH_STAGES.map((stage) => stage.key) as [FinishStage, ...FinishStage[]]

export const KNOCKOUT_ROUND_CAPS: Record<KnockoutWindowDto['key'], number> = {
  round_of_32: 3,
  round_of_16: 3,
  quarterfinal: 4,
  semifinalist: 6,
  champion: 8
}

export const GROUP_POSITION_PICKEM_MAX_POINTS = 48
export const KNOCKOUT_PICKEM_MAX_POINTS = 7

export function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

export function getQuestion(key: QuestionKey) {
  return QUESTIONS.find((question) => question.key === key)
}

export function isEligibleTeamForQuestion(questionKey: QuestionKey, team: Pick<TeamDto, 'tier'>) {
  void questionKey
  void team
  return true
}

export function deriveResults(teams: TeamDto[], teamStats: TeamMatchStatsForScoring[] = []): DerivedResultsDto {
  const scoredTeamSlugs = new Set(teamStats.map((stats) => stats.teamSlug))

  return {
    complete: Object.fromEntries(
      QUESTION_ORDER.map((questionKey) => [
        questionKey,
        teams.some((team) => isEligibleTeamForQuestion(questionKey, team) && scoredTeamSlugs.has(team.slug))
      ])
    ) as DerivedResultsDto['complete']
  }
}

export interface TeamMatchStatsForScoring {
  teamSlug: string
  wins: number
  draws: number
  goalsFor: number
  goalsAgainst: number
  reachedSemifinal: boolean
  reachedFinal: boolean
  played: number
}

export interface TeamFixtureForScoring {
  leagueRound: string | null
  statusShort: string
  homeTeamSlug: string | null
  awayTeamSlug: string | null
  homeGoals: number | null
  awayGoals: number | null
  penaltyHome: number | null
  penaltyAway: number | null
}

export function scorePick(
  questionKey: QuestionKey,
  team: TeamDto | undefined,
  competitionMode: CompetitionMode = 'ballot_only',
  teamStats: TeamMatchStatsForScoring[] = []
) {
  void competitionMode
  const question = getQuestion(questionKey)

  if (!question || !team) {
    return {
      points: 0,
      maxPoints: 0,
      result: null,
      status: 'No team selected'
    }
  }

  if (!isEligibleTeamForQuestion(questionKey, team)) {
    return {
      points: 0,
      maxPoints: 0,
      result: null,
      status: 'Ineligible team'
    }
  }

  const stats = teamStats.find((item) => item.teamSlug === team.slug)

  if (!stats) {
    return {
      points: 0,
      maxPoints: 0,
      result: null,
      status: 'Pending match results'
    }
  }

  const roundBonus = Number(stats.reachedSemifinal) + Number(stats.reachedFinal)
  const points = (stats.wins * 3) + stats.goalsFor + roundBonus
  const result = formatTeamStatsResult(stats, roundBonus)

  return {
    points,
    maxPoints: 0,
    result,
    status: `${points} pts (${result})`
  }
}

export interface GroupStandingForScoring {
  groupName: string
  rank: number
  teamSlug: string | null
  win?: number
  goalsFor?: number
  goalsAgainst?: number
}

export interface ScoringOptions {
  competitionMode?: CompetitionMode
  groups?: TournamentGroupDto[]
  groupStandings?: GroupStandingForScoring[]
  teamStats?: TeamMatchStatsForScoring[]
  knockoutWindows?: KnockoutScoringWindow[]
}

export interface KnockoutScoringWindow {
  fixtures: KnockoutFixtureDto[] | KnockoutPickemWindowDto['fixtures']
}

export function scoreEntry(entry: EntryDto, questions: QuestionDto[], teams: TeamDto[], options: ScoringOptions = {}) {
  const teamBySlug = new Map(teams.map((team) => [team.slug, team]))
  const competitionMode = options.competitionMode ?? 'ballot_only'

  const breakdown = questions.reduce<LeaderboardRow['breakdown']>((items, question) => {
    const answer = entry.answers.find((item) => item.questionKey === question.key)
    const team = answer ? teamBySlug.get(answer.teamSlug) : undefined
    const score = scorePick(question.key, team, competitionMode, options.teamStats ?? [])

    items.push({
      questionKey: question.key,
      label: question.label,
      points: score.points,
      maxPoints: score.maxPoints,
      prediction: team?.name ?? answer?.teamSlug ?? '',
      result: score.result,
      status: score.status
    })

    return items
  }, [])

  if (competitionMode === 'ballot_pickem') {
    const groupScore = scoreGroupPositionPicks(entry.groupPositionPicks, options.groups ?? [], options.groupStandings ?? [])

    breakdown.push({
      questionKey: 'group_pickem',
      label: "Group table pick'em",
      points: groupScore.points,
      maxPoints: GROUP_POSITION_PICKEM_MAX_POINTS,
      prediction: `${groupScore.completed}/${GROUP_POSITION_PICKEM_MAX_POINTS} positions picked`,
      result: groupScore.ready ? `${groupScore.correct} exact positions` : null,
      status: groupScore.ready ? `${groupScore.points}/${GROUP_POSITION_PICKEM_MAX_POINTS} pts` : 'Pending group standings'
    })
  }

  if (competitionMode === 'ballot_pickem' || (options.knockoutWindows?.length ?? 0) > 0) {
    const knockoutScore = scoreKnockoutPicks(entry.knockoutPicks, options.knockoutWindows ?? [])

    breakdown.push({
      questionKey: 'knockout_pickem',
      label: "Knockout pick'em",
      points: knockoutScore.points,
      maxPoints: knockoutScore.maxPoints,
      prediction: `${knockoutScore.completed} winners picked`,
      result: knockoutScore.ready ? `${knockoutScore.correct} correct winners` : null,
      status: knockoutScore.ready ? `${formatPoints(knockoutScore.points)}/${knockoutScore.maxPoints} pts` : 'Pending knockout results'
    })
  }

  return breakdown
}

export function buildLeaderboard(entries: EntryDto[], questions: QuestionDto[], teams: TeamDto[], options: ScoringOptions = {}): LeaderboardRow[] {
  const rows = entries
    .map((entry) => {
      const breakdown = scoreEntry(entry, questions, teams, options)
      const categoryScores = {
        ballot: breakdown
          .filter((item) => item.questionKey !== 'group_pickem' && item.questionKey !== 'knockout_pickem')
          .reduce((sum, item) => sum + item.points, 0),
        groups: breakdown.find((item) => item.questionKey === 'group_pickem')?.points ?? 0,
        knockouts: breakdown.find((item) => item.questionKey === 'knockout_pickem')?.points ?? 0
      }
      const totalScore = breakdown.reduce((sum, item) => sum + item.points, 0)

      return {
        entryId: entry.id,
        displayName: entry.displayName,
        avatarKey: resolvePlayerAvatarKey(entry.avatarKey, entry.displayName),
        totalScore,
        rank: 0,
        categoryScores,
        breakdown
      }
    })
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore
      }

      return a.displayName.localeCompare(b.displayName)
    })

  let previousScore: number | null = null
  let previousRank = 0

  return rows.map((row, index) => {
    const rank = previousScore === row.totalScore ? previousRank : index + 1
    previousScore = row.totalScore
    previousRank = rank
    return { ...row, rank }
  })
}

export function buildTeamMatchStats(fixtures: TeamFixtureForScoring[]): TeamMatchStatsForScoring[] {
  const statsByTeam = new Map<string, TeamMatchStatsForScoring>()

  for (const fixture of fixtures) {
    if (!fixture.homeTeamSlug || !fixture.awayTeamSlug) {
      continue
    }

    if (isThirdPlaceFixtureForScoring(fixture)) {
      continue
    }

    const round = normalizeKnockoutRound(fixture.leagueRound)
    const hasRoundBonus = round === 'semifinal' || round === 'final'

    if (!isFinishedFixtureForScoring(fixture) && !hasRoundBonus) {
      continue
    }

    const homeStats = getOrCreateTeamStats(statsByTeam, fixture.homeTeamSlug)
    const awayStats = getOrCreateTeamStats(statsByTeam, fixture.awayTeamSlug)

    applyRoundBonuses(round, homeStats)
    applyRoundBonuses(round, awayStats)

    if (!isFinishedFixtureForScoring(fixture)) {
      continue
    }

    const isPenaltyShootout = isPenaltyShootoutFixture(fixture)
    const winner = determineFixtureWinnerForScoring(fixture)

    if (isPenaltyShootout && winner === null) {
      continue
    }

    if (!isPenaltyShootout && (typeof fixture.homeGoals !== 'number' || typeof fixture.awayGoals !== 'number')) {
      continue
    }

    homeStats.played += 1
    awayStats.played += 1

    if (typeof fixture.homeGoals === 'number' && typeof fixture.awayGoals === 'number') {
      const homeGoals = fixture.homeGoals
      const awayGoals = fixture.awayGoals

      homeStats.goalsFor += homeGoals
      homeStats.goalsAgainst += awayGoals
      awayStats.goalsFor += awayGoals
      awayStats.goalsAgainst += homeGoals
    }

    if (winner === 'home') {
      homeStats.wins += 1
    }

    if (winner === 'away') {
      awayStats.wins += 1
    }

    if (winner === null) {
      homeStats.draws += 1
      awayStats.draws += 1
    }
  }

  return [...statsByTeam.values()].sort((a, b) => a.teamSlug.localeCompare(b.teamSlug))
}

function applyRoundBonuses(round: ReturnType<typeof normalizeKnockoutRound>, stats: TeamMatchStatsForScoring) {
  if (round === 'semifinal' || round === 'final') {
    stats.reachedSemifinal = true
  }

  if (round === 'final') {
    stats.reachedFinal = true
  }
}

function getOrCreateTeamStats(statsByTeam: Map<string, TeamMatchStatsForScoring>, teamSlug: string) {
  const existing = statsByTeam.get(teamSlug)

  if (existing) {
    return existing
  }

  const stats = {
    teamSlug,
    wins: 0,
    draws: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    reachedSemifinal: false,
    reachedFinal: false,
    played: 0
  }

  statsByTeam.set(teamSlug, stats)
  return stats
}

function isFinishedFixtureForScoring(fixture: Pick<TeamFixtureForScoring, 'statusShort'>) {
  return ['FT', 'AET', 'PEN'].includes(fixture.statusShort.toUpperCase())
}

function isPenaltyShootoutFixture(fixture: Pick<TeamFixtureForScoring, 'statusShort'>) {
  return fixture.statusShort.toUpperCase() === 'PEN'
}

function isThirdPlaceFixtureForScoring(fixture: Pick<TeamFixtureForScoring, 'leagueRound'>) {
  const round = (fixture.leagueRound ?? '').toLocaleLowerCase()
  return round.includes('third') || round.includes('3rd')
}

function determineFixtureWinnerForScoring(fixture: TeamFixtureForScoring): 'home' | 'away' | null {
  if (isPenaltyShootoutFixture(fixture)) {
    if (typeof fixture.penaltyHome === 'number' && typeof fixture.penaltyAway === 'number') {
      if (fixture.penaltyHome > fixture.penaltyAway) {
        return 'home'
      }

      if (fixture.penaltyAway > fixture.penaltyHome) {
        return 'away'
      }
    }
  }

  if (typeof fixture.homeGoals !== 'number' || typeof fixture.awayGoals !== 'number') {
    return null
  }

  if (fixture.homeGoals > fixture.awayGoals) {
    return 'home'
  }

  if (fixture.awayGoals > fixture.homeGoals) {
    return 'away'
  }

  if (typeof fixture.penaltyHome !== 'number' || typeof fixture.penaltyAway !== 'number') {
    return null
  }

  if (fixture.penaltyHome > fixture.penaltyAway) {
    return 'home'
  }

  if (fixture.penaltyAway > fixture.penaltyHome) {
    return 'away'
  }

  return null
}

function formatTeamStatsResult(stats: TeamMatchStatsForScoring, roundBonus: number) {
  return [
    `${stats.wins}W`,
    `${stats.draws}D`,
    `${stats.goalsFor} GF`,
    `${stats.goalsAgainst} GA`,
    roundBonus > 0 ? `${roundBonus} round bonus` : ''
  ].filter(Boolean).join(', ')
}

export function scoreGroupPositionPicks(
  picks: GroupPositionPickDto[],
  groups: TournamentGroupDto[],
  standings: GroupStandingForScoring[]
) {
  const groupById = new Map(groups.map((group) => [group.id, group]))
  const standingByGroupPosition = new Map(
    standings
      .filter((standing) => Boolean(standing.teamSlug))
      .map((standing) => [`${standing.groupName}:${standing.rank}`, standing.teamSlug as string])
  )
  let correct = 0

  for (const pick of picks) {
    const group = groupById.get(pick.groupId)

    if (!group) {
      continue
    }

    if (standingByGroupPosition.get(`${group.name}:${pick.position}`) === pick.teamSlug) {
      correct += 1
    }
  }

  return {
    points: correct,
    correct,
    completed: picks.length,
    ready: standings.length > 0
  }
}

export function scoreKnockoutPicks(picks: EntryDto['knockoutPicks'], windows: KnockoutScoringWindow[]) {
  const pickByFixture = new Map(picks.map((pick) => [pick.fixtureId, pick.winnerTeamSlug]))
  let points = 0
  let correct = 0
  let completed = 0
  let ready = false
  let maxPoints = 0

  for (const window of windows) {
    maxPoints += window.fixtures.length
    const decidedFixtures = window.fixtures.filter((fixture) => Boolean(fixture.winnerTeamSlug))

    if (decidedFixtures.length === 0) {
      continue
    }

    ready = true
    const correctInWindow = decidedFixtures.filter((fixture) => {
      const picked = pickByFixture.get(fixture.fixtureId)

      if (picked) {
        completed += 1
      }

      return picked === fixture.winnerTeamSlug
    }).length

    correct += correctInWindow
    points += correctInWindow
  }

  return {
    points,
    correct,
    completed,
    maxPoints,
    ready
  }
}

function formatPoints(points: number) {
  return Number.isInteger(points) ? String(points) : points.toFixed(1)
}
