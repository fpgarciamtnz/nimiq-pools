import { z } from 'zod'
import { getUserPoolSummaries } from '../../utils/game'
import { requireAuthUser } from '../../utils/nimiq-auth'

const bodySchema = z.object({
  codes: z.array(z.string().trim().min(1)).max(24)
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  await readValidatedBody(event, (value) => bodySchema.parse(value))

  return {
    pools: await getUserPoolSummaries(user.id, event)
  }
})
