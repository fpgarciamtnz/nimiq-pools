import type { EntryDto, LeaderboardRow, PoolDto, PoolSummaryDto } from './types'

export function summarizePoolState(input: {
  pool: PoolDto
  isPublic: boolean
  entries: EntryDto[]
  leaderboard: LeaderboardRow[]
}): PoolSummaryDto {
  return {
    code: input.pool.code,
    title: input.pool.title,
    imageDataUrl: input.pool.imageDataUrl,
    createdAt: input.pool.createdAt,
    inviteUrl: `/invite/${input.pool.code}`,
    isPublic: input.isPublic,
    participantCount: input.entries.length,
    leader: input.leaderboard[0]
      ? {
          displayName: input.leaderboard[0].displayName,
          totalScore: input.leaderboard[0].totalScore
        }
      : null,
    topRows: input.leaderboard.slice(0, 3)
  }
}
