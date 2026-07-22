<script setup lang="ts">
import { getTeamFlagMeta } from '#shared/team-flags'

interface Props {
  name: string
  fifaCode?: string
  flagEmoji?: string
  flagUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  fifaCode: '',
  flagEmoji: '',
  flagUrl: null,
  size: 'md'
})

const imageFailed = shallowRef(false)
const resolvedFlag = computed(() => props.flagUrl
  ? {
      flagEmoji: props.flagEmoji || getTeamFlagMeta(props.fifaCode).flagEmoji,
      flagUrl: props.flagUrl
    }
  : getTeamFlagMeta(props.fifaCode))
const canShowImage = computed(() => Boolean(resolvedFlag.value.flagUrl) && !imageFailed.value)
const fallbackLabel = computed(() => props.flagEmoji || resolvedFlag.value.flagEmoji)

watch(() => [props.flagUrl, props.fifaCode], () => {
  imageFailed.value = false
})
</script>

<template>
  <span class="team-flag" :class="`team-flag-${props.size}`">
    <img
      v-if="canShowImage && resolvedFlag.flagUrl"
      :src="resolvedFlag.flagUrl"
      :alt="`${props.name} flag`"
      loading="lazy"
      decoding="async"
      @error="imageFailed = true"
    >
    <span v-else aria-hidden="true">{{ fallbackLabel }}</span>
  </span>
</template>

<style scoped>
.team-flag {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 5px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.18);
  display: inline-flex;
  flex: 0 0 auto;
  justify-content: center;
  overflow: hidden;
}

.team-flag-sm {
  height: 1.1rem;
  width: 1.55rem;
}

.team-flag-md {
  height: 1.35rem;
  width: 1.9rem;
}

.team-flag-lg {
  height: 1.65rem;
  width: 2.35rem;
}

.team-flag img {
  display: block;
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.team-flag span {
  font-size: 0.9rem;
  line-height: 1;
}
</style>
