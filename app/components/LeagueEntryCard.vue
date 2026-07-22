<script setup lang="ts">
import { ChevronDown, ChevronUp, SquarePen } from '@lucide/vue'
import type { EntryDto, QuestionDto, TeamDto } from '../../shared/types'

interface Props {
  questions: QuestionDto[]
  teams: TeamDto[]
  poolCode: string
  poolTitle: string
  poolImageDataUrl?: string | null
  isLocked: boolean
  isPublic: boolean
  isLateEntry: boolean
  editableEntries: EntryDto[]
}

interface Emits {
  saved: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isExpanded = shallowRef(!props.isPublic)
const entryOpenRequest = shallowRef(0)

const eyebrow = computed(() => props.isPublic ? 'Revealed' : 'Your entry')
const title = computed(() => props.isPublic ? 'Picks are revealed' : 'Choose your four teams')
const helperText = computed(() => {
  if (props.isLateEntry) {
    return 'The tournament is underway. Follow your saved teams and the next Pick’em window here.'
  }

  if (props.isPublic) {
    return 'Predictions are public now. Check the table and follow the race.'
  }

  return 'Your connected wallet can create and edit only your own prediction.'
})
const actionLabel = computed(() => {
  if (isExpanded.value) {
    return 'Collapse'
  }

  return 'Open my picks'
})

async function toggleEntryCard() {
  isExpanded.value = !isExpanded.value

  if (isExpanded.value && !props.isLocked) {
    await nextTick()
    entryOpenRequest.value += 1
  }
}
</script>

<template>
  <section
    class="league-entry-card"
    :class="{ 'is-primary': !props.isPublic, 'is-late': props.isLateEntry, 'is-collapsed': !isExpanded }"
    aria-labelledby="picks-title"
  >
    <div class="entry-card-heading">
      <div class="section-heading">
        <p class="eyebrow">{{ eyebrow }}</p>
        <h2 id="picks-title">{{ title }}</h2>
        <p class="muted">{{ helperText }}</p>
      </div>
      <button
        class="entry-toggle"
        type="button"
        :aria-expanded="isExpanded"
        :aria-controls="`entry-panel-${props.poolCode}`"
        @click="toggleEntryCard"
      >
        <SquarePen v-if="!isExpanded" :size="16" aria-hidden="true" />
        <ChevronUp v-else :size="16" aria-hidden="true" />
        {{ actionLabel }}
        <ChevronDown v-if="!isExpanded" :size="16" aria-hidden="true" />
      </button>
    </div>

    <div v-if="isExpanded" :id="`entry-panel-${props.poolCode}`" class="entry-card-body">
      <MyPicksPanel
        :questions="props.questions"
        :teams="props.teams"
        :pool-code="props.poolCode"
        :pool-title="props.poolTitle"
        :pool-image-data-url="props.poolImageDataUrl"
        :is-locked="props.isLocked"
        :is-late-entry="props.isLateEntry"
        :editable-entries="props.editableEntries"
        :entry-open-request="entryOpenRequest"
        @saved="emit('saved')"
      />
    </div>
  </section>
</template>

<style scoped>
.league-entry-card {
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  display: grid;
  gap: 0.65rem;
  min-width: 0;
  padding: 0.25rem 0;
}

.league-entry-card.is-primary {
  padding-top: 0.5rem;
}

.league-entry-card.is-primary .entry-card-heading {
  background: rgba(17, 24, 20, 0.82);
  border-left: 0.24rem solid var(--gold);
  border-radius: var(--radius);
  padding: 0.85rem;
}

.league-entry-card.is-late {
  margin-top: 0.35rem;
}

.league-entry-card.is-late .entry-card-heading {
  background: rgba(17, 24, 20, 0.74);
  border-left: 0.24rem solid rgba(244, 176, 0, 0.72);
  border-radius: var(--radius);
  padding: 0.78rem;
}

.entry-card-heading {
  align-items: start;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  min-width: 0;
}

.entry-card-heading .section-heading h2 {
  color: var(--text-invert);
}

.entry-card-heading .section-heading .muted {
  color: rgba(255, 248, 232, 0.74);
}

.entry-toggle {
  background: var(--gold);
  border: 0;
  color: #1f1606;
  flex: 0 0 auto;
  white-space: nowrap;
}

.entry-card-body {
  min-width: 0;
}

@media (max-width: 640px) {
  .entry-card-heading {
    display: grid;
  }

  .entry-toggle {
    width: 100%;
  }
}
</style>
