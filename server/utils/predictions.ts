import type { H3Event } from 'h3'
import { avatarKeyForDisplayName, PLAYER_AVATAR_KEYS } from '../../shared/player-avatars'
import { normalizeDisplayName } from '../../shared/scoring'
import type { PredictionAnswerInput } from '../../shared/validation'
import { validatePredictionAnswers } from '../../shared/validation'
import { getGameConfig, getPoolByCode, getTeams, getVisibility } from './game'
import { getPrisma } from './db'
import { mapEntry } from './mappers'

export interface SavePredictionInput {
  poolCode: string
  displayName: string
  avatarKey?: typeof PLAYER_AVATAR_KEYS[number]
  answers: PredictionAnswerInput[]
}

export async function saveUserPrediction(
  userId: string,
  input: SavePredictionInput,
  event: H3Event,
  expectedEntryId?: string
) {
  const prisma = await getPrisma(event)
  const [config, pool, teams] = await Promise.all([
    getGameConfig(event),
    getPoolByCode(input.poolCode, event),
    getTeams(event)
  ])

  if (getVisibility(config.predictionDeadline).isLocked) {
    throw createError({ statusCode: 409, statusText: 'Predictions are locked.' })
  }

  const validation = validatePredictionAnswers(input.answers, new Map(teams.map((team) => [team.slug, team])))
  if (!validation.ok) {
    throw createError({ statusCode: 400, statusText: 'Choose one valid team for every question.' })
  }

  const ownedEntry = await prisma.predictionEntry.findUnique({
    where: { poolId_userId: { poolId: pool.id, userId } }
  })

  if (expectedEntryId && (!ownedEntry || ownedEntry.id !== expectedEntryId)) {
    const requestedEntry = await prisma.predictionEntry.findFirst({ where: { id: expectedEntryId, poolId: pool.id } })
    throw createError({
      statusCode: requestedEntry ? 403 : 404,
      statusText: requestedEntry ? 'You can only edit your own prediction.' : 'Prediction entry not found.'
    })
  }

  const displayName = input.displayName.trim().replace(/\s+/g, ' ')
  const data = {
    displayName,
    displayNameKey: normalizeDisplayName(displayName),
    avatarKey: input.avatarKey ?? ownedEntry?.avatarKey ?? avatarKeyForDisplayName(displayName)
  }

  try {
    const entry = ownedEntry
      ? await prisma.predictionEntry.update({ where: { id: ownedEntry.id }, data })
      : await prisma.predictionEntry.create({ data: { ...data, poolId: pool.id, userId } })

    await prisma.predictionAnswer.deleteMany({ where: { entryId: entry.id } })
    await prisma.predictionAnswer.createMany({
      data: validation.answers.map((answer) => ({ ...answer, entryId: entry.id }))
    })
    await prisma.poolMembership.upsert({
      where: { poolId_userId: { poolId: pool.id, userId } },
      update: {},
      create: { poolId: pool.id, userId, role: 'participant' }
    })

    const saved = await prisma.predictionEntry.findUniqueOrThrow({
      where: { id: entry.id },
      include: { answers: true, groupPositionPicks: true, knockoutPicks: true }
    })
    return mapEntry(saved)
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw createError({ statusCode: 409, statusText: 'That league-table name is already in use.' })
    }
    throw error
  }
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}
