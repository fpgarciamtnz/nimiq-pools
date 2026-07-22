<script setup lang="ts">
import { computed } from 'vue'
import type { KnockoutPickemProjectionBracket, KnockoutPickemProjectionColumn, KnockoutPickemProjectionSlot as ProjectionSlot } from '#shared/knockout-pickem-display'
import type { TeamDto } from '#shared/types'
import KnockoutPickemProjectionSlot from './KnockoutPickemProjectionSlot.vue'

interface Props {
  projection: KnockoutPickemProjectionBracket
  teams: TeamDto[]
}

const props = defineProps<Props>()

interface ProjectionMatchGroup {
  id: string
  slots: ProjectionSlot[]
}

interface ProjectionMatchColumn {
  key: KnockoutPickemProjectionColumn['key']
  label: string
  matches: ProjectionMatchGroup[]
}

interface ProjectionLaneColumn {
  id: string
  column: ProjectionMatchColumn | null
}

const MAX_SIDE_LANES = 4

const matchColumns = computed<ProjectionMatchColumn[]>(() => props.projection.columns.slice(0, -1).map((column) => ({
  key: column.key,
  label: column.label,
  matches: pairSlots(column.slots, column.key)
})))

const sideColumns = computed(() => matchColumns.value.slice(0, -1))
const centerColumn = computed(() => matchColumns.value.at(-1) ?? null)
const winnerColumn = computed(() => props.projection.columns.at(-1) ?? null)
const winnerSlot = computed(() => winnerColumn.value?.slots[0] ?? null)
const outerMatchCount = computed(() => Math.max(1, matchColumns.value[0]?.matches.length ?? 1))

const leftColumns = computed(() => sideColumns.value.map((column) => ({
  ...column,
  matches: column.matches.slice(0, Math.ceil(column.matches.length / 2))
})))

const rightColumns = computed(() => sideColumns.value.map((column) => ({
  ...column,
  matches: column.matches.slice(Math.ceil(column.matches.length / 2))
})).reverse())
const emptyLaneCount = computed(() => Math.max(0, MAX_SIDE_LANES - sideColumns.value.length))
const leftLaneColumns = computed<ProjectionLaneColumn[]>(() => [
  ...makeLaneSpacers(emptyLaneCount.value, 'left'),
  ...leftColumns.value.map((column) => ({
    id: `left-${column.key}`,
    column
  }))
])
const rightLaneColumns = computed<ProjectionLaneColumn[]>(() => [
  ...rightColumns.value.map((column) => ({
    id: `right-${column.key}`,
    column
  })),
  ...makeLaneSpacers(emptyLaneCount.value, 'right')
])
const visibleSideDepth = computed(() => sideColumns.value.length)

const bracketStyle = computed(() => ({
  '--outer-match-count': String(outerMatchCount.value),
  ...sizeTokensForDepth(visibleSideDepth.value)
}))

function pairSlots(slots: ProjectionSlot[], columnKey: KnockoutPickemProjectionColumn['key']) {
  const pairs: ProjectionMatchGroup[] = []

  for (let index = 0; index < slots.length; index += 2) {
    pairs.push({
      id: `${columnKey}-match-${index / 2}`,
      slots: slots.slice(index, index + 2)
    })
  }

  return pairs.length > 0 ? pairs : [{
    id: `${columnKey}-waiting-match`,
    slots: []
  }]
}

function makeLaneSpacers(count: number, side: 'left' | 'right'): ProjectionLaneColumn[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${side}-reserved-${index}`,
    column: null
  }))
}

function sizeTokensForDepth(depth: number) {
  if (depth <= 1) {
    return {
      '--bracket-gap': '0.72rem',
      '--side-lane-width': '5rem',
      '--center-lane-width': '5.1rem',
      '--column-gap': '0.44rem',
      '--match-gap': '0.92rem',
      '--match-unit-height': '3.18rem',
      '--match-padding': '0.22rem',
      '--slot-height': '2.12rem',
      '--slot-padding': '0.24rem',
      '--flag-width': '1.9rem',
      '--flag-height': '1.24rem',
      '--marker-size': '1rem',
      '--empty-size': '0.5rem',
      '--connector-width': '0.68rem'
    }
  }

  if (depth === 2) {
    return {
      '--bracket-gap': '0.72rem',
      '--side-lane-width': '5.15rem',
      '--center-lane-width': '5.25rem',
      '--column-gap': '0.42rem',
      '--match-gap': '0.9rem',
      '--match-unit-height': '3.12rem',
      '--match-padding': '0.22rem',
      '--slot-height': '2.08rem',
      '--slot-padding': '0.24rem',
      '--flag-width': '1.98rem',
      '--flag-height': '1.28rem',
      '--marker-size': '1.02rem',
      '--empty-size': '0.48rem',
      '--connector-width': '0.68rem'
    }
  }

  if (depth === 3) {
    return {
      '--bracket-gap': '0.52rem',
      '--side-lane-width': '3.72rem',
      '--center-lane-width': '4.1rem',
      '--column-gap': '0.36rem',
      '--match-gap': '0.68rem',
      '--match-unit-height': '2.52rem',
      '--match-padding': '0.17rem',
      '--slot-height': '1.64rem',
      '--slot-padding': '0.18rem',
      '--flag-width': '1.5rem',
      '--flag-height': '1rem',
      '--marker-size': '0.84rem',
      '--empty-size': '0.42rem',
      '--connector-width': '0.54rem'
    }
  }

  return {
    '--bracket-gap': '0.42rem',
    '--side-lane-width': '3.16rem',
    '--center-lane-width': '3.7rem',
    '--column-gap': '0.32rem',
    '--match-gap': '0.5rem',
    '--match-unit-height': '2.2rem',
    '--match-padding': '0.14rem',
    '--slot-height': '1.46rem',
    '--slot-padding': '0.14rem',
    '--flag-width': '1.28rem',
    '--flag-height': '0.86rem',
    '--marker-size': '0.76rem',
    '--empty-size': '0.36rem',
    '--connector-width': '0.46rem'
  }
}
</script>

<template>
  <div
    class="projection-bracket"
    :style="bracketStyle"
    aria-label="Projected Pick'em bracket"
  >
    <div class="bracket-side is-left" aria-label="Left bracket lane">
      <template v-for="laneColumn in leftLaneColumns" :key="laneColumn.id">
        <div v-if="!laneColumn.column" class="bracket-spacer" aria-hidden="true" />
        <section
          v-else
          class="projection-column"
          :aria-label="laneColumn.column.label"
        >
          <h4 class="projection-column-title">{{ laneColumn.column.label }}</h4>
          <div class="projection-matches">
            <div
              v-for="match in laneColumn.column.matches"
              :key="match.id"
              class="projection-match"
            >
              <KnockoutPickemProjectionSlot
                v-for="slot in match.slots"
                :key="slot.id"
                :slot="slot"
                :teams="props.teams"
              />
            </div>
          </div>
        </section>
      </template>
    </div>

    <section
      v-if="centerColumn"
      class="bracket-center"
      :aria-label="centerColumn.label"
    >
      <h4 class="projection-column-title">{{ centerColumn.label }}</h4>
      <div class="center-stack">
        <div
          v-for="match in centerColumn.matches"
          :key="match.id"
          class="projection-match is-final-match"
        >
          <KnockoutPickemProjectionSlot
            v-for="slot in match.slots"
            :key="slot.id"
            :slot="slot"
            :teams="props.teams"
          />
        </div>

        <div v-if="winnerSlot" class="winner-card" :aria-label="winnerColumn?.label ?? 'Winner'">
          <KnockoutPickemProjectionSlot
            :slot="winnerSlot"
            :teams="props.teams"
            variant="winner"
          />
        </div>
      </div>
    </section>

    <div class="bracket-side is-right" aria-label="Right bracket lane">
      <template v-for="laneColumn in rightLaneColumns" :key="laneColumn.id">
        <section
          v-if="laneColumn.column"
          class="projection-column"
          :aria-label="laneColumn.column.label"
        >
          <h4 class="projection-column-title">{{ laneColumn.column.label }}</h4>
          <div class="projection-matches">
            <div
              v-for="match in laneColumn.column.matches"
              :key="match.id"
              class="projection-match"
            >
              <KnockoutPickemProjectionSlot
                v-for="slot in match.slots"
                :key="slot.id"
                :slot="slot"
                :teams="props.teams"
              />
            </div>
          </div>
        </section>
        <div v-else class="bracket-spacer" aria-hidden="true" />
      </template>
    </div>
  </div>
</template>

<style scoped>
.projection-bracket {
  --bracket-line: rgba(255, 248, 232, 0.22);
  background:
    linear-gradient(90deg, rgba(255, 248, 232, 0.05), transparent 22% 78%, rgba(255, 248, 232, 0.05)),
    rgba(9, 38, 25, 0.86);
  border-radius: var(--radius);
  display: grid;
  gap: var(--bracket-gap);
  grid-template-columns: max-content var(--center-lane-width) max-content;
  justify-content: center;
  min-width: 0;
  overflow-x: auto;
  padding: calc(var(--bracket-gap) + 0.08rem);
  scrollbar-width: thin;
  width: 100%;
}

.bracket-side {
  display: grid;
  gap: var(--bracket-gap);
  grid-template-columns: repeat(4, var(--side-lane-width));
}

.projection-column,
.bracket-spacer {
  display: grid;
  gap: var(--column-gap);
  grid-template-rows: auto 1fr;
  min-width: var(--side-lane-width);
  position: relative;
}

.bracket-spacer {
  visibility: hidden;
}

.projection-column-title {
  color: rgba(255, 248, 232, 0.62);
  font-size: 0.62rem;
  font-weight: 950;
  line-height: 1;
  margin: 0;
  overflow: hidden;
  text-align: center;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.projection-matches {
  align-items: stretch;
  display: flex;
  flex-direction: column;
  gap: var(--match-gap);
  justify-content: space-around;
  min-height: calc(var(--outer-match-count) * var(--match-unit-height));
  position: relative;
}

.projection-matches::before {
  border-right: 1px solid var(--bracket-line);
  bottom: 1rem;
  content: "";
  opacity: 0.8;
  position: absolute;
  top: 1rem;
}

.is-left .projection-matches::before {
  right: -0.28rem;
}

.is-right .projection-matches::before {
  left: -0.28rem;
}

.projection-match {
  background: rgba(255, 248, 232, 0.035);
  border: 1px solid rgba(255, 248, 232, 0.09);
  border-radius: 7px;
  display: grid;
  gap: 0.16rem;
  padding: var(--match-padding);
  position: relative;
}

.is-left .projection-match::after,
.bracket-center .is-final-match::before,
.bracket-center .is-final-match::after {
  border-top: 1px solid var(--bracket-line);
  content: "";
  position: absolute;
  top: 50%;
  width: var(--connector-width);
}

.is-left .projection-match::after {
  left: 100%;
}

.is-right .projection-match::before {
  border-top: 1px solid var(--bracket-line);
  content: "";
  position: absolute;
  right: 100%;
  top: 50%;
  width: 0.56rem;
}

.bracket-center {
  display: grid;
  gap: var(--column-gap);
  grid-template-rows: auto 1fr;
  min-width: var(--center-lane-width);
}

.center-stack {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: calc(var(--match-gap) * 0.6);
  justify-content: center;
  min-height: calc(var(--outer-match-count) * var(--match-unit-height));
}

.bracket-center .is-final-match {
  border-color: rgba(245, 190, 42, 0.3);
  min-width: calc(var(--center-lane-width) - 0.2rem);
}

.bracket-center .is-final-match::before {
  right: 100%;
}

.bracket-center .is-final-match::after {
  left: 100%;
}

.winner-card {
  position: relative;
}

.winner-card::before {
  border-left: 1px solid var(--bracket-line);
  bottom: 100%;
  content: "";
  height: calc(var(--match-gap) * 0.6);
  left: 50%;
  position: absolute;
}

@media (max-width: 720px) {
  .projection-bracket {
    gap: calc(var(--bracket-gap) * 0.8);
    grid-template-columns: max-content var(--center-lane-width) max-content;
  }

  .bracket-side {
    gap: calc(var(--bracket-gap) * 0.8);
    grid-template-columns: repeat(4, var(--side-lane-width));
  }
}
</style>
