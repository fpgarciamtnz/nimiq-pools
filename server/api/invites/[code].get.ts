import { z } from 'zod'
import { getPoolState } from '../../utils/game'
import { requireAuthUser } from '../../utils/nimiq-auth'

const paramsSchema = z.object({
  code: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const params = await getValidatedRouterParams(event, (value) => paramsSchema.parse(value))
  return getPoolState(params.code, { userId: user.id }, event)
})
