<script setup lang="ts">
import { computed } from 'vue'
import { Check, CircleDashed, Trophy, X } from '@lucide/vue'
import { getTeamFlagMeta } from '#shared/team-flags'
import type { KnockoutFixtureDto, TeamDto } from '#shared/types'

type MatchupMode = 'select' | 'result'
type PickStatus = 'correct' | 'wrong' | 'pending' | 'missing'

interface Props {
  fixture: KnockoutFixtureDto
  teams: TeamDto[]
  selectedWinnerTeamSlug?: string
  mode?: MatchupMode
  disabled?: boolean
}

interface Emits {
  selectWinner: [teamSlug: string]
}

const props = withDefaults(defineProps<Props>(), {
  selectedWinnerTeamSlug: '',
  mode: 'select',
  disabled: false
})
const emit = defineEmits<Emits>()

const teamBySlug = computed(() => new Map(props.teams.map((team) => [team.slug, team])))
const options = computed(() => [
  {
    side: 'home',
    teamSlug: props.fixture.homeTeamSlug,
    fallbackName: props.fixture.homeTeamName
  },
  {
    side: 'away',
    teamSlug: props.fixture.awayTeamSlug,
    fallbackName: props.fixture.awayTeamName
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
const resultStatus = computed<PickStatus>(() => {
  if (!props.selectedWinnerTeamSlug) {
    return 'missing'
  }

  if (!props.fixture.winnerTeamSlug) {
    return 'pending'
  }

  return props.fixture.winnerTeamSlug === props.selectedWinnerTeamSlug ? 'correct' : 'wrong'
})
const selectedTeam = computed(() => teamBySlug.value.get(props.selectedWinnerTeamSlug) ?? null)
const actualWinner = computed(() => props.fixture.winnerTeamSlug
  ? teamBySlug.value.get(props.fixture.winnerTeamSlug) ?? null
  : null)
const statusLabel = computed(() => {
  if (props.mode === 'select' && props.selectedWinnerTeamSlug) {
    return `Selected winner: ${selectedTeam.value?.name ?? props.selectedWinnerTeamSlug}`
  }

  if (resultStatus.value === 'correct') {
    return `Correct pick: ${selectedTeam.value?.name ?? props.selectedWinnerTeamSlug}`
  }

  if (resultStatus.value === 'wrong') {
    return `Wrong pick: ${selectedTeam.value?.name ?? props.selectedWinnerTeamSlug}`
  }

  if (resultStatus.value === 'pending') {
    return `Pending result: ${selectedTeam.value?.name ?? props.selectedWinnerTeamSlug}`
  }

  return 'No pick'
})
const matchupLabel = computed(() => options.value.map((option) => option.name).join(' - '))

function chooseWinner(teamSlug: string) {
  if (props.mode !== 'select' || props.disabled) {
    return
  }

  emit('selectWinner', teamSlug)
}
</script>

<template>
  <article
    class="matchup-row"
    :class="[`is-${resultStatus}`, `mode-${props.mode}`]"
    :aria-label="matchupLabel"
  >
    <div class="matchup-line">
      <span
        v-for="(option, index) in options"
        :key="option.teamSlug"
        class="matchup-team-title"
        :class="{ 'is-picked': option.teamSlug === props.selectedWinnerTeamSlug }"
      >
        <span v-if="index > 0" class="matchup-dash" aria-hidden="true">-</span>
        {{ option.name }}
      </span>
    </div>

    <div class="team-choice-grid">
      <button
        v-for="option in options"
        :key="option.teamSlug"
        class="team-choice"
        :class="{
          'is-picked': option.teamSlug === props.selectedWinnerTeamSlug,
          'is-actual-winner': option.teamSlug === props.fixture.winnerTeamSlug
        }"
        type="button"
        :disabled="props.mode !== 'select' || props.disabled"
        :aria-pressed="props.mode === 'select' ? option.teamSlug === props.selectedWinnerTeamSlug : undefined"
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
        <span class="team-choice-name">{{ option.name }}</span>
        <span
          v-if="option.teamSlug === props.selectedWinnerTeamSlug"
          class="pick-marker"
          :class="`marker-${resultStatus}`"
          :aria-label="statusLabel"
        >
          <Trophy v-if="props.mode === 'select'" :size="16" aria-hidden="true" />
          <Check v-else-if="resultStatus === 'correct'" :size="16" aria-hidden="true" />
          <X v-else-if="resultStatus === 'wrong'" :size="16" aria-hidden="true" />
          <CircleDashed v-else-if="resultStatus === 'pending'" :size="16" aria-hidden="true" />
          <Trophy v-else :size="16" aria-hidden="true" />
        </span>
      </button>
    </div>

    <div v-if="props.mode === 'result'" class="result-footline" :class="`is-${resultStatus}`">
      <span>{{ statusLabel }}</span>
      <span v-if="resultStatus === 'wrong' && actualWinner">
        Actual: {{ actualWinner.name }}
      </span>
    </div>
  </article>
</template>

<style scoped>
.matchup-row {
  border-radius: var(--radius);
  display: grid;
  gap: 0.48rem;
  min-width: 0;
  position: relative;
}

.mode-select {
  background:
    linear-gradient(90deg, rgba(244, 176, 0, 0.11), transparent 38%),
    rgba(255, 248, 232, 0.08);
  border: 1px solid rgba(255, 248, 232, 0.13);
  padding: 0.7rem;
}

.mode-result {
  border-top: 1px solid var(--data-line);
  padding: 0.68rem 0;
}

.matchup-line {
  align-items: baseline;
  color: var(--text-invert);
  display: flex;
  flex-wrap: wrap;
  font-size: clamp(1.18rem, 2vw, 1.72rem);
  font-weight: 950;
  gap: 0.26rem;
  letter-spacing: 0;
  line-height: 1.02;
  min-width: 0;
}

.matchup-team-title {
  min-width: 0;
}

.matchup-team-title.is-picked {
  color: var(--gold);
}

.is-correct .matchup-team-title.is-picked {
  color: #7ee2a0;
}

.is-wrong .matchup-team-title.is-picked {
  color: rgba(255, 158, 142, 0.82);
  font-weight: 760;
}

.matchup-dash {
  color: rgba(255, 248, 232, 0.46);
  padding-right: 0.26rem;
}

.team-choice-grid {
  display: grid;
  gap: 0.44rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-width: 0;
}

.team-choice {
  align-items: center;
  background: rgba(255, 250, 240, 0.91);
  border: 1px solid transparent;
  border-radius: var(--radius);
  color: var(--text);
  cursor: pointer;
  display: flex;
  gap: 0.42rem;
  justify-content: flex-start;
  min-height: 2.85rem;
  min-width: 0;
  padding: 0.42rem 0.5rem;
  text-align: left;
  width: 100%;
}

.team-choice:disabled {
  cursor: default;
  opacity: 1;
}

.team-choice.is-picked {
  background: #fff3c2;
  border-color: rgba(244, 176, 0, 0.72);
  box-shadow: inset 0 -0.2rem 0 rgba(244, 176, 0, 0.2);
  font-weight: 950;
}

.is-correct .team-choice.is-picked {
  background: #d9f8df;
  border-color: rgba(13, 95, 29, 0.46);
  color: #083d16;
}

.is-wrong .team-choice.is-picked {
  background: #ffe0d9;
  border-color: rgba(201, 40, 24, 0.35);
  color: #6e1f15;
  font-weight: 760;
}

.is-pending .team-choice.is-picked {
  background: #fff4cf;
  border-color: rgba(244, 176, 0, 0.42);
}

.flag-frame {
  align-items: center;
  background: rgba(17, 24, 20, 0.12);
  border-radius: 5px;
  display: inline-flex;
  flex: 0 0 auto;
  height: 1.45rem;
  justify-content: center;
  overflow: hidden;
  width: 2rem;
}

.flag-frame img {
  display: block;
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.team-choice-name {
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
  height: 1.42rem;
  justify-content: center;
  min-width: 1.42rem;
  width: 1.42rem;
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

.result-footline {
  display: flex;
  flex-wrap: wrap;
  font-size: 0.78rem;
  font-weight: 870;
  gap: 0.42rem;
}

.result-footline.is-correct {
  color: #7ee2a0;
}

.result-footline.is-wrong {
  color: rgba(255, 158, 142, 0.9);
}

.result-footline.is-pending,
.result-footline.is-missing {
  color: rgba(255, 248, 232, 0.62);
}

@media (max-width: 620px) {
  .team-choice-grid {
    grid-template-columns: 1fr;
  }

  .mode-select {
    padding: 0.62rem;
  }

  .mode-result {
    padding: 0.58rem 0;
  }

  .matchup-line {
    font-size: 1.28rem;
  }

  .team-choice {
    padding: 0.4rem 0.42rem;
  }
}
</style>
