interface Env {
  NIMIQ_POOLS_BASE_URL: string
  FOOTBALL_DATA_CRON_SECRET: string
  FOOTBALL_DATA_SCHEDULER_ENABLED?: string
}

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    if (env.FOOTBALL_DATA_SCHEDULER_ENABLED !== 'true') {
      return
    }

    ctx.waitUntil(runSmartSync(env))
  },

  async fetch(_request: Request) {
    return Response.json({ ok: true, service: 'football-data-scheduler' })
  }
}

async function runSmartSync(env: Env) {
  if (env.FOOTBALL_DATA_SCHEDULER_ENABLED !== 'true') {
    return
  }

  const baseUrl = env.NIMIQ_POOLS_BASE_URL?.replace(/\/$/, '')

  if (!baseUrl || !env.FOOTBALL_DATA_CRON_SECRET) {
    throw new Error('NIMIQ_POOLS_BASE_URL and FOOTBALL_DATA_CRON_SECRET must be configured')
  }

  const response = await fetch(`${baseUrl}/api/cron/football-data-smart-sync`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-cron-secret': env.FOOTBALL_DATA_CRON_SECRET
    },
    body: JSON.stringify({})
  })

  if (!response.ok) {
    throw new Error(`Smart sync request failed with HTTP ${response.status}: ${await response.text()}`)
  }
}
