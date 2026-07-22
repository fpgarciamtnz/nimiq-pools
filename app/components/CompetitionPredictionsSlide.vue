<script setup lang="ts">
import type { CompetitionPredictionRow } from '../../shared/types'

interface Props {
  rows: CompetitionPredictionRow[]
  isPublic: boolean
}

const props = defineProps<Props>()
</script>

<template>
  <section class="competition-slide" aria-labelledby="predictions-title">
    <h2 id="predictions-title" class="sr-only">Predictions</h2>

    <div v-if="!props.isPublic" class="unlock-panel">
      <strong>Predictions are still hidden.</strong>
      <span>They reveal together when the deadline passes.</span>
    </div>

    <p v-else-if="props.rows.length === 0" class="muted">No public predictions yet.</p>

    <div v-else class="prediction-list">
      <article v-for="row in props.rows" :key="row.entryId" class="prediction-row">
        <div class="prediction-person">
          <PlayerAvatar :avatar-key="row.avatarKey" :display-name="row.displayName" size="sm" />
          <h3 class="prediction-name">{{ row.displayName }}</h3>
        </div>
        <dl class="pick-strip">
          <div v-for="pick in row.picks" :key="pick.questionKey" class="pick-pill">
            <dt>{{ pick.label }}</dt>
            <dd>
              <TeamFlag :name="pick.team.name" :fifa-code="pick.team.fifaCode" :flag-url="pick.team.flagUrl" :flag-emoji="pick.team.flagEmoji" size="sm" />
              {{ pick.team.name }}
            </dd>
          </div>
        </dl>
      </article>
    </div>
  </section>
</template>

<style scoped>
.competition-slide {
  display: grid;
  gap: 0.75rem;
}

.unlock-panel {
  background: rgba(17, 24, 20, 0.94);
  border: 0;
  border-radius: 8px;
  color: var(--text-invert);
  display: grid;
  gap: 0.25rem;
  padding: 1rem;
}

.unlock-panel span {
  color: rgba(255, 248, 232, 0.68);
}

.prediction-list {
  display: grid;
  gap: 0;
  background: rgba(17, 24, 20, 0.94);
  border: 0;
  border-radius: var(--radius);
  overflow: hidden;
}

.prediction-row {
  align-items: center;
  background: transparent;
  border-bottom: 1px solid rgba(255, 248, 232, 0.12);
  display: grid;
  gap: 0.75rem;
  grid-template-columns: minmax(9rem, 0.55fr) minmax(0, 1fr);
  min-height: 4.25rem;
  padding: 0.66rem 0;
}

.prediction-row:last-child {
  border-bottom: 0;
}

.prediction-person {
  align-items: center;
  display: flex;
  gap: 0.55rem;
  min-width: 0;
}

.prediction-name {
  color: var(--text-invert);
  font-size: 1.35rem;
  font-weight: 950;
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pick-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  justify-content: flex-end;
  margin: 0;
  min-width: 0;
}

.pick-pill {
  align-items: center;
  background: rgba(255, 250, 240, 0.92);
  border: 0;
  border-radius: 999px;
  display: inline-flex;
  gap: 0.35rem;
  max-width: 14rem;
  min-width: 0;
  padding: 0.32rem 0.58rem;
}

.pick-pill dt {
  color: var(--red);
  flex: 0 0 auto;
  font-size: 0.76rem;
  font-weight: 850;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pick-pill dd {
  align-items: center;
  display: flex;
  font-size: 0.92rem;
  font-weight: 900;
  gap: 0.24rem;
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sr-only {
  border: 0;
  clip: rect(0, 0, 0, 0);
  height: 1px;
  margin: -1px;
  overflow: hidden;
  padding: 0;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}

@media (max-width: 760px) {
  .prediction-row {
    grid-template-columns: 1fr;
    gap: 0.48rem;
  }

  .pick-strip {
    justify-content: flex-start;
  }
}

@media (max-width: 520px) {
  .prediction-name {
    font-size: 1.2rem;
  }

  .pick-pill {
    max-width: 100%;
  }
}
</style>
