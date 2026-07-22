import { z } from 'zod'
import { requireAdmin } from '../../../utils/admin'
import { getPrisma } from '../../../utils/db'

const paramsSchema = z.object({
  id: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const prisma = await getPrisma(event)
  requireAdmin(event)
  const params = await getValidatedRouterParams(event, (value) => paramsSchema.parse(value))

  await prisma.predictionEntry.delete({
    where: { id: params.id }
  })

  return { ok: true }
})
