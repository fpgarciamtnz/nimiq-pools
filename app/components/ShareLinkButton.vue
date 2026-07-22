<script setup lang="ts">
import { Check, Copy } from '@lucide/vue'

interface Props {
  url: string
}

const props = defineProps<Props>()

const copyState = shallowRef<'idle' | 'copied' | 'error'>('idle')
const resetTimer = shallowRef<ReturnType<typeof setTimeout> | null>(null)

const buttonLabel = computed(() => {
  if (copyState.value === 'copied') {
    return 'Copied'
  }

  if (copyState.value === 'error') {
    return 'Copy failed'
  }

  return 'Copy link'
})

async function copyLink() {
  clearResetTimer()

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(props.url)
    } else {
      copyWithTextArea(props.url)
    }

    copyState.value = 'copied'
  } catch {
    copyState.value = 'error'
  }

  resetTimer.value = setTimeout(() => {
    copyState.value = 'idle'
    resetTimer.value = null
  }, 2200)
}

function copyWithTextArea(value: string) {
  const textArea = document.createElement('textarea')
  textArea.value = value
  textArea.setAttribute('readonly', '')
  textArea.style.position = 'fixed'
  textArea.style.left = '-9999px'
  textArea.style.top = '0'
  document.body.appendChild(textArea)
  textArea.select()

  const didCopy = document.execCommand('copy')
  document.body.removeChild(textArea)

  if (!didCopy) {
    throw new Error('Copy command failed')
  }
}

function clearResetTimer() {
  if (!resetTimer.value) {
    return
  }

  clearTimeout(resetTimer.value)
  resetTimer.value = null
}

onBeforeUnmount(clearResetTimer)
</script>

<template>
  <button
    class="share-link-button"
    type="button"
    :class="{ 'is-copied': copyState === 'copied', 'has-error': copyState === 'error' }"
    :aria-label="`${buttonLabel}: ${props.url}`"
    @click="copyLink"
  >
    <Check v-if="copyState === 'copied'" :size="16" aria-hidden="true" />
    <Copy v-else :size="16" aria-hidden="true" />
    <span>{{ buttonLabel }}</span>
  </button>
</template>

<style scoped>
.share-link-button {
  background: #fffaf0;
  border: 1px solid var(--line-strong);
  color: var(--text);
  flex: 0 0 auto;
  min-height: 2.4rem;
  padding: 0.52rem 0.78rem 0.52rem 0.62rem;
  white-space: nowrap;
}

.share-link-button svg {
  color: var(--accent-strong);
  flex: 0 0 auto;
}

.share-link-button.is-copied {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff8e8;
}

.share-link-button.is-copied svg {
  color: #fff8e8;
}

.share-link-button.has-error {
  border-color: rgba(222, 50, 29, 0.42);
  color: var(--danger);
}

.share-link-button.has-error svg {
  color: var(--danger);
}

@media (max-width: 520px) {
  .share-link-button {
    justify-self: start;
    min-height: 2.75rem;
  }
}
</style>
