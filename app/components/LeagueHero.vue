<script setup lang="ts">
import { CalendarClock } from '@lucide/vue'
import type { PoolDto } from '../../shared/types'

interface Props {
  pool: PoolDto
  predictionDeadline: string
  isLocked: boolean
  isPublic: boolean
}

const props = defineProps<Props>()
const requestUrl = useRequestURL()
const currentTime = shallowRef<number | null>(null)
const countdownTimer = shallowRef<ReturnType<typeof setInterval> | null>(null)

const deadlineLabel = computed(() => new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short'
}).format(new Date(props.predictionDeadline)))

const inviteUrl = computed(() => new URL(`/invite/${props.pool.code}`, requestUrl.origin).toString())

const revealStatusTitle = computed(() => {
  if (props.isPublic) {
    return 'Predictions revealed'
  }

  if (props.isLocked) {
    return 'Reveal window open'
  }

  return countdownLabel.value
})

const revealStatusText = computed(() => {
  if (props.isPublic) {
    return 'Picks, rankings, and prediction details are visible now.'
  }

  if (props.isLocked) {
    return `The deadline passed ${deadlineLabel.value}. Picks reveal when the league is published.`
  }

  return `Picks stay private until ${deadlineLabel.value}.`
})

const countdownLabel = computed(() => {
  if (currentTime.value === null) {
    return 'Reveal scheduled'
  }

  const deadlineTime = new Date(props.predictionDeadline).getTime()

  if (!Number.isFinite(deadlineTime)) {
    return 'Reveal scheduled'
  }

  const remainingMs = deadlineTime - currentTime.value

  if (remainingMs <= 0) {
    return 'Reveal time reached'
  }

  const minutes = Math.ceil(remainingMs / (1000 * 60))

  if (minutes < 60) {
    return `Reveals in ${Math.max(1, minutes)} ${minutes === 1 ? 'minute' : 'minutes'}`
  }

  const hours = Math.ceil(minutes / 60)

  if (hours < 24) {
    return `Reveals in ${hours} ${hours === 1 ? 'hour' : 'hours'}`
  }

  const days = Math.ceil(hours / 24)

  return `Reveals in ${days} ${days === 1 ? 'day' : 'days'}`
})

const statusText = computed(() => {
  if (props.isPublic) {
    return 'The league table and prediction reveal are live.'
  }

  return `Picks reveal together after ${deadlineLabel.value}.`
})

const initials = computed(() => props.pool.title
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase() ?? '')
  .join('') || 'PP')

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
  <section class="league-hero" aria-labelledby="league-title">
    <div class="league-identity">
      <div class="league-image" aria-hidden="true">
        <img v-if="props.pool.imageDataUrl" :src="props.pool.imageDataUrl" alt="">
        <span v-else>{{ initials }}</span>
      </div>

      <div class="league-copy">
        <p class="eyebrow">Pick Party</p>
        <div class="league-title-row">
          <h1 id="league-title">{{ props.pool.title }}</h1>
          <ShareLinkButton :url="inviteUrl" />
        </div>
        <p>{{ statusText }}</p>
      </div>
    </div>

    <div class="reveal-status" aria-label="Prediction reveal timing">
      <CalendarClock :size="16" aria-hidden="true" />
      <div class="reveal-status-copy">
        <strong>{{ revealStatusTitle }}</strong>
        <span>{{ revealStatusText }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.league-hero {
  background:
    linear-gradient(103deg, transparent 0 58%, rgba(23, 131, 41, 0.13) 58% 100%),
    transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  display: grid;
  gap: 1rem;
  min-width: 0;
  padding: 0.35rem 0 1rem;
  position: relative;
  overflow: visible;
}

.league-hero::after {
  background:
    linear-gradient(180deg, transparent, rgba(21, 91, 29, 0.23)),
    repeating-linear-gradient(92deg, rgba(21, 91, 29, 0.16) 0 0.14rem, transparent 0.14rem 1.25rem);
  bottom: 0;
  content: "";
  height: 4.5rem;
  left: 0;
  pointer-events: none;
  position: absolute;
  right: 0;
  z-index: 0;
}

.league-identity {
  align-items: center;
  display: grid;
  gap: 0.85rem;
  grid-template-columns: auto minmax(0, 1fr);
  position: relative;
  z-index: 1;
}

.league-image {
  align-items: center;
  background: linear-gradient(135deg, var(--accent), var(--gold));
  border: 2px solid rgba(255, 248, 232, 0.82);
  border-radius: var(--radius);
  box-shadow: 0 12px 30px rgba(30, 102, 35, 0.16);
  color: #fff8e8;
  display: inline-flex;
  font-size: 1.28rem;
  font-weight: 950;
  height: 5.6rem;
  justify-content: center;
  overflow: hidden;
  width: 5.6rem;
}

.league-image img {
  display: block;
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.league-copy {
  display: grid;
  gap: 0.25rem;
  min-width: 0;
}

.league-copy p {
  margin: 0;
}

.league-title-row {
  align-items: end;
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  min-width: 0;
}

.league-copy h1 {
  color: var(--text);
  font-size: clamp(2rem, 5vw, 4.1rem);
  font-style: italic;
  font-weight: 950;
  line-height: 0.95;
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
  text-transform: uppercase;
}

.league-copy p:not(.eyebrow) {
  color: var(--muted);
  font-size: 1rem;
  font-weight: 760;
  overflow-wrap: anywhere;
}

.reveal-status {
  align-items: center;
  background: rgba(255, 250, 240, 0.9);
  border: 1px solid var(--line);
  border-left: 0.32rem solid var(--accent);
  border-radius: var(--radius);
  color: var(--text);
  display: grid;
  gap: 0.58rem;
  grid-template-columns: auto minmax(0, 1fr);
  padding: 0.72rem 0.82rem;
  position: relative;
  z-index: 1;
}

.reveal-status svg {
  color: var(--accent-strong);
}

.reveal-status-copy {
  display: grid;
  gap: 0.12rem;
  min-width: 0;
}

.reveal-status-copy strong {
  color: var(--text);
  font-size: 1rem;
}

.reveal-status-copy span {
  color: var(--muted);
  font-size: 0.94rem;
  font-weight: 760;
  overflow-wrap: anywhere;
}

@media (max-width: 680px) {
  .league-identity {
    grid-template-columns: 1fr;
  }

  .league-title-row {
    align-items: start;
    display: grid;
  }

  .league-image {
    height: 4.4rem;
    width: 4.4rem;
  }

}
</style>
