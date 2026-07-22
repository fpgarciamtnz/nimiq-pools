import { describe, expect, it } from 'vitest'
import {
  avatarKeyForDisplayName,
  DEFAULT_PLAYER_AVATAR_KEY,
  getPlayerAvatar,
  isPlayerAvatarKey,
  PLAYER_AVATARS,
  resolvePlayerAvatarKey
} from '../shared/player-avatars'

describe('player avatar catalog', () => {
  it('exposes a curated option set with a bee option', () => {
    expect(PLAYER_AVATARS.length).toBeGreaterThanOrEqual(30)
    expect(PLAYER_AVATARS).toContainEqual(expect.objectContaining({
      key: 'bee',
      emoji: '🐝',
      label: 'Bee'
    }))
  })

  it('validates curated keys only', () => {
    expect(isPlayerAvatarKey('bee')).toBe(true)
    expect(isPlayerAvatarKey('not-real')).toBe(false)
  })

  it('resolves missing or invalid saved keys from the display name', () => {
    expect(resolvePlayerAvatarKey(null, 'Ana')).toBe(avatarKeyForDisplayName('Ana'))
    expect(resolvePlayerAvatarKey('bad-key', 'Ana')).toBe(avatarKeyForDisplayName('Ana'))
    expect(resolvePlayerAvatarKey('bee', 'Ana')).toBe('bee')
  })

  it('falls back to the default avatar for blank names', () => {
    expect(avatarKeyForDisplayName('   ')).toBe(DEFAULT_PLAYER_AVATAR_KEY)
    expect(getPlayerAvatar(null).key).toBe(DEFAULT_PLAYER_AVATAR_KEY)
  })
})
