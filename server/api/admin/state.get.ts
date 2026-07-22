import { buildLeaderboard, deriveResults, QUESTIONS } from '../../../shared/scoring'
import { requireAdmin } from '../../utils/admin'
import { getEntries, getGameConfig, getGroupStandings, getKnockoutPickemState, getTeamMatchStats, getTeams, getTournamentGroups, getVisibility } from '../../utils/game'
import { getPrisma } from '../../utils/db'
import { mapPool } from '../../utils/mappers'

export default defineEventHandler(async (event) => {
  const prisma = await getPrisma(event)
  requireAdmin(event)

  const config = await getGameConfig(event)
  const teams = await getTeams(event)
  const knockoutPickem = await getKnockoutPickemState(config.knockoutPickemEnabledAt, event)
  const [groups, groupStandings, teamStats] = await Promise.all([
    getTournamentGroups(event),
    getGroupStandings(event),
    getTeamMatchStats(event)
  ])
  const pools = await prisma.pool.findMany({
    orderBy: { createdAt: 'asc' }
  })

  const poolSummaries = await Promise.all(
    pools.map(async (pool) => {
      const entries = await getEntries(pool.id, event)
      const poolDto = mapPool(pool)

      return {
        pool: poolDto,
        entries,
        leaderboard: buildLeaderboard(entries, QUESTIONS, teams, {
          competitionMode: poolDto.competitionMode,
          groups: poolDto.competitionMode === 'ballot_pickem' ? groups : undefined,
          groupStandings: poolDto.competitionMode === 'ballot_pickem' ? groupStandings : undefined,
          teamStats,
          knockoutWindows: knockoutPickem.windows
        })
      }
    })
  )

  return {
    title: config.title,
    predictionDeadline: config.predictionDeadline.toISOString(),
    ...getVisibility(config.predictionDeadline),
    questions: QUESTIONS,
    teams,
    results: deriveResults(teams, teamStats),
    knockoutPickem,
    pools: poolSummaries
  }
})
