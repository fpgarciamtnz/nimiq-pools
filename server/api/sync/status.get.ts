import { mapApiSyncState } from '../../utils/mappers'
import { getPrisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const prisma = await getPrisma(event)
  const states = await prisma.apiSyncState.findMany({
    orderBy: { key: 'asc' }
  })
  const logs = await prisma.apiSyncLog.findMany({
    orderBy: { startedAt: 'desc' },
    take: 10
  })

  return {
    states: states.map(mapApiSyncState),
    logs: logs.map((log) => ({
      id: log.id,
      job: log.job,
      status: log.status,
      startedAt: log.startedAt.toISOString(),
      finishedAt: log.finishedAt?.toISOString() ?? null,
      requestCount: log.requestCount,
      dailyRemaining: log.dailyRemaining,
      minuteLimit: log.minuteLimit,
      minuteRemaining: log.minuteRemaining,
      message: log.message,
      error: log.error
    }))
  }
})
