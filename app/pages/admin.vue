<script setup lang="ts">
import { RefreshCw, Save, Trash2 } from '@lucide/vue'
import type {
  DerivedResultsDto,
  EntryDto,
  KnockoutPickemStateDto,
  LeaderboardRow,
  PoolDto,
  QuestionDto,
  TeamDto
} from '../../shared/types'

interface PoolAdminState {
  pool: PoolDto
  entries: EntryDto[]
  leaderboard: LeaderboardRow[]
}

interface AdminState {
  title: string
  predictionDeadline: string
  isLocked: boolean
  isPublic: boolean
  questions: QuestionDto[]
  teams: TeamDto[]
  results: DerivedResultsDto
  knockoutPickem: KnockoutPickemStateDto
  pools: PoolAdminState[]
}

const adminPin = shallowRef('')
const state = shallowRef<AdminState | null>(null)
const error = shallowRef('')
const message = shallowRef('')
const isLoading = shallowRef(false)
const configTitle = shallowRef('')
const configDeadline = shallowRef('')
const configKnockoutPickemEnabled = shallowRef(false)

const adminHeaders = computed(() => ({
  'x-admin-pin': adminPin.value
}))

const teamNameBySlug = computed(() => new Map((state.value?.teams ?? []).map((team) => [team.slug, team.name])))
const totalEntries = computed(() => state.value?.pools.reduce((sum, poolState) => sum + poolState.entries.length, 0) ?? 0)
const totalPools = computed(() => state.value?.pools.length ?? 0)
const completedResultCount = computed(() => {
  if (!state.value) {
    return 0
  }

  return state.value.questions.filter((question) => state.value?.results.complete[question.key]).length
})

onMounted(() => {
  adminPin.value = localStorage.getItem('worldcup-admin-pin') || ''
})

function toDatetimeInput(value: string) {
  const date = new Date(value)
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return offsetDate.toISOString().slice(0, 16)
}

function hydrateForms(nextState: AdminState) {
  configTitle.value = nextState.title
  configDeadline.value = toDatetimeInput(nextState.predictionDeadline)
  configKnockoutPickemEnabled.value = nextState.knockoutPickem.enabled
}

async function loadState() {
  error.value = ''
  message.value = ''
  isLoading.value = true

  try {
    localStorage.setItem('worldcup-admin-pin', adminPin.value)
    const response = await $fetch<AdminState>('/api/admin/state', {
      headers: adminHeaders.value
    })
    state.value = response
    hydrateForms(response)
  } catch {
    error.value = 'Admin state could not be loaded. Check the PIN.'
  } finally {
    isLoading.value = false
  }
}

async function saveConfig() {
  if (!state.value) {
    return
  }

  error.value = ''
  message.value = ''

  try {
    await $fetch('/api/admin/config', {
      method: 'PUT',
      headers: adminHeaders.value,
      body: {
        title: configTitle.value,
        predictionDeadline: new Date(configDeadline.value).toISOString(),
        knockoutPickemEnabled: configKnockoutPickemEnabled.value
      }
    })
    message.value = 'Game settings saved.'
    await loadState()
  } catch {
    error.value = 'Game settings were not saved.'
  }
}

async function deleteEntry(entryId: string) {
  error.value = ''
  message.value = ''

  try {
    await $fetch(`/api/admin/entries/${entryId}`, {
      method: 'DELETE',
      headers: adminHeaders.value
    })
    message.value = 'Entry deleted.'
    await loadState()
  } catch {
    error.value = 'Entry was not deleted.'
  }
}

function answerFor(entry: EntryDto, questionKey: string) {
  const teamSlug = entry.answers.find((answer) => answer.questionKey === questionKey)?.teamSlug
  return teamSlug ? teamNameBySlug.value.get(teamSlug) ?? teamSlug : '-'
}
</script>

<template>
  <main class="page">
    <PageHeader title="Admin" subtitle="Operational controls for settings, results, and pool cleanup" />

    <section class="panel admin-login cue-step">
      <span class="cue-marker" aria-hidden="true">01</span>
      <div class="cue-body">
        <p class="cue-title">Load admin</p>
        <p class="cue-help">Enter the admin PIN to unlock settings, results, and sync controls.</p>
        <div class="answer-row">
          <div class="field action-field">
            <label for="admin-pin">Admin PIN</label>
            <input id="admin-pin" v-model="adminPin" name="adminPin" class="input" type="password" autocomplete="current-password">
          </div>
          <button class="btn-primary" type="button" :disabled="isLoading || !adminPin" @click="loadState">
            <RefreshCw :size="18" aria-hidden="true" />
            Load Admin
          </button>
        </div>
      </div>
    </section>

    <p v-if="message" class="status success">{{ message }}</p>
    <p v-if="error" class="status error">{{ error }}</p>

    <div v-if="state" class="stack">
      <section class="admin-overview" aria-label="Admin overview">
        <article class="admin-stat">
          <span>Pools</span>
          <strong>{{ totalPools }}</strong>
        </article>
        <article class="admin-stat">
          <span>Entries</span>
          <strong>{{ totalEntries }}</strong>
        </article>
        <article class="admin-stat">
          <span>Result sets</span>
          <strong>{{ completedResultCount }}/{{ state.questions.length }}</strong>
        </article>
        <article class="admin-stat">
          <span>Reveal</span>
          <strong>{{ state.isPublic ? 'Public' : 'Hidden' }}</strong>
        </article>
      </section>

      <FootballDataSyncPanel :admin-pin="adminPin" />

      <section class="panel admin-panel">
        <h2>Game Settings</h2>
        <form class="cue-flow" @submit.prevent="saveConfig">
          <div class="cue-step">
            <span class="cue-marker" aria-hidden="true">01</span>
            <div class="cue-body">
              <p class="cue-title">Set league basics</p>
              <p class="cue-help">Update the tournament title and the prediction lock time.</p>
              <div class="answer-row">
                <div class="field action-field">
                  <label for="game-title">Title</label>
                  <input id="game-title" v-model="configTitle" name="title" class="input" required>
                </div>
                <div class="field action-field">
                  <label for="deadline">Prediction deadline</label>
                  <input id="deadline" v-model="configDeadline" name="deadline" class="input" required type="datetime-local">
                </div>
                <div class="field action-field toggle-field">
                  <label for="knockout-pickem-enabled">Knockout Pick'em</label>
                  <label class="toggle-row" for="knockout-pickem-enabled">
                    <input id="knockout-pickem-enabled" v-model="configKnockoutPickemEnabled" name="knockoutPickemEnabled" type="checkbox">
                    <span>{{ configKnockoutPickemEnabled ? 'Enabled' : 'Disabled' }}</span>
                  </label>
                  <p class="muted small">Uses cached quarterfinal, semifinal, and final fixtures.</p>
                </div>
              </div>
            </div>
          </div>
          <div class="cue-step">
            <span class="cue-marker is-green" aria-hidden="true">02</span>
            <div class="cue-body">
              <p class="cue-title">Save settings</p>
              <p class="cue-help">Apply the title and lock time to every league.</p>
              <button class="btn-secondary admin-submit" type="submit">
                <Save :size="18" aria-hidden="true" />
                Save Settings
              </button>
            </div>
          </div>
        </form>
      </section>

      <section class="panel admin-panel">
        <h2>Knockout Pick'em</h2>
        <div class="pickem-admin-status">
          <article class="admin-stat">
            <span>Status</span>
            <strong>{{ state.knockoutPickem.status }}</strong>
          </article>
          <article class="admin-stat">
            <span>Enabled</span>
            <strong>{{ state.knockoutPickem.enabledAt ? new Date(state.knockoutPickem.enabledAt).toLocaleString() : 'No' }}</strong>
          </article>
          <article class="admin-stat">
            <span>Active round</span>
            <strong>{{ state.knockoutPickem.activeWindow?.label ?? 'Waiting' }}</strong>
          </article>
        </div>
        <p class="muted">{{ state.knockoutPickem.reason }}</p>
        <div v-if="state.knockoutPickem.windows.length > 0" class="pickem-window-list">
          <article v-for="window in state.knockoutPickem.windows" :key="window.roundKey" class="pickem-window-row">
            <strong>{{ window.label }}</strong>
            <span>{{ window.fixtures.length }} fixtures / locks {{ new Date(window.lockAt).toLocaleString() }}</span>
            <em>{{ window.isOpen ? 'Open' : 'Locked' }}</em>
          </article>
        </div>
      </section>

      <section class="panel admin-panel">
        <h2>Derived Results</h2>
        <div class="result-grid">
          <div v-for="question in state.questions" :key="question.key" class="result-pill">
            <span>{{ question.label }}</span>
            <strong>{{ state.results.complete[question.key] ? 'Has results' : 'Pending' }}</strong>
          </div>
        </div>
      </section>

      <section v-for="poolState in state.pools" :key="poolState.pool.code" class="panel admin-panel">
        <div class="admin-section-heading">
          <div>
            <h2>{{ poolState.pool.title }}</h2>
            <p class="muted small">Invite: /invite/{{ poolState.pool.code }}</p>
          </div>
          <span>{{ poolState.entries.length }} entries</span>
        </div>

        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Score</th>
                <th>Pick scores</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in poolState.leaderboard" :key="row.entryId">
                <td>{{ row.rank }}</td>
                <td>{{ row.displayName }}</td>
                <td>{{ row.totalScore }}</td>
                <td>
                  {{ row.breakdown.map((item) => `${item.label}: ${item.points}`).join(', ') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Name</th>
                <th v-for="question in state.questions" :key="question.key">{{ question.label }}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in poolState.entries" :key="entry.id">
                <td>{{ entry.displayName }}</td>
                <td v-for="question in state.questions" :key="question.key">
                  {{ answerFor(entry, question.key) }}
                </td>
                <td>
                  <button class="btn-danger" type="button" @click="deleteEntry(entry.id)">
                    <Trash2 :size="18" aria-hidden="true" />
                    Delete
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.result-grid,
.team-result-grid {
  display: grid;
  gap: 0.75rem;
}

.admin-login,
.admin-panel {
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.admin-overview {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.pickem-admin-status {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 0.75rem;
}

.admin-stat {
  background: var(--data-well);
  border: 0;
  border-radius: var(--radius);
  box-shadow: none;
  display: grid;
  gap: 0.2rem;
  min-width: 0;
  padding: 0.85rem;
}

.admin-stat span {
  color: rgba(255, 248, 232, 0.68);
  font-size: 0.78rem;
  font-weight: 900;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-stat strong {
  color: var(--text-invert);
  font-size: 1.55rem;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toggle-field {
  align-self: stretch;
}

.toggle-row {
  align-items: center;
  color: var(--text);
  cursor: pointer;
  display: inline-flex;
  font-weight: 950;
  gap: 0.48rem;
  min-height: 2.85rem;
}

.toggle-row input {
  height: 1.15rem;
  width: 1.15rem;
}

.pickem-window-list {
  display: grid;
  gap: 0.45rem;
  margin-top: 0.75rem;
}

.pickem-window-row {
  align-items: center;
  background: var(--data-well);
  border-radius: var(--radius);
  color: var(--text-invert);
  display: grid;
  gap: 0.6rem;
  grid-template-columns: minmax(8rem, 0.8fr) minmax(0, 1fr) auto;
  padding: 0.72rem;
}

.pickem-window-row span {
  color: rgba(255, 248, 232, 0.7);
  font-weight: 760;
}

.pickem-window-row em {
  color: var(--gold);
  font-style: normal;
  font-weight: 950;
}

.admin-section-heading {
  align-items: start;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  margin-bottom: 0.8rem;
}

.admin-section-heading h2,
.admin-section-heading p {
  margin: 0;
}

.admin-section-heading span {
  background: var(--accent);
  border: 0;
  border-radius: var(--radius);
  color: #fff8e8;
  font-size: 0.82rem;
  font-weight: 900;
  padding: 0.3rem 0.52rem;
  white-space: nowrap;
}

.result-grid {
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
}

.result-pill {
  background: var(--data-well);
  border: 0;
  border-radius: var(--radius);
  color: var(--text-invert);
  display: flex;
  gap: 0.5rem;
  justify-content: space-between;
  padding: 0.75rem;
}

.result-pill strong {
  color: var(--gold);
}

.team-result-row {
  align-items: end;
  border-bottom: 1px solid var(--line);
  display: grid;
  gap: 0.75rem;
  grid-template-columns: minmax(0, 1fr) repeat(2, minmax(11rem, 18rem));
  padding-bottom: 0.75rem;
}

.team-result-name {
  align-items: center;
  display: flex;
  gap: 0.65rem;
  min-width: 0;
}

.team-result-name p,
.team-result-name strong {
  margin: 0;
}

.admin-panel .table-wrap {
  background: var(--data-well);
  border-radius: var(--radius);
  color: var(--text-invert);
  margin-bottom: 0.75rem;
  overflow-x: auto;
}

.admin-panel .table-wrap:last-child {
  margin-bottom: 0;
}

.admin-panel .table th,
.admin-panel .table td {
  border-bottom-color: var(--data-line);
}

.admin-panel .table th {
  color: rgba(255, 248, 232, 0.62);
}

.admin-panel .table td {
  color: rgba(255, 248, 232, 0.88);
}

.admin-submit {
  justify-self: start;
}

@media (max-width: 820px) {
  .admin-overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .team-result-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 540px) {
  .admin-overview,
  .pickem-admin-status,
  .admin-section-heading {
    display: grid;
    grid-template-columns: 1fr;
  }

  .pickem-window-row {
    grid-template-columns: 1fr;
  }

  .admin-submit {
    width: 100%;
  }
}
</style>
