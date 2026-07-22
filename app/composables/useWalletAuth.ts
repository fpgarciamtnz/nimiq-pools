import type { AuthUserDto } from '../../shared/types'

export function useWalletAuth() {
  const user = useState<AuthUserDto | null>('wallet-auth:user', () => null)
  const loaded = useState('wallet-auth:loaded', () => false)
  const requestFetch = import.meta.server ? useRequestFetch() : $fetch

  async function loadSession(force = false) {
    if (loaded.value && !force) return user.value
    try {
      const response = await requestFetch<{ user: AuthUserDto | null }>('/api/auth/session')
      user.value = response.user
    } catch {
      user.value = null
    } finally {
      loaded.value = true
    }
    return user.value
  }

  async function loginWithNimiqPay() {
    const { connectAndSign } = useNimiqPay()
    const nonce = await $fetch<{ nonceId: string; message: string }>('/api/auth/nimiq/nonce', {
      method: 'POST', body: {}
    })
    const proof = await connectAndSign(nonce.message)
    const response = await $fetch<{ user: AuthUserDto }>('/api/auth/nimiq/verify', {
      method: 'POST',
      body: { nonceId: nonce.nonceId, ...proof, rememberMe: true }
    })
    user.value = response.user
    loaded.value = true
    return response.user
  }

  async function logout() {
    await $fetch('/api/auth/session', { method: 'DELETE' })
    user.value = null
    loaded.value = true
    await navigateTo('/login')
  }

  return {
    user: readonly(user),
    loggedIn: computed(() => Boolean(user.value)),
    loadSession,
    loginWithNimiqPay,
    logout
  }
}
