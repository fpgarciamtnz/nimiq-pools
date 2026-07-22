import { z } from 'zod'
import { normalizePoolImageDataUrl } from '../../shared/pool-image'
import { COMPETITION_MODES, KNOCKOUT_PICKEM_START_ROUNDS } from '../../shared/validation'
import { createPool } from '../utils/game'
import { mapPool } from '../utils/mappers'
import { assertSameOrigin, requireAuthUser } from '../utils/nimiq-auth'

const bodySchema = z.object({
  title: z.string().trim().min(2).max(80).default('World Cup Pick Party'),
  imageDataUrl: z.unknown().optional(),
  competitionMode: z.enum(COMPETITION_MODES).default('ballot_only'),
  knockoutPickemStartRound: z.enum(KNOCKOUT_PICKEM_START_ROUNDS).nullable().optional()
}).superRefine((body, context) => {
  if (body.competitionMode === 'ballot_pickem' && !body.knockoutPickemStartRound) {
    context.addIssue({
      code: 'custom',
      path: ['knockoutPickemStartRound'],
      message: "Pick'em leagues need a start round"
    })
  }

  if (body.competitionMode === 'ballot_only' && body.knockoutPickemStartRound) {
    context.addIssue({
      code: 'custom',
      path: ['knockoutPickemStartRound'],
      message: "Ballot-only leagues cannot have a Pick'em start round"
    })
  }
})

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const user = await requireAuthUser(event)
  const body = await readValidatedBody(event, (value) => bodySchema.parse(value))
  const imageDataUrl = normalizeImageDataUrl(body.imageDataUrl)
  const pool = await createPool(body.title.trim(), user.id, {
    imageDataUrl,
    competitionMode: body.competitionMode,
    knockoutPickemStartRound: body.knockoutPickemStartRound ?? null
  }, event)

  return {
    pool: mapPool(pool),
    inviteUrl: `/invite/${pool.code}`
  }
})

function normalizeImageDataUrl(value: unknown) {
  try {
    return normalizePoolImageDataUrl(value)
  } catch {
    throw createError({
      statusCode: 400,
      statusText: 'League image is invalid'
    })
  }
}
