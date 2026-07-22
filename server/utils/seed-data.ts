import { normalizeDisplayName } from '../../shared/scoring'
import { BETA_ENTRY_SELECTIONS } from '../../shared/beta-entries'
import type { TeamTier } from '../../shared/types'
import type { AppPrisma } from './db'

const rawTeams = [
  { slug: 'france', name: 'France', fifaCode: 'FRA', fifaRank: 1 },
  { slug: 'spain', name: 'Spain', fifaCode: 'ESP', fifaRank: 2 },
  { slug: 'argentina', name: 'Argentina', fifaCode: 'ARG', fifaRank: 3 },
  { slug: 'england', name: 'England', fifaCode: 'ENG', fifaRank: 4 },
  { slug: 'portugal', name: 'Portugal', fifaCode: 'POR', fifaRank: 5 },
  { slug: 'brazil', name: 'Brazil', fifaCode: 'BRA', fifaRank: 6 },
  { slug: 'netherlands', name: 'Netherlands', fifaCode: 'NED', fifaRank: 7 },
  { slug: 'morocco', name: 'Morocco', fifaCode: 'MAR', fifaRank: 8 },
  { slug: 'belgium', name: 'Belgium', fifaCode: 'BEL', fifaRank: 9 },
  { slug: 'germany', name: 'Germany', fifaCode: 'GER', fifaRank: 10 },
  { slug: 'croatia', name: 'Croatia', fifaCode: 'CRO', fifaRank: 11 },
  { slug: 'colombia', name: 'Colombia', fifaCode: 'COL', fifaRank: 13 },
  { slug: 'senegal', name: 'Senegal', fifaCode: 'SEN', fifaRank: 14 },
  { slug: 'mexico', name: 'Mexico', fifaCode: 'MEX', fifaRank: 15 },
  { slug: 'united-states', name: 'United States', fifaCode: 'USA', fifaRank: 16 },
  { slug: 'uruguay', name: 'Uruguay', fifaCode: 'URU', fifaRank: 17 },
  { slug: 'japan', name: 'Japan', fifaCode: 'JPN', fifaRank: 18 },
  { slug: 'switzerland', name: 'Switzerland', fifaCode: 'SUI', fifaRank: 19 },
  { slug: 'ir-iran', name: 'IR Iran', fifaCode: 'IRN', fifaRank: 21 },
  { slug: 'turkiye', name: 'Turkiye', fifaCode: 'TUR', fifaRank: 22 },
  { slug: 'ecuador', name: 'Ecuador', fifaCode: 'ECU', fifaRank: 23 },
  { slug: 'austria', name: 'Austria', fifaCode: 'AUT', fifaRank: 24 },
  { slug: 'korea-republic', name: 'Korea Republic', fifaCode: 'KOR', fifaRank: 25 },
  { slug: 'australia', name: 'Australia', fifaCode: 'AUS', fifaRank: 27 },
  { slug: 'algeria', name: 'Algeria', fifaCode: 'ALG', fifaRank: 28 },
  { slug: 'egypt', name: 'Egypt', fifaCode: 'EGY', fifaRank: 29 },
  { slug: 'canada', name: 'Canada', fifaCode: 'CAN', fifaRank: 30 },
  { slug: 'norway', name: 'Norway', fifaCode: 'NOR', fifaRank: 31 },
  { slug: 'panama', name: 'Panama', fifaCode: 'PAN', fifaRank: 33 },
  { slug: 'cote-divoire', name: "Cote d'Ivoire", fifaCode: 'CIV', fifaRank: 34 },
  { slug: 'sweden', name: 'Sweden', fifaCode: 'SWE', fifaRank: 38 },
  { slug: 'paraguay', name: 'Paraguay', fifaCode: 'PAR', fifaRank: 40 },
  { slug: 'czechia', name: 'Czechia', fifaCode: 'CZE', fifaRank: 41 },
  { slug: 'scotland', name: 'Scotland', fifaCode: 'SCO', fifaRank: 43 },
  { slug: 'tunisia', name: 'Tunisia', fifaCode: 'TUN', fifaRank: 44 },
  { slug: 'congo-dr', name: 'Congo DR', fifaCode: 'COD', fifaRank: 46 },
  { slug: 'uzbekistan', name: 'Uzbekistan', fifaCode: 'UZB', fifaRank: 50 },
  { slug: 'qatar', name: 'Qatar', fifaCode: 'QAT', fifaRank: 55 },
  { slug: 'iraq', name: 'Iraq', fifaCode: 'IRQ', fifaRank: 57 },
  { slug: 'south-africa', name: 'South Africa', fifaCode: 'RSA', fifaRank: 60 },
  { slug: 'saudi-arabia', name: 'Saudi Arabia', fifaCode: 'KSA', fifaRank: 61 },
  { slug: 'jordan', name: 'Jordan', fifaCode: 'JOR', fifaRank: 63 },
  { slug: 'bosnia-and-herzegovina', name: 'Bosnia and Herzegovina', fifaCode: 'BIH', fifaRank: 65 },
  { slug: 'cabo-verde', name: 'Cabo Verde', fifaCode: 'CPV', fifaRank: 69 },
  { slug: 'ghana', name: 'Ghana', fifaCode: 'GHA', fifaRank: 74 },
  { slug: 'curacao', name: 'Curacao', fifaCode: 'CUW', fifaRank: 82 },
  { slug: 'haiti', name: 'Haiti', fifaCode: 'HAI', fifaRank: 83 },
  { slug: 'new-zealand', name: 'New Zealand', fifaCode: 'NZL', fifaRank: 85 }
]

const teams = [...rawTeams]
  .sort((a, b) => a.fifaRank - b.fifaRank || a.name.localeCompare(b.name))
  .map((team, index) => ({
    ...team,
    qualifiedRankOrder: index + 1,
    tier: tierForQualifiedOrder(index + 1)
  }))

const legacyDemoDeadline = new Date('2026-05-01T18:00:00.000Z')
const openDemoDeadline = new Date('2026-06-11T18:00:00.000Z')

export async function ensureSeedData(prisma: AppPrisma) {
  await ensureGameConfig(prisma)

  const teamCount = await prisma.team.count()

  if (teamCount > 0) {
    await ensureBetaEntries(prisma)
    return
  }

  const pool = await prisma.pool.upsert({
    where: { code: 'worldcup' },
    update: { title: 'World Cup Pick Party' },
    create: {
      code: 'worldcup',
      title: 'World Cup Pick Party'
    }
  })

  for (const team of teams) {
    await prisma.team.upsert({
      where: { slug: team.slug },
      update: team,
      create: team
    })
  }

  await ensureBetaEntries(prisma, pool.id)
}

async function ensureGameConfig(prisma: AppPrisma) {
  const config = await prisma.gameConfig.findUnique({ where: { id: 1 } })

  if (!config) {
    await prisma.gameConfig.create({
      data: {
        id: 1,
        title: 'World Cup Pick Party',
        predictionDeadline: openDemoDeadline
      }
    })

    return
  }

  if (config.predictionDeadline.getTime() === legacyDemoDeadline.getTime()) {
    await prisma.gameConfig.update({
      where: { id: 1 },
      data: {
        predictionDeadline: openDemoDeadline
      }
    })
  }
}

async function ensureBetaEntries(prisma: AppPrisma, poolId?: string) {
  const pool = poolId
    ? { id: poolId }
    : await prisma.pool.upsert({
        where: { code: 'worldcup' },
        update: { title: 'World Cup Pick Party' },
        create: {
          code: 'worldcup',
          title: 'World Cup Pick Party'
        }
      })
  const expectedDisplayNameKeys = BETA_ENTRY_SELECTIONS.map((entry) => normalizeDisplayName(entry.displayName))

  await prisma.predictionEntry.deleteMany({
    where: {
      poolId: pool.id,
      displayNameKey: {
        notIn: expectedDisplayNameKeys
      }
    }
  })

  for (const betaEntry of BETA_ENTRY_SELECTIONS) {
    const entry = await prisma.predictionEntry.upsert({
      where: {
        poolId_displayNameKey: {
          poolId: pool.id,
          displayNameKey: normalizeDisplayName(betaEntry.displayName)
        }
      },
      update: {
        displayName: betaEntry.displayName
      },
      create: {
        displayName: betaEntry.displayName,
        displayNameKey: normalizeDisplayName(betaEntry.displayName),
        poolId: pool.id
      }
    })

    await prisma.predictionAnswer.deleteMany({
      where: {
        entryId: entry.id
      }
    })

    await prisma.predictionAnswer.createMany({
      data: betaEntry.teams.map((teamSlug, index) => ({
        entryId: entry.id,
        questionKey: `team_${index + 1}`,
        teamSlug
      }))
    })
  }
}

function tierForQualifiedOrder(order: number): TeamTier {
  if (order <= 16) {
    return 'TOP'
  }

  if (order <= 32) {
    return 'MIDDLE'
  }

  return 'BOTTOM'
}
