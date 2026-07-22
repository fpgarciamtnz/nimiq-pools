<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { Eye, LockKeyhole } from '@lucide/vue'
import { buildKnockoutProjectionBracket, type KnockoutPickemProjectionBracket as PickemProjection } from '#shared/knockout-pickem-display'
import type { CompetitionPredictionRow, EntryDto, KnockoutPickemRoundKey, KnockoutPickemStateDto, TeamDto } from '../../shared/types'
import KnockoutPickemProjectionBracket from './KnockoutPickemProjectionBracket.vue'

interface Props {
  rows: CompetitionPredictionRow[]
  isPublic: boolean
  predictionDeadline: string
  entries: EntryDto[]
  teams: TeamDto[]
  knockoutPickem: KnockoutPickemStateDto
  knockoutPickemStartRound: KnockoutPickemRoundKey | null
}

const props = defineProps<Props>()
const currentTime = shallowRef<number | null>(null)
const countdownTimer = shallowRef<ReturnType<typeof setInterval> | null>(null)

const revealDateLabel = computed(() => new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short'
}).format(new Date(props.predictionDeadline)))

const revealCountdownLabel = computed(() => {
  if (currentTime.value === null) {
    return 'Reveal timing is scheduled.'
  }

  const deadlineTime = new Date(props.predictionDeadline).getTime()

  if (!Number.isFinite(deadlineTime)) {
    return 'Reveal timing is coming soon.'
  }

  const remainingMs = deadlineTime - currentTime.value

  if (remainingMs <= 0) {
    return 'Reveal opens when the league publishes picks.'
  }

  const hours = Math.ceil(remainingMs / (1000 * 60 * 60))

  if (hours < 24) {
    return `Reveals in ${Math.max(1, hours)} ${hours === 1 ? 'hour' : 'hours'}.`
  }

  const days = Math.ceil(hours / 24)

  if (days > 1) {
    return `Reveals in ${days} days.`
  }

  if (days === 1) {
    return 'Reveals in 1 day.'
  }

  return 'Reveals in less than a day.'
})

const entryById = computed(() => new Map(props.entries.map((entry) => [entry.id, entry])))
const rowsWithPickem = computed(() => props.rows.map((row) => {
  const entry = entryById.value.get(row.entryId)
  const projection = entry && props.knockoutPickem.enabled
    ? buildKnockoutProjectionBracket({
      entry,
      windows: props.knockoutPickem.windows,
      startRoundKey: props.knockoutPickemStartRound
    })
    : null

  return {
    row,
    projection
  }
}))

function pickLine(row: CompetitionPredictionRow) {
  return row.picks.map((pick) => `${pick.label}: ${pick.team.name}`).join(' / ')
}

function totalPickemSummary(projection: PickemProjection) {
  const suffix = projection.summary.missing > 0 ? `, ${projection.summary.missing} missed` : ''

  if (projection.summary.decided === 0) {
    return projection.summary.missing > 0 ? `${projection.summary.missing} missed` : 'Waiting for Pickem picks'
  }

  return `${projection.summary.correct}/${projection.summary.decided} Pickem correct${suffix}`
}

onMounted(() => {
  currentTime.value = Date.now()
  countdownTimer.value = setInterval(() => {
    currentTime.value = Date.now()
  }, 60 * 1000)
})

onBeforeUnmount(() => {
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
    countdownTimer.value = null
  }
})
</script>

<template>
  <section class="prediction-reveal" aria-labelledby="prediction-title">
    <span class="module-number" aria-hidden="true">03</span>
    <div class="reveal-heading">
      <div class="section-heading">
        <p class="eyebrow">Prediction reveal</p>
        <h2 id="prediction-title">Who picked what</h2>
      </div>
      <Eye v-if="props.isPublic" :size="16" aria-hidden="true" />
    </div>

    <div v-if="!props.isPublic" class="reveal-locked">
      <LockKeyhole :size="16" aria-hidden="true" />
      <div class="reveal-locked-copy">
        <strong>{{ revealCountdownLabel }}</strong>
        <span>Picks stay private until {{ revealDateLabel }}.</span>
      </div>
    </div>

    <p v-else-if="props.rows.length === 0" class="muted">No public predictions yet.</p>

    <div v-else class="reveal-list">
      <article v-for="item in rowsWithPickem" :key="item.row.entryId" class="reveal-row">
        <div class="person-line">
          <PlayerAvatar :avatar-key="item.row.avatarKey" :display-name="item.row.displayName" size="sm" />
          <div class="person-copy">
            <strong>{{ item.row.displayName }}</strong>
            <span>{{ pickLine(item.row) }}</span>
          </div>
        </div>

        <dl class="pick-list">
          <div v-for="pick in item.row.picks" :key="pick.questionKey" class="pick-pill">
            <dt>{{ pick.label }}</dt>
            <dd>
              <TeamFlag :name="pick.team.name" :fifa-code="pick.team.fifaCode" :flag-url="pick.team.flagUrl" :flag-emoji="pick.team.flagEmoji" size="sm" />
              {{ pick.team.name }}
            </dd>
          </div>
        </dl>

        <div v-if="item.projection" class="pickem-reveal">
          <header class="pickem-reveal-heading">
            <div>
              <p>Knockout Pick'em</p>
              <h3>{{ totalPickemSummary(item.projection) }}</h3>
            </div>
          </header>

          <KnockoutPickemProjectionBracket
            :projection="item.projection"
            :teams="props.teams"
          />
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.prediction-reveal {
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  display: grid;
  gap: 0.85rem;
  padding: 0.35rem 0 0.6rem;
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

.reveal-heading {
  align-items: start;
  display: flex;
  justify-content: space-between;
}

.prediction-reveal .section-heading h2,
.prediction-reveal .muted {
  color: var(--text-invert);
}

.prediction-reveal .section-heading h2 {
  color: var(--text-invert);
}

.prediction-reveal .muted {
  color: rgba(255, 248, 232, 0.72);
}

.reveal-heading svg {
  color: var(--gold);
}

.reveal-locked {
  align-items: center;
  background: var(--data-well);
  border: 0;
  border-radius: var(--radius);
  color: rgba(255, 248, 232, 0.76);
  display: flex;
  font-weight: 800;
  gap: 0.48rem;
  padding: 0.85rem;
}

.reveal-locked-copy {
  display: grid;
  gap: 0.12rem;
  min-width: 0;
}

.reveal-locked-copy strong {
  color: var(--text-invert);
  font-size: 1rem;
}

.reveal-locked-copy span {
  color: rgba(255, 248, 232, 0.7);
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}

.reveal-list {
  background: var(--data-well);
  border: 0;
  border-radius: var(--radius);
  display: grid;
  overflow: hidden;
}

.reveal-row {
  border-bottom: 1px solid var(--data-line);
  display: grid;
  gap: 0.65rem;
  padding: 0.72rem;
}

.reveal-row:last-child {
  border-bottom: 0;
}

.person-line {
  align-items: center;
  display: flex;
  gap: 0.55rem;
  min-width: 0;
}

.person-copy {
  display: grid;
  gap: 0.16rem;
  min-width: 0;
}

.person-copy strong {
  color: var(--text-invert);
  font-size: 1.05rem;
}

.person-copy span {
  color: rgba(255, 248, 232, 0.66);
  font-size: 0.88rem;
  font-weight: 750;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pick-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.38rem;
  margin: 0;
}

.pick-pill {
  align-items: center;
  background: rgba(255, 250, 240, 0.92);
  border: 0;
  border-radius: 999px;
  display: inline-flex;
  gap: 0.3rem;
  max-width: 100%;
  padding: 0.28rem 0.52rem;
}

.pick-pill dt {
  color: var(--red);
  flex: 0 0 auto;
  font-size: 0.75rem;
  font-weight: 850;
}

.pick-pill dd {
  align-items: center;
  color: var(--text);
  display: inline-flex;
  font-size: 0.86rem;
  font-weight: 900;
  gap: 0.28rem;
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pickem-reveal {
  border-top: 1px solid rgba(255, 248, 232, 0.1);
  display: grid;
  gap: 0.6rem;
  min-width: 0;
  padding-top: 0.62rem;
}

.pickem-reveal-heading {
  align-items: start;
  display: flex;
  justify-content: space-between;
  min-width: 0;
}

.pickem-reveal-heading p,
.pickem-reveal-heading h3 {
  margin: 0;
}

.pickem-reveal-heading p {
  color: var(--gold);
  font-size: 0.76rem;
  font-weight: 950;
  text-transform: uppercase;
}

.pickem-reveal-heading h3 {
  color: var(--text-invert);
  font-size: 1rem;
  line-height: 1.12;
  overflow-wrap: anywhere;
}

</style>
