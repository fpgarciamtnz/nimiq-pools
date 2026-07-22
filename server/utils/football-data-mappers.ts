const LIVE_PROVIDER_STATUSES = new Set(['IN_PLAY', 'PAUSED', 'EXTRA_TIME', 'PENALTY_SHOOTOUT'])
export const LIVE_STATUS_CODES = new Set(['HT', 'LIVE', 'ET', 'P'])

export interface FootballDataTeamsPayload {
  teams: FootballDataTeamPayload[]
}

export interface FootballDataTeamPayload {
  id: number
  name: string
  tla?: string | null
  crest?: string | null
}

export interface FootballDataMatchesPayload {
  matches: FootballDataMatchPayload[]
}

export interface FootballDataMatchPayload {
  id: number
  utcDate: string
  status: string
  minute?: number | null
  stage?: string | null
  group?: string | null
  homeTeam: FootballDataMatchTeam
  awayTeam: FootballDataMatchTeam
  score: {
    winner?: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
    duration?: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT' | null
    fullTime?: FootballDataScore | null
    regularTime?: FootballDataScore | null
    extraTime?: FootballDataScore | null
    penalties?: FootballDataScore | null
  }
}

interface FootballDataMatchTeam {
  id?: number | null
  name: string | null
  tla?: string | null
}

interface FootballDataScore {
  home?: number | null
  away?: number | null
  homeTeam?: number | null
  awayTeam?: number | null
}

export interface FootballDataStandingsPayload {
  standings: Array<{
    stage?: string | null
    type?: string | null
    group?: string | null
    table: Array<{
      position: number
      team: {
        id?: number | null
        name: string
      }
      playedGames?: number | null
      form?: string | null
      won?: number | null
      draw?: number | null
      lost?: number | null
      points?: number | null
      goalsFor?: number | null
      goalsAgainst?: number | null
      goalDifference?: number | null
    }>
  }>
}

export function mapFixtureForCache(match: FootballDataMatchPayload, teamSlugByProviderId: Map<number, string>) {
  const homeTeamProviderId = match.homeTeam.id ?? null
  const awayTeamProviderId = match.awayTeam.id ?? null
  const statusShort = mapStatusShort(match)
  const goals = scoreWithoutShootoutGoals(match.score)

  return {
    fixtureId: match.id,
    leagueRound: stageLabel(match.stage, match.group),
    statusShort,
    statusLong: match.status,
    elapsed: match.minute ?? null,
    kickoffAt: new Date(match.utcDate),
    venueName: null,
    venueCity: null,
    homeTeamApiId: homeTeamProviderId,
    awayTeamApiId: awayTeamProviderId,
    homeTeamSlug: homeTeamProviderId ? teamSlugByProviderId.get(homeTeamProviderId) ?? null : null,
    awayTeamSlug: awayTeamProviderId ? teamSlugByProviderId.get(awayTeamProviderId) ?? null : null,
    homeTeamName: fixtureTeamName(match.homeTeam),
    awayTeamName: fixtureTeamName(match.awayTeam),
    homeGoals: goals.home,
    awayGoals: goals.away,
    penaltyHome: scoreHome(match.score.penalties),
    penaltyAway: scoreAway(match.score.penalties),
    isLive: LIVE_PROVIDER_STATUSES.has(match.status),
    sourceUpdatedAt: new Date()
  }
}

export function isExcludedFixtureForCache(match: Pick<FootballDataMatchPayload, 'stage'>) {
  return match.stage === 'THIRD_PLACE'
}

function fixtureTeamName(team: FootballDataMatchTeam) {
  return team.name?.trim() || team.tla?.trim() || 'TBD'
}

export function flattenStandings(response: FootballDataStandingsPayload, teamSlugByProviderId: Map<number, string>) {
  return response.standings.flatMap((standing) =>
    standing.table.map((row) => ({
      groupName: stageLabel(standing.stage, standing.group) ?? standing.type ?? 'Standings',
      rank: row.position,
      teamApiId: row.team.id ?? null,
      teamSlug: row.team.id ? teamSlugByProviderId.get(row.team.id) ?? null : null,
      teamName: row.team.name,
      points: row.points ?? 0,
      goalsDiff: row.goalDifference ?? 0,
      description: null,
      form: row.form ?? null,
      played: row.playedGames ?? 0,
      win: row.won ?? 0,
      draw: row.draw ?? 0,
      lose: row.lost ?? 0,
      goalsFor: row.goalsFor ?? 0,
      goalsAgainst: row.goalsAgainst ?? 0,
      sourceUpdatedAt: new Date()
    }))
  )
}

function mapStatusShort(match: FootballDataMatchPayload) {
  switch (match.status) {
    case 'FINISHED':
    case 'AWARDED':
      if (match.score.duration === 'PENALTY_SHOOTOUT') {
        return 'PEN'
      }

      if (match.score.duration === 'EXTRA_TIME') {
        return 'AET'
      }

      return 'FT'
    case 'PAUSED':
      return 'HT'
    case 'EXTRA_TIME':
      return 'ET'
    case 'PENALTY_SHOOTOUT':
      return 'P'
    case 'IN_PLAY':
      return 'LIVE'
    case 'SCHEDULED':
    case 'TIMED':
      return 'NS'
    case 'POSTPONED':
      return 'PST'
    case 'SUSPENDED':
    case 'CANCELLED':
      return 'CANC'
    default:
      return match.status
  }
}

function scoreHome(score: FootballDataScore | null | undefined) {
  return score?.home ?? score?.homeTeam ?? null
}

function scoreAway(score: FootballDataScore | null | undefined) {
  return score?.away ?? score?.awayTeam ?? null
}

function scoreWithoutShootoutGoals(score: FootballDataMatchPayload['score']) {
  if (score.duration !== 'PENALTY_SHOOTOUT') {
    return {
      home: scoreHome(score.fullTime),
      away: scoreAway(score.fullTime)
    }
  }

  const regularTime = scorePair(score.regularTime)
  const extraTime = scorePair(score.extraTime)

  if (regularTime || extraTime) {
    return {
      home: (regularTime?.home ?? 0) + (extraTime?.home ?? 0),
      away: (regularTime?.away ?? 0) + (extraTime?.away ?? 0)
    }
  }

  return {
    home: subtractShootoutGoals(scoreHome(score.fullTime), scoreHome(score.penalties)),
    away: subtractShootoutGoals(scoreAway(score.fullTime), scoreAway(score.penalties))
  }
}

function scorePair(score: FootballDataScore | null | undefined) {
  const home = scoreHome(score)
  const away = scoreAway(score)

  if (typeof home !== 'number' && typeof away !== 'number') {
    return null
  }

  return { home: home ?? 0, away: away ?? 0 }
}

function subtractShootoutGoals(fullTime: number | null, penalties: number | null) {
  if (typeof fullTime !== 'number') {
    return null
  }

  return typeof penalties === 'number' ? Math.max(0, fullTime - penalties) : fullTime
}

function stageLabel(stage: string | null | undefined, group: string | null | undefined) {
  if (stage === 'GROUP_STAGE') {
    return group ? formatEnumLabel(group) : 'Group Stage'
  }

  if (!stage) {
    return null
  }

  return formatEnumLabel(stage)
}

function formatEnumLabel(value: string) {
  return value
    .toLocaleLowerCase()
    .split('_')
    .map((item) => item.charAt(0).toLocaleUpperCase() + item.slice(1))
    .join(' ')
}
