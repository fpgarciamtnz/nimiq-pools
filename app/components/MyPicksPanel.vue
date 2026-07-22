<script setup lang="ts">
import { computed, reactive, shallowRef, watch } from 'vue'
import { Check, LockKeyhole, Save } from '@lucide/vue'
import type { EntryDto, QuestionDto, QuestionKey, TeamDto } from '../../shared/types'

interface Props {
  questions: QuestionDto[]
  teams: TeamDto[]
  poolCode: string
  poolTitle: string
  poolImageDataUrl?: string | null
  isLocked: boolean
  isLateEntry?: boolean
  editableEntries: EntryDto[]
  entryOpenRequest?: number
}

const props = defineProps<Props>()
const emit = defineEmits<{ saved: [] }>()
const displayName = shallowRef('')
const answerByQuestion = reactive<Record<QuestionKey, string>>({
  team_1: '', team_2: '', team_3: '', team_4: ''
})
const isSaving = shallowRef(false)
const message = shallowRef('')
const error = shallowRef('')
const ownEntry = computed(() => props.editableEntries[0] ?? null)
const sortedTeams = computed(() => [...props.teams].sort((a, b) => a.qualifiedRankOrder - b.qualifiedRankOrder))
const canSubmit = computed(() => displayName.value.trim().length >= 2
  && props.questions.every((question) => answerByQuestion[question.key]))

watch(ownEntry, (entry) => {
  if (!entry) return
  displayName.value = entry.displayName
  for (const answer of entry.answers) answerByQuestion[answer.questionKey] = answer.teamSlug
}, { immediate: true })

async function savePicks() {
  if (!canSubmit.value || props.isLocked) return
  isSaving.value = true
  error.value = ''
  message.value = ''
  const body = {
    poolCode: props.poolCode,
    displayName: displayName.value,
    answers: props.questions.map((question) => ({
      questionKey: question.key,
      teamSlug: answerByQuestion[question.key]
    }))
  }

  try {
    const path = ownEntry.value ? `/api/predictions/${ownEntry.value.id}` : '/api/predictions'
    await $fetch(path, { method: ownEntry.value ? 'PUT' : 'POST', body })
    message.value = 'Your predictions are saved to this wallet.'
    emit('saved')
  } catch (cause) {
    const statusText = typeof cause === 'object' && cause && 'statusMessage' in cause
      ? String(cause.statusMessage)
      : ''
    error.value = statusText || 'Your predictions could not be saved. Check every team and try again.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section class="my-picks-panel" aria-label="Your predictions">
    <div v-if="props.isLocked" class="locked-notice">
      <LockKeyhole :size="19" aria-hidden="true" />
      <div><strong>Predictions are locked</strong><span>Your saved picks can no longer be changed.</span></div>
    </div>

    <form v-else class="picks-form" @submit.prevent="savePicks">
      <div class="field action-field nickname-field">
        <label for="prediction-display-name">League table name</label>
        <input
          id="prediction-display-name"
          v-model="displayName"
          class="input"
          name="displayName"
          autocomplete="name"
          maxlength="80"
          placeholder="Your nickname"
          required
        >
        <small>This is how other players see you in this league.</small>
      </div>

      <div class="question-grid">
        <label v-for="(question, index) in props.questions" :key="question.key" class="question-field">
          <span class="question-number">0{{ index + 1 }}</span>
          <span class="question-copy"><strong>{{ question.label }}</strong><small>{{ question.description }}</small></span>
          <select v-model="answerByQuestion[question.key]" class="select" required>
            <option value="" disabled>Choose a team</option>
            <option v-for="team in sortedTeams" :key="team.slug" :value="team.slug">
              {{ team.name }} ({{ team.fifaCode }})
            </option>
          </select>
        </label>
      </div>

      <div class="save-row">
        <span v-if="ownEntry" class="own-entry"><Check :size="17" aria-hidden="true" /> Editing your saved entry</span>
        <button class="btn-primary" type="submit" :disabled="isSaving || !canSubmit">
          <Save :size="18" aria-hidden="true" />
          {{ isSaving ? 'Saving…' : ownEntry ? 'Update my picks' : 'Save my picks' }}
        </button>
      </div>
      <p v-if="message" class="status success" role="status">{{ message }}</p>
      <p v-if="error" class="status error" role="alert">{{ error }}</p>
    </form>
  </section>
</template>

<style scoped>
.my-picks-panel,
.picks-form { display: grid; gap: 1rem; }
.picks-form { background: rgba(255, 250, 240, 0.72); border: 1px solid var(--line); padding: 1rem; }
.nickname-field { max-width: 28rem; }
.nickname-field small,
.question-copy small { color: var(--muted); font-size: 0.8rem; font-weight: 700; }
.question-grid { display: grid; gap: 0.7rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.question-field { align-items: center; background: var(--data-well); color: var(--text-invert); display: grid; gap: 0.7rem; grid-template-columns: auto minmax(0, 1fr); padding: 0.85rem; }
.question-number { color: var(--gold); font-size: 1.25rem; font-weight: 950; }
.question-copy { display: grid; gap: 0.15rem; }
.question-copy small { color: rgba(255, 248, 232, 0.65); }
.question-field .select { grid-column: 1 / -1; width: 100%; }
.save-row { align-items: center; display: flex; gap: 0.8rem; justify-content: space-between; }
.own-entry { align-items: center; color: var(--accent-strong); display: inline-flex; font-size: 0.88rem; font-weight: 850; gap: 0.35rem; }
.locked-notice { align-items: center; background: var(--data-well); color: var(--text-invert); display: flex; gap: 0.7rem; padding: 0.9rem; }
.locked-notice div { display: grid; gap: 0.12rem; }
.locked-notice span { color: rgba(255, 248, 232, 0.7); font-size: 0.86rem; }
@media (max-width: 700px) {
  .question-grid { grid-template-columns: 1fr; }
  .save-row { align-items: stretch; display: grid; }
  .save-row .btn-primary { width: 100%; }
}
</style>
