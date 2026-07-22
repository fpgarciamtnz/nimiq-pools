import { describe, expect, it } from 'vitest'
import { QUESTION_ORDER } from '../shared/scoring'
import { validatePredictionAnswers } from '../shared/validation'

const validTeams = new Map([
  ['france', { tier: 'TOP' as const }],
  ['spain', { tier: 'TOP' as const }],
  ['japan', { tier: 'MIDDLE' as const }],
  ['ghana', { tier: 'BOTTOM' as const }],
  ['brazil', { tier: 'TOP' as const }]
])

const validAnswers = [
  { questionKey: 'team_1' as const, teamSlug: 'france' },
  { questionKey: 'team_2' as const, teamSlug: 'japan' },
  { questionKey: 'team_3' as const, teamSlug: 'ghana' },
  { questionKey: 'team_4' as const, teamSlug: 'brazil' }
]

describe('prediction validation', () => {
  it('accepts one valid team answer for every fixed question', () => {
    const validation = validatePredictionAnswers(validAnswers, validTeams)

    expect(validation.ok).toBe(true)
  })

  it('rejects unknown teams', () => {
    const validation = validatePredictionAnswers([
      validAnswers[0],
      { questionKey: 'team_2', teamSlug: 'unknown' },
      validAnswers[2],
      validAnswers[3]
    ], validTeams)

    expect(validation).toEqual({ ok: false, reason: 'UNKNOWN_TEAM' })
  })

  it('rejects missing or duplicate question coverage', () => {
    const validation = validatePredictionAnswers([
      { questionKey: 'team_1', teamSlug: 'france' },
      { questionKey: 'team_2', teamSlug: 'japan' },
      { questionKey: 'team_2', teamSlug: 'japan' },
      { questionKey: 'team_4', teamSlug: 'brazil' }
    ], validTeams)

    expect(validation).toEqual({ ok: false, reason: 'INCOMPLETE_QUESTIONS' })
  })

  it('allows any known team in any slot', () => {
    expect(validatePredictionAnswers([
      { questionKey: 'team_1', teamSlug: 'japan' },
      { questionKey: 'team_2', teamSlug: 'spain' },
      { questionKey: 'team_3', teamSlug: 'france' },
      { questionKey: 'team_4', teamSlug: 'ghana' }
    ], validTeams)).toEqual({
      ok: true,
      answers: [
        { questionKey: 'team_1', teamSlug: 'japan' },
        { questionKey: 'team_2', teamSlug: 'spain' },
        { questionKey: 'team_3', teamSlug: 'france' },
        { questionKey: 'team_4', teamSlug: 'ghana' }
      ]
    })
  })

  it('requires exactly the current four question keys', () => {
    expect(QUESTION_ORDER).toEqual(['team_1', 'team_2', 'team_3', 'team_4'])
  })
})
