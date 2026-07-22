import type { H3Event } from 'h3'
import type { FootballDataAdminSyncStatusDto, ApiSyncLogDto } from '../../shared/types'
import { mapApiSyncMilestone, mapApiSyncState } from './mappers'
import { getPrisma } from './db'
import { getFootballDataConfig } from './football-data-config'
import { getAdminPin } from './admin'

interface ApiSyncLogRecord {
  id: string
  job: string
  status: string
  startedAt: Date
  finishedAt: Date | null
  requestCount: number
  dailyRemaining: string | null
  minuteLimit: string | null
  minuteRemaining: string | null
  message: string | null
  error: string | null
}

export async function getFootballDataAdminSyncStatus(event: H3Event): Promise<FootballDataAdminSyncStatusDto> {
  const prisma = await getPrisma(event)
  const apiConfig = getFootballDataConfig(event)
  const now = new Date()
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const states = await prisma.apiSyncState.findMany({
    orderBy: { key: 'asc' }
  })
  const logs = await prisma.apiSyncLog.findMany({
    orderBy: { startedAt: 'desc' },
    take: 10
  })
  const budget = await prisma.apiSyncLog.aggregate({
    where: {
      startedAt: { gte: todayStart }
    },
    _sum: {
      requestCount: true
    }
  })
  const latestQuotaLog = await prisma.apiSyncLog.findFirst({
    where: {
      dailyRemaining: { not: null }
    },
    orderBy: { startedAt: 'desc' }
  })
  const nextMilestones = await prisma.apiSyncMilestone.findMany({
    where: {
      status: { in: ['pending', 'failed'] },
      dueAt: { gte: now }
    },
    orderBy: { dueAt: 'asc' },
    take: 8
  })
  const recentMilestones = await prisma.apiSyncMilestone.findMany({
    where: {
      status: { not: 'pending' }
    },
    orderBy: { updatedAt: 'desc' },
    take: 8
  })

  return {
    states: states.map(mapApiSyncState),
    logs: logs.map(mapApiSyncLog),
    budget: {
      callsToday: budget._sum.requestCount ?? 0,
      dailyLimit: apiConfig.dailyLimit,
      latestDailyRemaining: latestQuotaLog?.dailyRemaining ?? null
    },
    milestones: {
      next: nextMilestones.map(mapApiSyncMilestone),
      recent: recentMilestones.map(mapApiSyncMilestone)
    },
    config: {
      hasFootballDataKey: Boolean(apiConfig.key),
      hasCronSecret: Boolean(apiConfig.cronSecret),
      usesDefaultAdminPin: getAdminPin(event) === 'change-me',
    }
  }
}

export function mapApiSyncLog(log: ApiSyncLogRecord): ApiSyncLogDto {
  return {
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
  }
}
