<script setup lang="ts">
import { computed } from 'vue'
import type { EntryDto, KnockoutFixtureDto, KnockoutPickemWindowDto, TeamDto } from '#shared/types'
import KnockoutPickemMatchupRow from './KnockoutPickemMatchupRow.vue'

interface FixturePick {
  fixture: KnockoutFixtureDto
  winnerTeamSlug: string
}

interface RoundEntryRow {
  entry: EntryDto
  picks: FixturePick[]
}

interface RoundTimelineItem {
  window: KnockoutPickemWindowDto
  rows: RoundEntryRow[]
}

interface Props {
  teams: TeamDto[]
  rounds: RoundTimelineItem[]
}

const props = defineProps<Props>()

const roundsWithPicks = computed(() => props.rounds.filter((round) => round.rows.length > 0))

function entrySummary(row: RoundEntryRow) {
  const decidedPicks = row.picks.filter((pick) => Boolean(pick.fixture.winnerTeamSlug) && Boolean(pick.winnerTeamSlug))
  const correct = decidedPicks.filter((pick) => pick.fixture.winnerTeamSlug === pick.winnerTeamSlug).length
  const missing = row.picks.filter((pick) => !pick.winnerTeamSlug).length

  if (decidedPicks.length === 0 && missing === row.picks.length) {
    return 'No picks saved'
  }

  const base = `${correct}/${decidedPicks.length} correct`

  return missing > 0 ? `${base}, ${missing} missed` : base
}

function roundSummary(round: RoundTimelineItem) {
  const picks = round.rows.flatMap((row) => row.picks)
  const decided = picks.filter((pick) => Boolean(pick.fixture.winnerTeamSlug) && Boolean(pick.winnerTeamSlug))
  const correct = decided.filter((pick) => pick.fixture.winnerTeamSlug === pick.winnerTeamSlug).length
  const missing = picks.filter((pick) => !pick.winnerTeamSlug).length

  if (decided.length === 0 && missing === picks.length) {
    return 'Waiting on saved picks'
  }

  return missing > 0
    ? `${correct}/${decided.length} correct, ${missing} missed`
    : `${correct}/${decided.length} correct`
}
</script>

<template>
  <div class="round-timeline" aria-label="Revealed Pick'em rounds">
    <article v-for="round in roundsWithPicks" :key="round.window.roundKey" class="timeline-round">
      <header class="round-header">
        <div>
          <span class="round-kicker">{{ round.window.label }}</span>
          <h3>{{ round.window.label }} picks</h3>
        </div>
        <span class="round-score">{{ roundSummary(round) }}</span>
      </header>

      <div class="entry-stack">
        <article v-for="row in round.rows" :key="row.entry.id" class="entry-result">
          <div class="entry-line">
            <strong>{{ row.entry.displayName }}</strong>
            <span>{{ entrySummary(row) }}</span>
          </div>

          <div class="entry-fixtures">
            <KnockoutPickemMatchupRow
              v-for="pick in row.picks"
              :key="pick.fixture.fixtureId"
              :fixture="pick.fixture"
              :teams="props.teams"
              :selected-winner-team-slug="pick.winnerTeamSlug"
              mode="result"
            />
          </div>
        </article>
      </div>
    </article>
  </div>
</template>

<style scoped>
.round-timeline {
  display: grid;
  gap: 0.8rem;
}

.timeline-round {
  background:
    linear-gradient(90deg, rgba(244, 176, 0, 0.1), transparent 26%),
    rgba(255, 248, 232, 0.055);
  border-radius: var(--radius);
  display: grid;
  gap: 0.64rem;
  min-width: 0;
  padding: 0.78rem;
}

.round-header {
  align-items: start;
  display: flex;
  gap: 0.72rem;
  justify-content: space-between;
  min-width: 0;
}

.round-header h3 {
  color: var(--text-invert);
  font-size: 1.18rem;
  line-height: 1.05;
  margin: 0.1rem 0 0;
}

.round-kicker,
.round-score {
  font-size: 0.78rem;
  font-weight: 950;
  text-transform: uppercase;
}

.round-kicker {
  color: var(--gold);
}

.round-score {
  background: rgba(255, 250, 240, 0.92);
  border-radius: 999px;
  color: var(--text);
  flex: 0 0 auto;
  max-width: 100%;
  overflow-wrap: anywhere;
  padding: 0.28rem 0.5rem;
  text-transform: none;
}

.entry-stack {
  display: grid;
}

.entry-result {
  border-top: 1px solid var(--data-line);
  display: grid;
  gap: 0.42rem;
  min-width: 0;
  padding: 0.72rem 0 0.62rem;
}

.entry-result:first-child {
  border-top: 0;
  padding-top: 0;
}

.entry-line {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  justify-content: space-between;
  min-width: 0;
}

.entry-line strong {
  color: var(--text-invert);
  font-size: 1.02rem;
  min-width: 0;
  overflow-wrap: anywhere;
}

.entry-line span {
  color: rgba(255, 248, 232, 0.66);
  font-size: 0.82rem;
  font-weight: 800;
  min-width: 0;
  overflow-wrap: anywhere;
}

.entry-fixtures {
  display: grid;
  min-width: 0;
}

@media (max-width: 620px) {
  .round-header {
    display: grid;
  }

  .round-score {
    justify-self: start;
  }

  .timeline-round {
    padding: 0.66rem 0.48rem;
  }

  .entry-line {
    display: grid;
    justify-content: stretch;
  }
}
</style>
