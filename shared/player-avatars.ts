export const PLAYER_AVATARS = [
  { key: 'bee', emoji: '🐝', label: 'Bee', accent: '#f4b000' },
  { key: 'trophy', emoji: '🏆', label: 'Trophy', accent: '#f4b000' },
  { key: 'soccer', emoji: '⚽', label: 'Soccer ball', accent: '#fff8e8' },
  { key: 'rocket', emoji: '🚀', label: 'Rocket', accent: '#e63222' },
  { key: 'star', emoji: '⭐', label: 'Star', accent: '#f4b000' },
  { key: 'fire', emoji: '🔥', label: 'Fire', accent: '#e63222' },
  { key: 'crown', emoji: '👑', label: 'Crown', accent: '#f4b000' },
  { key: 'sunglasses', emoji: '😎', label: 'Cool face', accent: '#0b7a2a' },
  { key: 'wizard', emoji: '🧙', label: 'Wizard', accent: '#7c3aed' },
  { key: 'ninja', emoji: '🥷', label: 'Ninja', accent: '#111827' },
  { key: 'mage', emoji: '🪄', label: 'Magic wand', accent: '#8b5cf6' },
  { key: 'ghost', emoji: '👻', label: 'Ghost', accent: '#fff8e8' },
  { key: 'alien', emoji: '👽', label: 'Alien', accent: '#86efac' },
  { key: 'robot', emoji: '🤖', label: 'Robot', accent: '#94a3b8' },
  { key: 'clown', emoji: '🤡', label: 'Clown', accent: '#e63222' },
  { key: 'skull', emoji: '💀', label: 'Skull', accent: '#e5e7eb' },
  { key: 'brain', emoji: '🧠', label: 'Brain', accent: '#f472b6' },
  { key: 'muscle', emoji: '💪', label: 'Muscle', accent: '#f59e0b' },
  { key: 'eyes', emoji: '👀', label: 'Eyes', accent: '#fff8e8' },
  { key: 'lightning', emoji: '⚡', label: 'Lightning', accent: '#f4b000' },
  { key: 'target', emoji: '🎯', label: 'Target', accent: '#e63222' },
  { key: 'dice', emoji: '🎲', label: 'Dice', accent: '#fff8e8' },
  { key: 'joystick', emoji: '🕹️', label: 'Joystick', accent: '#111827' },
  { key: 'medal', emoji: '🥇', label: 'Gold medal', accent: '#f4b000' },
  { key: 'whistle', emoji: '📣', label: 'Megaphone', accent: '#e63222' },
  { key: 'flag', emoji: '🚩', label: 'Flag', accent: '#e63222' },
  { key: 'drum', emoji: '🥁', label: 'Drum', accent: '#dc2626' },
  { key: 'party', emoji: '🎉', label: 'Party popper', accent: '#22c55e' },
  { key: 'sparkles', emoji: '✨', label: 'Sparkles', accent: '#f4b000' },
  { key: 'gem', emoji: '💎', label: 'Gem', accent: '#38bdf8' },
  { key: 'shield', emoji: '🛡️', label: 'Shield', accent: '#0b7a2a' },
  { key: 'compass', emoji: '🧭', label: 'Compass', accent: '#b45309' },
  { key: 'mountain', emoji: '⛰️', label: 'Mountain', accent: '#4b5563' },
  { key: 'wave', emoji: '🌊', label: 'Wave', accent: '#0284c7' },
  { key: 'sun', emoji: '☀️', label: 'Sun', accent: '#f4b000' },
  { key: 'moon', emoji: '🌙', label: 'Moon', accent: '#64748b' }
] as const

export type PlayerAvatar = (typeof PLAYER_AVATARS)[number]
export type PlayerAvatarKey = PlayerAvatar['key']

export const DEFAULT_PLAYER_AVATAR_KEY: PlayerAvatarKey = 'bee'
export const PLAYER_AVATAR_KEYS = PLAYER_AVATARS.map((avatar) => avatar.key) as [PlayerAvatarKey, ...PlayerAvatarKey[]]

const avatarByKey = new Map<PlayerAvatarKey, PlayerAvatar>(
  PLAYER_AVATARS.map((avatar) => [avatar.key, avatar])
)

export function isPlayerAvatarKey(value: unknown): value is PlayerAvatarKey {
  return typeof value === 'string' && avatarByKey.has(value as PlayerAvatarKey)
}

export function normalizePlayerAvatarKey(value: unknown): PlayerAvatarKey | null {
  return isPlayerAvatarKey(value) ? value : null
}

export function getPlayerAvatar(key: PlayerAvatarKey | null | undefined) {
  return avatarByKey.get(key ?? DEFAULT_PLAYER_AVATAR_KEY)
    ?? (avatarByKey.get(DEFAULT_PLAYER_AVATAR_KEY) as PlayerAvatar)
}

export function avatarKeyForDisplayName(displayName: string): PlayerAvatarKey {
  const normalized = displayName.trim().toLocaleLowerCase()

  if (!normalized) {
    return DEFAULT_PLAYER_AVATAR_KEY
  }

  let hash = 0

  for (const char of normalized) {
    hash = ((hash * 31) + char.codePointAt(0)!) >>> 0
  }

  return PLAYER_AVATARS[hash % PLAYER_AVATARS.length]?.key ?? DEFAULT_PLAYER_AVATAR_KEY
}

export function resolvePlayerAvatarKey(
  avatarKey: string | null | undefined,
  displayName: string
): PlayerAvatarKey {
  return normalizePlayerAvatarKey(avatarKey) ?? avatarKeyForDisplayName(displayName)
}
