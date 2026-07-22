import { describe, expect, it, vi } from 'vitest'
import { FootballDataClient, FootballDataError } from '../server/utils/football-data-client'
import {
  isExcludedFixtureForCache,
  mapFixtureForCache,
  type FootballDataMatchPayload
} from '../server/utils/football-data-mappers'
import { mapLiveFixture } from '../server/utils/mappers'

function fixture(overrides: Partial<FootballDataMatchPayload> = {}): FootballDataMatchPayload {
  return {
    id: 123,
    utcDate: '2026-07-19T19:00:00Z',
    status: 'FINISHED',
    stage: 'FINAL',
    group: null,
    homeTeam: { id: 1, name: 'Argentina', tla: 'ARG' },
    awayTeam: { id: 2, name: 'France', tla: 'FRA' },
    score: {
      winner: 'HOME_TEAM',
      duration: 'REGULAR',
      fullTime: { home: 2, away: 1 },
      penalties: { home: null, away: null }
    },
    ...overrides
  }
}

describe('football-data.org client', () => {
  it('adds auth headers, query params, and exposes quota headers', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([{ ok: true }]), {
      status: 200,
      headers: {
        'x-requestsavailable': '99',
        'x-requestcounter-reset': '42'
      }
    })) as unknown as typeof fetch
    const client = new FootballDataClient({
      apiKey: 'secret',
      baseUrl: 'https://example.test',
      fetchImpl
    })

    const result = await client.get('/competitions/WC/matches', { season: 2026 })
    const [url, init] = vi.mocked(fetchImpl).mock.calls[0] ?? []

    expect(String(url)).toBe('https://example.test/competitions/WC/matches?season=2026')
    expect(init?.headers).toEqual({ 'X-Auth-Token': 'secret' })
    expect(result.data).toEqual([{ ok: true }])
    expect(result.rateLimit.dailyRemaining).toBe('99')
    expect(result.rateLimit.minuteRemaining).toBe('42')
  })

  it('does not retry rate-limited requests', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      message: 'rate limited'
    }), { status: 429 })) as unknown as typeof fetch
    const client = new FootballDataClient({
      apiKey: 'secret',
      baseUrl: 'https://example.test',
      fetchImpl,
      retryDelayMs: 0
    })

    await expect(client.get('/competitions/WC/matches')).rejects.toBeInstanceOf(FootballDataError)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('retries one transient server failure', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(['ok']), { status: 200 })) as unknown as typeof fetch
    const client = new FootballDataClient({
      apiKey: 'secret',
      baseUrl: 'https://example.test',
      fetchImpl,
      retryDelayMs: 0
    })

    await expect(client.get('/competitions/WC/matches')).resolves.toMatchObject({ data: ['ok'] })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
})

describe('football-data.org mappers', () => {
  it('maps matches into the local live-score cache shape', () => {
    expect(mapFixtureForCache(fixture({
      status: 'IN_PLAY',
      minute: 22,
      stage: 'GROUP_STAGE',
      group: 'GROUP_A'
    }), new Map([[1, 'argentina'], [2, 'france']]))).toEqual(expect.objectContaining({
      fixtureId: 123,
      leagueRound: 'Group A',
      statusShort: 'LIVE',
      elapsed: 22,
      homeTeamSlug: 'argentina',
      awayTeamSlug: 'france',
      homeGoals: 2,
      awayGoals: 1,
      isLive: true
    }))
  })

  it('keeps shootout goals out of the cached scoring totals', () => {
    expect(mapFixtureForCache(fixture({
      score: {
        winner: 'AWAY_TEAM',
        duration: 'PENALTY_SHOOTOUT',
        fullTime: { homeTeam: 6, awayTeam: 7 },
        regularTime: { homeTeam: 1, awayTeam: 1 },
        extraTime: { homeTeam: 0, awayTeam: 0 },
        penalties: { homeTeam: 4, awayTeam: 5 }
      }
    }), new Map([[1, 'argentina'], [2, 'france']]))).toEqual(expect.objectContaining({
      statusShort: 'PEN',
      homeGoals: 1,
      awayGoals: 1,
      penaltyHome: 4,
      penaltyAway: 5
    }))
  })

  it('marks the France–England third-place fixture as excluded from the cache', () => {
    expect(isExcludedFixtureForCache(fixture({
      stage: 'THIRD_PLACE',
      homeTeam: { id: 1, name: 'France', tla: 'FRA' },
      awayTeam: { id: 2, name: 'England', tla: 'ENG' }
    }))).toBe(true)
  })

  it('keeps unresolved knockout fixtures cacheable with display-safe team names', () => {
    expect(mapFixtureForCache(fixture({
      status: 'TIMED',
      stage: 'THIRD_PLACE',
      homeTeam: { id: null, name: null, tla: null },
      awayTeam: { id: null, name: '  ', tla: null }
    }), new Map())).toEqual(expect.objectContaining({
      leagueRound: 'Third Place',
      homeTeamApiId: null,
      awayTeamApiId: null,
      homeTeamSlug: null,
      awayTeamSlug: null,
      homeTeamName: 'TBD',
      awayTeamName: 'TBD'
    }))
  })

  it('maps cached live fixtures with team slugs for match support', () => {
    expect(mapLiveFixture({
      fixtureId: 123,
      leagueRound: 'Final',
      statusShort: 'NS',
      statusLong: 'TIMED',
      elapsed: null,
      kickoffAt: new Date('2026-07-19T19:00:00.000Z'),
      homeTeamSlug: 'argentina',
      awayTeamSlug: 'france',
      homeTeamName: 'Argentina',
      awayTeamName: 'France',
      homeGoals: null,
      awayGoals: null,
      penaltyHome: null,
      penaltyAway: null,
      isLive: false,
      sourceUpdatedAt: null,
      updatedAt: new Date('2026-07-18T19:00:00.000Z')
    })).toEqual(expect.objectContaining({
      fixtureId: 123,
      homeTeamSlug: 'argentina',
      awayTeamSlug: 'france'
    }))
  })
})
