<script setup lang="ts">
import { computed } from 'vue'
import { getPlayerAvatar, type PlayerAvatarKey } from '#shared/player-avatars'
import { getTeamFlagMetaByName } from '#shared/team-flags'
import type { CompetitionSupportDto, KnockoutFixtureDto, KnockoutPickemWindowDto, QuestionKey } from '../../shared/types'

interface Props {
  window: KnockoutPickemWindowDto | null
  support: CompetitionSupportDto
  isPublic: boolean
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

const visibleSupport = computed(() => props.isPublic ? props.support : emptySupport)
const matchRows = computed(() => (props.window?.fixtures ?? []).map((fixture) => ({
  fixture,
  homeSupport: supportTokens(fixture, fixture.homeTeamSlug, fixture.homeTeamName),
  awaySupport: supportTokens(fixture, fixture.awayTeamSlug, fixture.awayTeamName)
})))
const windowStatus = computed(() => {
  if (!props.window) {
    return 'Waiting'
  }

  if (props.window.isOpen) {
    return 'Open'
  }

  return props.window.isRevealed ? 'Revealed' : 'Locked'
})
const matchCountLabel = computed(() => {
  const count = matchRows.value.length
  return `${count} ${count === 1 ? 'match' : 'matches'}`
})

function scoreLabel(fixture: KnockoutFixtureDto) {
  const home = fixture.homeGoals ?? '-'
  const away = fixture.awayGoals ?? '-'
  const penalty = typeof fixture.penaltyHome === 'number' && typeof fixture.penaltyAway === 'number'
    ? ` (${fixture.penaltyHome}-${fixture.penaltyAway} pens)`
    : ''

  return `${home} - ${away}${penalty}`
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

function supportTokens(fixture: KnockoutFixtureDto, teamSlug: string | null, teamName: string): SupportToken[] {
  if (!teamSlug) {
    return []
  }

  const ballotSupporters = visibleSupport.value.ballotTeams[teamSlug] ?? []
  const pickemSupporters = visibleSupport.value.pickemFixtures[String(fixture.fixtureId)]?.[teamSlug] ?? []

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
  <section class="matches-panel" aria-labelledby="league-matches-title">
    <div class="matches-heading">
      <div>
        <p class="eyebrow">Match center</p>
        <h2 id="league-matches-title">{{ props.window?.label ?? "Next Pick'em round" }}</h2>
      </div>
      <div class="matches-meta" aria-label="Round status">
        <span>{{ windowStatus }}</span>
        <span>{{ matchCountLabel }}</span>
      </div>
    </div>

    <div v-if="matchRows.length > 0" class="match-list">
      <article v-for="row in matchRows" :key="row.fixture.fixtureId" class="match-card">
        <div class="match-meta">
          <span>{{ row.fixture.leagueRound ?? props.window?.label ?? 'Knockout match' }}</span>
          <span>{{ kickoffLabel(row.fixture.kickoffAt) }}</span>
        </div>

        <div class="match-scoreline">
          <div class="match-team">
            <span class="match-team-name">
              <TeamFlag :name="row.fixture.homeTeamName" :flag-url="flagForTeamName(row.fixture.homeTeamName).flagUrl" :flag-emoji="flagForTeamName(row.fixture.homeTeamName).flagEmoji" size="sm" />
              {{ row.fixture.homeTeamName }}
            </span>
            <span v-if="row.homeSupport.length > 0" class="support-list" aria-label="Home team support">
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
            <span v-else class="support-empty">No visible support</span>
          </div>

          <strong>{{ scoreLabel(row.fixture) }}</strong>

          <div class="match-team match-team-away">
            <span class="match-team-name">
              <TeamFlag :name="row.fixture.awayTeamName" :flag-url="flagForTeamName(row.fixture.awayTeamName).flagUrl" :flag-emoji="flagForTeamName(row.fixture.awayTeamName).flagEmoji" size="sm" />
              {{ row.fixture.awayTeamName }}
            </span>
            <span v-if="row.awaySupport.length > 0" class="support-list" aria-label="Away team support">
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
            <span v-else class="support-empty">No visible support</span>
          </div>
        </div>
      </article>
    </div>

    <p v-else class="muted">Waiting for the next Pick'em round fixtures.</p>
  </section>
</template>

<style scoped>
.matches-panel {
  display: grid;
  gap: 0.78rem;
  min-width: 0;
}

.matches-heading {
  align-items: end;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  min-width: 0;
}

.matches-heading h2,
.matches-heading p {
  margin: 0;
}

.matches-heading h2 {
  color: var(--text);
  font-size: 1.12rem;
  line-height: 1.05;
}

.matches-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.34rem;
  justify-content: flex-end;
}

.matches-meta span {
  background: rgba(17, 24, 20, 0.08);
  border: 1px solid rgba(17, 24, 20, 0.1);
  border-radius: 999px;
  color: var(--muted);
  font-size: 0.76rem;
  font-weight: 900;
  padding: 0.22rem 0.48rem;
}

.match-list {
  display: grid;
  gap: 0.72rem;
}

.match-card {
  background: rgba(255, 250, 240, 0.82);
  border: 1px solid rgba(22, 21, 17, 0.1);
  border-radius: var(--radius);
  color: var(--text);
  display: grid;
  gap: 0.68rem;
  min-width: 0;
  padding: 0.82rem;
}

.match-meta {
  align-items: center;
  color: var(--muted);
  display: flex;
  flex-wrap: wrap;
  font-size: 0.82rem;
  font-weight: 850;
  gap: 0.5rem;
  justify-content: space-between;
}

.match-scoreline {
  align-items: start;
  display: grid;
  gap: 0.62rem;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
}

.match-team,
.match-team-name {
  min-width: 0;
}

.match-team {
  display: grid;
  gap: 0.34rem;
}

.match-team-name {
  align-items: center;
  display: flex;
  font-weight: 950;
  gap: 0.35rem;
}

.match-team-away {
  justify-items: end;
  text-align: right;
}

.match-team-away .match-team-name,
.match-team-away .support-list {
  justify-content: flex-end;
}

.match-scoreline strong {
  color: var(--red);
  font-size: 1.16rem;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  padding-top: 0.14rem;
  white-space: nowrap;
}

.support-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.24rem;
  min-width: 0;
}

.support-token {
  align-items: center;
  background: rgba(17, 24, 20, 0.07);
  border: 1px solid rgba(17, 24, 20, 0.1);
  border-radius: 999px;
  display: inline-flex;
  font-size: 0.84rem;
  gap: 0.1rem;
  line-height: 1;
  padding: 0.2rem 0.36rem;
}

.support-token-ballot {
  background: rgba(230, 50, 34, 0.14);
}

.support-token-pickem {
  background: rgba(244, 176, 0, 0.2);
}

.support-empty {
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 800;
}

.matches-panel > .muted {
  color: var(--muted);
  margin: 0;
}

@media (max-width: 640px) {
  .matches-heading {
    align-items: start;
    display: grid;
  }

  .matches-meta {
    justify-content: flex-start;
  }

  .match-scoreline {
    grid-template-columns: 1fr;
  }

  .match-team-away,
  .match-team-away .match-team-name,
  .match-team-away .support-list {
    justify-content: flex-start;
    justify-items: start;
    text-align: left;
  }
}
</style>
