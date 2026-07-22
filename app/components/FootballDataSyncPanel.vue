<script setup lang="ts">
import { Play, RefreshCw } from '@lucide/vue'
import type { FootballDataAdminSyncStatusDto, ApiSyncLogDto, ApiSyncStatusDto } from '../../shared/types'

type SyncJob = 'daily' | 'hourly' | 'live' | 'all'

interface Props {
  adminPin: string
}

const props = defineProps<Props>()

const status = shallowRef<FootballDataAdminSyncStatusDto | null>(null)
const isLoadingStatus = shallowRef(false)
const runningJob = shallowRef<SyncJob | null>(null)
const message = shallowRef('')
const error = shallowRef('')

const jobs: Array<{ key: SyncJob; label: string }> = [
  { key: 'daily', label: 'Daily' },
  { key: 'hourly', label: 'Hourly' },
  { key: 'live', label: 'Live' }
]

const adminHeaders = computed(() => ({
  'x-admin-pin': props.adminPin
}))

const isBusy = computed(() => isLoadingStatus.value || Boolean(runningJob.value))
const states = computed(() => status.value?.states ?? [])
const logs = computed(() => status.value?.logs ?? [])
const budget = computed(() => status.value?.budget ?? {
  callsToday: 0,
  dailyLimit: 100,
  latestDailyRemaining: null
})
const nextMilestones = computed(() => status.value?.milestones.next ?? [])
const recentMilestones = computed(() => status.value?.milestones.recent ?? [])
const budgetPercent = computed(() => {
  if (budget.value.dailyLimit <= 0) {
    return 0
  }

  return Math.min(100, Math.round((budget.value.callsToday / budget.value.dailyLimit) * 100))
})
const warnings = computed(() => {
  const config = status.value?.config

  if (!config) {
    return []
  }

  const nextWarnings: string[] = []

  if (config.usesDefaultAdminPin) {
    nextWarnings.push('Default admin PIN')
  }

  if (!config.hasFootballDataKey) {
    nextWarnings.push('Missing football-data.org key')
  }

  if (!config.hasCronSecret) {
    nextWarnings.push('Missing cron secret')
  }

  return nextWarnings
})

onMounted(() => {
  void loadStatus()
})

watch(() => props.adminPin, () => {
  if (props.adminPin) {
    void loadStatus({ silent: true })
  }
})

async function loadStatus(options: { silent?: boolean } = {}) {
  if (!props.adminPin) {
    return
  }

  if (!options.silent) {
    isLoadingStatus.value = true
  }

  error.value = ''

  try {
    status.value = await $fetch<FootballDataAdminSyncStatusDto>('/api/admin/sync/status', {
      headers: adminHeaders.value
    })
  } catch (caught) {
    error.value = getFetchErrorMessage(caught, 'Sync status could not be loaded.')
  } finally {
    isLoadingStatus.value = false
  }
}

async function runJob(job: SyncJob) {
  if (isBusy.value) {
    return
  }

  runningJob.value = job
  message.value = ''
  error.value = ''

  try {
    const result = await $fetch<{ ok: boolean; job: SyncJob; requestCount: number; message: string }>('/api/admin/sync', {
      method: 'POST',
      headers: adminHeaders.value,
      body: { job }
    })
    message.value = `${labelForJob(result.job)} sync finished with ${result.requestCount} API ${result.requestCount === 1 ? 'request' : 'requests'}.`
    await loadStatus({ silent: true })
  } catch (caught) {
    error.value = getFetchErrorMessage(caught, `${labelForJob(job)} sync failed.`)
    await loadStatus({ silent: true })
  } finally {
    runningJob.value = null
  }
}

function labelForJob(job: SyncJob) {
  return jobs.find((item) => item.key === job)?.label ?? job
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Not run'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

function statusClass(value: string) {
  switch (value.toLowerCase()) {
    case 'success':
      return 'sync-status-success'
    case 'failed':
      return 'sync-status-failed'
    case 'running':
      return 'sync-status-running'
    default:
      return 'sync-status-idle'
  }
}

function logTitle(log: ApiSyncLogDto) {
  return `${labelForJob(log.job as SyncJob)} / ${log.status}`
}

function stateTitle(item: ApiSyncStatusDto) {
  if (item.key === 'smart') {
    return 'Smart'
  }

  if (item.key === 'fixture_schedule') {
    return 'Fixture schedule'
  }

  return labelForJob(item.key as SyncJob)
}

function milestoneLabel(value: string) {
  switch (value) {
    case 'pregame_check':
      return 'Pregame'
    case 'kickoff_check':
      return 'Kickoff'
    case 'halftime':
      return 'Half'
    case 'live_watch':
      return 'Live'
    case 'fulltime':
      return 'Full'
    case 'final_backup':
      return 'Backup'
    case 'late_settlement':
      return 'Late'
    default:
      return value
  }
}

function getFetchErrorMessage(caught: unknown, fallback: string) {
  if (typeof caught !== 'object' || caught === null) {
    return fallback
  }

  const candidate = caught as {
    data?: { statusText?: string; message?: string }
    statusText?: string
    message?: string
  }

  return candidate.data?.statusText
    ?? candidate.data?.message
    ?? candidate.statusText
    ?? candidate.message
    ?? fallback
}
</script>

<template>
  <section class="panel sync-panel" aria-labelledby="football-sync-title">
    <div class="sync-heading">
      <div>
        <p class="eyebrow">Football data</p>
        <h2 id="football-sync-title">Football Sync</h2>
        <p class="muted small">Choose a sync job, then check the latest local data state.</p>
      </div>

      <button class="btn-secondary sync-refresh" type="button" :disabled="isBusy" @click="loadStatus()">
        <RefreshCw :size="18" aria-hidden="true" />
        Refresh
      </button>
    </div>

    <div v-if="warnings.length > 0" class="sync-warning-list" aria-label="Sync configuration warnings">
      <span v-for="warning in warnings" :key="warning" class="sync-warning">{{ warning }}</span>
    </div>

    <div class="cue-step">
      <span class="cue-marker" aria-hidden="true">01</span>
      <div class="cue-body">
        <p class="cue-title">Run sync job</p>
        <p class="cue-help">Use Daily for the fixture schedule, Hourly for a one-request refresh, or Live for current scores.</p>
        <div class="sync-actions" aria-label="Run sync jobs">
          <button
            v-for="job in jobs"
            :key="job.key"
            class="btn-secondary sync-run"
            type="button"
            :disabled="isBusy"
            @click="runJob(job.key)"
          >
            <RefreshCw v-if="runningJob === job.key" :size="18" aria-hidden="true" />
            <Play v-else :size="18" aria-hidden="true" />
            {{ runningJob === job.key ? `Running ${job.label}` : `Run ${job.label}` }}
          </button>
        </div>
      </div>
    </div>

    <p v-if="message" class="status success">{{ message }}</p>
    <p v-if="error" class="status error">{{ error }}</p>

    <p v-if="isLoadingStatus && !status" class="muted">Loading sync status...</p>

    <div v-else class="sync-content">
      <div class="sync-budget-grid" aria-label="API request budget">
        <article class="sync-budget-card">
          <p class="sync-budget-label">Requests today</p>
          <strong>{{ budget.callsToday }} / {{ budget.dailyLimit }}</strong>
          <div class="sync-budget-meter" aria-hidden="true">
            <span :style="{ width: `${budgetPercent}%` }" />
          </div>
        </article>
        <article class="sync-budget-card">
          <p class="sync-budget-label">Requests available</p>
          <strong>{{ budget.latestDailyRemaining ?? '-' }}</strong>
          <span class="sync-budget-help">Latest X-RequestsAvailable value from football-data.org.</span>
        </article>
      </div>

      <div class="sync-milestone-grid" aria-label="Milestone sync schedule">
        <section class="sync-milestone-list">
          <div class="sync-log-heading">
            <h3>Next milestone calls</h3>
            <span>{{ nextMilestones.length }} shown</span>
          </div>
          <div v-if="nextMilestones.length > 0" class="sync-milestone-items">
            <article v-for="milestone in nextMilestones" :key="milestone.id" class="sync-milestone-item">
              <span class="sync-status-pill sync-status-idle">{{ milestoneLabel(milestone.milestone) }}</span>
              <div>
                <strong>Fixture {{ milestone.fixtureId }}</strong>
                <p>{{ formatDate(milestone.dueAt) }} · {{ milestone.attempts }} attempts</p>
              </div>
            </article>
          </div>
          <p v-else class="muted">No upcoming milestone calls are queued.</p>
        </section>

        <section class="sync-milestone-list">
          <div class="sync-log-heading">
            <h3>Recent milestones</h3>
            <span>{{ recentMilestones.length }} shown</span>
          </div>
          <div v-if="recentMilestones.length > 0" class="sync-milestone-items">
            <article v-for="milestone in recentMilestones" :key="milestone.id" class="sync-milestone-item">
              <span :class="['sync-status-pill', statusClass(milestone.status)]">{{ milestoneLabel(milestone.milestone) }}</span>
              <div>
                <strong>Fixture {{ milestone.fixtureId }}</strong>
                <p>{{ formatDate(milestone.completedAt || milestone.lastAttemptAt || milestone.dueAt) }} · {{ milestone.message || milestone.error || milestone.status }}</p>
              </div>
            </article>
          </div>
          <p v-else class="muted">No milestone calls have run yet.</p>
        </section>
      </div>

      <div v-if="states.length > 0" class="sync-state-grid" aria-label="Latest sync states">
        <article v-for="item in states" :key="item.key" class="sync-state-card">
          <div class="sync-state-topline">
            <h3>{{ stateTitle(item) }}</h3>
            <span :class="['sync-status-pill', statusClass(item.status)]">{{ item.status }}</span>
          </div>

          <dl class="sync-facts">
            <div>
              <dt>Started</dt>
              <dd>{{ formatDate(item.lastStartedAt) }}</dd>
            </div>
            <div>
              <dt>Finished</dt>
              <dd>{{ formatDate(item.lastFinishedAt) }}</dd>
            </div>
            <div>
              <dt>Requests</dt>
              <dd>{{ item.requestCount }}</dd>
            </div>
          </dl>

          <p v-if="item.message" class="sync-note">{{ item.message }}</p>
          <p v-if="item.error" class="sync-error">{{ item.error }}</p>
        </article>
      </div>

      <p v-else class="muted">No football-data.org sync state has been recorded yet.</p>

      <div class="sync-log-section">
        <div class="sync-log-heading">
          <h3>Recent logs</h3>
          <span>{{ logs.length }} shown</span>
        </div>

        <div v-if="logs.length > 0" class="table-wrap">
          <table class="table sync-log-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Started</th>
                <th>Finished</th>
                <th>Requests</th>
                <th>Provider window</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in logs" :key="log.id">
                <td>
                  <span :class="['sync-status-pill', statusClass(log.status)]">{{ logTitle(log) }}</span>
                </td>
                <td>{{ formatDate(log.startedAt) }}</td>
                <td>{{ formatDate(log.finishedAt) }}</td>
                <td>{{ log.requestCount }}</td>
                <td>
                  Available {{ log.dailyRemaining ?? '-' }} / Reset {{ log.minuteRemaining ?? '-' }}s
                </td>
                <td>{{ log.error || log.message || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-else class="muted">No sync logs yet.</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sync-panel {
  background: transparent;
  border: 0;
  display: grid;
  gap: 0.9rem;
}

.sync-heading,
.sync-state-topline,
.sync-log-heading {
  align-items: start;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}

.sync-heading h2,
.sync-heading p,
.sync-state-card h3,
.sync-note,
.sync-error,
.sync-log-heading h3 {
  margin: 0;
}

.sync-refresh {
  flex: 0 0 auto;
}

.sync-warning-list,
.sync-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.sync-warning {
  background: var(--gold-soft);
  border: 1px solid rgba(244, 176, 0, 0.32);
  border-radius: var(--radius);
  color: var(--warning);
  font-size: 0.82rem;
  font-weight: 900;
  padding: 0.35rem 0.55rem;
}

.sync-run {
  min-width: 8.5rem;
}

.sync-content {
  display: grid;
  gap: 1rem;
}

.sync-budget-grid,
.sync-milestone-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
}

.sync-budget-card,
.sync-milestone-list {
  background: var(--data-well);
  border-radius: var(--radius);
  color: var(--text-invert);
  display: grid;
  gap: 0.65rem;
  padding: 0.85rem;
}

.sync-budget-card strong {
  font-size: 1.55rem;
  line-height: 1;
}

.sync-budget-label,
.sync-budget-help {
  margin: 0;
}

.sync-budget-label {
  color: rgba(255, 248, 232, 0.64);
  font-size: 0.72rem;
  font-weight: 900;
  text-transform: uppercase;
}

.sync-budget-help {
  color: rgba(255, 248, 232, 0.68);
  font-size: 0.82rem;
  font-weight: 750;
}

.sync-budget-meter {
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius);
  height: 0.45rem;
  overflow: hidden;
}

.sync-budget-meter span {
  background: #7cf0ad;
  display: block;
  height: 100%;
}

.sync-milestone-items {
  display: grid;
  gap: 0.55rem;
}

.sync-milestone-item {
  align-items: start;
  display: grid;
  gap: 0.6rem;
  grid-template-columns: auto minmax(0, 1fr);
}

.sync-milestone-item strong,
.sync-milestone-item p {
  margin: 0;
}

.sync-milestone-item p {
  color: rgba(255, 248, 232, 0.68);
  font-size: 0.82rem;
  font-weight: 750;
  overflow-wrap: anywhere;
}

.sync-state-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
}

.sync-state-card {
  background: var(--data-well);
  border: 0;
  border-radius: var(--radius);
  color: var(--text-invert);
  display: grid;
  gap: 0.75rem;
  padding: 0.85rem;
}

.sync-state-card h3 {
  font-size: 1rem;
  line-height: 1.2;
}

.sync-status-pill {
  border: 1px solid transparent;
  border-radius: var(--radius);
  display: inline-flex;
  font-size: 0.75rem;
  font-weight: 950;
  max-width: 100%;
  padding: 0.25rem 0.45rem;
  text-transform: uppercase;
  white-space: nowrap;
}

.sync-status-success {
  background: rgba(23, 131, 41, 0.24);
  border-color: rgba(124, 240, 173, 0.26);
  color: #7cf0ad;
}

.sync-status-failed {
  background: rgba(222, 50, 29, 0.22);
  border-color: rgba(255, 127, 113, 0.28);
  color: #ff9a8d;
}

.sync-status-running {
  background: rgba(244, 176, 0, 0.22);
  border-color: rgba(244, 176, 0, 0.3);
  color: #ffd052;
}

.sync-status-idle {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 248, 232, 0.16);
  color: rgba(255, 248, 232, 0.76);
}

.sync-facts {
  display: grid;
  gap: 0.55rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
}

.sync-facts div {
  display: grid;
  gap: 0.15rem;
}

.sync-facts dt {
  color: rgba(255, 248, 232, 0.64);
  font-size: 0.72rem;
  font-weight: 900;
}

.sync-facts dd {
  font-size: 0.88rem;
  font-weight: 850;
  margin: 0;
  overflow-wrap: anywhere;
}

.sync-note,
.sync-error {
  border-radius: var(--radius);
  font-size: 0.88rem;
  font-weight: 800;
  padding: 0.6rem;
}

.sync-note {
  background: rgba(23, 131, 41, 0.14);
  color: #b7f8ca;
}

.sync-error {
  background: rgba(222, 50, 29, 0.16);
  color: #ffb3aa;
}

.sync-log-section {
  display: grid;
  gap: 0.65rem;
}

.sync-log-section .table-wrap {
  background: var(--data-well);
  border-radius: var(--radius);
  color: var(--text-invert);
}

.sync-log-section .table th,
.sync-log-section .table td {
  border-bottom-color: var(--data-line);
}

.sync-log-section .table th {
  color: rgba(255, 248, 232, 0.62);
}

.sync-log-section .table td {
  color: rgba(255, 248, 232, 0.86);
}

.sync-log-heading span {
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 900;
}

.sync-log-table td {
  font-size: 0.86rem;
}

@media (max-width: 720px) {
  .sync-heading,
  .sync-state-topline,
  .sync-log-heading {
    display: grid;
    grid-template-columns: 1fr;
  }

  .sync-refresh,
  .sync-run {
    width: 100%;
  }

  .sync-facts {
    grid-template-columns: 1fr;
  }
}
</style>
