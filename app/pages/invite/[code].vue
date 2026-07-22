<script setup lang="ts">
import type {
  CompetitionViewDto,
  EntryDto,
  KnockoutPickemStateDto,
  LeaderboardRow,
  PoolDto,
  QuestionDto,
  TeamDto
} from '../../../shared/types'

interface PoolState {
  title: string
  predictionDeadline: string
  isLocked: boolean
  isPublic: boolean
  isLateEntry: boolean
  pool: PoolDto
  questions: QuestionDto[]
  teams: TeamDto[]
  entries: EntryDto[]
  editableEntries: EntryDto[]
  leaderboard: LeaderboardRow[]
  knockoutPickem: KnockoutPickemStateDto
  competition: CompetitionViewDto
}

const route = useRoute()
const poolCode = computed(() => String(route.params.code))

const { data, error, refresh } = await useFetch<PoolState>(() => `/api/pools/${poolCode.value}`)
let refreshTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  refreshTimer = setInterval(() => {
    void refresh()
  }, 10 * 60 * 1000)
})

onBeforeUnmount(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})
</script>

<template>
  <CompetitionShell
    v-if="data"
    :pool="data.pool"
    :prediction-deadline="data.predictionDeadline"
    :is-locked="data.isLocked"
    :is-public="data.isPublic"
    :is-late-entry="data.isLateEntry"
    :questions="data.questions"
    :teams="data.teams"
    :entries="data.entries"
    :editable-entries="data.editableEntries"
    :knockout-pickem="data.knockoutPickem"
    :competition="data.competition"
    @saved="refresh"
  />

  <main v-else class="competition-page">
    <p v-if="error" class="status error">League is not available. Check the invite link.</p>
    <p v-else class="muted">Opening league...</p>
  </main>
</template>
