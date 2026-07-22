<script setup lang="ts">
import { CalendarClock, ChevronDown, CircleHelp, ListChecks, LockKeyhole, MousePointerClick, Trophy } from '@lucide/vue'
import { GROUP_POSITION_PICKEM_MAX_POINTS } from '#shared/scoring'
import type { Component } from 'vue'

interface Props {
  context?: 'league' | 'standalone'
}

interface GuideStep {
  title: string
  text: string
  image: string
  imageAlt: string
  watchFor: string
}

interface ExplainerItem {
  title: string
  text: string
  icon: Component
}

const props = withDefaults(defineProps<Props>(), {
  context: 'league'
})

const guideSteps: GuideStep[] = [
  {
    title: 'Start from the league tabs',
    text: 'The league is split into simple places: Picks, Rankings, Predictions, Matches, and this guide. Use the tabs or arrows to move around without losing your league.',
    image: '/how-it-works/league-navigation.png',
    imageAlt: 'League page tabs showing Picks, Rankings, Predictions, Matches, and How it works.',
    watchFor: 'The active tab has the dark background. That tells you where you are.'
  },
  {
    title: 'Make or edit your ballot',
    text: 'Open Picks, choose your table name, pick an icon, then choose one team for each ballot lane. Saved names edit the same entry, while a new name creates a new table entry.',
    image: '/how-it-works/make-picks.png',
    imageAlt: 'Organizer-managed beta entries with four team selectors.',
    watchFor: 'Fill all four team selectors before pressing Save Picks.'
  },
  {
    title: "Use Pick'em when a round opens",
    text: "If the league has Pick'em enabled, a knockout round appears when its fixtures are ready. Pick one winner in every match before that round locks.",
    image: '/how-it-works/pickem-round.png',
    imageAlt: "Knockout Pick'em panel with a round lock time and winner choices.",
    watchFor: "The lock time is shown at the top of the Pick'em panel."
  },
  {
    title: 'Read the table after the reveal',
    text: 'Rankings show the race, Predictions show who picked what, and Matches show live scores. Before the reveal, names may show while points and picks stay private.',
    image: '/how-it-works/rankings-reveal.png',
    imageAlt: 'Rankings and reveal area showing player rows, points, and pick chips.',
    watchFor: "After reveal, score chips explain where each player's points came from."
  },
  {
    title: 'Create a league with the right options',
    text: "On Create League, you can name the league, add a picture, and decide whether to add Pick'em. If you add it, choose the knockout round where winner picks should start.",
    image: '/how-it-works/create-league.png',
    imageAlt: "Create League form showing the league name, image picker, and Pick'em option.",
    watchFor: "Pick'em is optional. Turn it on only if your group wants winner picks after the ballot."
  }
]

const explainerItems: ExplainerItem[] = [
  {
    title: 'Ballots',
    text: 'Your beta entry is a four-team ballot. Every team uses the same scoring formula.',
    icon: ListChecks
  },
  {
    title: 'Deadlines',
    text: "The main ballot locks at the league deadline. Pick'em rounds lock at kickoff for that round.",
    icon: CalendarClock
  },
  {
    title: "Pick'em",
    text: 'When a knockout round opens, pick every match winner and save before the lock time.',
    icon: MousePointerClick
  },
  {
    title: 'Reveal',
    text: 'Picks stay private until the league reveal. Then everyone can compare entries.',
    icon: LockKeyhole
  }
]

const ballotScoringItems = [
  { label: 'Win', value: '+3', detail: 'for every match the selected team wins' },
  { label: 'Goal for', value: '+1', detail: 'for every non-shootout goal the selected team scores' },
  { label: 'Semifinal', value: '+1', detail: 'for reaching the semifinal' },
  { label: 'Final', value: '+1', detail: 'for reaching the final' }
]

const specialRuleTeams = [
  { name: 'Croatia', fifaCode: 'CRO' },
  { name: 'Uruguay', fifaCode: 'URU' },
  { name: 'Canada', fifaCode: 'CAN' },
  { name: 'Saudi Arabia', fifaCode: 'KSA' }
]
</script>

<template>
  <section class="how-guide" :class="{ 'is-standalone': props.context === 'standalone' }" aria-labelledby="how-guide-title">
    <div v-if="props.context === 'standalone'" class="guide-hero">
      <div class="guide-hero-copy">
        <p class="eyebrow">How it works</p>
        <h1 id="how-guide-title">How Pick Party works</h1>
        <p>
          Start with the simple version: make your ballot before the deadline, come back for Pick'em rounds if they are enabled, then follow the reveal and rankings.
        </p>
      </div>
      <div class="guide-score">
        <Trophy :size="16" aria-hidden="true" />
        <strong>Most points wins.</strong>
        <span>Ties share the same rank.</span>
      </div>
    </div>
    <div v-else class="guide-compact-heading">
      <p class="eyebrow">Points</p>
      <h3 id="how-guide-title">How the table score is built</h3>
      <p>
        Rankings add your ballot team points, group table Pick'em points, and knockout Pick'em points. Highest total ranks first; tied totals share the same rank.
      </p>
    </div>

    <div v-if="props.context === 'standalone'" class="guide-quick-list" aria-label="Quick guide">
      <article v-for="item in explainerItems" :key="item.title" class="quick-item">
        <component :is="item.icon" :size="16" aria-hidden="true" />
        <div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.text }}</p>
        </div>
      </article>
    </div>

    <section v-if="props.context === 'standalone'" class="guide-section" aria-labelledby="guide-screenshots-title">
      <div class="section-heading">
        <p class="eyebrow">What to look for</p>
        <h3 id="guide-screenshots-title">Screenshots from the app</h3>
      </div>

      <div class="screenshot-list">
        <article v-for="(step, index) in guideSteps" :key="step.title" class="screenshot-step">
          <figure>
            <img :src="step.image" :alt="step.imageAlt">
          </figure>
          <div class="screenshot-copy">
            <span>{{ String(index + 1).padStart(2, '0') }}</span>
            <h4>{{ step.title }}</h4>
            <p>{{ step.text }}</p>
            <p class="watch-note">{{ step.watchFor }}</p>
          </div>
        </article>
      </div>
    </section>

    <section class="guide-section points-section" aria-labelledby="points-title">
      <div class="section-heading">
        <p class="eyebrow">Points</p>
        <h3 id="points-title">Scoring system</h3>
      </div>

      <div class="score-formula" aria-label="Ballot scoring formula">
        <span>Team score</span>
        <strong>3 x wins + non-shootout goals for + semifinal and final bonuses</strong>
      </div>

      <div class="ballot-score-grid">
        <article v-for="item in ballotScoringItems" :key="item.label" class="score-token">
          <strong>{{ item.value }}</strong>
          <div>
            <h4>{{ item.label }}</h4>
            <p>{{ item.detail }}</p>
          </div>
        </article>
      </div>

      <details v-if="props.context === 'league'" class="special-rules">
        <summary>
          <span>Special rules</span>
          <ChevronDown :size="16" aria-hidden="true" />
        </summary>

        <div class="special-rules-body">
          <p>
            People with the following teams might be eligible for bonus points just because they are besties with the admin:
          </p>
          <ul class="special-team-list" aria-label="Special rule teams">
            <li v-for="team in specialRuleTeams" :key="team.fifaCode" class="special-team">
              <TeamFlag :name="team.name" :fifa-code="team.fifaCode" size="sm" />
              <span>{{ team.name }}</span>
            </li>
          </ul>
        </div>
      </details>

      <div class="points-grid">
        <article class="points-copy">
          <CircleHelp :size="16" aria-hidden="true" />
          <div>
            <h4>Ballot points</h4>
            <p>
              Every selected team scores 3 points per win, 1 point per non-shootout goal scored, 1 point for reaching the semifinal, and 1 point for reaching the final. Goals against are still shown in the breakdown, but they do not remove points. A penalty-shootout winner receives the 3 win points, but shootout goals never count. There are no tier bonuses.
            </p>
          </div>
        </article>

        <article class="points-copy">
          <CircleHelp :size="16" aria-hidden="true" />
          <div>
            <h4>Group and knockout Pick'em</h4>
            <p>
              Group table Pick'em gives 1 point per exact group position, up to {{ GROUP_POSITION_PICKEM_MAX_POINTS }}. Knockout Pick'em gives 1 point for each correct winner after the result is known.
            </p>
          </div>
        </article>
      </div>

    </section>
  </section>
</template>

<style scoped>
.how-guide {
  display: grid;
  gap: 0.9rem;
  min-width: 0;
  padding: 0.3rem 0 0.8rem;
}

.how-guide.is-standalone {
  margin: 0 auto;
  max-width: var(--page-max);
  min-height: 100vh;
  padding: 1rem;
  width: 100%;
}

.guide-hero {
  align-items: start;
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1fr) minmax(12rem, 18rem);
}

.guide-hero-copy {
  display: grid;
  gap: 0.28rem;
}

.guide-compact-heading {
  display: grid;
  gap: 0.32rem;
  max-width: 62rem;
}

.guide-compact-heading h3,
.guide-compact-heading p {
  margin: 0;
}

.guide-compact-heading h3 {
  color: var(--text);
  font-size: 1.25rem;
  line-height: 1.08;
}

.guide-compact-heading p {
  color: var(--muted);
  font-size: 0.98rem;
  font-weight: 760;
  line-height: 1.48;
}

.guide-hero h1,
.guide-hero h2,
.guide-hero p {
  margin: 0;
}

.guide-hero h1,
.guide-hero h2 {
  color: var(--text);
  font-style: italic;
  font-weight: 950;
  line-height: 0.96;
  text-transform: uppercase;
}

.guide-hero h1 {
  font-size: clamp(2.2rem, 6vw, 4.8rem);
}

.guide-hero h2 {
  font-size: clamp(1.7rem, 4vw, 2.8rem);
}

.guide-hero-copy p:not(.eyebrow) {
  color: var(--muted);
  font-size: 1rem;
  font-weight: 780;
  line-height: 1.5;
  max-width: 54rem;
}

.guide-score {
  align-items: start;
  background: var(--data-well);
  border-left: 0.24rem solid var(--gold);
  border-radius: var(--radius);
  color: var(--text-invert);
  display: grid;
  gap: 0.18rem;
  grid-template-columns: auto minmax(0, 1fr);
  padding: 0.8rem;
}

.guide-score svg {
  color: var(--gold);
  grid-row: span 2;
}

.guide-score strong,
.guide-score span {
  min-width: 0;
}

.guide-score span {
  color: rgba(255, 248, 232, 0.72);
  font-size: 0.9rem;
  font-weight: 760;
}

.guide-quick-list {
  display: grid;
  gap: 0.55rem;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.quick-item {
  align-items: start;
  background: rgba(255, 250, 240, 0.64);
  border: 1px solid rgba(22, 21, 17, 0.12);
  border-radius: var(--radius);
  display: grid;
  gap: 0.52rem;
  grid-template-columns: auto minmax(0, 1fr);
  padding: 0.72rem;
}

.quick-item svg {
  color: var(--accent-strong);
}

.quick-item h3,
.quick-item p {
  margin: 0;
}

.quick-item h3 {
  color: var(--text);
  font-size: 0.94rem;
  line-height: 1.1;
}

.quick-item p {
  color: var(--muted);
  font-size: 0.9rem;
  font-weight: 740;
  line-height: 1.38;
}

.guide-section {
  display: grid;
  gap: 0.65rem;
  min-width: 0;
}

.guide-section .section-heading h3 {
  color: var(--text);
  font-size: 1.14rem;
  margin: 0;
}

.screenshot-list {
  display: grid;
  gap: 0.7rem;
}

.screenshot-step {
  align-items: start;
  display: grid;
  gap: 0.85rem;
  grid-template-columns: minmax(16rem, 0.95fr) minmax(0, 1fr);
}

.screenshot-step figure {
  background: rgba(255, 250, 240, 0.7);
  border-radius: var(--radius);
  margin: 0;
  min-width: 0;
  overflow: hidden;
  outline: 1px solid rgba(22, 21, 17, 0.1);
  outline-offset: -1px;
}

.screenshot-step img {
  display: block;
  height: auto;
  width: 100%;
}

.screenshot-copy {
  align-content: start;
  display: grid;
  gap: 0.32rem;
  min-width: 0;
  padding-top: 0.2rem;
}

.screenshot-copy span {
  background: var(--red);
  border-radius: 999px;
  color: #fff8e8;
  font-size: 0.8rem;
  font-weight: 950;
  justify-self: start;
  padding: 0.25rem 0.45rem;
}

.screenshot-copy h4,
.screenshot-copy p {
  margin: 0;
}

.screenshot-copy h4 {
  color: var(--text);
  font-size: 1.08rem;
  line-height: 1.16;
}

.screenshot-copy p {
  color: var(--text);
  font-size: 0.98rem;
  font-weight: 740;
  line-height: 1.5;
}

.screenshot-copy .watch-note {
  color: var(--text);
  font-style: italic;
  font-weight: 950;
  text-decoration: underline;
  text-decoration-thickness: 0.08em;
  text-underline-offset: 0.18em;
}

.points-grid {
  display: grid;
  gap: 0.6rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.score-formula {
  align-items: baseline;
  background: rgba(255, 250, 240, 0.7);
  border: 1px solid rgba(22, 21, 17, 0.12);
  border-radius: var(--radius);
  display: grid;
  gap: 0.3rem;
  grid-template-columns: auto minmax(0, 1fr);
  padding: 0.72rem 0.8rem;
}

.score-formula span {
  color: var(--red);
  font-size: 0.78rem;
  font-weight: 950;
  text-transform: uppercase;
}

.score-formula strong {
  color: var(--text);
  font-size: 0.98rem;
  line-height: 1.35;
}

.ballot-score-grid {
  display: grid;
  gap: 0.55rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.score-token {
  align-items: start;
  background: rgba(255, 250, 240, 0.62);
  border: 1px solid rgba(22, 21, 17, 0.12);
  border-radius: var(--radius);
  display: grid;
  gap: 0.55rem;
  grid-template-columns: auto minmax(0, 1fr);
  min-width: 0;
  padding: 0.68rem;
}

.score-token > strong {
  background: var(--data-well);
  border-radius: 999px;
  color: var(--gold);
  font-size: 0.88rem;
  font-weight: 950;
  min-width: 2.35rem;
  padding: 0.22rem 0.4rem;
  text-align: center;
}

.score-token h4,
.score-token p {
  margin: 0;
}

.score-token h4 {
  color: var(--text);
  font-size: 0.94rem;
  line-height: 1.12;
}

.score-token p {
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 730;
  line-height: 1.36;
}

.points-copy {
  align-items: start;
  background: var(--data-well);
  border-radius: var(--radius);
  color: var(--text-invert);
  display: grid;
  gap: 0.52rem;
  grid-template-columns: auto minmax(0, 1fr);
  padding: 0.78rem;
}

.points-copy svg {
  color: var(--gold);
}

.points-copy h4,
.points-copy p {
  margin: 0;
}

.points-copy h4 {
  color: var(--text-invert);
  font-size: 1rem;
}

.points-copy p {
  color: rgba(255, 248, 232, 0.74);
  font-size: 0.94rem;
  font-weight: 750;
  line-height: 1.45;
}

.special-rules {
  background: rgba(255, 250, 240, 0.6);
  border: 1px solid rgba(22, 21, 17, 0.12);
  border-radius: var(--radius);
  color: var(--text);
  overflow: hidden;
}

.special-rules summary {
  align-items: center;
  cursor: pointer;
  display: flex;
  gap: 0.5rem;
  justify-content: space-between;
  list-style: none;
  padding: 0.7rem 0.8rem;
}

.special-rules summary::-webkit-details-marker {
  display: none;
}

.special-rules summary span {
  color: var(--text);
  font-size: 0.88rem;
  font-weight: 950;
  text-transform: uppercase;
}

.special-rules summary svg {
  color: var(--red);
  flex: 0 0 auto;
}

.special-rules[open] summary svg {
  transform: rotate(180deg);
}

.special-rules-body {
  border-top: 1px solid rgba(22, 21, 17, 0.1);
  display: grid;
  gap: 0.62rem;
  padding: 0 0.8rem 0.8rem;
}

.special-rules-body p {
  color: var(--muted);
  font-size: 0.94rem;
  font-weight: 760;
  line-height: 1.44;
  margin: 0;
}

.special-team-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.48rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.special-team {
  align-items: center;
  background: var(--data-well);
  border-radius: 999px;
  color: var(--text-invert);
  display: inline-flex;
  gap: 0.42rem;
  min-width: 0;
  padding: 0.34rem 0.58rem 0.34rem 0.36rem;
}

.special-team span {
  font-size: 0.9rem;
  font-weight: 900;
  line-height: 1.15;
}

.stage-table-wrap {
  overflow-x: auto;
}

.stage-table {
  background: rgba(255, 250, 240, 0.66);
  border-collapse: collapse;
  border-radius: var(--radius);
  overflow: hidden;
  width: 100%;
}

.stage-table th,
.stage-table td {
  border-bottom: 1px solid rgba(22, 21, 17, 0.12);
  padding: 0.58rem 0.7rem;
  text-align: left;
  white-space: nowrap;
}

.stage-table th {
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 950;
}

.stage-table td {
  color: var(--text);
  font-size: 0.92rem;
  font-weight: 830;
}

.stage-table tr:last-child td {
  border-bottom: 0;
}

@media (max-width: 980px) {
  .guide-hero,
  .screenshot-step,
  .points-grid,
  .score-formula {
    grid-template-columns: 1fr;
  }

  .ballot-score-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .guide-quick-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .how-guide.is-standalone {
    padding: 0.75rem;
  }

  .guide-quick-list {
    grid-template-columns: 1fr;
  }

  .ballot-score-grid {
    grid-template-columns: 1fr;
  }

  .screenshot-step {
    gap: 0.55rem;
  }
}
</style>
