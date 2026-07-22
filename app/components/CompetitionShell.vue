<script setup lang="ts">
import { computed, nextTick, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import type {
  CompetitionViewDto,
  EntryDto,
  KnockoutPickemStateDto,
  PoolDto,
  QuestionDto,
  TeamDto
} from '../../shared/types'

interface Props {
  pool: PoolDto
  predictionDeadline: string
  isLocked: boolean
  isPublic: boolean
  isLateEntry: boolean
  questions: QuestionDto[]
  teams: TeamDto[]
  entries: EntryDto[]
  editableEntries: EntryDto[]
  knockoutPickem: KnockoutPickemStateDto
  competition: CompetitionViewDto
}

interface Emits {
  saved: []
}

interface CompetitionPage {
  id: 'picks' | 'rankings' | 'matches' | 'predictions' | 'scoring'
  label: string
  kicker: string
  summary: string
  description: string
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const pageScroll = useTemplateRef<HTMLElement>('pageScroll')
const activePageId = shallowRef<CompetitionPage['id']>('rankings')

const rankings = computed(() => props.competition.rankings)
const predictions = computed(() => props.competition.predictions)
const isTournamentComplete = computed(() => props.competition.status.isTournamentComplete)
const lastRanking = computed(() => rankings.value.at(-1) ?? null)
const openPickemWindow = computed(() => props.knockoutPickem.windows.find((window) => window.isOpen) ?? null)
const matchWindow = computed(() => openPickemWindow.value
  ?? props.knockoutPickem.activeWindow
  ?? props.knockoutPickem.windows.at(-1)
  ?? null)
const needsBallotSelection = computed(() => !props.isPublic && !props.isLocked)
const needsSelection = computed(() => !isTournamentComplete.value && (needsBallotSelection.value || Boolean(openPickemWindow.value)))
const defaultPageId = computed<CompetitionPage['id']>(() => needsSelection.value ? 'picks' : 'rankings')
const pages = computed<CompetitionPage[]>(() => {
  const items: CompetitionPage[] = [
    {
      id: 'picks',
      label: 'Picks',
      kicker: needsSelection.value ? 'Action' : props.isPublic ? 'Revealed' : 'Ballots',
      summary: pickPageSummary.value,
      description: pickPageDescription.value
    },
    {
      id: 'rankings',
      label: 'Rankings',
      kicker: isTournamentComplete.value ? 'Final' : props.isPublic ? 'Live' : props.isLocked ? 'Waiting' : 'Tracking',
      summary: isTournamentComplete.value ? 'Winner podium' : props.isPublic ? 'Table and pulse' : 'Names and reveal status',
      description: isTournamentComplete.value
        ? 'The final podium and full rankings stay together here.'
        : props.isPublic
        ? "League pulse, table pressure, and the current race stay together here."
        : props.isLocked
          ? "When picks are locked and everyone is waiting, this is the default view."
          : "Submitted names and league pulse stay here while selections are still open."
    }
  ]

  if (props.knockoutPickem.enabled) {
    items.push({
      id: 'matches',
      label: 'Matches',
      kicker: 'Knockout',
      summary: matchPageSummary.value,
      description: "See the latest Pick'em round by match, team, and visible supporter emojis."
    })
  }

  items.push(
    {
      id: 'predictions',
      label: 'Predictions',
      kicker: props.isPublic ? 'Revealed' : 'Hidden',
      summary: props.isPublic ? 'Who picked what' : 'Reveal timing',
      description: props.isPublic
        ? "Compare every visible ballot without leaving the competition."
        : "Picks remain private until the reveal opens."
    },
    {
      id: 'scoring',
      label: 'Scoring',
      kicker: 'Rules',
      summary: 'Points and Pick’em',
      description: "See how ballot teams, group Pick'em, and knockout Pick'em add to the table."
    }
  )

  return items
})
const activePageIndex = computed(() => Math.max(0, pages.value.findIndex((page) => page.id === activePageId.value)))
const activePage = computed(() => pages.value[activePageIndex.value] ?? pages.value[0])
const canMoveBackward = computed(() => activePageIndex.value > 0)
const canMoveForward = computed(() => activePageIndex.value < pages.value.length - 1)
const pickPageSummary = computed(() => {
  if (isTournamentComplete.value) {
    return 'Closed'
  }

  if (openPickemWindow.value) {
    return `${openPickemWindow.value.label} open`
  }

  if (needsBallotSelection.value) {
    return 'Ballot open'
  }

  if (props.isPublic) {
    return props.isLateEntry ? 'Managed entries' : 'Revealed'
  }

  return 'Locked'
})
const pickPageDescription = computed(() => {
  if (isTournamentComplete.value) {
    return 'The tournament is complete, so final rankings stay first.'
  }

  if (openPickemWindow.value) {
    return "A pick'em window is open, so selections stay first."
  }

  if (needsBallotSelection.value) {
    return 'Ballots are open, so making an entry stays first.'
  }

  if (props.isPublic) {
    return props.isLateEntry
      ? 'The beta entries are managed by the organizer after play has started.'
      : 'The league is revealed, but play has not started yet.'
  }

  return 'Ballots are locked; use this page only to review entry state.'
})
const matchPageSummary = computed(() => {
  if (!matchWindow.value) {
    return 'Waiting for fixtures'
  }

  if (matchWindow.value.isOpen) {
    return `${matchWindow.value.label} open`
  }

  return matchWindow.value.isRevealed ? `${matchWindow.value.label} revealed` : `${matchWindow.value.label} locked`
})

watch(defaultPageId, (pageId) => {
  selectPage(pageId, 'auto')
}, { immediate: true })

onMounted(() => {
  selectPage(defaultPageId.value, 'auto')
})

function selectPage(pageId: CompetitionPage['id'], behavior: ScrollBehavior = 'smooth') {
  const canUseDomScroll = typeof window !== 'undefined'

  if (!canUseDomScroll || behavior === 'auto') {
    activePageId.value = pageId
  }

  if (!canUseDomScroll) {
    return
  }

  void nextTick(() => {
    window.requestAnimationFrame(() => {
      scrollPageTo(pageId, behavior)
    })

    if (behavior === 'auto') {
      window.setTimeout(() => scrollPageTo(pageId, behavior), 80)
      window.setTimeout(() => scrollPageTo(pageId, behavior), 240)
    }
  })
}

function scrollPageTo(pageId: CompetitionPage['id'], behavior: ScrollBehavior) {
  const container = pageScroll.value
  const panel = container?.querySelector<HTMLElement>(`[data-competition-page="${pageId}"]`)

  if (!container || !panel) {
    activePageId.value = pageId
    return
  }

  const left = panel.offsetLeft - container.offsetLeft

  if (behavior === 'auto') {
    container.scrollLeft = left
  }

  container.scrollTo({
    left,
    behavior
  })

  if (behavior === 'auto') {
    activePageId.value = pageId
  }
}

function movePage(delta: -1 | 1) {
  const nextPage = pages.value[activePageIndex.value + delta]

  if (nextPage) {
    selectPage(nextPage.id)
  }
}

function syncActivePageFromScroll() {
  const container = pageScroll.value

  if (!container) {
    return
  }

  const panels = [...container.querySelectorAll<HTMLElement>('[data-competition-page]')]
  const nearestPanel = panels
    .map((panel) => ({
      panel,
      distance: Math.abs(panel.offsetLeft - container.offsetLeft - container.scrollLeft)
    }))
    .sort((first, second) => first.distance - second.distance)[0]?.panel
  const pageId = nearestPanel?.dataset.competitionPage as CompetitionPage['id'] | undefined

  if (pageId && pageId !== activePageId.value) {
    activePageId.value = pageId
  }
}
</script>

<template>
  <main class="league-page">
    <LeagueHero
      :pool="props.pool"
      :prediction-deadline="props.predictionDeadline"
      :is-locked="props.isLocked"
      :is-public="props.isPublic"
    />

    <section class="competition-pager" aria-label="Competition pages">
      <div class="pager-toolbar">
        <button
          class="pager-arrow"
          type="button"
          :disabled="!canMoveBackward"
          aria-label="Previous competition page"
          @click="movePage(-1)"
        >
          <ChevronLeft :size="18" aria-hidden="true" />
        </button>

        <nav class="page-tabs" aria-label="Competition page selector">
          <button
            v-for="page in pages"
            :key="page.id"
            class="page-tab"
            :class="{ 'is-active': page.id === activePageId }"
            type="button"
            :aria-current="page.id === activePageId ? 'page' : undefined"
            @click="selectPage(page.id)"
          >
            <span class="tab-copy">
              <strong>{{ page.label }}</strong>
              <span>{{ page.summary }}</span>
            </span>
          </button>
        </nav>

        <button
          class="pager-arrow"
          type="button"
          :disabled="!canMoveForward"
          aria-label="Next competition page"
          @click="movePage(1)"
        >
          <ChevronRight :size="18" aria-hidden="true" />
        </button>
      </div>

      <div v-if="activePage" class="page-cue" aria-live="polite">
        <span>{{ activePage.kicker }}</span>
        <strong>{{ activePage.label }}</strong>
        <p>{{ activePage.description }}</p>
      </div>

      <div class="page-dots" aria-hidden="true">
        <span
          v-for="page in pages"
          :key="page.id"
          :class="{ 'is-active': page.id === activePageId }"
        />
      </div>

      <div
        ref="pageScroll"
        class="page-track"
        :class="{ 'is-final-default': isTournamentComplete }"
        @scroll.passive="syncActivePageFromScroll"
      >
        <section class="competition-page-panel" data-competition-page="picks" aria-labelledby="competition-picks-page">
          <div class="page-panel-heading">
            <p class="eyebrow">Selection desk</p>
            <h2 id="competition-picks-page">Picks</h2>
          </div>

          <div class="panel-flow">
            <LeagueEntryCard
              v-if="!props.isPublic"
              :questions="props.questions"
              :teams="props.teams"
              :pool-code="props.pool.code"
              :pool-title="props.pool.title"
              :pool-image-data-url="props.pool.imageDataUrl"
              :is-locked="props.isLocked"
              :is-public="props.isPublic"
              :is-late-entry="props.isLateEntry"
              :editable-entries="props.editableEntries"
              @saved="emit('saved')"
            />

            <KnockoutPickemPanel
              v-if="props.knockoutPickem.enabled"
              :pool-code="props.pool.code"
              :teams="props.teams"
              :entries="props.entries"
              :editable-entries="props.editableEntries"
              :knockout-pickem="props.knockoutPickem"
              :is-late-entry="props.isLateEntry"
              @saved="emit('saved')"
            />

            <LeagueEntryCard
              v-if="props.isPublic"
              :questions="props.questions"
              :teams="props.teams"
              :pool-code="props.pool.code"
              :pool-title="props.pool.title"
              :pool-image-data-url="props.pool.imageDataUrl"
              :is-locked="props.isLocked"
              :is-public="props.isPublic"
              :is-late-entry="props.isLateEntry"
              :editable-entries="props.editableEntries"
              @saved="emit('saved')"
            />
          </div>
        </section>

        <section
          class="competition-page-panel"
          data-competition-page="rankings"
          aria-labelledby="competition-rankings-page"
        >
          <div class="page-panel-heading">
            <p class="eyebrow">Table view</p>
            <h2 id="competition-rankings-page">Rankings</h2>
          </div>

          <div class="panel-flow">
            <LeagueWinnerPodium
              v-if="isTournamentComplete"
              :entries="props.competition.winnerPodium"
              :last-entry="lastRanking"
            />
            <LeagueBattles
              v-if="!isTournamentComplete"
              :battles="props.competition.battles"
              :is-public="props.isPublic"
            />
            <LeagueCollisionSchedule
              v-if="!isTournamentComplete"
              :collisions="props.competition.collisions"
              :is-public="props.isPublic"
            />
            <div class="ranking-flow" :class="{ 'is-final': isTournamentComplete }">
              <LeagueMoments
                v-if="!isTournamentComplete"
                :moments="props.competition.moments"
                :is-public="props.isPublic"
              />
              <LeagueRankingBoard :rows="rankings" :is-public="props.isPublic" />
            </div>
          </div>
        </section>

        <section
          v-if="props.knockoutPickem.enabled"
          class="competition-page-panel"
          data-competition-page="matches"
          aria-labelledby="competition-matches-page"
        >
          <div class="page-panel-heading">
            <p class="eyebrow">Round view</p>
            <h2 id="competition-matches-page">Matches</h2>
          </div>

          <div class="panel-flow">
            <LeagueMatchesPanel
              :window="matchWindow"
              :support="props.competition.support"
              :is-public="props.isPublic"
            />
          </div>
        </section>

        <section class="competition-page-panel" data-competition-page="predictions" aria-labelledby="competition-predictions-page">
          <div class="page-panel-heading">
            <p class="eyebrow">Reveal room</p>
            <h2 id="competition-predictions-page">Predictions</h2>
          </div>

          <div class="panel-flow">
            <LeaguePredictionReveal
              :rows="predictions"
              :is-public="props.isPublic"
              :prediction-deadline="props.predictionDeadline"
              :entries="props.entries"
              :teams="props.teams"
              :knockout-pickem="props.knockoutPickem"
              :knockout-pickem-start-round="props.pool.knockoutPickemStartRound"
            />
          </div>
        </section>

        <section class="competition-page-panel" data-competition-page="scoring" aria-labelledby="competition-scoring-page">
          <div class="page-panel-heading">
            <p class="eyebrow">Rules</p>
            <h2 id="competition-scoring-page">Scoring system</h2>
          </div>

          <div class="panel-flow">
            <HowItWorksGuide context="league" />
          </div>
        </section>
      </div>
    </section>
  </main>
</template>

<style scoped>
.league-page {
  background: transparent;
  display: grid;
  gap: 0.45rem;
  margin: 0 auto;
  max-width: var(--page-max);
  min-height: 100vh;
  min-width: 0;
  padding: 1rem;
  width: 100%;
}

.competition-pager {
  display: grid;
  gap: 0.65rem;
  min-width: 0;
  padding: 0.1rem 0 1rem;
}

.pager-toolbar {
  align-items: stretch;
  display: grid;
  gap: 0.45rem;
  grid-template-columns: auto minmax(0, 1fr) auto;
  min-width: 0;
  position: sticky;
  top: 0.35rem;
  z-index: 5;
}

.pager-arrow {
  background: rgba(255, 250, 240, 0.86);
  border: 1px solid var(--line);
  color: var(--text);
  min-height: 3.25rem;
  padding: 0.45rem;
  width: 3rem;
}

.page-tabs {
  background: rgba(255, 250, 240, 0.76);
  border: 1px solid rgba(22, 21, 17, 0.1);
  border-radius: var(--radius);
  display: flex;
  gap: 0.35rem;
  min-width: 0;
  overflow-x: auto;
  padding: 0.28rem;
  scrollbar-width: thin;
}

.page-tab {
  background: transparent;
  color: var(--muted);
  flex: 1 0 min(11rem, 72vw);
  justify-content: start;
  min-height: 3rem;
  padding: 0.52rem 0.68rem;
  text-align: left;
}

.page-tab.is-active {
  background: rgba(17, 24, 20, 0.92);
  color: var(--text-invert);
}

.tab-copy {
  display: grid;
  gap: 0.05rem;
  min-width: 0;
}

.tab-copy strong,
.tab-copy span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-copy strong {
  color: inherit;
  font-size: 0.94rem;
}

.tab-copy span {
  color: currentColor;
  font-size: 0.78rem;
  font-weight: 780;
  opacity: 0.76;
}

.page-cue {
  align-items: baseline;
  background:
    linear-gradient(90deg, rgba(255, 250, 240, 0.84), rgba(255, 250, 240, 0.36)),
    transparent;
  border-left: 0.24rem solid var(--accent);
  border-radius: var(--radius);
  color: var(--text);
  display: grid;
  gap: 0.22rem 0.65rem;
  grid-template-columns: auto auto minmax(0, 1fr);
  padding: 0.62rem 0.72rem;
}

.page-cue span {
  color: var(--red);
  font-size: 0.76rem;
  font-weight: 950;
  text-transform: uppercase;
}

.page-cue strong {
  color: var(--text);
  font-size: 1rem;
}

.page-cue p {
  color: var(--muted);
  font-size: 0.94rem;
  font-weight: 760;
  margin: 0;
}

.page-dots {
  display: flex;
  gap: 0.32rem;
  justify-content: center;
}

.page-dots span {
  background: rgba(17, 24, 20, 0.24);
  border-radius: 999px;
  height: 0.32rem;
  width: 1.15rem;
}

.page-dots span.is-active {
  background: var(--gold);
  width: 2.2rem;
}

.page-track {
  display: flex;
  gap: 0;
  min-width: 0;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.page-track::-webkit-scrollbar {
  display: none;
}

.competition-page-panel {
  flex: 0 0 100%;
  min-width: 100%;
  padding: 0.1rem 0.1rem 0.5rem;
  scroll-snap-align: start;
}

.page-track.is-final-default .competition-page-panel[data-competition-page="rankings"] {
  order: -1;
}

.page-panel-heading {
  align-items: baseline;
  display: flex;
  gap: 0.65rem;
  justify-content: space-between;
  padding: 0.2rem 0 0.45rem;
}

.page-panel-heading h2,
.page-panel-heading p {
  margin: 0;
}

.page-panel-heading h2 {
  color: var(--text);
  font-size: 1.05rem;
  line-height: 1;
}

.panel-flow {
  display: grid;
  gap: 0.7rem;
  min-width: 0;
}

.ranking-flow {
  display: grid;
  gap: 0.7rem;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.35fr);
  min-width: 0;
}

.ranking-flow.is-final {
  grid-template-columns: 1fr;
}

@media (max-width: 980px) {
  .league-page {
    max-width: 100vw;
    overflow-x: hidden;
    padding: 0.75rem;
  }

  .league-page > * {
    max-width: 100%;
    width: 100%;
  }

  .ranking-flow {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .pager-toolbar {
    gap: 0.32rem;
  }

  .pager-arrow {
    min-height: 3rem;
    width: 2.7rem;
  }

  .page-tab {
    flex-basis: min(10rem, 68vw);
  }

  .page-cue {
    align-items: start;
    grid-template-columns: 1fr;
  }
}
</style>
