import type {
  ApiSyncMilestoneDto,
  ApiSyncStatusDto,
  CompetitionMode,
  EntryDto,
  FinishStage,
  LiveFixtureDto,
  PoolDto,
  KnockoutPickemRoundKey,
  TeamDto,
  TeamTier,
  TournamentGroupDto
} from '../../shared/types'
import { normalizePlayerAvatarKey } from '../../shared/player-avatars'

interface TeamRecord {
  slug: string
  name: string
  fifaCode: string
  fifaRank: number
  qualifiedRankOrder: number
  tier: string
  footballDataId?: number | null
  logoUrl?: string | null
}

interface LiveFixtureRecord {
  fixtureId: number
  leagueRound: string | null
  statusShort: string
  statusLong: string
  elapsed: number | null
  kickoffAt: Date
  homeTeamSlug: string | null
  awayTeamSlug: string | null
  homeTeamName: string
  awayTeamName: string
  homeGoals: number | null
  awayGoals: number | null
  penaltyHome: number | null
  penaltyAway: number | null
  isLive: boolean
  sourceUpdatedAt: Date | null
  updatedAt: Date
}

interface ApiSyncStateRecord {
  key: string
  status: string
  lastStartedAt: Date | null
  lastFinishedAt: Date | null
  requestCount: number
  message: string | null
  error: string | null
}

interface ApiSyncMilestoneRecord {
  id: string
  fixtureId: number
  milestone: string
  dueAt: Date
  status: string
  attempts: number
  lastAttemptAt: Date | null
  completedAt: Date | null
  message: string | null
  error: string | null
}

interface EntryRecord {
  id: string
  displayName: string
  avatarKey?: string | null
  createdAt: Date
  updatedAt: Date
  answers: Array<{
    questionKey: string
    teamSlug: string
  }>
  groupPositionPicks?: Array<{
    groupId: string
    position: number
    teamSlug: string
  }>
  knockoutPicks?: Array<{
    fixtureId: number
    winnerTeamSlug: string
  }>
}

interface PoolRecord {
  code: string
  title: string
  imageDataUrl?: string | null
  competitionMode?: string
  knockoutPickemStartRound?: string | null
  createdAt: Date
}

interface TournamentGroupRecord {
  id: string
  name: string
  sortOrder: number
  teams: Array<{
    teamSlug: string
    sortOrder: number
  }>
}

export function mapTeam(team: TeamRecord): TeamDto {
  return {
    slug: team.slug,
    name: team.name,
    fifaCode: team.fifaCode,
    fifaRank: team.fifaRank,
    qualifiedRankOrder: team.qualifiedRankOrder,
    tier: team.tier as TeamTier,
    finishStage: null as FinishStage | null,
    guaranteedStage: null as FinishStage | null,
    footballDataId: team.footballDataId ?? null,
    logoUrl: team.logoUrl ?? null
  }
}

export function mapEntry(entry: EntryRecord): EntryDto {
  return {
    id: entry.id,
    displayName: entry.displayName,
    avatarKey: normalizePlayerAvatarKey(entry.avatarKey),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    answers: entry.answers.map((answer) => ({
      questionKey: answer.questionKey as EntryDto['answers'][number]['questionKey'],
      teamSlug: answer.teamSlug
    })),
    groupPositionPicks: (entry.groupPositionPicks ?? []).map((pick) => ({
      groupId: pick.groupId,
      position: pick.position,
      teamSlug: pick.teamSlug
    })),
    knockoutPicks: (entry.knockoutPicks ?? []).map((pick) => ({
      fixtureId: pick.fixtureId,
      winnerTeamSlug: pick.winnerTeamSlug
    }))
  }
}

export function mapPool(pool: PoolRecord): PoolDto {
  return {
    code: pool.code,
    title: pool.title,
    imageDataUrl: pool.imageDataUrl ?? null,
    competitionMode: (pool.competitionMode ?? 'ballot_only') as CompetitionMode,
    knockoutPickemStartRound: (pool.knockoutPickemStartRound ?? null) as KnockoutPickemRoundKey | null,
    createdAt: pool.createdAt.toISOString()
  }
}

export function mapTournamentGroup(group: TournamentGroupRecord): TournamentGroupDto {
  return {
    id: group.id,
    name: group.name,
    sortOrder: group.sortOrder,
    teams: group.teams
      .map((team) => ({
        teamSlug: team.teamSlug,
        sortOrder: team.sortOrder
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }
}

export function mapLiveFixture(fixture: LiveFixtureRecord): LiveFixtureDto {
  return {
    fixtureId: fixture.fixtureId,
    leagueRound: fixture.leagueRound,
    statusShort: fixture.statusShort,
    statusLong: fixture.statusLong,
    elapsed: fixture.elapsed,
    kickoffAt: fixture.kickoffAt.toISOString(),
    homeTeamSlug: fixture.homeTeamSlug,
    awayTeamSlug: fixture.awayTeamSlug,
    homeTeamName: fixture.homeTeamName,
    awayTeamName: fixture.awayTeamName,
    homeGoals: fixture.homeGoals,
    awayGoals: fixture.awayGoals,
    penaltyHome: fixture.penaltyHome,
    penaltyAway: fixture.penaltyAway,
    isLive: fixture.isLive,
    sourceUpdatedAt: fixture.sourceUpdatedAt?.toISOString() ?? null,
    updatedAt: fixture.updatedAt.toISOString()
  }
}

export function mapApiSyncState(state: ApiSyncStateRecord): ApiSyncStatusDto {
  return {
    key: state.key,
    status: state.status,
    lastStartedAt: state.lastStartedAt?.toISOString() ?? null,
    lastFinishedAt: state.lastFinishedAt?.toISOString() ?? null,
    requestCount: state.requestCount,
    message: state.message,
    error: state.error
  }
}

export function mapApiSyncMilestone(milestone: ApiSyncMilestoneRecord): ApiSyncMilestoneDto {
  return {
    id: milestone.id,
    fixtureId: milestone.fixtureId,
    milestone: milestone.milestone as ApiSyncMilestoneDto['milestone'],
    dueAt: milestone.dueAt.toISOString(),
    status: milestone.status,
    attempts: milestone.attempts,
    lastAttemptAt: milestone.lastAttemptAt?.toISOString() ?? null,
    completedAt: milestone.completedAt?.toISOString() ?? null,
    message: milestone.message,
    error: milestone.error
  }
}
