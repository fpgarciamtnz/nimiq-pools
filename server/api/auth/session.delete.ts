import { clearAuthSession } from '../../utils/nimiq-auth'

export default defineEventHandler(async (event) => {
  await clearAuthSession(event)
  return { ok: true }
})
