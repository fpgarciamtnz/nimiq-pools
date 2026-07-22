import { z } from 'zod'
import { getOpenPickemWindow } from '../../../../shared/knockout-pickem'
import { normalizeDisplayName } from '../../../../shared/scoring'
import type { KnockoutPickemRoundKey } from '../../../../shared/types'
import { getKnockoutPickemState, getPoolByCode } from '../../../utils/game'
import { mapEntry } from '../../../utils/mappers'
import { getPrisma } from '../../../utils/db'
import { avatarKeyForDisplayName, PLAYER_AVATAR_KEYS } from '../../../../shared/player-avatars'
import { assertSameOrigin, requireAuthUser } from '../../../utils/nimiq-auth'

const paramsSchema = z.object({
  code: z.string().min(1)
})

const pickSchema = z.object({
  fixtureId: z.number().int(),
  winnerTeamSlug: z.string().trim().min(1)
})

const bodySchema = z.object({
  entryId: z.string().trim().min(1).optional(),
  displayName: z.string().trim().min(2).max(80),
  avatarKey: z.enum(PLAYER_AVATAR_KEYS).optional(),
  picks: z.array(pickSchema)
})

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const user = await requireAuthUser(event)
  const prisma = await getPrisma(event)
  const params = await getValidatedRouterParams(event, (value) => paramsSchema.parse(value))
  const body = await readValidatedBody(event, (value) => bodySchema.parse(value))
  const pool = await getPoolByCode(params.code, event)
  const pickemState = await getKnockoutPickemState({
    startRoundKey: pool.competitionMode === 'ballot_pickem'
      ? pool.knockoutPickemStartRound as KnockoutPickemRoundKey | null
      : null
  }, event)
  const openWindow = getOpenPickemWindow(pickemState)

  if (!openWindow) {
    throw createError({
      statusCode: 409,
      statusText: 'No Pickem round is open'
    })
  }

  const picks = normalizePicksOrThrow(body.picks, openWindow.fixtures)
  const displayName = body.displayName.trim().replace(/\s+/g, ' ')
  const displayNameKey = normalizeDisplayName(displayName)
  const avatarKey = body.avatarKey ?? avatarKeyForDisplayName(displayName)

  const ownedEntry = await prisma.predictionEntry.findUnique({
    where: { poolId_userId: { poolId: pool.id, userId: user.id } },
    include: { answers: true, groupPositionPicks: true, knockoutPicks: true }
  })
  const entry = ownedEntry
    ? await updateOwnedEntry(prisma, ownedEntry.id, body.avatarKey)
    : await createEntryOrThrow(prisma, {
        displayName,
        displayNameKey,
        avatarKey,
        poolId: pool.id,
        userId: user.id
      })

  await prisma.poolMembership.upsert({
    where: { poolId_userId: { poolId: pool.id, userId: user.id } },
    update: {},
    create: { poolId: pool.id, userId: user.id, role: 'participant' }
  })

  for (const pick of picks) {
    await prisma.knockoutPick.upsert({
      where: {
        entryId_fixtureId: {
          entryId: entry.id,
          fixtureId: pick.fixtureId
        }
      },
      update: {
        winnerTeamSlug: pick.winnerTeamSlug
      },
      create: {
        entryId: entry.id,
        fixtureId: pick.fixtureId,
        winnerTeamSlug: pick.winnerTeamSlug
      }
    })
  }

  const updatedEntry = await prisma.predictionEntry.findUniqueOrThrow({
    where: { id: entry.id },
    include: {
      answers: true,
      groupPositionPicks: true,
      knockoutPicks: true
    }
  })

  return {
    entry: mapEntry(updatedEntry),
    knockoutPickem: pickemState
  }
})

async function updateOwnedEntry(
  prisma: Awaited<ReturnType<typeof getPrisma>>,
  entryId: string,
  avatarKey: string | undefined
) {
  return prisma.predictionEntry.update({
    where: { id: entryId },
    data: avatarKey ? { avatarKey } : {},
    include: {
      answers: true,
      groupPositionPicks: true,
      knockoutPicks: true
    }
  })
}

async function createEntryOrThrow(
  prisma: Awaited<ReturnType<typeof getPrisma>>,
  data: {
    displayName: string
    displayNameKey: string
    avatarKey: string
    poolId: string
    userId: string
  }
) {
  try {
    return await prisma.predictionEntry.create({
      data,
      include: {
        answers: true,
        groupPositionPicks: true,
        knockoutPicks: true
      }
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw createError({
        statusCode: 409,
        statusText: 'Display name is already used in this pool'
      })
    }

    throw error
  }
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}

function normalizePicksOrThrow(
  picks: Array<{ fixtureId: number; winnerTeamSlug: string }>,
  fixtures: Array<{ fixtureId: number; homeTeamSlug: string | null; awayTeamSlug: string | null }>
) {
  const fixtureById = new Map(fixtures.map((fixture) => [fixture.fixtureId, fixture]))
  const winnerByFixtureId = new Map<number, string>()
  const seenFixtureIds = new Set<number>()

  if (picks.length !== fixtures.length) {
    throw createError({
      statusCode: 400,
      statusText: 'Every open fixture needs one winner pick'
    })
  }

  for (const pick of picks) {
    const fixture = fixtureById.get(pick.fixtureId)

    if (!fixture || seenFixtureIds.has(pick.fixtureId)) {
      throw createError({
        statusCode: 400,
        statusText: 'Pick fixtures are invalid'
      })
    }

    seenFixtureIds.add(pick.fixtureId)
    winnerByFixtureId.set(pick.fixtureId, pick.winnerTeamSlug)

    if (pick.winnerTeamSlug !== fixture.homeTeamSlug && pick.winnerTeamSlug !== fixture.awayTeamSlug) {
      throw createError({
        statusCode: 400,
        statusText: 'Winner must be one of the fixture teams'
      })
    }
  }

  return fixtures.map((fixture) => ({
    fixtureId: fixture.fixtureId,
    winnerTeamSlug: winnerByFixtureId.get(fixture.fixtureId) ?? ''
  }))
}
