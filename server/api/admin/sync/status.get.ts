import { requireAdmin } from '../../../utils/admin'
import { getFootballDataAdminSyncStatus } from '../../../utils/football-data-status'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  return getFootballDataAdminSyncStatus(event)
})
