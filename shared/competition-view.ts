import type {
  CompetitionBallotSupport,
  CompetitionBallotSupportQuestionKey,
  CompetitionBattle,
  CompetitionCollision,
  CompetitionMoment,
  CompetitionMomentType,
  CompetitionPickemSupport,
  CompetitionPredictionRow,
  CompetitionRankingRow,
  CompetitionSupportDto,
  CompetitionSupporter,
  CompetitionViewDto,
  CompetitionWinnerPodiumEntry,
  EntryDto,
  KnockoutFixtureDto,
  KnockoutPickemStateDto,
  LeaderboardRow,
  LiveFixtureDto,
  QuestionDto,
  QuestionKey,
  TeamDisplayDto,
  TeamDto
} from './types'
import { getTeamFlagMeta } from './team-flags'
import { resolvePlayerAvatarKey } from './player-avatars'
import { QUESTION_ORDER } from './scoring'

interface CompetitionViewInput {
  isPublic: boolean
  predictionDeadline: string
  entries: EntryDto[]
  leaderboard: LeaderboardRow[]
  questions: QuestionDto[]
  teams: TeamDto[]
  fixtures?: LiveFixtureDto[]
  knockoutPickem?: KnockoutPickemStateDto | null
  now?: Date
}

const MAX_BATTLES = 2
const MAX_COLLISIONS = 4
const TIGHT_RACE_MAX_GAP = 3
const BALLOT_SUPPORT_QUESTIONS = new Set<QuestionKey>(QUESTION_ORDER)
const POSITIVE_BALLOT_SUPPORT_QUESTIONS = new Set<QuestionKey>(QUESTION_ORDER)
const UNKNOWN_TEAM: TeamDisplayDto = {
  slug: '',
  name: 'Pending',
  fifaCode: '',
  flagCode: null,
  flagEmoji: '\u26BD',
  flagUrl: null,
  logoUrl: null
}

interface FixtureTeams {
  homeTeamSlug: string | null
  awayTeamSlug: string | null
  homeTeamName: string
  awayTeamName: string
  leagueRound: string | null
}

export function createEmptyCompetitionSupport(): CompetitionSupportDto {
  return {
    ballotTeams: {},
    pickemFixtures: {}
  }
}

export function buildCompetitionView(input: CompetitionViewInput): CompetitionViewDto {
  if (!input.isPublic) {
    return {
      status: {
        isPublic: input.isPublic,
        predictionDeadline: input.predictionDeadline,
        isTournamentComplete: false
      },
      support: createEmptyCompetitionSupport(),
      battles: [],
      collisions: [],
      moments: [],
      rankings: buildPrivateCompetitionRankingRows(input.entries),
      predictions: [],
      winnerPodium: []
    }
  }

  const teamByName = new Map(input.teams.map((team) => [team.name, team]))
  const teamBySlug = new Map(input.teams.map((team) => [team.slug, team]))
  const entryById = new Map(input.entries.map((entry) => [entry.id, entry]))
  const rankings = buildCompetitionRankingRows(input.leaderboard, entryById, teamByName, teamBySlug)
  const predictions = buildCompetitionPredictionRows(input.entries, input.questions, teamBySlug)
  const support = buildCompetitionSupport(input.entries, input.knockoutPickem)
  const isTournamentComplete = hasTournamentChampion(input.teams)

  return {
    status: {
      isPublic: input.isPublic,
      predictionDeadline: input.predictionDeadline,
      isTournamentComplete
    },
    support,
    battles: buildCompetitionBattles(rankings, input.entries, teamBySlug, input.knockoutPickem),
    collisions: buildCompetitionCollisions(rankings, support, teamBySlug, input.fixtures ?? [], input.now ?? new Date()),
    moments: buildCompetitionMoments(rankings, support, teamBySlug),
    rankings,
    predictions,
    winnerPodium: isTournamentComplete ? buildWinnerPodium(rankings) : []
  }
}

function hasTournamentChampion(teams: TeamDto[]) {
  return teams.some((team) => team.finishStage === 'champion')
}

function buildWinnerPodium(rows: CompetitionRankingRow[]): CompetitionWinnerPodiumEntry[] {
  return rows.slice(0, 3).map((row) => ({
    entryId: row.entryId,
    rank: row.rank,
    displayName: row.displayName,
    totalScore: row.totalScore
  }))
}

function buildPrivateCompetitionRankingRows(entries: EntryDto[]): CompetitionRankingRow[] {
  return entries.map((entry, index) => ({
    entryId: entry.id,
    rank: index + 1,
    displayName: entry.displayName,
    avatarKey: resolvePlayerAvatarKey(entry.avatarKey, entry.displayName),
    totalScore: 0,
    breakdown: []
  }))
}

export function buildCompetitionRankingRows(
  rows: LeaderboardRow[],
  entryByIdOrEntries: Map<string, EntryDto> | EntryDto[] = new Map(),
  teamByNameOrTeams: Map<string, TeamDto> | TeamDto[] = new Map(),
  teamBySlug: Map<string, TeamDto> = Array.isArray(teamByNameOrTeams)
    ? new Map(teamByNameOrTeams.map((team) => [team.slug, team]))
    : new Map()
): CompetitionRankingRow[] {
  const entryById = Array.isArray(entryByIdOrEntries)
    ? new Map(entryByIdOrEntries.map((entry) => [entry.id, entry]))
    : entryByIdOrEntries
  const teamByName = Array.isArray(teamByNameOrTeams)
    ? new Map(teamByNameOrTeams.map((team) => [team.name, team]))
    : teamByNameOrTeams

  return rows.map((row) => {
    const entry = entryById.get(row.entryId)

    return {
      entryId: row.entryId,
      rank: row.rank,
      displayName: row.displayName,
      avatarKey: resolvePlayerAvatarKey(row.avatarKey, row.displayName),
      totalScore: row.totalScore,
      breakdown: row.breakdown.map((item) => {
        const answer = entry?.answers.find((candidate) => candidate.questionKey === item.questionKey)
        const team = answer ? teamBySlug.get(answer.teamSlug) : teamByName.get(item.prediction)

        return {
          questionKey: item.questionKey,
          label: item.label,
          shortLabel: shortBreakdownLabel(item.questionKey),
          team: toTeamDisplay(team, item.prediction),
          points: item.points,
          maxPoints: item.maxPoints,
          scoreLabel: `+${item.points}`,
          resultLabel: item.result ?? item.status,
          isPending: item.status === 'Pending result' || item.status === 'Pending match results'
        }
      })
    }
  })
}

export function buildCompetitionBattles(
  rows: CompetitionRankingRow[],
  entries: EntryDto[],
  teamsOrMap: TeamDto[] | Map<string, TeamDto>,
  knockoutPickem: KnockoutPickemStateDto | null | undefined = null
): CompetitionBattle[] {
  if (rows.length < 2 || entries.length < 2 || !knockoutPickem) {
    return []
  }

  const teamBySlug = Array.isArray(teamsOrMap)
    ? new Map(teamsOrMap.map((team) => [team.slug, team]))
    : teamsOrMap
  const rowByEntryId = new Map(rows.map((row) => [row.entryId, row]))
  const entryById = new Map(entries.map((entry) => [entry.id, entry]))
  const allFixtures = knockoutPickem.windows.flatMap((window) => window.fixtures)
  const revealedFixtures = knockoutPickem.windows
    .filter((window) => window.isRevealed)
    .flatMap((window) => window.fixtures)
  const candidates = [
    ...buildSelectedTeamFixtureBattles(rows, entryById, teamBySlug, allFixtures),
    ...buildSelectedTeamVsPickemBattles(rows, entryById, teamBySlug, revealedFixtures),
    ...buildOppositePickemBattles(rows, entryById, teamBySlug, revealedFixtures)
  ]

  return candidates
    .sort(compareBattleCandidates)
    .filter(dedupeBattleCandidates())
    .slice(0, MAX_BATTLES)
    .map(({ evidenceWeight: _evidenceWeight, sortKey: _sortKey, ...battle }) => battle)
}

export function buildCompetitionCollisions(
  rows: CompetitionRankingRow[],
  support: CompetitionSupportDto,
  teamsOrMap: TeamDto[] | Map<string, TeamDto>,
  fixtures: LiveFixtureDto[],
  now = new Date()
): CompetitionCollision[] {
  if (rows.length < 2 || fixtures.length === 0) {
    return []
  }

  const teamBySlug = Array.isArray(teamsOrMap)
    ? new Map(teamsOrMap.map((team) => [team.slug, team]))
    : teamsOrMap
  const rowByEntryId = new Map(rows.map((row) => [row.entryId, row]))
  const candidates = fixtures
    .filter(hasTwoLiveFixtureTeams)
    .filter((fixture) => isCollisionScheduleFixture(fixture, now))
    .map((fixture) => buildCollisionCandidate(fixture, support, teamBySlug, rowByEntryId))
    .filter((collision): collision is CompetitionCollision => Boolean(collision))

  return candidates
    .sort(compareCollisionCandidates)
    .slice(0, MAX_COLLISIONS)
}

export function buildCompetitionPredictionRows(
  entries: EntryDto[],
  questions: QuestionDto[],
  teams: TeamDto[]
): CompetitionPredictionRow[]
export function buildCompetitionPredictionRows(
  entries: EntryDto[],
  questions: QuestionDto[],
  teamBySlug: Map<string, TeamDto>
): CompetitionPredictionRow[]
export function buildCompetitionPredictionRows(
  entries: EntryDto[],
  questions: QuestionDto[],
  teamsOrMap: TeamDto[] | Map<string, TeamDto>
): CompetitionPredictionRow[] {
  const teamBySlug = Array.isArray(teamsOrMap)
    ? new Map(teamsOrMap.map((team) => [team.slug, team]))
    : teamsOrMap

  return entries.map((entry) => ({
    entryId: entry.id,
    displayName: entry.displayName,
    avatarKey: resolvePlayerAvatarKey(entry.avatarKey, entry.displayName),
    picks: questions.map((question) => {
      const teamSlug = entry.answers.find((answer) => answer.questionKey === question.key)?.teamSlug
      const team = teamSlug ? teamBySlug.get(teamSlug) : undefined

      return {
        questionKey: question.key,
        label: shortQuestionLabel(question.key),
        team: toTeamDisplay(team, teamSlug ?? 'Pending')
      }
    })
  }))
}

export function buildCompetitionSupport(
  entries: EntryDto[],
  knockoutPickem: KnockoutPickemStateDto | null | undefined = null
): CompetitionSupportDto {
  const support = createEmptyCompetitionSupport()
  const revealedFixtureById = new Map<number, KnockoutFixtureDto>()

  for (const window of knockoutPickem?.windows ?? []) {
    if (!window.isRevealed) {
      continue
    }

    for (const fixture of window.fixtures.filter(hasTwoTeams)) {
      revealedFixtureById.set(fixture.fixtureId, fixture)
    }
  }

  for (const entry of entries) {
    const supporter = toCompetitionSupporter(entry)

    for (const answer of entry.answers) {
      if (!BALLOT_SUPPORT_QUESTIONS.has(answer.questionKey)) {
        continue
      }

      const item: CompetitionBallotSupport = {
        ...supporter,
        teamSlug: answer.teamSlug,
        questionKey: answer.questionKey as CompetitionBallotSupportQuestionKey
      }

      support.ballotTeams[answer.teamSlug] = [
        ...(support.ballotTeams[answer.teamSlug] ?? []),
        item
      ]
    }

    for (const pick of entry.knockoutPicks) {
      const fixture = revealedFixtureById.get(pick.fixtureId)

      if (!fixture || !fixtureContainsTeam(fixture, pick.winnerTeamSlug)) {
        continue
      }

      const fixtureKey = String(pick.fixtureId)
      const item: CompetitionPickemSupport = {
        ...supporter,
        fixtureId: pick.fixtureId,
        teamSlug: pick.winnerTeamSlug
      }

      support.pickemFixtures[fixtureKey] = support.pickemFixtures[fixtureKey] ?? {}
      support.pickemFixtures[fixtureKey][pick.winnerTeamSlug] = [
        ...(support.pickemFixtures[fixtureKey][pick.winnerTeamSlug] ?? []),
        item
      ]
    }
  }

  return support
}

export function buildCompetitionMoments(rows: CompetitionRankingRow[]): CompetitionMoment[]
export function buildCompetitionMoments(
  rows: CompetitionRankingRow[],
  support: CompetitionSupportDto,
  teamBySlug?: Map<string, TeamDto>
): CompetitionMoment[]
export function buildCompetitionMoments(
  rows: CompetitionRankingRow[],
  support = createEmptyCompetitionSupport(),
  teamBySlug = new Map<string, TeamDto>()
): CompetitionMoment[] {
  if (rows.length === 0) {
    return []
  }

  return [
    buildLeaderMoment(rows),
    buildSupportWaveMoment(support, teamBySlug),
    buildPickemSplitMoment(support, teamBySlug),
    buildTightRaceMoment(rows),
    buildTieMoment(rows),
    buildBestBreakdownMoment(rows, 'team_1', 'best_team_1', 'Team 1 hit'),
    buildBestBreakdownMoment(rows, 'team_2', 'best_team_2', 'Team 2 hit'),
    buildBestBreakdownMoment(rows, 'team_3', 'best_team_3', 'Team 3 hit'),
    buildBestBreakdownMoment(rows, 'team_4', 'best_team_4', 'Team 4 hit'),
    buildPendingSwingMoment(rows)
  ].filter((moment): moment is CompetitionMoment => Boolean(moment))
}

export function getTeamFlagEmoji(fifaCode: string) {
  return getTeamFlagMeta(fifaCode).flagEmoji
}

export function shortQuestionLabel(questionKey: QuestionKey) {
  return questionKey.replace('team_', 'T')
}

function shortBreakdownLabel(questionKey: CompetitionRankingRow['breakdown'][number]['questionKey']) {
  if (questionKey === 'group_pickem') {
    return 'Groups'
  }

  if (questionKey === 'knockout_pickem') {
    return 'KO'
  }

  return shortQuestionLabel(questionKey)
}

function toCompetitionSupporter(entry: EntryDto): CompetitionSupporter {
  return {
    entryId: entry.id,
    displayName: entry.displayName,
    avatarKey: resolvePlayerAvatarKey(entry.avatarKey, entry.displayName)
  }
}

function buildSupportWaveMoment(
  support: CompetitionSupportDto,
  teamBySlug: Map<string, TeamDto>
): CompetitionMoment | null {
  const strongest = Object.entries(support.ballotTeams)
    .map(([teamSlug, supporters]) => [
      teamSlug,
      supporters.filter((supporter) => POSITIVE_BALLOT_SUPPORT_QUESTIONS.has(supporter.questionKey))
    ] as const)
    .filter(([, supporters]) => supporters.length > 0)
    .sort(([firstSlug, firstSupporters], [secondSlug, secondSupporters]) => {
      if (firstSupporters.length !== secondSupporters.length) {
        return secondSupporters.length - firstSupporters.length
      }

      return firstSlug.localeCompare(secondSlug)
    })[0]

  if (!strongest) {
    return null
  }

  const [teamSlug, supporters] = strongest
  const team = teamName(teamBySlug, teamSlug)

  return {
    type: 'support_wave',
    title: 'Support wave',
    text: `${formatNames(supporters.map((supporter) => supporter.displayName))} ${supporters.length === 1 ? 'is' : 'are'} behind ${team}`,
    entryIds: supporters.map((supporter) => supporter.entryId),
    teamSlugs: [teamSlug],
    source: 'support',
    reason: 'A visible team has the most ballot support'
  }
}

function buildPickemSplitMoment(
  support: CompetitionSupportDto,
  teamBySlug: Map<string, TeamDto>
): CompetitionMoment | null {
  const split = Object.entries(support.pickemFixtures)
    .map(([fixtureId, supportByTeam]) => {
      const supportedTeams = Object.entries(supportByTeam)
        .filter(([, supporters]) => supporters.length > 0)
        .sort(([firstSlug, firstSupporters], [secondSlug, secondSupporters]) => {
          if (firstSupporters.length !== secondSupporters.length) {
            return secondSupporters.length - firstSupporters.length
          }

          return firstSlug.localeCompare(secondSlug)
        })

      return {
        fixtureId: Number(fixtureId),
        supportedTeams
      }
    })
    .filter((item) => item.supportedTeams.length > 1)
    .sort((first, second) => first.fixtureId - second.fixtureId)[0]

  if (!split) {
    return null
  }

  const [firstTeam, secondTeam] = split.supportedTeams

  if (!firstTeam || !secondTeam) {
    return null
  }

  const [firstTeamSlug, firstSupporters] = firstTeam
  const [secondTeamSlug, secondSupporters] = secondTeam

  return {
    type: 'pickem_split',
    title: "Pick'em split",
    text: `${formatNames(firstSupporters.map((supporter) => supporter.displayName))} picked ${teamName(teamBySlug, firstTeamSlug)}; ${formatNames(secondSupporters.map((supporter) => supporter.displayName))} picked ${teamName(teamBySlug, secondTeamSlug)}`,
    entryIds: [...firstSupporters, ...secondSupporters].map((supporter) => supporter.entryId),
    teamSlugs: [firstTeamSlug, secondTeamSlug],
    source: 'support',
    reason: "Revealed Pick'em choices support both teams in the same fixture"
  }
}

interface BattleCandidate extends CompetitionBattle {
  sortKey: string
  evidenceWeight: number
}

function buildSelectedTeamFixtureBattles(
  rows: CompetitionRankingRow[],
  entryById: Map<string, EntryDto>,
  teamBySlug: Map<string, TeamDto>,
  fixtures: KnockoutFixtureDto[]
): BattleCandidate[] {
  const candidates: BattleCandidate[] = []

  for (const fixture of fixtures.filter(hasTwoTeams)) {
    const homeBackers = rows.filter((row) => selectedTeamSlugs(entryById.get(row.entryId)).includes(fixture.homeTeamSlug))
    const awayBackers = rows.filter((row) => selectedTeamSlugs(entryById.get(row.entryId)).includes(fixture.awayTeamSlug))

    for (const homeBacker of homeBackers) {
      for (const awayBacker of awayBackers) {
        if (homeBacker.entryId === awayBacker.entryId) {
          continue
        }

        candidates.push(buildBattleCandidate({
          type: 'selected_team_fixture',
          title: 'Team collision',
          text: `${homeBacker.displayName} has ${teamName(teamBySlug, fixture.homeTeamSlug)}; ${awayBacker.displayName} has ${teamName(teamBySlug, fixture.awayTeamSlug)}. They meet in ${fixtureLabel(fixture)}.`,
          rows: [homeBacker, awayBacker],
          teamSlugs: [fixture.homeTeamSlug, fixture.awayTeamSlug],
          teamBySlug,
          fixture,
          source: 'fixtures',
          reason: 'Two ranked players picked teams facing each other in the same known fixture',
          evidenceWeight: 1
        }))
      }
    }
  }

  return candidates
}

function buildSelectedTeamVsPickemBattles(
  rows: CompetitionRankingRow[],
  entryById: Map<string, EntryDto>,
  teamBySlug: Map<string, TeamDto>,
  fixtures: KnockoutFixtureDto[]
): BattleCandidate[] {
  const candidates: BattleCandidate[] = []

  for (const fixture of fixtures.filter(hasTwoTeams)) {
    for (const backerRow of rows) {
      const backedTeamSlugs = selectedTeamSlugs(entryById.get(backerRow.entryId))
        .filter((teamSlug) => fixtureContainsTeam(fixture, teamSlug))

      for (const backedTeamSlug of backedTeamSlugs) {
        const opponentTeamSlug = opponentSlug(fixture, backedTeamSlug)

        if (!opponentTeamSlug) {
          continue
        }

        for (const pickerRow of rows) {
          if (pickerRow.entryId === backerRow.entryId) {
            continue
          }

          const pick = entryById.get(pickerRow.entryId)?.knockoutPicks.find((item) => item.fixtureId === fixture.fixtureId)

          if (pick?.winnerTeamSlug !== opponentTeamSlug) {
            continue
          }

          candidates.push(buildBattleCandidate({
            type: 'selected_team_vs_pickem',
            title: 'Picked against them',
            text: `${backerRow.displayName} has ${teamName(teamBySlug, backedTeamSlug)}; ${pickerRow.displayName} picked ${teamName(teamBySlug, opponentTeamSlug)} in ${fixtureLabel(fixture)}.`,
            rows: [backerRow, pickerRow],
            teamSlugs: [backedTeamSlug, opponentTeamSlug],
            teamBySlug,
            fixture,
            source: 'pickem',
            reason: 'One player picked a fixture team while another revealed pick chooses the opponent',
            evidenceWeight: 2
          }))
        }
      }
    }
  }

  return candidates
}

function buildOppositePickemBattles(
  rows: CompetitionRankingRow[],
  entryById: Map<string, EntryDto>,
  teamBySlug: Map<string, TeamDto>,
  fixtures: KnockoutFixtureDto[]
): BattleCandidate[] {
  const candidates: BattleCandidate[] = []

  for (const fixture of fixtures.filter(hasTwoTeams)) {
    for (let firstIndex = 0; firstIndex < rows.length - 1; firstIndex += 1) {
      const firstRow = rows[firstIndex]

      if (!firstRow) {
        continue
      }

      const firstPick = entryById.get(firstRow.entryId)?.knockoutPicks.find((item) => item.fixtureId === fixture.fixtureId)

      if (!firstPick || !fixtureContainsTeam(fixture, firstPick.winnerTeamSlug)) {
        continue
      }

      for (let secondIndex = firstIndex + 1; secondIndex < rows.length; secondIndex += 1) {
        const secondRow = rows[secondIndex]

        if (!secondRow) {
          continue
        }

        const secondPick = entryById.get(secondRow.entryId)?.knockoutPicks.find((item) => item.fixtureId === fixture.fixtureId)

        if (!secondPick || firstPick.winnerTeamSlug === secondPick.winnerTeamSlug || !fixtureContainsTeam(fixture, secondPick.winnerTeamSlug)) {
          continue
        }

        candidates.push(buildBattleCandidate({
          type: 'opposite_pickem',
          title: 'Bracket split',
          text: `${firstRow.displayName} picked ${teamName(teamBySlug, firstPick.winnerTeamSlug)}; ${secondRow.displayName} picked ${teamName(teamBySlug, secondPick.winnerTeamSlug)} in ${fixtureLabel(fixture)}.`,
          rows: [firstRow, secondRow],
          teamSlugs: [firstPick.winnerTeamSlug, secondPick.winnerTeamSlug],
          teamBySlug,
          fixture,
          source: 'pickem',
          reason: 'Two revealed knockout predictions choose opposite winners for the same fixture',
          evidenceWeight: 3
        }))
      }
    }
  }

  return candidates
}

function buildBattleCandidate(input: {
  type: CompetitionBattle['type']
  title: string
  text: string
  rows: [CompetitionRankingRow, CompetitionRankingRow]
  teamSlugs: [string, string]
  teamBySlug: Map<string, TeamDto>
  fixture: KnockoutFixtureDto
  source: CompetitionBattle['source']
  reason: string
  evidenceWeight: number
}): BattleCandidate {
  const scoreGap = Math.abs(input.rows[0].totalScore - input.rows[1].totalScore)
  const bestRank = Math.min(input.rows[0].rank, input.rows[1].rank)
  const sortedEntryIds = input.rows.map((row) => row.entryId).sort()
  const sortedTeamSlugs = input.teamSlugs.filter(Boolean).sort()

  return {
    type: input.type,
    title: input.title,
    text: `${input.text} ${gapSentence(scoreGap)}`,
    entryIds: input.rows.map((row) => row.entryId),
    teamSlugs: [...new Set(input.teamSlugs.filter(Boolean))],
    teams: [...new Map(input.teamSlugs.map((slug) => [slug, toTeamDisplay(input.teamBySlug.get(slug), slug)])).values()],
    fixtureId: input.fixture.fixtureId,
    fixtureLabel: fixtureLabel(input.fixture),
    scoreGap,
    bestRank,
    source: input.source,
    reason: input.reason,
    evidenceWeight: input.evidenceWeight,
    sortKey: `${input.fixture.fixtureId}:${input.type}:${sortedEntryIds.join(':')}:${sortedTeamSlugs.join(':')}`
  }
}

function compareBattleCandidates(first: BattleCandidate, second: BattleCandidate) {
  if (first.scoreGap !== second.scoreGap) {
    return first.scoreGap - second.scoreGap
  }

  if (first.bestRank !== second.bestRank) {
    return first.bestRank - second.bestRank
  }

  if (first.evidenceWeight !== second.evidenceWeight) {
    return second.evidenceWeight - first.evidenceWeight
  }

  return first.sortKey.localeCompare(second.sortKey)
}

function dedupeBattleCandidates() {
  const seen = new Set<string>()

  return (candidate: BattleCandidate) => {
    const pairKey = candidate.entryIds.slice().sort().join(':')
    const conflictKey = `${candidate.fixtureId}:${pairKey}`

    if (seen.has(conflictKey)) {
      return false
    }

    seen.add(conflictKey)
    return true
  }
}

function selectedTeamSlugs(entry: EntryDto | undefined) {
  return [...new Set(
    entry?.answers
      .filter((answer) => BALLOT_SUPPORT_QUESTIONS.has(answer.questionKey))
      .map((answer) => answer.teamSlug)
      .filter(Boolean) ?? []
  )]
}

function hasTwoTeams(fixture: KnockoutFixtureDto): fixture is KnockoutFixtureDto & { homeTeamSlug: string, awayTeamSlug: string } {
  return Boolean(fixture.homeTeamSlug && fixture.awayTeamSlug)
}

function hasTwoLiveFixtureTeams(fixture: LiveFixtureDto): fixture is LiveFixtureDto & { homeTeamSlug: string, awayTeamSlug: string } {
  return Boolean(fixture.homeTeamSlug && fixture.awayTeamSlug)
}

function isCollisionScheduleFixture(fixture: LiveFixtureDto, now: Date) {
  if (fixture.isLive) {
    return true
  }

  const kickoffAt = new Date(fixture.kickoffAt)
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000)

  if (kickoffAt < threeHoursAgo) {
    return false
  }

  return !['FT', 'AET', 'PEN', 'CANC', 'ABD', 'PST'].includes(fixture.statusShort.toUpperCase())
}

function buildCollisionCandidate(
  fixture: LiveFixtureDto & { homeTeamSlug: string, awayTeamSlug: string },
  support: CompetitionSupportDto,
  teamBySlug: Map<string, TeamDto>,
  rowByEntryId: Map<string, CompetitionRankingRow>
): CompetitionCollision | null {
  const homeSupporters = support.ballotTeams[fixture.homeTeamSlug] ?? []
  const awaySupporters = support.ballotTeams[fixture.awayTeamSlug] ?? []

  if (homeSupporters.length === 0 || awaySupporters.length === 0) {
    return null
  }

  const homeEntryIds = new Set(homeSupporters.map((supporter) => supporter.entryId))
  const awayEntryIds = new Set(awaySupporters.map((supporter) => supporter.entryId))
  const entryIds = [...new Set([...homeEntryIds, ...awayEntryIds])]
  const homeRows = [...homeEntryIds].map((entryId) => rowByEntryId.get(entryId)).filter((row): row is CompetitionRankingRow => Boolean(row))
  const awayRows = [...awayEntryIds].map((entryId) => rowByEntryId.get(entryId)).filter((row): row is CompetitionRankingRow => Boolean(row))
  const scoreGap = smallestScoreGap(homeRows, awayRows)
  const bestRank = Math.min(...[...homeRows, ...awayRows].map((row) => row.rank))
  const homeTeam = toTeamDisplay(teamBySlug.get(fixture.homeTeamSlug), fixture.homeTeamName)
  const awayTeam = toTeamDisplay(teamBySlug.get(fixture.awayTeamSlug), fixture.awayTeamName)

  return {
    type: 'team_fixture_collision',
    title: `${homeTeam.name} vs ${awayTeam.name}`,
    text: `${formatNames(homeSupporters.map((supporter) => supporter.displayName))} vs ${formatNames(awaySupporters.map((supporter) => supporter.displayName))}`,
    fixtureId: fixture.fixtureId,
    fixtureLabel: fixtureLabel(fixture),
    kickoffAt: fixture.kickoffAt,
    statusShort: fixture.statusShort,
    isLive: fixture.isLive,
    home: {
      team: homeTeam,
      supporters: homeSupporters
    },
    away: {
      team: awayTeam,
      supporters: awaySupporters
    },
    entryIds,
    teamSlugs: [fixture.homeTeamSlug, fixture.awayTeamSlug],
    totalSupporters: homeSupporters.length + awaySupporters.length,
    scoreGap,
    bestRank: Number.isFinite(bestRank) ? bestRank : 0,
    source: 'fixtures',
    reason: 'Both teams in this cached fixture have visible league ballot support'
  }
}

function smallestScoreGap(firstRows: CompetitionRankingRow[], secondRows: CompetitionRankingRow[]) {
  let smallest = Number.POSITIVE_INFINITY

  for (const first of firstRows) {
    for (const second of secondRows) {
      smallest = Math.min(smallest, Math.abs(first.totalScore - second.totalScore))
    }
  }

  return Number.isFinite(smallest) ? smallest : 0
}

function compareCollisionCandidates(first: CompetitionCollision, second: CompetitionCollision) {
  if (first.isLive !== second.isLive) {
    return first.isLive ? -1 : 1
  }

  const firstKickoff = new Date(first.kickoffAt).getTime()
  const secondKickoff = new Date(second.kickoffAt).getTime()

  if (firstKickoff !== secondKickoff) {
    return firstKickoff - secondKickoff
  }

  if (first.totalSupporters !== second.totalSupporters) {
    return second.totalSupporters - first.totalSupporters
  }

  if (first.scoreGap !== second.scoreGap) {
    return first.scoreGap - second.scoreGap
  }

  return first.fixtureId - second.fixtureId
}

function fixtureContainsTeam(fixture: FixtureTeams, teamSlug: string) {
  return fixture.homeTeamSlug === teamSlug || fixture.awayTeamSlug === teamSlug
}

function opponentSlug(fixture: FixtureTeams, teamSlug: string) {
  if (fixture.homeTeamSlug === teamSlug) {
    return fixture.awayTeamSlug
  }

  if (fixture.awayTeamSlug === teamSlug) {
    return fixture.homeTeamSlug
  }

  return null
}

function fixtureLabel(fixture: FixtureTeams) {
  const round = fixture.leagueRound ?? 'Knockout match'
  return `${round}: ${fixture.homeTeamName} vs ${fixture.awayTeamName}`
}

function teamName(teamBySlug: Map<string, TeamDto>, teamSlug: string) {
  return teamBySlug.get(teamSlug)?.name ?? teamSlug
}

function gapSentence(scoreGap: number) {
  if (scoreGap === 0) {
    return 'They are tied in the ranking.'
  }

  return `Only ${scoreGap} ${pointWord(scoreGap)} separate them.`
}

function buildLeaderMoment(rows: CompetitionRankingRow[]): CompetitionMoment | null {
  const leader = rows[0]

  if (!leader) {
    return null
  }

  return {
    type: 'leader',
    title: 'On top',
    text: `${leader.displayName} leads with ${leader.totalScore} pts`,
    entryIds: [leader.entryId],
    teamSlugs: [],
    source: 'leaderboard',
    reason: 'First row after leaderboard sorting by total score'
  }
}

function buildTightRaceMoment(rows: CompetitionRankingRow[]): CompetitionMoment | null {
  for (let index = 0; index < rows.length - 1; index += 1) {
    const ahead = rows[index]
    const behind = rows[index + 1]

    if (!ahead || !behind) {
      continue
    }

    const gap = ahead.totalScore - behind.totalScore

    if (gap > 0 && gap <= TIGHT_RACE_MAX_GAP) {
      return {
        type: 'tight_race',
        title: 'Tight race',
        text: `${ahead.displayName} is only ${gap} ${pointWord(gap)} ahead of ${behind.displayName}`,
        entryIds: [ahead.entryId, behind.entryId],
        teamSlugs: [],
        source: 'leaderboard',
        reason: `Adjacent leaderboard rows have a score gap <= ${TIGHT_RACE_MAX_GAP}`
      }
    }
  }

  return null
}

function buildTieMoment(rows: CompetitionRankingRow[]): CompetitionMoment | null {
  const rowsByScore = new Map<number, CompetitionRankingRow[]>()

  for (const row of rows) {
    rowsByScore.set(row.totalScore, [...(rowsByScore.get(row.totalScore) ?? []), row])
  }

  const tiedRows = [...rowsByScore.entries()]
    .sort(([scoreA], [scoreB]) => scoreB - scoreA)
    .find(([, group]) => group.length > 1)?.[1]

  if (!tiedRows) {
    return null
  }

  return {
    type: 'tie',
    title: 'Tied up',
    text: `${formatNames(tiedRows.map((row) => row.displayName))} are tied on ${tiedRows[0]?.totalScore ?? 0} pts`,
    entryIds: tiedRows.map((row) => row.entryId),
    teamSlugs: [],
    source: 'leaderboard',
    reason: 'Multiple leaderboard rows share the same total score'
  }
}

function buildBestBreakdownMoment(
  rows: CompetitionRankingRow[],
  questionKey: QuestionKey,
  type: CompetitionMomentType,
  title: string
): CompetitionMoment | null {
  const candidates = rows
    .map((row) => ({
      row,
      breakdown: row.breakdown.find((item) => item.questionKey === questionKey)
    }))
    .filter((item): item is { row: CompetitionRankingRow; breakdown: CompetitionRankingRow['breakdown'][number] } => {
      return Boolean(item.breakdown) && item.breakdown.points > 0
    })

  const maxPoints = Math.max(0, ...candidates.map((item) => item.breakdown.points))

  if (maxPoints === 0) {
    return null
  }

  const winners = candidates.filter((item) => item.breakdown.points === maxPoints)
  const teams = [...new Map(winners.map((item) => [item.breakdown.team.slug, item.breakdown.team])).values()]

  return {
    type,
    title,
    text: `${formatNames(winners.map((item) => item.row.displayName))} got +${maxPoints} from ${formatNames(teams.map((team) => team.name))}`,
    entryIds: winners.map((item) => item.row.entryId),
    teamSlugs: teams.map((team) => team.slug).filter(Boolean),
    source: 'breakdown',
    reason: `${shortQuestionLabel(questionKey)} has the highest current point value among entries`
  }
}

function buildPendingSwingMoment(rows: CompetitionRankingRow[]): CompetitionMoment | null {
  const entriesWithPending = rows.filter((row) => row.breakdown.some((item) => item.isPending))
  const pendingTeamSlugs = rows.flatMap((row) =>
    row.breakdown
      .filter((item) => item.isPending)
      .map((item) => item.team.slug)
      .filter(Boolean)
  )

  if (entriesWithPending.length === 0) {
    return null
  }

  return {
    type: 'pending_swing',
    title: 'Still open',
    text: `${entriesWithPending.length} ${entriesWithPending.length === 1 ? 'player has' : 'players have'} picks waiting on results`,
    entryIds: entriesWithPending.map((row) => row.entryId),
    teamSlugs: [...new Set(pendingTeamSlugs)],
    source: 'results',
    reason: 'At least one selected team has no standings or result yet'
  }
}

function toTeamDisplay(team: TeamDto | undefined, fallbackName: string): TeamDisplayDto {
  if (!team) {
    return {
      ...UNKNOWN_TEAM,
      name: fallbackName || UNKNOWN_TEAM.name
    }
  }

  const flag = getTeamFlagMeta(team.fifaCode)

  return {
    slug: team.slug,
    name: team.name,
    fifaCode: team.fifaCode,
    flagCode: flag.flagCode,
    flagEmoji: flag.flagEmoji,
    flagUrl: flag.flagUrl,
    logoUrl: team.logoUrl ?? null
  }
}

function formatNames(names: string[]) {
  const uniqueNames = [...new Set(names.filter(Boolean))]

  if (uniqueNames.length <= 2) {
    return uniqueNames.join(' and ')
  }

  if (uniqueNames.length === 3) {
    return `${uniqueNames[0]}, ${uniqueNames[1]} and ${uniqueNames[2]}`
  }

  return `${uniqueNames.slice(0, 2).join(', ')} +${uniqueNames.length - 2}`
}

function pointWord(points: number) {
  return points === 1 ? 'point' : 'pts'
}
