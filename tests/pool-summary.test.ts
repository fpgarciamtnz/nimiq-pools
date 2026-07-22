import { describe, expect, it } from 'vitest'
import { summarizePoolState } from '../shared/pool-summary'
import type { EntryDto, LeaderboardRow, PoolDto } from '../shared/types'

const pool: PoolDto = {
  code: 'office',
  title: 'Office Cup',
  imageDataUrl: 'data:image/png;base64,aGVsbG8=',
  competitionMode: 'ballot_only',
  knockoutPickemStartRound: null,
  createdAt: '2026-05-01T00:00:00.000Z'
}

const entry: EntryDto = {
  id: 'entry-one',
  displayName: 'Ana',
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
  answers: [
    { questionKey: 'team_1', teamSlug: 'france' },
    { questionKey: 'team_2', teamSlug: 'japan' },
    { questionKey: 'team_3', teamSlug: 'ghana' },
    { questionKey: 'team_4', teamSlug: 'spain' }
  ],
  groupPositionPicks: [],
  knockoutPicks: []
}

const leaderboardRow: LeaderboardRow = {
  entryId: 'entry-one',
  displayName: 'Ana',
  totalScore: 24,
  rank: 1,
  categoryScores: {
    ballot: 24,
    groups: 0,
    knockouts: 0
  },
  breakdown: []
}

describe('pool summary shaping', () => {
  it('hides private entries before the deadline when given no public rows', () => {
    expect(summarizePoolState({
      pool,
      isPublic: false,
      entries: [],
      leaderboard: []
    })).toEqual({
      code: 'office',
      title: 'Office Cup',
      imageDataUrl: pool.imageDataUrl,
      createdAt: pool.createdAt,
      inviteUrl: '/invite/office',
      isPublic: false,
      participantCount: 0,
      leader: null,
      topRows: []
    })
  })

  it('shows participant count, leader, and top rows after the deadline', () => {
    const summary = summarizePoolState({
      pool,
      isPublic: true,
      entries: [entry],
      leaderboard: [leaderboardRow]
    })

    expect(summary.participantCount).toBe(1)
    expect(summary.leader).toEqual({ displayName: 'Ana', totalScore: 24 })
    expect(summary.topRows).toEqual([leaderboardRow])
  })
})
