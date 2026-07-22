<script setup lang="ts">
import { computed } from 'vue'
import { Trophy } from '@lucide/vue'
import { splitKnockoutBracketSides, type KnockoutPickemMatchView } from '#shared/knockout-pickem-display'
import type { TeamDto } from '#shared/types'
import KnockoutPickemBracketMatch from './KnockoutPickemBracketMatch.vue'

type BracketBoardMode = 'select' | 'result'

interface Props {
  label: string
  matches: KnockoutPickemMatchView[]
  teams: TeamDto[]
  mode: BracketBoardMode
  disabled?: boolean
}

interface Emits {
  selectWinner: [payload: { fixtureId: number, teamSlug: string }]
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})
const emit = defineEmits<Emits>()

const lanes = computed(() => splitKnockoutBracketSides(props.matches))
const isSingleMatch = computed(() => props.matches.length <= 1)

function selectWinner(fixtureId: number, teamSlug: string) {
  emit('selectWinner', { fixtureId, teamSlug })
}
</script>

<template>
  <div class="bracket-board" :class="{ 'is-single': isSingleMatch }" :aria-label="`${props.label} bracket`">
    <div class="round-labels" aria-hidden="true">
      <span>{{ props.label }}</span>
      <span>Prediction</span>
      <span v-if="!isSingleMatch">{{ props.label }}</span>
    </div>

    <div class="bracket-grid">
      <div class="bracket-lane lane-left">
        <KnockoutPickemBracketMatch
          v-for="match in lanes.left"
          :key="match.fixture.fixtureId"
          :match="match"
          :teams="props.teams"
          :mode="props.mode"
          :disabled="props.disabled"
          @select-winner="selectWinner(match.fixture.fixtureId, $event)"
        />
      </div>

      <div class="bracket-center">
        <span class="center-badge" aria-hidden="true">
          <Trophy :size="18" />
        </span>
        <strong>{{ props.mode === 'select' ? 'Your picks' : 'Predicted winners' }}</strong>
      </div>

      <div v-if="!isSingleMatch" class="bracket-lane lane-right">
        <KnockoutPickemBracketMatch
          v-for="match in lanes.right"
          :key="match.fixture.fixtureId"
          :match="match"
          :teams="props.teams"
          :mode="props.mode"
          :disabled="props.disabled"
          @select-winner="selectWinner(match.fixture.fixtureId, $event)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.bracket-board {
  background:
    linear-gradient(90deg, rgba(255, 248, 232, 0.06), transparent 18% 82%, rgba(255, 248, 232, 0.06)),
    rgba(17, 24, 20, 0.76);
  border-radius: var(--radius);
  display: grid;
  gap: 0.58rem;
  min-width: 0;
  overflow: hidden;
  padding: 0.72rem;
}

.round-labels,
.bracket-grid {
  display: grid;
  gap: 0.8rem;
  grid-template-columns: minmax(0, 1fr) minmax(6.5rem, 0.36fr) minmax(0, 1fr);
  min-width: 0;
}

.is-single .round-labels,
.is-single .bracket-grid {
  grid-template-columns: minmax(0, 1fr) minmax(6.5rem, 0.36fr);
}

.round-labels span {
  color: rgba(255, 248, 232, 0.66);
  font-size: 0.76rem;
  font-weight: 950;
  text-align: center;
  text-transform: uppercase;
}

.bracket-lane {
  display: grid;
  gap: 0.58rem;
  min-width: 0;
}

.bracket-center {
  align-content: center;
  color: var(--gold);
  display: grid;
  gap: 0.35rem;
  justify-items: center;
  min-width: 0;
  text-align: center;
}

.center-badge {
  align-items: center;
  background: var(--gold);
  border-radius: 999px;
  color: #1f1606;
  display: inline-flex;
  height: 2.3rem;
  justify-content: center;
  width: 2.3rem;
}

.bracket-center strong {
  font-size: 0.86rem;
  line-height: 1.1;
  overflow-wrap: anywhere;
  text-transform: uppercase;
}

@media (max-width: 720px) {
  .bracket-board {
    padding: 0.62rem 0.5rem;
  }

  .round-labels {
    grid-template-columns: 1fr;
  }

  .round-labels span:not(:first-child) {
    display: none;
  }

  .bracket-grid,
  .is-single .bracket-grid {
    display: flex;
    gap: 0.62rem;
    overflow-x: auto;
    padding-bottom: 0.15rem;
    scroll-snap-type: x mandatory;
  }

  .bracket-lane {
    display: contents;
  }

  .bracket-center {
    display: none;
  }
}
</style>
