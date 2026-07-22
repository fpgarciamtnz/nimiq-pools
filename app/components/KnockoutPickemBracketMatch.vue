<script setup lang="ts">
import { computed } from 'vue'
import { Check, CircleDashed, Trophy, X } from '@lucide/vue'
import { getTeamFlagMeta } from '#shared/team-flags'
import type { KnockoutPickemMatchView } from '#shared/knockout-pickem-display'
import type { TeamDto } from '#shared/types'

type BracketMatchMode = 'select' | 'result'

interface Props {
  match: KnockoutPickemMatchView
  teams: TeamDto[]
  mode: BracketMatchMode
  disabled?: boolean
}

interface Emits {
  selectWinner: [teamSlug: string]
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})
const emit = defineEmits<Emits>()

const teamBySlug = computed(() => new Map(props.teams.map((team) => [team.slug, team])))
const options = computed(() => [
  {
    side: 'home',
    teamSlug: props.match.fixture.homeTeamSlug,
    fallbackName: props.match.fixture.homeTeamName
  },
  {
    side: 'away',
    teamSlug: props.match.fixture.awayTeamSlug,
    fallbackName: props.match.fixture.awayTeamName
  }
].flatMap((option) => {
  if (!option.teamSlug) {
    return []
  }

  const team = teamBySlug.value.get(option.teamSlug)
  const flag = getTeamFlagMeta(team?.fifaCode ?? '')

  return [{
    ...option,
    name: team?.name ?? option.fallbackName,
    fifaCode: team?.fifaCode ?? '',
    flagEmoji: flag.flagEmoji,
    flagUrl: flag.flagUrl
  }]
}))
const selectedTeam = computed(() => teamBySlug.value.get(props.match.winnerTeamSlug) ?? null)
const actualWinner = computed(() => props.match.actualWinnerTeamSlug
  ? teamBySlug.value.get(props.match.actualWinnerTeamSlug) ?? null
  : null)
const statusLabel = computed(() => {
  const selectedName = selectedTeam.value?.name ?? props.match.winnerTeamSlug

  if (props.mode === 'select') {
    return selectedName ? `Selected winner: ${selectedName}` : 'Choose a winner'
  }

  if (props.match.status === 'correct') {
    return `Correct pick: ${selectedName}`
  }

  if (props.match.status === 'wrong') {
    return `Wrong pick: ${selectedName}`
  }

  if (props.match.status === 'pending') {
    return `Pending result: ${selectedName}`
  }

  return 'No pick'
})
const matchupLabel = computed(() => options.value.map((option) => option.name).join(' vs '))

function chooseWinner(teamSlug: string) {
  if (props.mode !== 'select' || props.disabled) {
    return
  }

  emit('selectWinner', teamSlug)
}
</script>

<template>
  <article
    class="bracket-match"
    :class="[`is-${props.match.status}`, `mode-${props.mode}`]"
    :aria-label="matchupLabel"
  >
    <p class="match-code">{{ props.match.fixture.leagueRound ?? 'Knockout match' }}</p>

    <div class="team-stack">
      <button
        v-for="option in options"
        :key="option.teamSlug"
        class="team-row"
        :class="{
          'is-picked': option.teamSlug === props.match.winnerTeamSlug,
          'is-actual-winner': option.teamSlug === props.match.actualWinnerTeamSlug
        }"
        type="button"
        :disabled="props.mode !== 'select' || props.disabled"
        :aria-pressed="props.mode === 'select' ? option.teamSlug === props.match.winnerTeamSlug : undefined"
        :aria-label="props.mode === 'select' ? `Pick ${option.name}` : option.name"
        @click="chooseWinner(option.teamSlug)"
      >
        <span class="flag-frame">
          <img
            v-if="option.flagUrl"
            :src="option.flagUrl"
            :alt="`${option.name} flag`"
            loading="lazy"
            decoding="async"
          >
          <span v-else aria-hidden="true">{{ option.flagEmoji }}</span>
        </span>
        <span class="team-name">{{ option.name }}</span>
        <span
          v-if="option.teamSlug === props.match.winnerTeamSlug"
          class="pick-marker"
          :class="`marker-${props.match.status}`"
          :aria-label="statusLabel"
        >
          <Trophy v-if="props.mode === 'select'" :size="15" aria-hidden="true" />
          <Check v-else-if="props.match.status === 'correct'" :size="15" aria-hidden="true" />
          <X v-else-if="props.match.status === 'wrong'" :size="15" aria-hidden="true" />
          <CircleDashed v-else :size="15" aria-hidden="true" />
        </span>
      </button>
    </div>

    <div class="match-footline" :class="`is-${props.match.status}`">
      <span>{{ statusLabel }}</span>
      <span v-if="props.match.status === 'wrong' && actualWinner">
        Actual: {{ actualWinner.name }}
      </span>
    </div>
  </article>
</template>

<style scoped>
.bracket-match {
  background: rgba(8, 42, 27, 0.9);
  border: 1px solid rgba(255, 248, 232, 0.13);
  border-radius: var(--radius);
  color: var(--text-invert);
  display: grid;
  gap: 0.42rem;
  min-width: 0;
  padding: 0.56rem;
  position: relative;
}

.bracket-match.is-correct {
  border-color: rgba(126, 226, 160, 0.52);
}

.bracket-match.is-wrong {
  border-color: rgba(255, 120, 98, 0.48);
}

.match-code,
.match-footline {
  margin: 0;
}

.match-code {
  color: rgba(255, 248, 232, 0.56);
  font-size: 0.75rem;
  font-weight: 900;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.team-stack {
  display: grid;
  min-width: 0;
}

.team-row {
  align-items: center;
  background: rgba(255, 248, 232, 0.04);
  border-radius: 0;
  color: rgba(255, 248, 232, 0.72);
  display: flex;
  gap: 0.44rem;
  justify-content: start;
  min-height: 2.46rem;
  min-width: 0;
  padding: 0.34rem 0.42rem;
  text-align: left;
  width: 100%;
}

.team-row + .team-row {
  border-top: 1px solid rgba(255, 248, 232, 0.1);
}

.team-row:disabled {
  cursor: default;
  opacity: 1;
}

.team-row.is-picked {
  color: var(--text-invert);
  font-weight: 950;
}

.mode-select .team-row.is-picked {
  background: rgba(244, 176, 0, 0.18);
  color: var(--gold);
}

.is-correct .team-row.is-picked {
  color: #7ee2a0;
}

.is-wrong .team-row.is-picked {
  color: rgba(255, 158, 142, 0.95);
}

.flag-frame {
  align-items: center;
  background: rgba(255, 248, 232, 0.1);
  border-radius: 4px;
  display: inline-flex;
  flex: 0 0 auto;
  height: 1.28rem;
  justify-content: center;
  overflow: hidden;
  width: 1.82rem;
}

.flag-frame img {
  display: block;
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.team-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pick-marker {
  align-items: center;
  border-radius: 999px;
  display: inline-flex;
  flex: 0 0 auto;
  height: 1.3rem;
  justify-content: center;
  width: 1.3rem;
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

.match-footline {
  display: flex;
  flex-wrap: wrap;
  font-size: 0.76rem;
  font-weight: 840;
  gap: 0.42rem;
  min-width: 0;
}

.match-footline.is-correct {
  color: #7ee2a0;
}

.match-footline.is-wrong {
  color: rgba(255, 158, 142, 0.95);
}

.match-footline.is-pending,
.match-footline.is-missing {
  color: rgba(255, 248, 232, 0.62);
}

@media (max-width: 620px) {
  .bracket-match {
    inline-size: min(18rem, 78vw);
    scroll-snap-align: start;
  }
}
</style>
