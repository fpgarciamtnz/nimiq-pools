import { QUESTION_ORDER } from './scoring'
import type { CompetitionMode, GroupPositionPickDto, KnockoutPickemRoundKey, QuestionKey, TeamDto, TournamentGroupDto } from './types'

export const COMPETITION_MODES = ['ballot_only', 'ballot_pickem'] as const satisfies readonly CompetitionMode[]
export const KNOCKOUT_PICKEM_START_ROUNDS = ['round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'final'] as const satisfies readonly KnockoutPickemRoundKey[]

export type PredictionAnswerInput = {
  questionKey: QuestionKey
  teamSlug: string
}

export type PredictionAnswerValidation =
  | {
      ok: true
      answers: PredictionAnswerInput[]
    }
  | {
      ok: false
      reason: 'UNKNOWN_TEAM' | 'INCOMPLETE_QUESTIONS'
    }

export function validatePredictionAnswers(
  answers: PredictionAnswerInput[],
  teamsBySlug: Map<string, Pick<TeamDto, 'tier'>>
): PredictionAnswerValidation {
  const byQuestion = new Map<QuestionKey, string>()

  for (const answer of answers) {
    const team = teamsBySlug.get(answer.teamSlug)

    if (!team) {
      return {
        ok: false,
        reason: 'UNKNOWN_TEAM'
      }
    }

    byQuestion.set(answer.questionKey, answer.teamSlug)
  }

  if (byQuestion.size !== QUESTION_ORDER.length || QUESTION_ORDER.some((key) => !byQuestion.has(key))) {
    return {
      ok: false,
      reason: 'INCOMPLETE_QUESTIONS'
    }
  }

  return {
    ok: true,
    answers: QUESTION_ORDER.map((questionKey) => ({
      questionKey,
      teamSlug: byQuestion.get(questionKey) as string
    }))
  }
}

export function validateGroupPositionPicks(
  picks: GroupPositionPickDto[],
  groups: TournamentGroupDto[]
) {
  const groupById = new Map(groups.map((group) => [group.id, group]))
  const normalized: GroupPositionPickDto[] = []
  const positionKeys = new Set<string>()
  const teamKeys = new Set<string>()

  for (const pick of picks) {
    const group = groupById.get(pick.groupId)

    if (!group) {
      return { ok: false as const, reason: 'UNKNOWN_GROUP' as const }
    }

    if (pick.position < 1 || pick.position > group.teams.length) {
      return { ok: false as const, reason: 'INVALID_POSITION' as const }
    }

    if (!group.teams.some((team) => team.teamSlug === pick.teamSlug)) {
      return { ok: false as const, reason: 'TEAM_NOT_IN_GROUP' as const }
    }

    const positionKey = `${pick.groupId}:${pick.position}`
    const teamKey = `${pick.groupId}:${pick.teamSlug}`

    if (positionKeys.has(positionKey) || teamKeys.has(teamKey)) {
      return { ok: false as const, reason: 'DUPLICATE_PICK' as const }
    }

    positionKeys.add(positionKey)
    teamKeys.add(teamKey)
    normalized.push({
      groupId: pick.groupId,
      position: pick.position,
      teamSlug: pick.teamSlug
    })
  }

  return { ok: true as const, picks: normalized }
}
