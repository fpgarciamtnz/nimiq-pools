<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ImagePlus, ListChecks, Plus, Trophy, UsersRound, X } from '@lucide/vue'
import { MAX_POOL_IMAGE_DATA_URL_LENGTH } from '#shared/pool-image'
import type { KnockoutPickemRoundKey, PoolDto } from '../../shared/types'

const title = shallowRef('')
const imageDataUrl = shallowRef<string | null>(null)
const isPickemEnabled = shallowRef(false)
const knockoutPickemStartRound = shallowRef<KnockoutPickemRoundKey | ''>('')
const error = shallowRef('')
const isSaving = shallowRef(false)

const pickemRoundOptions: Array<{ value: KnockoutPickemRoundKey; label: string }> = [
  { value: 'round_of_32', label: 'Round of 32' },
  { value: 'round_of_16', label: 'Round of 16' },
  { value: 'quarterfinal', label: 'Quarterfinals' },
  { value: 'semifinal', label: 'Semifinals' },
  { value: 'final', label: 'Final' }
]
const canSubmit = computed(() => !isSaving.value && (!isPickemEnabled.value || Boolean(knockoutPickemStartRound.value)))

async function createPool() {
  error.value = ''

  if (isPickemEnabled.value && !knockoutPickemStartRound.value) {
    error.value = "Choose the round where Pick'em starts."
    return
  }

  isSaving.value = true

  try {
    const response = await $fetch<{ pool: PoolDto; inviteUrl: string }>('/api/pools', {
      method: 'POST',
      body: {
        title: title.value,
        imageDataUrl: imageDataUrl.value,
        competitionMode: isPickemEnabled.value ? 'ballot_pickem' : 'ballot_only',
        knockoutPickemStartRound: isPickemEnabled.value ? knockoutPickemStartRound.value : null
      }
    })

    await navigateTo(response.inviteUrl)
  } catch {
    error.value = 'League could not be created. Check the name and picture.'
  } finally {
    isSaving.value = false
  }
}

function enablePickem() {
  isPickemEnabled.value = !isPickemEnabled.value
  error.value = ''

  if (!isPickemEnabled.value) {
    knockoutPickemStartRound.value = ''
  }
}

async function chooseImage(event: Event) {
  error.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    error.value = 'Use a PNG, JPEG, or WebP picture.'
    input.value = ''
    return
  }

  const dataUrl = await readFileAsDataUrl(file)

  if (dataUrl.length > MAX_POOL_IMAGE_DATA_URL_LENGTH) {
    error.value = 'Use a smaller picture for the league.'
    input.value = ''
    return
  }

  imageDataUrl.value = dataUrl
}

function clearImage() {
  imageDataUrl.value = null
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result)))
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsDataURL(file)
  })
}
</script>

<template>
  <section class="create-league-panel">
    <div class="create-heading">
      <div>
        <p class="eyebrow">Create your league</p>
        <h2>Start the group table</h2>
        <p class="muted">Name the league, add an optional picture, and go straight to the league hub.</p>
      </div>
      <div class="create-badges" aria-label="League traits">
        <span><UsersRound :size="16" aria-hidden="true" /> Private invite</span>
        <span><Trophy :size="16" aria-hidden="true" /> Live rankings</span>
      </div>
    </div>

    <form class="cue-flow" @submit.prevent="createPool">
      <div class="cue-step">
        <span class="cue-marker" aria-hidden="true">01</span>
        <div class="cue-body">
          <p class="cue-title">Name the league</p>
          <p class="cue-help">This name appears on the invite and league hub.</p>
          <div class="field action-field">
            <label for="pool-title">League name</label>
            <input id="pool-title" v-model="title" name="title" class="input" required placeholder="Friends World Cup League">
          </div>
        </div>
      </div>

      <div class="cue-step">
        <span class="cue-marker is-gold" aria-hidden="true">02</span>
        <div class="cue-body">
          <p class="cue-title">Add picture</p>
          <p class="cue-help">Optional. Use a team photo, trophy, or group image.</p>
          <div class="image-field">
            <div v-if="imageDataUrl" class="image-preview">
              <img :src="imageDataUrl" alt="">
              <button class="image-clear" type="button" aria-label="Remove league picture" @click="clearImage">
                <X :size="16" aria-hidden="true" />
              </button>
            </div>
            <label class="image-picker action-upload" for="pool-image">
              <ImagePlus :size="18" aria-hidden="true" />
              <span>{{ imageDataUrl ? 'Change picture' : 'Choose picture' }}</span>
            </label>
            <input
              id="pool-image"
              name="image"
              class="file-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              @change="chooseImage"
            >
          </div>
        </div>
      </div>

      <div class="cue-step">
        <span class="cue-marker is-green" aria-hidden="true">03</span>
        <div class="cue-body">
          <p class="cue-title">Add Pick'em</p>
          <p class="cue-help">Optional. Open winner picks from a knockout round you choose.</p>
          <div class="pickem-choice">
            <button
              class="btn-secondary pickem-toggle"
              :class="{ 'is-active': isPickemEnabled }"
              type="button"
              :aria-pressed="isPickemEnabled"
              @click="enablePickem"
            >
              <ListChecks :size="18" aria-hidden="true" />
              {{ isPickemEnabled ? "Pick'em enabled" : "Add Pick'em" }}
            </button>
            <div v-if="isPickemEnabled" class="field action-field pickem-round-field">
              <label for="pickem-start-round">At what round should this Pick'em be enabled?</label>
              <select
                id="pickem-start-round"
                v-model="knockoutPickemStartRound"
                name="knockoutPickemStartRound"
                class="select"
                required
              >
                <option value="" disabled>Choose round</option>
                <option v-for="round in pickemRoundOptions" :key="round.value" :value="round.value">
                  {{ round.label }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="cue-step">
        <span class="cue-marker is-green" aria-hidden="true">04</span>
        <div class="cue-body">
          <p class="cue-title">Open league</p>
          <p class="cue-help">Create the private link and continue directly to predictions.</p>
          <button class="btn-primary create-submit" type="submit" :disabled="!canSubmit">
            <Plus :size="18" aria-hidden="true" />
            Create League
          </button>
        </div>
      </div>
    </form>

    <p v-if="error" class="status error">{{ error }}</p>
  </section>
</template>

<style scoped>
.create-league-panel {
  --create-ink: #111814;
  --create-ink-soft: #26352f;
  --create-text-shadow: 0 1px 0 rgba(255, 248, 232, 0.68), 0 0 12px rgba(255, 248, 232, 0.42);
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  color: var(--create-ink);
  display: grid;
  gap: 1.05rem;
  isolation: isolate;
  padding: 0.2rem 0 1.25rem;
  position: relative;
  z-index: 1;
}

.create-heading {
  align-items: start;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  min-width: 0;
}

.create-heading > div {
  min-width: 0;
}

.create-heading h2,
.create-heading p {
  margin: 0;
}

.create-heading h2 {
  color: var(--create-ink);
  font-size: clamp(1.8rem, 4vw, 3.1rem);
  font-style: italic;
  font-weight: 950;
  line-height: 1;
  overflow-wrap: anywhere;
  text-shadow: var(--create-text-shadow);
  text-transform: uppercase;
}

.create-heading .eyebrow {
  color: #ba281a;
  font-weight: 950;
  text-shadow: var(--create-text-shadow);
}

.create-heading .muted {
  color: var(--create-ink-soft);
  font-weight: 890;
  margin-top: 0.32rem;
  text-shadow: var(--create-text-shadow);
}

.create-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.42rem;
  justify-content: flex-end;
}

.create-badges span {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 0;
  color: var(--create-ink);
  display: inline-flex;
  font-size: 0.86rem;
  font-weight: 920;
  gap: 0.32rem;
  padding: 0.32rem 0.52rem;
  text-shadow: var(--create-text-shadow);
  white-space: nowrap;
}

.create-league-panel .cue-title {
  color: var(--create-ink);
  font-weight: 950;
  text-shadow: var(--create-text-shadow);
}

.create-league-panel .cue-help,
.create-league-panel .field label {
  color: var(--create-ink-soft);
  font-weight: 880;
  text-shadow: var(--create-text-shadow);
}

.image-field {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.image-preview {
  height: 5rem;
  position: relative;
  width: 5rem;
}

.image-preview img {
  display: block;
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.image-clear {
  background: rgba(2, 10, 19, 0.82);
  border: 1px solid var(--line);
  border-radius: 999px;
  color: #fff;
  min-height: 1.65rem;
  padding: 0;
  position: absolute;
  right: 0.25rem;
  top: 0.25rem;
  width: 1.65rem;
}

.image-picker,
.btn-link {
  align-items: center;
  border-radius: 0;
  display: inline-flex;
  font-weight: 800;
  gap: 0.45rem;
  justify-content: center;
  min-height: 2.55rem;
  padding: 0.65rem 0.95rem;
}

.image-picker {
  background: rgba(255, 250, 240, 0.82);
  border: 1px dashed rgba(22, 21, 17, 0.2);
  color: var(--text);
  cursor: pointer;
}

.pickem-choice {
  align-items: start;
  display: grid;
  gap: 0.72rem;
  justify-items: start;
}

.pickem-toggle {
  min-height: 2.8rem;
}

.pickem-toggle.is-active {
  background: var(--gold);
  color: #1f1606;
}

.pickem-round-field {
  max-width: 24rem;
  width: min(100%, 24rem);
}

.file-input {
  inline-size: 1px;
  opacity: 0;
  position: absolute;
}

.create-submit {
  justify-self: start;
}

@media (max-width: 640px) {
  .create-heading {
    display: grid;
  }

  .create-heading h2 {
    font-size: clamp(1.55rem, 9vw, 2.45rem);
  }

  .create-badges {
    justify-content: flex-start;
  }

  .create-submit {
    width: 100%;
  }

  .pickem-choice,
  .pickem-toggle {
    width: 100%;
  }
}
</style>
