import { getUserPoolSummaries } from '../../utils/game'
import { requireAuthUser } from '../../utils/nimiq-auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  return { pools: await getUserPoolSummaries(user.id, event) }
})
