<script setup lang="ts">
import { computed } from 'vue'
import { Clock, Radio, UsersRound } from '@lucide/vue'
import type { CompetitionBallotSupport, CompetitionCollision, CompetitionCollisionSide } from '../../shared/types'

interface Props {
  collisions: CompetitionCollision[]
  isPublic: boolean
}

const props = defineProps<Props>()

interface RivalryCollisionSide extends CompetitionCollisionSide {
  userLabel: string
  pickLabel: string
}

interface RivalryCollision {
  collision: CompetitionCollision
  home: RivalryCollisionSide
  away: RivalryCollisionSide
  kickoffText: string
  picksText: string
  gapText: string
}

const visibleCollisions = computed<RivalryCollision[]>(() => props.collisions.slice(0, 4).map((collision) => ({
  collision,
  home: buildRivalrySide(collision.home),
  away: buildRivalrySide(collision.away),
  kickoffText: collision.isLive ? 'Live now' : kickoffLabel(collision.kickoffAt),
  picksText: `${collision.totalSupporters} ${collision.totalSupporters === 1 ? 'pick' : 'picks'}`,
  gapText: gapLabel(collision)
})))

function kickoffLabel(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

function slotLabel(supporter: CompetitionBallotSupport) {
  return supporter.questionKey.replace('team_', 'Team ')
}

function buildRivalrySide(side: CompetitionCollisionSide): RivalryCollisionSide {
  const primarySupporter = side.supporters[0]

  return {
    ...side,
    userLabel: primarySupporter
      ? supporterGroupLabel(side.supporters)
      : 'No player',
    pickLabel: primarySupporter
      ? side.supporters.map((supporter) => slotLabel(supporter)).join(', ')
      : 'No pick'
  }
}

function supporterGroupLabel(supporters: CompetitionBallotSupport[]) {
  const [firstSupporter, ...otherSupporters] = supporters

  if (!firstSupporter) {
    return 'No player'
  }

  if (otherSupporters.length === 0) {
    return firstSupporter.displayName
  }

  return `${firstSupporter.displayName} + ${otherSupporters.length}`
}

function gapLabel(collision: CompetitionCollision) {
  return collision.scoreGap === 0 ? 'Tied players' : `${collision.scoreGap} pts gap`
}
</script>

<template>
  <section v-if="props.isPublic && visibleCollisions.length > 0" class="collision-panel" aria-labelledby="collision-title">
    <div class="section-heading">
      <p class="eyebrow">Collision schedule</p>
      <h2 id="collision-title" class="sr-only">Collision schedule</h2>
    </div>

    <div class="collision-list">
      <article
        v-for="item in visibleCollisions"
        :key="item.collision.fixtureId"
        class="collision-card"
        :class="{ 'is-live': item.collision.isLive }"
      >
        <div class="collision-topline">
          <span class="collision-status">
            <Radio v-if="item.collision.isLive" :size="14" aria-hidden="true" />
            <Clock v-else :size="14" aria-hidden="true" />
            {{ item.kickoffText }}
          </span>
          <span class="collision-status">
            <UsersRound :size="14" aria-hidden="true" />
            {{ item.picksText }}
          </span>
        </div>

        <div class="collision-rivalry">
          <div class="collision-side">
            <span class="collision-user">{{ item.home.userLabel }}</span>
            <span class="collision-team">
              <TeamFlag
                :name="item.home.team.name"
                :fifa-code="item.home.team.fifaCode"
                :flag-url="item.home.team.flagUrl"
                :flag-emoji="item.home.team.flagEmoji"
                size="sm"
              />
              {{ item.home.team.name }}
            </span>
            <span class="collision-supporters">{{ item.home.pickLabel }}</span>
          </div>

          <strong class="collision-versus">vs</strong>

          <div class="collision-side collision-side-away">
            <span class="collision-user">{{ item.away.userLabel }}</span>
            <span class="collision-team">
              <TeamFlag
                :name="item.away.team.name"
                :fifa-code="item.away.team.fifaCode"
                :flag-url="item.away.team.flagUrl"
                :flag-emoji="item.away.team.flagEmoji"
                size="sm"
              />
              {{ item.away.team.name }}
            </span>
            <span class="collision-supporters">{{ item.away.pickLabel }}</span>
          </div>
        </div>

        <div class="collision-footer">
          <span>{{ item.collision.fixtureLabel }}</span>
          <span>{{ item.gapText }}</span>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.collision-panel {
  display: grid;
  gap: 0.62rem;
  min-width: 0;
}

.sr-only {
  clip: rect(0, 0, 0, 0);
  border: 0;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  padding: 0;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}

.collision-list {
  display: grid;
  gap: 0.82rem;
}

.collision-card {
  background:
    linear-gradient(112deg, rgba(46, 77, 127, 0.3), transparent 39%),
    linear-gradient(247deg, rgba(151, 48, 38, 0.22), transparent 41%),
    var(--data-well);
  border: 1px solid rgba(255, 248, 232, 0.14);
  border-radius: var(--radius);
  box-shadow: 0 1rem 2.3rem rgba(0, 0, 0, 0.18);
  color: var(--text-invert);
  display: grid;
  gap: 0.9rem;
  min-width: 0;
  overflow: hidden;
  padding: 0.9rem;
  position: relative;
}

.collision-card::before {
  background: linear-gradient(180deg, transparent, rgba(244, 176, 0, 0.68), transparent);
  content: "";
  height: 72%;
  left: 50%;
  opacity: 0.38;
  position: absolute;
  top: 14%;
  transform: translateX(-50%) skewX(-14deg);
  width: 1px;
}

.collision-card.is-live {
  border-color: rgba(244, 176, 0, 0.42);
}

.collision-topline,
.collision-footer {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  justify-content: space-between;
  min-width: 0;
  position: relative;
  z-index: 1;
}

.collision-status {
  align-items: center;
  background: rgba(255, 248, 232, 0.1);
  border-radius: var(--radius);
  color: var(--gold);
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 950;
  gap: 0.28rem;
  letter-spacing: 0;
  padding: 0.26rem 0.54rem;
  white-space: nowrap;
}

.collision-rivalry {
  align-items: start;
  display: grid;
  gap: 0.72rem;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  min-width: 0;
  position: relative;
  z-index: 1;
}

.collision-versus {
  color: var(--gold);
  font-size: 2.1rem;
  font-weight: 950;
  line-height: 1;
  padding-top: 0.7rem;
  text-shadow: 0 0 1rem rgba(244, 176, 0, 0.28);
  text-transform: uppercase;
}

.collision-side {
  display: grid;
  gap: 0.34rem;
  min-width: 0;
}

.collision-side-away {
  justify-items: end;
  text-align: right;
}

.collision-user {
  color: #fff8e8;
  display: block;
  font-size: 2.45rem;
  font-weight: 950;
  line-height: 0.96;
  min-width: 0;
  overflow-wrap: anywhere;
  text-shadow: 0 0.08rem 0.2rem rgba(0, 0, 0, 0.28);
}

.collision-team {
  align-items: center;
  color: rgba(255, 248, 232, 0.84);
  display: flex;
  font-size: 1rem;
  font-weight: 850;
  gap: 0.34rem;
  min-width: 0;
}

.collision-side-away .collision-team {
  justify-content: flex-end;
}

.collision-supporters {
  color: rgba(255, 248, 232, 0.62);
  font-size: 0.82rem;
  font-weight: 760;
  line-height: 1.28;
  overflow-wrap: anywhere;
}

.collision-footer {
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(255, 248, 232, 0.06);
  border-radius: calc(var(--radius) - 0.2rem);
  color: rgba(255, 248, 232, 0.62);
  font-size: 0.82rem;
  font-weight: 820;
  padding: 0.56rem 0.66rem;
}

.collision-footer span {
  overflow-wrap: anywhere;
}

@media (max-width: 680px) {
  .collision-card::before {
    display: none;
  }

  .collision-rivalry {
    grid-template-columns: 1fr;
  }

  .collision-versus {
    font-size: 1.1rem;
    padding-top: 0;
  }

  .collision-user {
    font-size: 1.75rem;
  }

  .collision-side-away,
  .collision-side-away .collision-team {
    justify-content: flex-start;
    justify-items: start;
    text-align: left;
  }
}
</style>
