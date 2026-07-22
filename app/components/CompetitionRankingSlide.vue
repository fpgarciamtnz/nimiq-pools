<script setup lang="ts">
import type { CompetitionRankingRow } from '../../shared/types'

interface Props {
  rows: CompetitionRankingRow[]
  isPublic: boolean
}

const props = defineProps<Props>()
</script>

<template>
  <section class="competition-slide" aria-labelledby="rankings-title">
    <h2 id="rankings-title" class="sr-only">Rankings</h2>

    <div v-if="!props.isPublic" class="unlock-panel">
      <strong>Rankings unlock when the tournament starts.</strong>
      <span>Everyone's picks stay hidden until the deadline passes.</span>
    </div>

    <p v-else-if="props.rows.length === 0" class="muted">No ranked entries yet.</p>

    <div v-else class="score-sheet" role="table" aria-label="Pool rankings">
      <article
        v-for="row in props.rows"
        :key="row.entryId"
        class="score-row"
        :class="{ 'score-row-leader': row.rank === 1 }"
        role="row"
      >
        <div class="rank-mark" role="cell">#{{ row.rank }}</div>

        <div class="player-block" role="cell">
          <div class="player-heading">
            <PlayerAvatar :avatar-key="row.avatarKey" :display-name="row.displayName" size="sm" />
            <strong class="player-name">{{ row.displayName }}</strong>
          </div>
          <div class="breakdown-strip" aria-label="Score breakdown">
            <span v-for="item in row.breakdown" :key="item.questionKey" class="breakdown-chip">
              <TeamFlag :name="item.team.name" :fifa-code="item.team.fifaCode" :flag-url="item.team.flagUrl" :flag-emoji="item.team.flagEmoji" size="sm" />
              <span class="chip-label">{{ item.shortLabel }}</span>
              <strong>{{ item.scoreLabel }}</strong>
            </span>
          </div>
        </div>

        <div class="total-score" aria-label="Total score" role="cell">
          <strong>{{ row.totalScore }}</strong>
          <span>pts</span>
        </div>
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

.score-sheet {
  background: rgba(17, 24, 20, 0.94);
  border: 0;
  border-radius: var(--radius);
  display: grid;
}

.score-row {
  align-items: stretch;
  background: transparent;
  border-bottom: 1px solid rgba(255, 248, 232, 0.12);
  display: grid;
  gap: 0.8rem;
  grid-template-columns: 3.25rem minmax(0, 1fr) 7.25rem;
  min-height: 5.4rem;
  padding: 0.72rem 0;
}

.score-row:last-child {
  border-bottom: 0;
}

.rank-mark {
  align-items: center;
  color: var(--gold);
  display: inline-flex;
  font-size: 1rem;
  font-weight: 900;
  justify-content: center;
  padding-top: 0.26rem;
}

.score-row-leader .rank-mark {
  background: var(--gold-soft);
  border: 0;
  border-radius: 999px;
  height: 2.35rem;
  margin-top: 0.12rem;
  padding: 0;
  width: 2.85rem;
}

.player-block {
  display: grid;
  gap: 0.5rem;
  min-width: 0;
}

.player-heading {
  align-items: center;
  display: flex;
  gap: 0.55rem;
  min-width: 0;
}

.player-name {
  color: var(--text-invert);
  display: block;
  font-size: 2.2rem;
  font-weight: 950;
  line-height: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.total-score {
  align-items: baseline;
  color: var(--accent-strong);
  display: flex;
  gap: 0.18rem;
  justify-content: end;
  line-height: 1;
  min-width: 0;
}

.total-score strong {
  font-size: 3.8rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
}

.total-score span {
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 900;
}

.breakdown-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  min-width: 0;
}

.breakdown-chip {
  align-items: center;
  background: rgba(255, 250, 240, 0.92);
  border: 0;
  border-radius: 999px;
  color: var(--text);
  display: inline-flex;
  gap: 0.28rem;
  max-width: 12rem;
  min-width: 0;
  padding: 0.27rem 0.5rem;
}

.chip-flag,
.chip-label,
.breakdown-chip strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-flag {
  flex: 0 0 auto;
}

.chip-label {
  color: var(--red);
  font-size: 0.78rem;
  font-weight: 850;
}

.breakdown-chip strong {
  color: #17211b;
  font-size: 0.82rem;
  margin: 0;
  font-variant-numeric: tabular-nums;
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

@media (max-width: 880px) {
  .score-row {
    grid-template-columns: 3rem minmax(0, 1fr) 5.75rem;
  }
}

@media (max-width: 560px) {
  .score-row {
    gap: 0.55rem;
    grid-template-columns: 2.5rem minmax(0, 1fr) 4.6rem;
    min-height: 4.7rem;
    padding: 0.66rem 0;
  }

  .player-name {
    font-size: 1.5rem;
  }

  .total-score strong {
    font-size: 2.4rem;
  }

  .breakdown-chip {
    max-width: 9.5rem;
    padding: 0.24rem 0.42rem;
  }

  .chip-label {
    font-size: 0.74rem;
  }
}
</style>
