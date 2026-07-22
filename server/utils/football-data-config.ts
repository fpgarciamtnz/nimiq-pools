import type { H3Event } from 'h3'

interface FootballDataRuntimeConfig {
  key: string
  baseUrl: string
  competitionCode: string
  season: number
  cronSecret: string
  dailyLimit: number
  dailyReserve: number
}

interface CloudflareFootballDataEnv {
  FOOTBALL_DATA_KEY?: string
  FOOTBALL_DATA_BASE_URL?: string
  FOOTBALL_DATA_COMPETITION_CODE?: string
  FOOTBALL_DATA_SEASON?: string
  FOOTBALL_DATA_CRON_SECRET?: string
  FOOTBALL_DATA_DAILY_LIMIT?: string
  FOOTBALL_DATA_DAILY_RESERVE?: string
}

export function getFootballDataConfig(event?: H3Event) {
  const runtime = useRuntimeConfig(event).footballData as FootballDataRuntimeConfig
  const env = (event?.context as { cloudflare?: { env?: CloudflareFootballDataEnv } } | undefined)?.cloudflare?.env

  return {
    key: env?.FOOTBALL_DATA_KEY || runtime.key,
    baseUrl: env?.FOOTBALL_DATA_BASE_URL || runtime.baseUrl,
    competitionCode: env?.FOOTBALL_DATA_COMPETITION_CODE || runtime.competitionCode,
    season: readNumber(env?.FOOTBALL_DATA_SEASON, runtime.season),
    cronSecret: env?.FOOTBALL_DATA_CRON_SECRET || runtime.cronSecret,
    dailyLimit: readNumber(env?.FOOTBALL_DATA_DAILY_LIMIT, runtime.dailyLimit),
    dailyReserve: readNumber(env?.FOOTBALL_DATA_DAILY_RESERVE, runtime.dailyReserve)
  }
}

function readNumber(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
