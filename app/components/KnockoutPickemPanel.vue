<script setup lang="ts">
import { computed, reactive, shallowRef, watch } from 'vue'
import { Send, Swords } from '@lucide/vue'
import { buildKnockoutMatchViews } from '#shared/knockout-pickem-display'
import type { EntryDto, KnockoutPickemStateDto, KnockoutPickemWindowDto, TeamDto } from '../../shared/types'
import KnockoutPickemBracketBoard from './KnockoutPickemBracketBoard.vue'

interface Props {
  poolCode: string
  teams: TeamDto[]
  entries: EntryDto[]
  editableEntries: EntryDto[]
  knockoutPickem: KnockoutPickemStateDto
  isLateEntry?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ saved: [] }>()
const displayName = shallowRef('')
const message = shallowRef('')
const error = shallowRef('')
const isSaving = shallowRef(false)
const savedEntry = shallowRef<EntryDto | null>(null)
const winnerByFixtureId = reactive<Record<number, string>>({})
const ownEntry = computed(() => savedEntry.value ?? props.editableEntries[0] ?? null)
const openWindow = computed(() => props.knockoutPickem.windows.find((window) => window.isOpen) ?? null)
const openMatches = computed(() => openWindow.value
  ? buildKnockoutMatchViews(openWindow.value.fixtures, winnerByFixtureId)
  : [])
const statusLabel = computed(() => openWindow.value
  ? `${openWindow.value.label} open`
  : props.knockoutPickem.status === 'locked' ? 'Locked' : 'Pending')
const lockLabel = computed(() => openWindow.value
  ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(openWindow.value.lockAt))
  : '')
const identity = computed(() => ownEntry.value?.displayName ?? displayName.value.trim())
const canSubmit = computed(() => Boolean(openWindow.value
  && identity.value.length >= 2
  && openWindow.value.fixtures.every((fixture) => winnerByFixtureId[fixture.fixtureId])))

watch([openWindow, ownEntry], ([window, entry]) => resetSelections(window, entry), { immediate: true })

async function submitPicks() {
  const window = openWindow.value
  if (!window || !canSubmit.value) return
  isSaving.value = true
  error.value = ''
  message.value = ''
  try {
    const response = await $fetch<{ entry: EntryDto }>(`/api/pools/${props.poolCode}/pickem`, {
      method: 'POST',
      body: {
        displayName: identity.value,
        picks: window.fixtures.map((fixture) => ({
          fixtureId: fixture.fixtureId,
          winnerTeamSlug: winnerByFixtureId[fixture.fixtureId]
        }))
      }
    })
    savedEntry.value = response.entry
    applyEntryPicks(response.entry, window)
    message.value = "Your Pick'em is saved to this wallet."
    emit('saved')
  } catch (cause) {
    error.value = typeof cause === 'object' && cause && 'statusMessage' in cause
      ? String(cause.statusMessage)
      : 'Choose every winner and try again before the round locks.'
  } finally {
    isSaving.value = false
  }
}

function resetSelections(window: KnockoutPickemWindowDto | null, entry: EntryDto | null) {
  for (const fixtureId of Object.keys(winnerByFixtureId)) delete winnerByFixtureId[Number(fixtureId)]
  if (window && entry) applyEntryPicks(entry, window)
}

function applyEntryPicks(entry: EntryDto, window: KnockoutPickemWindowDto) {
  for (const fixture of window.fixtures) {
    winnerByFixtureId[fixture.fixtureId] = entry.knockoutPicks.find((pick) => pick.fixtureId === fixture.fixtureId)?.winnerTeamSlug ?? ''
  }
}

function setFixtureWinner(payload: { fixtureId: number; teamSlug: string }) {
  winnerByFixtureId[payload.fixtureId] = payload.teamSlug
  error.value = ''
  message.value = ''
}
</script>

<template>
  <section class="pickem-panel" aria-labelledby="pickem-title">
    <div class="pickem-heading">
      <div class="section-heading">
        <p class="eyebrow">Knockout Pick'em</p>
        <h2 id="pickem-title">Bracket winners</h2>
        <p class="muted">{{ props.knockoutPickem.reason }}</p>
      </div>
      <span class="pickem-status"><Swords :size="16" aria-hidden="true" />{{ statusLabel }}</span>
    </div>

    <p v-if="message" class="status success" role="status">{{ message }}</p>
    <p v-if="error" class="status error" role="alert">{{ error }}</p>

    <div v-if="openWindow" class="pickem-open">
      <div class="round-topline"><strong>{{ openWindow.label }}</strong><span>Locks at {{ lockLabel }}</span></div>
      <form class="pickem-form" @submit.prevent="submitPicks">
        <div class="identity-card">
          <template v-if="ownEntry">
            <span>Your league entry</span><strong>{{ ownEntry.displayName }}</strong>
          </template>
          <label v-else for="pickem-display-name">League table name</label>
          <input v-if="!ownEntry" id="pickem-display-name" v-model="displayName" class="input" name="displayName" autocomplete="name" placeholder="Your nickname" required>
        </div>

        <KnockoutPickemBracketBoard
          :label="openWindow.label"
          :matches="openMatches"
          :teams="props.teams"
          mode="select"
          :disabled="isSaving"
          @select-winner="setFixtureWinner"
        />

        <div class="pickem-actions">
          <span>Only this wallet’s entry will be changed.</span>
          <button class="btn-primary" type="submit" :disabled="isSaving || !canSubmit">
            <Send :size="18" aria-hidden="true" />{{ isSaving ? 'Saving…' : 'Save winners' }}
          </button>
        </div>
      </form>
    </div>
    <p v-else class="pickem-pending">{{ props.knockoutPickem.reason }}</p>
  </section>
</template>

<style scoped>
.pickem-panel { display: grid; gap: 0.75rem; padding: 0.3rem 0; }
.pickem-heading,
.round-topline,
.pickem-actions { align-items: center; display: flex; gap: 0.8rem; justify-content: space-between; }
.pickem-status { align-items: center; background: var(--gold); color: #1f1606; display: inline-flex; flex: 0 0 auto; font-size: 0.84rem; font-weight: 950; gap: 0.35rem; padding: 0.36rem 0.56rem; }
.pickem-open,
.pickem-pending { background: var(--data-well); color: var(--text-invert); display: grid; gap: 0.72rem; padding: 0.85rem; }
.round-topline strong { color: var(--gold); }
.round-topline span,
.pickem-pending,
.pickem-actions > span { color: rgba(255, 248, 232, 0.7); font-size: 0.86rem; font-weight: 760; }
.pickem-form { display: grid; gap: 0.75rem; }
.identity-card { align-items: center; background: rgba(255, 248, 232, 0.08); display: flex; flex-wrap: wrap; gap: 0.45rem 0.75rem; max-width: 36rem; padding: 0.75rem; }
.identity-card span,
.identity-card label { color: rgba(255, 248, 232, 0.7); font-size: 0.82rem; font-weight: 800; }
.identity-card strong { color: var(--gold); }
.identity-card .input { flex: 1 1 15rem; }
@media (max-width: 760px) {
  .pickem-heading,
  .round-topline,
  .pickem-actions { align-items: stretch; display: grid; }
  .pickem-status,
  .pickem-actions .btn-primary { width: 100%; }
  .pickem-open { padding: 0.72rem 0.58rem; }
}
</style>
