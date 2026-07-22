import { z } from 'zod'
import { PLAYER_AVATAR_KEYS } from '../../shared/player-avatars'
import { requireAuthUser, assertSameOrigin } from '../utils/nimiq-auth'
import { saveUserPrediction } from '../utils/predictions'

const questionKey = z.enum(['team_1', 'team_2', 'team_3', 'team_4'])
const bodySchema = z.object({
  poolCode: z.string().trim().min(1),
  displayName: z.string().trim().min(2).max(80),
  avatarKey: z.enum(PLAYER_AVATAR_KEYS).optional(),
  answers: z.array(z.object({ questionKey, teamSlug: z.string().trim().min(1) })).length(4)
})

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const user = await requireAuthUser(event)
  const body = await readValidatedBody(event, (value) => bodySchema.parse(value))
  return { entry: await saveUserPrediction(user.id, body, event) }
})
