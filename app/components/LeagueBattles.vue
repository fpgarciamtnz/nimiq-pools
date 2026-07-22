<script setup lang="ts">
import { computed } from 'vue'
import { Flame, Swords, Trophy } from '@lucide/vue'
import type { CompetitionBattle } from '../../shared/types'

interface Props {
  battles: CompetitionBattle[]
  isPublic: boolean
}

const props = defineProps<Props>()

const visibleBattles = computed(() => props.battles.slice(0, 2))

function gapLabel(battle: CompetitionBattle) {
  return battle.scoreGap === 0 ? 'Tied' : `${battle.scoreGap} pts apart`
}
</script>

<template>
  <section v-if="props.isPublic && visibleBattles.length > 0" class="battles-panel" aria-labelledby="battles-title">
    <div class="section-heading">
      <p class="eyebrow">Drama battles</p>
      <h2 id="battles-title">Rivalry watch</h2>
      <p class="muted">The closest conflicts from rankings, ballots, and revealed Pick'em calls.</p>
    </div>

    <div class="battle-grid">
      <article v-for="battle in visibleBattles" :key="`${battle.type}-${battle.fixtureId}-${battle.entryIds.join('-')}`" class="battle-card">
        <div class="battle-icon" aria-hidden="true">
          <Swords v-if="battle.type === 'opposite_pickem'" :size="18" />
          <Flame v-else-if="battle.type === 'selected_team_vs_pickem'" :size="18" />
          <Trophy v-else :size="18" />
        </div>

        <div class="battle-copy">
          <div class="battle-kicker">
            <span>{{ gapLabel(battle) }}</span>
            <span>Best rank #{{ battle.bestRank }}</span>
          </div>
          <h3>{{ battle.title }}</h3>
          <p>{{ battle.text }}</p>
          <div class="battle-teams" aria-label="Battle teams">
            <span v-for="team in battle.teams" :key="team.slug" class="battle-team">
              <TeamFlag :name="team.name" :fifa-code="team.fifaCode" :flag-url="team.flagUrl" :flag-emoji="team.flagEmoji" size="sm" />
              {{ team.name }}
            </span>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.battles-panel {
  display: grid;
  gap: 0.78rem;
  min-width: 0;
}

.battles-panel .section-heading h2 {
  color: var(--text);
}

.battles-panel .section-heading .muted {
  color: var(--muted);
}

.battle-grid {
  display: grid;
  gap: 0.7rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.battle-card {
  background: linear-gradient(135deg, var(--data-well), #3c160f);
  border: 1px solid rgba(255, 248, 232, 0.12);
  border-radius: var(--radius);
  color: var(--text-invert);
  display: grid;
  gap: 0.62rem;
  grid-template-columns: auto minmax(0, 1fr);
  min-width: 0;
  padding: 0.86rem;
}

.battle-icon {
  align-items: center;
  background: var(--gold);
  border-radius: 999px;
  color: #1f1606;
  display: inline-flex;
  height: 2.15rem;
  justify-content: center;
  width: 2.15rem;
}

.battle-copy {
  display: grid;
  gap: 0.34rem;
  min-width: 0;
}

.battle-kicker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.34rem;
}

.battle-kicker span {
  background: rgba(255, 248, 232, 0.12);
  border-radius: 999px;
  color: var(--gold);
  font-size: 0.75rem;
  font-weight: 900;
  padding: 0.18rem 0.44rem;
}

.battle-copy h3,
.battle-copy p {
  margin: 0;
}

.battle-copy h3 {
  color: #fff8e8;
  font-size: 1.05rem;
  line-height: 1.05;
}

.battle-copy p {
  color: rgba(255, 248, 232, 0.8);
  font-size: 0.93rem;
  font-weight: 760;
  line-height: 1.34;
  overflow-wrap: anywhere;
}

.battle-teams {
  display: flex;
  flex-wrap: wrap;
  gap: 0.34rem;
}

.battle-team {
  align-items: center;
  background: rgba(255, 250, 240, 0.94);
  border-radius: 999px;
  color: var(--text);
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 860;
  gap: 0.28rem;
  max-width: 12rem;
  overflow: hidden;
  padding: 0.24rem 0.48rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 760px) {
  .battle-grid {
    grid-template-columns: 1fr;
  }
}
</style>
