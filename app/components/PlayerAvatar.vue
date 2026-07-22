<script setup lang="ts">
import { getPlayerAvatar, resolvePlayerAvatarKey, type PlayerAvatarKey } from '#shared/player-avatars'

interface Props {
  avatarKey?: PlayerAvatarKey | null
  displayName: string
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

const resolvedAvatar = computed(() => getPlayerAvatar(resolvePlayerAvatarKey(props.avatarKey, props.displayName)))
const avatarLabel = computed(() => `${resolvedAvatar.value.label} avatar for ${props.displayName}`)
const avatarStyle = computed(() => ({
  '--avatar-accent': resolvedAvatar.value.accent
}))
</script>

<template>
  <span
    class="player-avatar"
    :class="`player-avatar-${props.size}`"
    :style="avatarStyle"
    role="img"
    :aria-label="avatarLabel"
  >
    <span class="player-avatar-emoji" aria-hidden="true">{{ resolvedAvatar.emoji }}</span>
  </span>
</template>

<style scoped>
.player-avatar {
  align-items: center;
  background:
    radial-gradient(circle at 35% 28%, rgba(255, 255, 255, 0.55), transparent 34%),
    color-mix(in srgb, var(--avatar-accent, var(--gold)) 82%, #111814 18%);
  border: 2px solid rgba(255, 248, 232, 0.32);
  border-radius: 999px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.28),
    0 0.25rem 0.7rem rgba(0, 0, 0, 0.16);
  color: #111814;
  display: inline-flex;
  flex: 0 0 auto;
  justify-content: center;
  line-height: 1;
  overflow: hidden;
}

.player-avatar-sm {
  font-size: 1.06rem;
  height: 2.35rem;
  width: 2.35rem;
}

.player-avatar-md {
  font-size: 1.22rem;
  height: 2.65rem;
  width: 2.65rem;
}

.player-avatar-lg {
  font-size: 1.42rem;
  height: 2.9rem;
  width: 2.9rem;
}

.player-avatar-emoji {
  filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.32));
}
</style>
