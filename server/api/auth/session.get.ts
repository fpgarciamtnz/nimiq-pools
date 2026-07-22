import { getOptionalAuthUser } from '../../utils/nimiq-auth'

export default defineEventHandler(async (event) => ({
  user: await getOptionalAuthUser(event)
}))
