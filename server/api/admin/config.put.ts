import { z } from 'zod'
import { requireAdmin } from '../../utils/admin'
import { getGameConfig } from '../../utils/game'
import { getPrisma } from '../../utils/db'

const bodySchema = z.object({
  title: z.string().trim().min(2).max(120),
  predictionDeadline: z.string().datetime(),
  knockoutPickemEnabled: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const prisma = await getPrisma(event)
  requireAdmin(event)
  const body = await readValidatedBody(event, (value) => bodySchema.parse(value))
  const existingConfig = await getGameConfig(event)
  const knockoutPickemEnabledAt = body.knockoutPickemEnabled === undefined
    ? existingConfig.knockoutPickemEnabledAt
    : body.knockoutPickemEnabled
      ? existingConfig.knockoutPickemEnabledAt ?? new Date()
      : null

  const config = await prisma.gameConfig.update({
    where: { id: 1 },
    data: {
      title: body.title.trim(),
      predictionDeadline: new Date(body.predictionDeadline),
      knockoutPickemEnabledAt
    }
  })

  return {
    title: config.title,
    predictionDeadline: config.predictionDeadline.toISOString(),
    knockoutPickemEnabledAt: config.knockoutPickemEnabledAt?.toISOString() ?? null
  }
})
