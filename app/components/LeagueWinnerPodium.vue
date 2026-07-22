<script setup lang="ts">
import { computed } from 'vue'
import type { CompetitionRankingRow, CompetitionWinnerPodiumEntry } from '../../shared/types'

interface Props {
  entries: CompetitionWinnerPodiumEntry[]
  lastEntry?: CompetitionRankingRow | null
}

const props = defineProps<Props>()

const podiumEntries = computed(() => props.entries.slice(0, 3))
const showLastNudge = computed(() => Boolean(props.lastEntry) && props.lastEntry?.entryId !== podiumEntries.value[0]?.entryId)

function placementLabel(rank: number) {
  if (rank === 1) {
    return '1st'
  }

  if (rank === 2) {
    return '2nd'
  }

  if (rank === 3) {
    return '3rd'
  }

  return `#${rank}`
}
</script>

<template>
  <section v-if="podiumEntries.length > 0" class="winner-podium" aria-label="Final podium">
    <article
      v-for="entry in podiumEntries"
      :key="entry.entryId"
      class="podium-step"
      :class="`is-rank-${entry.rank}`"
    >
      <template v-if="entry.rank === 1">
        <span class="winner-ribbon">Congratulations</span>
        <span class="winner-burst burst-one" aria-hidden="true" />
        <span class="winner-burst burst-two" aria-hidden="true" />
        <span class="winner-burst burst-three" aria-hidden="true" />
        <span class="winner-burst burst-four" aria-hidden="true" />
        <span class="winner-burst burst-five" aria-hidden="true" />
        <span class="winner-burst burst-six" aria-hidden="true" />
        <span class="winner-burst burst-seven" aria-hidden="true" />
        <span class="winner-burst burst-eight" aria-hidden="true" />
        <span class="winner-burst burst-nine" aria-hidden="true" />
        <span class="winner-burst burst-ten" aria-hidden="true" />
        <span class="celebration celebration-left" aria-hidden="true">&#x1F37E;</span>
        <span class="celebration celebration-right" aria-hidden="true">&#x1F389;</span>
        <span class="celebration celebration-top-left" aria-hidden="true">&#x1F942;</span>
        <span class="celebration celebration-top-right" aria-hidden="true">&#x1F38A;</span>
        <span class="celebration celebration-sparkle" aria-hidden="true">&#x2728;</span>
      </template>
      <span class="podium-medal">{{ placementLabel(entry.rank) }}</span>
      <span v-if="entry.rank === 1" class="winner-name">
        <span class="winner-crown" aria-hidden="true">&#x1F451;</span>
        <strong>{{ entry.displayName }}</strong>
      </span>
      <strong v-else>{{ entry.displayName }}</strong>
      <span>{{ entry.totalScore }} pts</span>
    </article>
    <aside v-if="showLastNudge && props.lastEntry" class="last-place-nudge" aria-label="Last place encouragement">
      <span class="nudge-icon" aria-hidden="true">
        <PlayerAvatar :avatar-key="props.lastEntry.avatarKey" :display-name="props.lastEntry.displayName" size="sm" />
      </span>
      <p>
        <strong>{{ props.lastEntry.displayName }}</strong>
        needs this <span aria-hidden="true">&#x1F52E;</span>... or the quick-start guide.
      </p>
    </aside>
  </section>
</template>

<style scoped>
.winner-podium {
  align-items: end;
  display: grid;
  gap: 0.9rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  min-width: 0;
  overflow: visible;
  padding: 2.6rem 0 0;
  position: relative;
}

.winner-ribbon {
  background: var(--red);
  border: 0.16rem solid #fff8e8;
  border-radius: 999px;
  box-shadow: 0 10px 24px rgba(17, 24, 20, 0.18);
  color: #fff8e8;
  font-size: 0.9rem;
  font-weight: 950;
  left: 50%;
  padding: 0.35rem 0.75rem;
  position: absolute;
  text-transform: uppercase;
  top: -2.55rem;
  transform: translateX(-50%) rotate(-1deg);
  white-space: nowrap;
  z-index: 4;
}

.winner-crown {
  filter: drop-shadow(0 8px 12px rgba(17, 24, 20, 0.22));
  font-size: 2rem;
  line-height: 1;
  transform: rotate(4deg);
}

.winner-burst {
  border-radius: 999px;
  display: block;
  height: 0.38rem;
  position: absolute;
  transform: rotate(18deg);
  width: 1.12rem;
  z-index: 2;
}

.burst-one {
  background: var(--gold);
  left: 9%;
  top: -1.55rem;
}

.burst-two {
  background: var(--blue);
  right: 10%;
  top: -1.5rem;
  transform: rotate(-24deg);
}

.burst-three {
  background: var(--red);
  left: 25%;
  top: -2.1rem;
  width: 0.86rem;
}

.burst-four {
  background: var(--orange);
  right: 24%;
  top: -2.05rem;
  transform: rotate(42deg);
}

.burst-five {
  background: var(--accent);
  left: -0.55rem;
  top: 0.55rem;
  transform: rotate(58deg);
}

.burst-six {
  background: #fff8e8;
  right: -0.5rem;
  top: 0.5rem;
  transform: rotate(-52deg);
}

.burst-seven {
  background: var(--gold);
  left: 4%;
  top: 2rem;
  transform: rotate(-18deg);
}

.burst-eight {
  background: var(--blue);
  right: 4%;
  top: 2.15rem;
  transform: rotate(24deg);
}

.burst-nine {
  background: var(--red);
  left: 18%;
  top: -0.42rem;
  width: 0.7rem;
}

.burst-ten {
  background: var(--orange);
  right: 18%;
  top: -0.45rem;
  width: 0.7rem;
}

.celebration {
  filter: drop-shadow(0 8px 14px rgba(17, 24, 20, 0.22));
  font-size: 2.25rem;
  line-height: 1;
  position: absolute;
  top: -0.95rem;
  z-index: 3;
}

.celebration-left {
  left: 0.35rem;
  transform: rotate(-22deg);
}

.celebration-right {
  right: 0.35rem;
  transform: rotate(20deg);
}

.celebration-top-left {
  font-size: 1.7rem;
  left: 23%;
  top: -2.3rem;
  transform: rotate(-14deg);
}

.celebration-top-right {
  font-size: 1.7rem;
  right: 23%;
  top: -2.25rem;
  transform: rotate(14deg);
}

.celebration-sparkle {
  font-size: 1.65rem;
  left: 50%;
  top: 0.45rem;
  transform: translateX(-50%);
}

.podium-step {
  align-content: start;
  background:
    linear-gradient(180deg, rgba(255, 248, 232, 0.14), transparent 38%),
    linear-gradient(160deg, #115fcf, #17221d);
  border: 1px solid rgba(255, 248, 232, 0.18);
  border-radius: var(--radius) var(--radius) 0 0;
  box-shadow: 0 -8px 28px rgba(17, 24, 20, 0.16);
  color: var(--text-invert);
  display: grid;
  gap: 0.42rem;
  justify-items: center;
  min-height: 8.8rem;
  min-width: 0;
  overflow: visible;
  padding: 0.92rem 0.72rem 1rem;
  position: relative;
  text-align: center;
  z-index: 1;
}

.podium-step.is-rank-1 {
  background:
    radial-gradient(circle at 50% 12%, rgba(255, 255, 255, 0.5), transparent 4.9rem),
    linear-gradient(180deg, #ffd052, #f4b000 48%, #8a5600);
  color: #211806;
  min-height: 12.7rem;
  order: 2;
  padding-top: 1.55rem;
}

.podium-step.is-rank-2 {
  background:
    radial-gradient(circle at 50% 17%, rgba(255, 255, 255, 0.32), transparent 3.4rem),
    linear-gradient(180deg, #f6e7c5, #978b70 50%, #5b543f);
  order: 1;
}

.podium-step.is-rank-3 {
  background:
    radial-gradient(circle at 50% 17%, rgba(255, 255, 255, 0.28), transparent 3.4rem),
    linear-gradient(180deg, #f0791f, #de321d 52%, #65170f);
  order: 3;
}

.podium-medal {
  align-items: center;
  background: rgba(255, 248, 232, 0.9);
  border: 0.22rem solid rgba(255, 248, 232, 0.44);
  border-radius: 999px;
  box-shadow: 0 8px 22px rgba(17, 24, 20, 0.18);
  color: currentColor;
  display: inline-flex;
  font-size: 1.05rem;
  font-weight: 950;
  height: 3.1rem;
  justify-content: center;
  width: 3.1rem;
}

.podium-step.is-rank-1 .podium-medal {
  background: var(--gold);
  color: #fff8e8;
  font-size: 1.18rem;
  height: 3.85rem;
  width: 3.85rem;
}

.podium-step.is-rank-2 .podium-medal {
  background: #d8d3c3;
  color: #5b543f;
}

.podium-step.is-rank-3 .podium-medal {
  background: var(--orange);
  color: #fff8e8;
}

.podium-step strong {
  align-self: end;
  color: inherit;
  font-size: 1.34rem;
  line-height: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.winner-name {
  align-self: end;
  display: grid;
  gap: 0.12rem;
  justify-items: center;
  min-width: 0;
  width: 100%;
}

.podium-step.is-rank-1 strong {
  font-size: 1.62rem;
}

.podium-step span:last-child {
  color: currentColor;
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  font-weight: 950;
  opacity: 0.82;
}

.last-place-nudge {
  align-items: center;
  background: rgba(255, 250, 240, 0.82);
  border: 1px dashed rgba(222, 50, 29, 0.38);
  border-radius: var(--radius);
  box-shadow: 0 8px 22px rgba(17, 24, 20, 0.08);
  color: var(--text);
  display: grid;
  gap: 0.55rem;
  grid-column: 1 / -1;
  grid-template-columns: auto minmax(0, 1fr);
  margin-top: 0.1rem;
  order: 4;
  padding: 0.68rem 0.82rem;
}

.nudge-icon {
  align-items: center;
  display: inline-flex;
  justify-content: center;
  line-height: 1;
}

.last-place-nudge p {
  color: var(--muted);
  font-size: 0.94rem;
  font-weight: 850;
  line-height: 1.2;
  margin: 0;
  min-width: 0;
}

.last-place-nudge strong {
  color: var(--red);
  font-weight: 950;
}

@media (max-width: 720px) {
  .winner-podium {
    align-items: stretch;
    grid-template-columns: 1fr;
    padding: 2.8rem 0 0;
  }

  .podium-step,
  .podium-step.is-rank-1 {
    border-radius: var(--radius);
    min-height: 0;
    order: initial;
  }

  .podium-step strong {
    font-size: 1.18rem;
  }

  .celebration {
    font-size: 1.7rem;
    top: -0.78rem;
  }

  .celebration-top-left,
  .celebration-top-right {
    top: -2rem;
  }

  .winner-ribbon {
    font-size: 0.76rem;
    top: -2.35rem;
  }

  .winner-crown {
    font-size: 1.75rem;
  }

  .last-place-nudge {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }
}
</style>
