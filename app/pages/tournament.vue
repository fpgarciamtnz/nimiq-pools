<script setup lang="ts">
import { ArrowRight, RefreshCw, Trophy } from '@lucide/vue'
import type { PoolSummaryDto } from '../../shared/types'

const summaries = shallowRef<PoolSummaryDto[]>([])
const error = shallowRef('')
const isLoading = shallowRef(false)
const requestFetch = useRequestFetch()

const hasLeagues = computed(() => summaries.value.length > 0)

await loadSummaries()

async function loadSummaries() {
  error.value = ''
  isLoading.value = true

  try {
    const response = await requestFetch<{ pools: PoolSummaryDto[] }>('/api/pools/summaries')
    summaries.value = response.pools
  } catch {
    error.value = 'Your leagues could not be loaded.'
  } finally {
    isLoading.value = false
  }
}

function initials(title: string) {
  return title
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'L'
}
</script>

<template>
  <main class="page">
    <PageHeader title="Your Leagues" subtitle="Open leagues connected to your Nimiq Pay account" />

    <p v-if="error" class="status error">{{ error }}</p>

    <section class="league-dashboard">
      <div class="dashboard-heading">
        <div>
          <p class="eyebrow">Account leagues</p>
          <h2>Pick up the rivalry</h2>
          <p class="muted">Your leagues stay connected to the wallet you signed in with.</p>
        </div>
        <button class="btn-secondary" type="button" :disabled="isLoading" @click="loadSummaries">
          <RefreshCw :size="18" aria-hidden="true" />
          Refresh
        </button>
      </div>

      <div v-if="hasLeagues" class="league-list">
        <article v-for="league in summaries" :key="league.code" class="league-card">
          <div class="league-card-image" aria-hidden="true">
            <img v-if="league.imageDataUrl" :src="league.imageDataUrl" alt="">
            <span v-else>{{ initials(league.title) }}</span>
          </div>

          <div class="league-card-copy">
            <h3>{{ league.title }}</h3>
            <p>
              <span v-if="league.isPublic">{{ league.participantCount }} players - rankings live</span>
              <span v-else>Predictions hidden until reveal</span>
            </p>
          </div>

          <div class="league-card-status" aria-label="League summary">
            <Trophy :size="16" aria-hidden="true" />
            <span v-if="league.leader">{{ league.leader.displayName }} leads</span>
            <span v-else>Waiting</span>
          </div>

          <NuxtLink class="open-pool-link" :to="league.inviteUrl">
            Open League
            <ArrowRight :size="18" aria-hidden="true" />
          </NuxtLink>
        </article>
      </div>

      <div v-else class="empty-state cue-step">
        <span class="cue-marker" aria-hidden="true">01</span>
        <div class="cue-body">
          <p class="cue-title">Create your first league</p>
          <p class="cue-help">No leagues are connected to this wallet yet. Create one to get started.</p>
          <NuxtLink class="open-pool-link" to="/">
            Create League
            <ArrowRight :size="18" aria-hidden="true" />
          </NuxtLink>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.league-dashboard {
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  display: grid;
  gap: 1.1rem;
  padding: 0.35rem 0 1rem;
  position: relative;
}

.dashboard-heading {
  align-items: start;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  padding-bottom: 0.85rem;
  position: relative;
}

.dashboard-heading::after {
  background:
    linear-gradient(90deg, rgba(22, 21, 17, 0.18), transparent),
    repeating-linear-gradient(90deg, rgba(22, 21, 17, 0.12) 0 1px, transparent 1px 1.5rem);
  bottom: 0;
  content: "";
  height: 1px;
  left: 0;
  position: absolute;
  right: 0;
}

.dashboard-heading h2,
.dashboard-heading p,
.league-card h3,
.league-card p,
.empty-state p {
  margin: 0;
}

.dashboard-heading h2 {
  color: var(--text);
  font-size: clamp(1.55rem, 3vw, 2.35rem);
  font-style: italic;
  font-weight: 950;
  line-height: 1;
  text-transform: uppercase;
}

.league-list {
  display: grid;
  gap: 0;
}

.league-card {
  align-items: center;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--section-line);
  border-radius: 0;
  box-shadow: none;
  color: var(--text-invert);
  display: grid;
  gap: 0.9rem;
  grid-template-columns: auto minmax(0, 1fr) minmax(8rem, auto) auto;
  padding: 1rem 0;
}

.league-card-image {
  align-items: center;
  background: linear-gradient(135deg, var(--accent), var(--gold));
  border: 0;
  border-radius: var(--radius);
  color: #fff8e8;
  display: inline-flex;
  font-weight: 950;
  height: 4.25rem;
  justify-content: center;
  overflow: hidden;
  width: 4.25rem;
}

.league-card-image img {
  display: block;
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.league-card-copy {
  display: grid;
  gap: 0.2rem;
  min-width: 0;
}

.league-card-copy h3 {
  color: var(--text-invert);
  font-size: 1.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.league-card-copy p {
  color: rgba(255, 248, 232, 0.72);
  font-weight: 800;
}

.league-card-status {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 0;
  color: var(--gold);
  display: inline-flex;
  font-size: 0.86rem;
  font-weight: 850;
  gap: 0.35rem;
  justify-content: center;
  min-width: 0;
  padding: 0;
}

.league-card-status span {
  overflow: hidden;
  text-shadow: 0 1px 12px rgba(2, 10, 19, 0.5);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.open-pool-link {
  align-items: center;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  border-radius: var(--radius);
  box-shadow: none;
  color: #fff8e8;
  display: inline-flex;
  font-weight: 900;
  gap: 0.45rem;
  justify-content: center;
  min-height: 2.55rem;
  padding: 0.65rem 0.95rem;
  text-decoration: none;
}

.empty-state {
  align-items: start;
  background: transparent;
  border: 0;
  border-radius: 0;
  color: var(--text);
  display: grid;
  gap: 1rem;
  padding: 0.5rem 0;
}

@media (max-width: 640px) {
  .dashboard-heading,
  .empty-state {
    align-items: stretch;
    display: grid;
  }

  .league-card {
    grid-template-columns: auto minmax(0, 1fr);
    padding: 1rem 0;
  }

  .league-card-status,
  .open-pool-link {
    grid-column: 1 / -1;
    width: 100%;
  }

  .league-card-status {
    justify-content: flex-start;
  }
}
</style>
