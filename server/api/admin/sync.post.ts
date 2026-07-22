import { z } from 'zod'
import { requireAdmin } from '../../utils/admin'
import { runFootballDataSync } from '../../utils/football-data-sync'

const bodySchema = z.object({
  job: z.enum(['daily', 'hourly', 'live', 'all']).default('daily')
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedBody(event, (value) => bodySchema.parse(value ?? {}))

  return runFootballDataSync(body.job, event)
})
