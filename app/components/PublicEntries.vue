<script setup lang="ts">
import type { EntryDto, QuestionDto, TeamDto } from '../../shared/types'

interface Props {
  questions: QuestionDto[]
  teams: TeamDto[]
  entries: EntryDto[]
}

const props = defineProps<Props>()

const teamBySlug = computed(() => new Map(props.teams.map((team) => [team.slug, team])))

function answerFor(entry: EntryDto, questionKey: string) {
  const teamSlug = entry.answers.find((answer) => answer.questionKey === questionKey)?.teamSlug
  return teamSlug ? teamBySlug.value.get(teamSlug) ?? null : null
}
</script>

<template>
  <section class="panel">
    <h2>Public Predictions</h2>
    <p v-if="props.entries.length === 0" class="muted">No public entries yet.</p>
    <div v-else class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th v-for="question in props.questions" :key="question.key">
              {{ question.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in props.entries" :key="entry.id">
            <td>{{ entry.displayName }}</td>
            <td v-for="question in props.questions" :key="question.key">
              <span v-if="answerFor(entry, question.key)" class="entry-pick">
                <TeamFlag
                  :name="answerFor(entry, question.key)?.name ?? ''"
                  :fifa-code="answerFor(entry, question.key)?.fifaCode ?? ''"
                  :flag-url="answerFor(entry, question.key)?.flagUrl ?? null"
                  :flag-emoji="answerFor(entry, question.key)?.flagEmoji ?? undefined"
                  size="sm"
                />
                {{ answerFor(entry, question.key)?.name }}
              </span>
              <span v-else>-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.entry-pick {
  align-items: center;
  display: inline-flex;
  gap: 0.35rem;
  white-space: nowrap;
}
</style>
