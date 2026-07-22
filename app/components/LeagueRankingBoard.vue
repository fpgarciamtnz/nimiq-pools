<script setup lang="ts">
import { LockKeyhole, Medal } from '@lucide/vue'
import type { CompetitionRankingRow } from '../../shared/types'

interface Props {
  rows: CompetitionRankingRow[]
  isPublic: boolean
}

const props = defineProps<Props>()

const leader = computed(() => props.rows[0] ?? null)
const chasingRows = computed(() => props.rows.slice(1))
const maxScore = computed(() => Math.max(1, ...props.rows.map((row) => row.totalScore)))
const countLabel = computed(() => `${props.rows.length} ${props.rows.length === 1 ? 'player' : 'players'}`)

function scoreWidth(row: CompetitionRankingRow) {
  if (row.totalScore <= 0) {
    return '0%'
  }

  return `${Math.max(7, Math.round((row.totalScore / maxScore.value) * 100))}%`
}

</script>

<template>
  <section class="ranking-board" aria-labelledby="rankings-title">
    <span class="module-number" aria-hidden="true">02</span>
    <div class="board-heading">
      <div class="section-heading">
        <p class="eyebrow">Live rankings</p>
        <h2 id="rankings-title">Table pressure</h2>
      </div>
      <span v-if="props.rows.length > 0" class="board-count">{{ countLabel }}</span>
    </div>

    <div v-if="!props.isPublic && props.rows.length > 0" class="board-locked">
      <LockKeyhole :size="16" aria-hidden="true" />
      <div>
        <strong>Ballots received.</strong>
        <span>Names are live now. Points stay at 0 until the reveal.</span>
      </div>
    </div>

    <p v-if="props.rows.length === 0" class="muted">
      <span v-if="props.isPublic">No ranked entries yet.</span>
      <span v-else>No ballots submitted yet.</span>
    </p>

    <template v-if="props.rows.length > 0">
      <article v-if="leader" class="leader-card" :class="{ 'is-placeholder': !props.isPublic }">
        <div class="leader-main">
          <Medal :size="16" aria-hidden="true" />
          <PlayerAvatar :avatar-key="leader.avatarKey" :display-name="leader.displayName" size="lg" />
          <div class="leader-copy">
            <span>#{{ leader.rank }} {{ props.isPublic ? 'right now' : 'entered' }}</span>
            <strong>{{ leader.displayName }}</strong>
          </div>
        </div>

        <div class="leader-score">
          <strong>{{ leader.totalScore }}</strong>
          <span>pts</span>
        </div>

        <div v-if="props.isPublic" class="breakdown-list" aria-label="Leader score breakdown">
          <span v-for="item in leader.breakdown" :key="item.questionKey" class="breakdown-chip">
            <TeamFlag :name="item.team.name" :fifa-code="item.team.fifaCode" :flag-url="item.team.flagUrl" :flag-emoji="item.team.flagEmoji" size="sm" />
            {{ item.shortLabel }} {{ item.scoreLabel }}
          </span>
        </div>
      </article>

      <div class="rank-list" role="table" aria-label="League rankings">
        <article v-for="row in chasingRows" :key="row.entryId" class="rank-row" :class="{ 'is-placeholder': !props.isPublic }" role="row">
          <span class="rank-number" role="cell">#{{ row.rank }}</span>
          <PlayerAvatar :avatar-key="row.avatarKey" :display-name="row.displayName" size="sm" />
          <div class="rank-main" role="cell">
            <div class="rank-line">
              <strong>{{ row.displayName }}</strong>
              <span>{{ row.totalScore }} pts</span>
            </div>
            <div class="score-track" aria-hidden="true">
              <span :style="{ width: scoreWidth(row) }" />
            </div>
            <div v-if="props.isPublic" class="breakdown-list" aria-label="Score breakdown">
              <span v-for="item in row.breakdown" :key="item.questionKey" class="breakdown-chip">
                <TeamFlag :name="item.team.name" :fifa-code="item.team.fifaCode" :flag-url="item.team.flagUrl" :flag-emoji="item.team.flagEmoji" size="sm" />
                {{ item.shortLabel }} {{ item.scoreLabel }}
              </span>
            </div>
          </div>
        </article>
      </div>
    </template>
  </section>
</template>

<style scoped>
.ranking-board {
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  display: grid;
  gap: 0.72rem;
  padding: 0.35rem 0 0.6rem;
  position: relative;
}

.module-number {
  background: var(--red);
  border-radius: 999px;
  color: #fff8e8;
  font-size: 0.82rem;
  font-weight: 950;
  justify-self: start;
  padding: 0.25rem 0.45rem;
}

.board-heading {
  align-items: start;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}

.ranking-board .section-heading h2 {
  color: var(--text);
}

.ranking-board > .muted {
  color: rgba(255, 248, 232, 0.72);
}

.board-count {
  background: var(--gold);
  border: 0;
  border-radius: var(--radius);
  color: #1f1606;
  font-size: 0.84rem;
  font-weight: 900;
  padding: 0.32rem 0.52rem;
  white-space: nowrap;
}

.board-locked {
  align-items: center;
  background: var(--data-well);
  border: 0;
  border-radius: var(--radius);
  color: var(--text-invert);
  display: grid;
  gap: 0.55rem;
  grid-template-columns: auto minmax(0, 1fr);
  padding: 0.85rem;
}

.board-locked div {
  display: grid;
  gap: 0.12rem;
  min-width: 0;
}

.board-locked span {
  color: rgba(255, 248, 232, 0.66);
  font-weight: 760;
  overflow-wrap: anywhere;
}

.leader-card {
  background: linear-gradient(135deg, var(--accent), #063b15);
  border: 0;
  border-radius: var(--radius);
  color: var(--text-invert);
  display: grid;
  gap: 0.85rem;
  grid-template-columns: minmax(0, 1fr) auto;
  padding: 0.9rem;
}

.leader-card.is-placeholder {
  background: var(--data-well);
  border-left: 0.22rem solid var(--gold);
}

.leader-main {
  align-items: center;
  display: flex;
  gap: 0.55rem;
  min-width: 0;
}

.leader-main svg {
  color: var(--gold);
}

.leader-copy {
  display: grid;
  gap: 0.06rem;
  min-width: 0;
}

.leader-copy span {
  color: rgba(255, 248, 232, 0.72);
  font-size: 0.82rem;
  font-weight: 850;
}

.leader-copy strong {
  font-size: 1.55rem;
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.leader-score {
  align-items: baseline;
  display: flex;
  gap: 0.2rem;
}

.leader-score strong {
  font-size: 2.8rem;
  font-variant-numeric: tabular-nums;
  line-height: 0.9;
}

.leader-score span {
  color: rgba(255, 248, 232, 0.76);
  font-weight: 900;
}

.breakdown-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.34rem;
  grid-column: 1 / -1;
}

.breakdown-chip {
  align-items: center;
  background: rgba(255, 250, 240, 0.92);
  border: 0;
  border-radius: 999px;
  color: var(--text);
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 850;
  gap: 0.28rem;
  max-width: 13rem;
  overflow: hidden;
  padding: 0.24rem 0.48rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-list {
  background: var(--data-well);
  border: 0;
  border-radius: var(--radius);
  display: grid;
  overflow: hidden;
}

.rank-row {
  align-items: center;
  border-bottom: 1px solid var(--data-line);
  display: grid;
  gap: 0.62rem;
  grid-template-columns: 2.65rem auto minmax(0, 1fr);
  padding: 0.72rem 0.3rem;
}

.rank-row.is-placeholder .score-track span {
  background: transparent;
}

.rank-row:last-child {
  border-bottom: 0;
}

.rank-number {
  color: var(--gold);
  font-weight: 950;
  text-align: center;
}

.rank-main {
  display: grid;
  gap: 0.38rem;
  min-width: 0;
}

.rank-line {
  align-items: baseline;
  display: grid;
  gap: 0.7rem;
  grid-template-columns: minmax(0, 1fr) auto;
}

.rank-line strong {
  color: var(--text-invert);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-line span {
  color: var(--gold);
  font-variant-numeric: tabular-nums;
  font-weight: 950;
  white-space: nowrap;
}

.score-track {
  background: rgba(255, 248, 232, 0.12);
  border-radius: 999px;
  height: 0.36rem;
  overflow: hidden;
}

.score-track span {
  background: linear-gradient(90deg, var(--accent), var(--gold));
  border-radius: inherit;
  display: block;
  height: 100%;
}

@media (max-width: 620px) {
  .leader-card {
    grid-template-columns: 1fr;
  }

  .leader-score strong {
    font-size: 2.4rem;
  }

  .rank-row {
    grid-template-columns: 2.25rem minmax(0, 1fr);
  }

  .rank-row :deep(.player-avatar) {
    display: none;
  }
}
</style>
