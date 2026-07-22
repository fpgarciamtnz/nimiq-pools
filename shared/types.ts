import type { PlayerAvatarKey } from './player-avatars'

export interface AuthUserDto {
  id: string
  address: string
  publicKey: string
}

export type QuestionKey = 'team_1' | 'team_2' | 'team_3' | 'team_4'

export type CompetitionMode = 'ballot_only' | 'ballot_pickem'

export type TeamTier = 'TOP' | 'MIDDLE' | 'BOTTOM'

export type FinishStage =
  | 'group'
  | 'round_of_32'
  | 'round_of_16'
  | 'quarterfinal'
  | 'semifinalist'
  | 'runner_up'
  | 'champion'

export interface TeamDto {
  slug: string
  name: string
  fifaCode: string
  fifaRank: number
  qualifiedRankOrder: number
  tier: TeamTier
  finishStage: FinishStage | null
  guaranteedStage: FinishStage | null
  footballDataId?: number | null
  logoUrl?: string | null
}

export interface TournamentGroupTeamDto {
  teamSlug: string
  sortOrder: number
}

export interface TournamentGroupDto {
  id: string
  name: string
  sortOrder: number
  teams: TournamentGroupTeamDto[]
}

export interface GroupPositionPickDto {
  groupId: string
  position: number
  teamSlug: string
}

export interface KnockoutPickDto {
  fixtureId: number
  winnerTeamSlug: string
}

export interface KnockoutFixtureDto {
  fixtureId: number
  kickoffAt: string
  leagueRound: string | null
  homeTeamSlug: string | null
  awayTeamSlug: string | null
  homeTeamName: string
  awayTeamName: string
  homeGoals: number | null
  awayGoals: number | null
  penaltyHome: number | null
  penaltyAway: number | null
  statusShort: string
  winnerTeamSlug: string | null
}

export type KnockoutPickemRoundKey = 'round_of_32' | 'round_of_16' | 'quarterfinal' | 'semifinal' | 'final'

export type KnockoutPickemStatus = 'disabled' | 'pending' | 'open' | 'locked'

export interface KnockoutPickemWindowDto {
  roundKey: KnockoutPickemRoundKey
  label: string
  lockAt: string
  isOpen: boolean
  isLocked: boolean
  isRevealed: boolean
  fixtures: KnockoutFixtureDto[]
}

export interface KnockoutPickemStateDto {
  enabled: boolean
  enabledAt: string | null
  status: KnockoutPickemStatus
  reason: string
  activeWindow: KnockoutPickemWindowDto | null
  windows: KnockoutPickemWindowDto[]
}

export interface KnockoutWindowDto {
  key: 'round_of_32' | 'round_of_16' | 'quarterfinal' | 'semifinalist' | 'champion'
  label: string
  cap: number
  lockAt: string | null
  isLocked: boolean
  isRevealed: boolean
  fixtures: KnockoutFixtureDto[]
}

export interface TeamDisplayDto {
  slug: string
  name: string
  fifaCode: string
  flagCode: string | null
  flagEmoji: string
  flagUrl: string | null
  logoUrl?: string | null
}

export interface QuestionDto {
  key: QuestionKey
  label: string
  description: string
  points: number
}

export interface AnswerDto {
  questionKey: QuestionKey
  teamSlug: string
}

export interface EntryDto {
  id: string
  displayName: string
  avatarKey: PlayerAvatarKey | null
  createdAt: string
  updatedAt: string
  answers: AnswerDto[]
  groupPositionPicks: GroupPositionPickDto[]
  knockoutPicks: KnockoutPickDto[]
}

export interface PoolDto {
  code: string
  title: string
  imageDataUrl: string | null
  competitionMode: CompetitionMode
  knockoutPickemStartRound: KnockoutPickemRoundKey | null
  createdAt: string
}

export interface DerivedResultsDto {
  complete: Record<QuestionKey, boolean>
}

export interface LeaderboardRow {
  entryId: string
  displayName: string
  avatarKey: PlayerAvatarKey
  totalScore: number
  rank: number
  categoryScores: {
    ballot: number
    groups: number
    knockouts: number
  }
  breakdown: Array<{
    questionKey: QuestionKey | 'group_pickem' | 'knockout_pickem'
    label: string
    points: number
    maxPoints: number
    prediction: string
    result: string | null
    status: string
  }>
}

export type CompetitionMomentType =
  | 'leader'
  | 'tight_race'
  | 'tie'
  | 'best_team_1'
  | 'best_team_2'
  | 'best_team_3'
  | 'best_team_4'
  | 'pending_swing'
  | 'support_wave'
  | 'pickem_split'

export interface CompetitionMoment {
  type: CompetitionMomentType
  title: string
  text: string
  entryIds: string[]
  teamSlugs: string[]
  source: 'leaderboard' | 'breakdown' | 'results' | 'support'
  reason: string
}

export type CompetitionBallotSupportQuestionKey = QuestionKey

export interface CompetitionSupporter {
  entryId: string
  displayName: string
  avatarKey: PlayerAvatarKey
}

export interface CompetitionBallotSupport extends CompetitionSupporter {
  teamSlug: string
  questionKey: CompetitionBallotSupportQuestionKey
}

export interface CompetitionPickemSupport extends CompetitionSupporter {
  fixtureId: number
  teamSlug: string
}

export interface CompetitionSupportDto {
  ballotTeams: Record<string, CompetitionBallotSupport[]>
  pickemFixtures: Record<string, Record<string, CompetitionPickemSupport[]>>
}

export type CompetitionBattleType =
  | 'selected_team_fixture'
  | 'selected_team_vs_pickem'
  | 'opposite_pickem'

export interface CompetitionBattle {
  type: CompetitionBattleType
  title: string
  text: string
  entryIds: string[]
  teamSlugs: string[]
  teams: TeamDisplayDto[]
  fixtureId: number
  fixtureLabel: string
  scoreGap: number
  bestRank: number
  source: 'fixtures' | 'pickem'
  reason: string
}

export interface CompetitionCollisionSide {
  team: TeamDisplayDto
  supporters: CompetitionBallotSupport[]
}

export interface CompetitionCollision {
  type: 'team_fixture_collision'
  title: string
  text: string
  fixtureId: number
  fixtureLabel: string
  kickoffAt: string
  statusShort: string
  isLive: boolean
  home: CompetitionCollisionSide
  away: CompetitionCollisionSide
  entryIds: string[]
  teamSlugs: string[]
  totalSupporters: number
  scoreGap: number
  bestRank: number
  source: 'fixtures'
  reason: string
}

export interface CompetitionBreakdownItem {
  questionKey: QuestionKey | 'group_pickem' | 'knockout_pickem'
  label: string
  shortLabel: string
  team: TeamDisplayDto
  points: number
  maxPoints: number
  scoreLabel: string
  resultLabel: string
  isPending: boolean
}

export interface CompetitionRankingRow {
  entryId: string
  rank: number
  displayName: string
  avatarKey: PlayerAvatarKey
  totalScore: number
  breakdown: CompetitionBreakdownItem[]
}

export interface CompetitionPredictionRow {
  entryId: string
  displayName: string
  avatarKey: PlayerAvatarKey
  picks: Array<{
    questionKey: QuestionKey
    label: string
    team: TeamDisplayDto
  }>
}

export interface CompetitionWinnerPodiumEntry {
  entryId: string
  rank: number
  displayName: string
  totalScore: number
}

export interface CompetitionViewDto {
  status: {
    isPublic: boolean
    predictionDeadline: string
    isTournamentComplete: boolean
  }
  support: CompetitionSupportDto
  battles: CompetitionBattle[]
  collisions: CompetitionCollision[]
  moments: CompetitionMoment[]
  rankings: CompetitionRankingRow[]
  predictions: CompetitionPredictionRow[]
  winnerPodium: CompetitionWinnerPodiumEntry[]
}

export interface PoolSummaryDto {
  code: string
  title: string
  imageDataUrl: string | null
  createdAt: string
  inviteUrl: string
  isPublic: boolean
  participantCount: number
  leader: {
    displayName: string
    totalScore: number
  } | null
  topRows: LeaderboardRow[]
}

export interface GameStateDto {
  title: string
  predictionDeadline: string
  isLocked: boolean
  isPublic: boolean
  questions: QuestionDto[]
  teams: TeamDto[]
  knockoutPickem: KnockoutPickemStateDto
}

export interface LiveFixtureDto {
  fixtureId: number
  leagueRound: string | null
  statusShort: string
  statusLong: string
  elapsed: number | null
  kickoffAt: string
  homeTeamSlug: string | null
  awayTeamSlug: string | null
  homeTeamName: string
  awayTeamName: string
  homeGoals: number | null
  awayGoals: number | null
  penaltyHome: number | null
  penaltyAway: number | null
  isLive: boolean
  sourceUpdatedAt: string | null
  updatedAt: string
}

export interface ApiSyncStatusDto {
  key: string
  status: string
  lastStartedAt: string | null
  lastFinishedAt: string | null
  requestCount: number
  message: string | null
  error: string | null
}

export interface ApiSyncLogDto {
  id: string
  job: string
  status: string
  startedAt: string
  finishedAt: string | null
  requestCount: number
  dailyRemaining: string | null
  minuteLimit: string | null
  minuteRemaining: string | null
  message: string | null
  error: string | null
}

export type ApiSyncMilestoneKey =
  | 'pregame_check'
  | 'kickoff_check'
  | 'halftime'
  | 'live_watch'
  | 'fulltime'
  | 'final_backup'
  | 'late_settlement'

export interface ApiSyncMilestoneDto {
  id: string
  fixtureId: number
  milestone: ApiSyncMilestoneKey
  dueAt: string
  status: string
  attempts: number
  lastAttemptAt: string | null
  completedAt: string | null
  message: string | null
  error: string | null
}

export interface FootballDataAdminSyncStatusDto {
  states: ApiSyncStatusDto[]
  logs: ApiSyncLogDto[]
  budget: {
    callsToday: number
    dailyLimit: number
    latestDailyRemaining: string | null
  }
  milestones: {
    next: ApiSyncMilestoneDto[]
    recent: ApiSyncMilestoneDto[]
  }
  config: {
    hasFootballDataKey: boolean
    hasCronSecret: boolean
    usesDefaultAdminPin: boolean
  }
}
