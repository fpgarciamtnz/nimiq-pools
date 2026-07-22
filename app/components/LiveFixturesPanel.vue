<script setup lang="ts">
import { computed } from 'vue'
import { getPlayerAvatar, type PlayerAvatarKey } from '#shared/player-avatars'
import { getTeamFlagMetaByName } from '#shared/team-flags'
import type { CompetitionSupportDto, LiveFixtureDto, QuestionKey } from '../../shared/types'

interface Props {
  support?: CompetitionSupportDto
}

interface SupportToken {
  id: string
  symbol: string
  emoji: string
  label: string
  kind: 'ballot' | 'pickem'
}

const props = defineProps<Props>()
const emptySupport: CompetitionSupportDto = {
  ballotTeams: {},
  pickemFixtures: {}
}

const { fixtures, generatedAt, pending, error } = useLiveFixtures()

const liveFixtures = computed(() => fixtures.value.filter((fixture) => fixture.isLive))
const sortedFixtures = computed(() => [...fixtures.value].sort((first, second) => {
  if (first.isLive !== second.isLive) {
    return first.isLive ? -1 : 1
  }

  return new Date(first.kickoffAt).getTime() - new Date(second.kickoffAt).getTime()
}))
const visibleFixtures = computed(() => liveFixtures.value.length > 0 ? sortedFixtures.value.filter((fixture) => fixture.isLive) : sortedFixtures.value.slice(0, 4))
const support = computed(() => props.support ?? emptySupport)
const fixtureRows = computed(() => visibleFixtures.value.map((fixture) => ({
  fixture,
  homeSupport: supportTokens(fixture, fixture.homeTeamSlug, fixture.homeTeamName),
  awaySupport: supportTokens(fixture, fixture.awayTeamSlug, fixture.awayTeamName)
})))
const lastUpdatedLabel = computed(() => {
  const value = generatedAt.value

  if (!value) {
    return 'Waiting for cached scores'
  }

  return `Updated ${new Intl.DateTimeFormat('en-US', {
    timeStyle: 'short'
  }).format(new Date(value))}`
})

function scoreLabel(fixture: LiveFixtureDto) {
  const home = fixture.homeGoals ?? '-'
  const away = fixture.awayGoals ?? '-'
  const penalty = typeof fixture.penaltyHome === 'number' && typeof fixture.penaltyAway === 'number'
    ? ` (${fixture.penaltyHome}-${fixture.penaltyAway} pens)`
    : ''

  return `${home} - ${away}${penalty}`
}

function statusLabel(fixture: LiveFixtureDto) {
  if (!fixture.isLive) {
    return fixture.statusShort
  }

  return typeof fixture.elapsed === 'number' ? `Live ${fixture.elapsed}'` : 'Live'
}

function kickoffLabel(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

function flagForTeamName(name: string) {
  return getTeamFlagMetaByName(name)
}

function supportTokens(fixture: LiveFixtureDto, teamSlug: string | null, teamName: string): SupportToken[] {
  if (!teamSlug) {
    return []
  }

  const ballotSupporters = support.value.ballotTeams[teamSlug] ?? []
  const pickemSupporters = support.value.pickemFixtures[String(fixture.fixtureId)]?.[teamSlug] ?? []

  return [
    ...ballotSupporters.map((supporter) => ({
      id: `ballot-${supporter.entryId}-${supporter.questionKey}`,
      symbol: ballotSupportSymbol(supporter.questionKey),
      emoji: avatarEmoji(supporter.avatarKey),
      label: ballotSupportLabel(supporter.displayName, teamName, supporter.questionKey),
      kind: 'ballot' as const
    })),
    ...pickemSupporters.map((supporter) => ({
      id: `pickem-${supporter.entryId}-${fixture.fixtureId}`,
      symbol: '\uD83D\uDC4D',
      emoji: avatarEmoji(supporter.avatarKey),
      label: `${supporter.displayName} picked ${teamName} in Pick'em`,
      kind: 'pickem' as const
    }))
  ]
}

function avatarEmoji(avatarKey: PlayerAvatarKey) {
  return getPlayerAvatar(avatarKey).emoji
}

function ballotSupportSymbol(questionKey: QuestionKey) {
  void questionKey
  return '\u2764\uFE0F'
}

function ballotSupportLabel(displayName: string, teamName: string, questionKey: QuestionKey) {
  return `${displayName} supports ${teamName} as ${supportLabel(questionKey)}`
}

function supportLabel(questionKey: QuestionKey) {
  return questionKey.replace('team_', 'Team ')
}
</script>

<template>
  <section class="live-panel" aria-labelledby="live-fixtures-title">
    <div class="live-heading">
      <div>
        <p class="eyebrow">Match center</p>
        <h2 id="live-fixtures-title">Live scores</h2>
      </div>
      <span class="live-updated">{{ lastUpdatedLabel }}</span>
    </div>

    <p v-if="error" class="status error">{{ error }}</p>

    <div v-else-if="fixtureRows.length > 0" class="fixture-grid">
      <article
        v-for="row in fixtureRows"
        :key="row.fixture.fixtureId"
        class="fixture-card"
        :class="{ 'fixture-card-live': row.fixture.isLive }"
      >
        <div class="fixture-meta">
          <span :class="['status-pill', { 'status-pill-live': row.fixture.isLive }]">
            {{ statusLabel(row.fixture) }}
          </span>
          <span>{{ row.fixture.leagueRound ?? kickoffLabel(row.fixture.kickoffAt) }}</span>
        </div>

        <div class="fixture-score">
          <div class="fixture-team">
            <span class="fixture-team-name">
              <TeamFlag :name="row.fixture.homeTeamName" :flag-url="flagForTeamName(row.fixture.homeTeamName).flagUrl" :flag-emoji="flagForTeamName(row.fixture.homeTeamName).flagEmoji" size="sm" />
              {{ row.fixture.homeTeamName }}
            </span>
            <span v-if="row.homeSupport.length > 0" class="fixture-support" aria-label="Home team support">
              <span
                v-for="token in row.homeSupport"
                :key="token.id"
                class="support-token"
                :class="`support-token-${token.kind}`"
                role="img"
                :aria-label="token.label"
                :title="token.label"
              >
                <span aria-hidden="true">{{ token.symbol }}</span>
                <span aria-hidden="true">{{ token.emoji }}</span>
              </span>
            </span>
          </div>
          <strong>{{ scoreLabel(row.fixture) }}</strong>
          <div class="fixture-team fixture-team-away">
            <span class="fixture-team-name">
              <TeamFlag :name="row.fixture.awayTeamName" :flag-url="flagForTeamName(row.fixture.awayTeamName).flagUrl" :flag-emoji="flagForTeamName(row.fixture.awayTeamName).flagEmoji" size="sm" />
              {{ row.fixture.awayTeamName }}
            </span>
            <span v-if="row.awaySupport.length > 0" class="fixture-support" aria-label="Away team support">
              <span
                v-for="token in row.awaySupport"
                :key="token.id"
                class="support-token"
                :class="`support-token-${token.kind}`"
                role="img"
                :aria-label="token.label"
                :title="token.label"
              >
                <span aria-hidden="true">{{ token.symbol }}</span>
                <span aria-hidden="true">{{ token.emoji }}</span>
              </span>
            </span>
          </div>
        </div>

        <p class="fixture-status">{{ row.fixture.statusLong }}</p>
      </article>
    </div>

    <p v-else class="muted">{{ pending ? 'Loading cached scores...' : 'No World Cup fixtures cached yet.' }}</p>
  </section>
</template>

<style scoped>
.live-panel {
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  display: grid;
  gap: 0.85rem;
  padding: 0.35rem 0 0.6rem;
}

.live-heading {
  align-items: end;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}

.live-heading h2,
.live-heading p {
  margin: 0;
}

.live-heading h2 {
  color: var(--text-invert);
  font-size: 1.15rem;
  font-weight: 900;
}

.live-updated {
  color: var(--gold);
  font-size: 0.85rem;
  font-weight: 800;
  white-space: nowrap;
}

.fixture-grid {
  display: grid;
  gap: 0.65rem;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
}

.fixture-card {
  background: var(--data-well);
  border: 0;
  border-radius: var(--radius);
  color: var(--text-invert);
  display: grid;
  gap: 0.6rem;
  padding: 0.75rem;
}

.fixture-card-live {
  background:
    linear-gradient(135deg, rgba(230, 50, 34, 0.34), rgba(244, 176, 0, 0.2)),
    var(--data-well);
  box-shadow: inset 0 0 0 1px rgba(244, 176, 0, 0.28);
}

.fixture-meta {
  align-items: center;
  color: rgba(255, 248, 232, 0.68);
  display: flex;
  font-size: 0.85rem;
  font-weight: 800;
  gap: 0.5rem;
  justify-content: space-between;
}

.status-pill {
  background: rgba(255, 248, 232, 0.1);
  border: 1px solid rgba(255, 248, 232, 0.18);
  border-radius: 999px;
  color: rgba(255, 248, 232, 0.72);
  min-width: 2.5rem;
  padding: 0.25rem 0.5rem;
  text-align: center;
}

.status-pill-live {
  background: var(--red);
  border-color: rgba(255, 117, 117, 0.24);
  box-shadow: 0 0 0 3px rgba(230, 50, 34, 0.18);
  color: #fff8e8;
  min-width: 4.2rem;
}

.fixture-score {
  align-items: center;
  display: grid;
  gap: 0.45rem;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
}

.fixture-team,
.fixture-team-name {
  align-items: center;
  display: flex;
  min-width: 0;
}

.fixture-team {
  align-items: start;
  display: grid;
  gap: 0.32rem;
}

.fixture-team-name {
  font-weight: 900;
  gap: 0.35rem;
}

.fixture-team-away {
  justify-content: flex-end;
  text-align: right;
}

.fixture-team-away .fixture-team-name,
.fixture-team-away .fixture-support {
  justify-content: flex-end;
}

.fixture-score strong {
  color: var(--gold);
  font-size: 1.2rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.fixture-card-live .fixture-score strong {
  color: #ffe27a;
  font-size: 1.55rem;
}

.fixture-card-live .fixture-team-name {
  color: #fff8e8;
}

.fixture-card-live .fixture-status {
  color: rgba(255, 248, 232, 0.82);
}

.fixture-support {
  display: flex;
  flex-wrap: wrap;
  gap: 0.22rem;
  min-width: 0;
}

.support-token {
  align-items: center;
  background: rgba(255, 248, 232, 0.1);
  border: 1px solid rgba(255, 248, 232, 0.16);
  border-radius: 999px;
  display: inline-flex;
  font-size: 0.82rem;
  gap: 0.1rem;
  line-height: 1;
  padding: 0.18rem 0.32rem;
}

.support-token-ballot {
  background: rgba(230, 50, 34, 0.2);
}

.support-token-pickem {
  background: rgba(244, 176, 0, 0.18);
}

.fixture-status {
  color: rgba(255, 248, 232, 0.68);
  font-size: 0.9rem;
  font-weight: 800;
  margin: 0;
}

.live-panel > .muted {
  color: rgba(255, 248, 232, 0.72);
}

@media (max-width: 640px) {
  .live-heading {
    align-items: start;
    display: grid;
  }

  .live-heading h2 {
    color: var(--text-invert);
  }

  .live-panel > .muted {
    color: rgba(255, 248, 232, 0.72);
  }

  .fixture-score {
    align-items: start;
    grid-template-columns: 1fr;
  }

  .fixture-team-away,
  .fixture-team-away .fixture-team-name,
  .fixture-team-away .fixture-support {
    justify-content: flex-start;
    text-align: left;
  }
}
</style>
