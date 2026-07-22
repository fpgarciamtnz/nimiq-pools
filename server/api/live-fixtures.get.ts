import { mapLiveFixture } from '../utils/mappers'
import { getPrisma } from '../utils/db'

export default defineEventHandler(async (event) => {
  const prisma = await getPrisma(event)
  const now = new Date()
  const windowStart = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const fixtures = await prisma.apiFixture.findMany({
    where: {
      OR: [
        { isLive: true },
        {
          kickoffAt: {
            gte: windowStart,
            lte: windowEnd
          }
        }
      ]
    },
    orderBy: [
      { isLive: 'desc' },
      { kickoffAt: 'asc' }
    ]
  })

  return {
    fixtures: fixtures.map(mapLiveFixture),
    generatedAt: now.toISOString()
  }
})
