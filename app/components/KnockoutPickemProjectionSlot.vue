<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { Check, CircleDashed, X } from '@lucide/vue'
import type { KnockoutPickemProjectionSlot } from '#shared/knockout-pickem-display'
import { getTeamFlagMeta } from '#shared/team-flags'
import type { TeamDto } from '#shared/types'

interface Props {
  slot: KnockoutPickemProjectionSlot
  teams: TeamDto[]
  variant?: 'standard' | 'winner'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'standard'
})

const teamBySlug = computed(() => new Map(props.teams.map((team) => [team.slug, team])))
const team = computed(() => props.slot.teamSlug ? teamBySlug.value.get(props.slot.teamSlug) ?? null : null)
const flag = computed(() => getTeamFlagMeta(team.value?.fifaCode ?? ''))
const imageFailed = shallowRef(false)
const canShowImage = computed(() => Boolean(flag.value.flagUrl) && !imageFailed.value)
const label = computed(() => {
  const name = team.value?.name ?? props.slot.teamSlug ?? 'Waiting'

  if (!props.slot.isPrediction) {
    return name
  }

  if (props.slot.status === 'correct') {
    return `${name}, correct prediction`
  }

  if (props.slot.status === 'wrong') {
    return `${name}, wrong prediction`
  }

  if (props.slot.status === 'pending') {
    return `${name}, pending result`
  }

  return props.slot.teamSlug ? `${name}, saved prediction` : 'Waiting for prediction'
})

watch(() => [props.slot.teamSlug, flag.value.flagUrl], () => {
  imageFailed.value = false
})
</script>

<template>
  <div
    class="projection-slot"
    :class="[
      `is-${props.slot.status}`,
      {
        'is-prediction': props.slot.isPrediction,
        'is-waiting': props.slot.isWaiting,
        'is-winner': props.variant === 'winner',
        'has-team': Boolean(props.slot.teamSlug)
      }
    ]"
    :aria-label="label"
    :title="label"
  >
    <span v-if="props.slot.teamSlug" class="flag-frame" aria-hidden="true">
      <span class="flag-emoji">{{ flag.flagEmoji }}</span>
      <img
        v-if="canShowImage && flag.flagUrl"
        :src="flag.flagUrl"
        alt=""
        loading="lazy"
        decoding="async"
        @error="imageFailed = true"
      >
    </span>
    <span v-else class="empty-slot" aria-hidden="true" />

    <span
      v-if="props.slot.isPrediction && props.slot.teamSlug"
      class="slot-marker"
      :class="`marker-${props.slot.status}`"
      aria-hidden="true"
    >
      <Check v-if="props.slot.status === 'correct'" :size="12" />
      <X v-else-if="props.slot.status === 'wrong'" :size="12" />
      <CircleDashed v-else :size="12" />
    </span>
  </div>
</template>

<style scoped>
.projection-slot {
  align-items: center;
  background: rgba(255, 248, 232, 0.05);
  border: 1px solid rgba(255, 248, 232, 0.1);
  border-radius: 5px;
  display: inline-flex;
  gap: 0.12rem;
  justify-content: center;
  min-height: var(--slot-height, 1.66rem);
  min-width: 0;
  padding: var(--slot-padding, 0.18rem);
}

.projection-slot.is-prediction.has-team {
  background: rgba(255, 248, 232, 0.08);
  font-weight: 950;
}

.projection-slot.is-correct.has-team {
  border-color: rgba(126, 226, 160, 0.56);
}

.projection-slot.is-wrong.has-team {
  border-color: rgba(255, 120, 98, 0.56);
}

.projection-slot.is-waiting {
  border-style: dashed;
  opacity: 0.62;
}

.projection-slot.is-winner {
  border-color: rgba(245, 190, 42, 0.42);
}

.flag-frame {
  align-items: center;
  border-radius: 4px;
  display: inline-flex;
  height: var(--flag-height, 1rem);
  justify-content: center;
  overflow: hidden;
  position: relative;
  width: var(--flag-width, 1.48rem);
}

.flag-frame img {
  display: block;
  height: 100%;
  inset: 0;
  object-fit: cover;
  position: absolute;
  width: 100%;
}

.flag-emoji {
  font-size: calc(var(--flag-height, 1rem) * 0.86);
  line-height: 1;
}

.empty-slot {
  background: rgba(255, 248, 232, 0.16);
  border-radius: 999px;
  display: inline-block;
  height: var(--empty-size, 0.42rem);
  width: var(--empty-size, 0.42rem);
}

.slot-marker {
  align-items: center;
  border-radius: 999px;
  display: inline-flex;
  height: var(--marker-size, 0.86rem);
  justify-content: center;
  width: var(--marker-size, 0.86rem);
}

.marker-correct {
  background: var(--accent-strong);
  color: #fffaf0;
}

.marker-wrong {
  background: var(--danger);
  color: #fffaf0;
}

.marker-pending,
.marker-missing {
  background: var(--gold);
  color: #1f1606;
}
</style>
