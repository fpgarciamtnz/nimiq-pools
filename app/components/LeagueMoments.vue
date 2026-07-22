<script setup lang="ts">
import { computed } from 'vue'
import { Flame, LockKeyhole, Sparkles, TrendingUp } from '@lucide/vue'
import type { CompetitionMoment } from '../../shared/types'

interface Props {
  moments: CompetitionMoment[]
  isPublic: boolean
}

const props = defineProps<Props>()

const visibleMoments = computed(() => props.moments.slice(0, 2))
</script>

<template>
  <section class="moments-panel" aria-labelledby="moments-title">
    <div class="section-heading">
      <p class="eyebrow">League pulse</p>
      <h2 id="moments-title">What's going on</h2>
      <p class="muted">Only real score and pick signals appear here.</p>
    </div>

    <div v-if="!props.isPublic" class="locked-moment">
      <LockKeyhole :size="16" aria-hidden="true" />
      <span>Moments unlock with the reveal.</span>
    </div>

    <div v-else-if="visibleMoments.length > 0" class="moment-grid">
      <article v-for="moment in visibleMoments" :key="moment.type" class="moment-card">
        <Sparkles v-if="moment.type === 'leader'" :size="16" aria-hidden="true" />
        <TrendingUp v-else-if="moment.type === 'tight_race' || moment.type === 'pending_swing'" :size="16" aria-hidden="true" />
        <Flame v-else :size="16" aria-hidden="true" />
        <div class="moment-copy">
          <h3>{{ moment.title }}</h3>
          <p>{{ moment.text }}</p>
        </div>
      </article>
    </div>

    <p v-else class="muted">No league moments yet.</p>
  </section>
</template>

<style scoped>
.moments-panel {
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  display: grid;
  gap: 0.88rem;
  padding: 0.35rem 0 0.6rem;
}

.moments-panel .section-heading h2,
.moments-panel .section-heading .muted,
.moments-panel > .muted {
  color: var(--text);
}

.moments-panel .section-heading .muted,
.moments-panel > .muted {
  color: var(--muted);
}

.moment-grid {
  display: grid;
  gap: 0.65rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.moment-card,
.locked-moment {
  align-items: start;
  background: var(--red);
  border: 0;
  border-radius: var(--radius);
  box-shadow: none;
  color: #fff8e8;
  display: grid;
  gap: 0.55rem;
  grid-template-columns: auto minmax(0, 1fr);
  min-width: 0;
  padding: 0.72rem;
}

.locked-moment {
  align-items: center;
  background: var(--panel);
}

.moment-card svg,
.locked-moment svg {
  color: var(--gold);
  margin-top: 0.1rem;
}

.moment-copy {
  display: grid;
  gap: 0.14rem;
  min-width: 0;
}

.moment-copy h3,
.moment-copy p {
  margin: 0;
}

.moment-copy h3 {
  color: #fff8e8;
  font-size: 0.98rem;
}

.moment-copy p,
.locked-moment span {
  color: rgba(255, 248, 232, 0.78);
  font-size: 0.9rem;
  font-weight: 740;
  line-height: 1.32;
}

.moment-card:nth-child(2) {
  background: var(--accent);
}

@media (max-width: 720px) {
  .moments-panel .section-heading h2 {
    color: var(--text);
  }

  .moments-panel .section-heading .muted,
  .moments-panel > .muted {
    color: var(--muted);
  }

  .moment-grid {
    grid-template-columns: 1fr;
  }
}
</style>
