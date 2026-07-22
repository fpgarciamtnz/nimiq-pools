import { computed, getCurrentInstance, onBeforeUnmount, onMounted, readonly, shallowRef } from 'vue'

interface NimiqProviderError {
  error: { message: string }
}

interface NimiqSignatureResult {
  publicKey: string
  signature: string
}

interface NimiqPayProvider {
  connect?: () => Promise<void>
  listAccounts: () => Promise<string[] | NimiqProviderError>
  sign: (message: string) => Promise<NimiqSignatureResult | NimiqProviderError>
}

declare global {
  interface Window {
    nimiq?: NimiqPayProvider
  }
}

function isProvider(value: unknown): value is NimiqPayProvider {
  return Boolean(value && typeof value === 'object'
    && typeof (value as NimiqPayProvider).listAccounts === 'function'
    && typeof (value as NimiqPayProvider).sign === 'function')
}

function unwrap<T>(value: T | NimiqProviderError): T {
  if (value && typeof value === 'object' && 'error' in value) {
    throw new Error(value.error.message)
  }
  return value as T
}

export function useNimiqPay() {
  const provider = shallowRef<NimiqPayProvider | null>(null)
  const detecting = shallowRef(false)

  function refreshProvider() {
    if (typeof window !== 'undefined' && isProvider(window.nimiq)) provider.value = window.nimiq
    return provider.value
  }

  async function detectProvider(timeoutMs = 3000) {
    if (typeof window === 'undefined' || provider.value) return refreshProvider()
    detecting.value = true
    const startedAt = Date.now()
    try {
      while (!refreshProvider() && Date.now() - startedAt < timeoutMs) {
        await new Promise((resolve) => window.setTimeout(resolve, 100))
      }
      return provider.value
    } finally {
      detecting.value = false
    }
  }

  async function connectAndSign(message: string) {
    const activeProvider = await detectProvider()
    if (!activeProvider) throw new Error('Open Pick Party inside Nimiq Pay to connect your wallet.')
    await activeProvider.connect?.()
    const accounts = unwrap(await activeProvider.listAccounts())
    const address = accounts[0]?.trim()
    if (!address) throw new Error('No Nimiq account is available in Nimiq Pay.')
    const signed = unwrap(await activeProvider.sign(message))
    return { address, publicKeyHex: signed.publicKey, signatureHex: signed.signature }
  }

  if (typeof window !== 'undefined' && getCurrentInstance()) {
    const onProviderReady = () => refreshProvider()
    let interval: number | undefined
    onMounted(() => {
      refreshProvider()
      interval = window.setInterval(refreshProvider, 250)
      window.addEventListener('nimiq-pay:provider-ready', onProviderReady)
      window.addEventListener('focus', onProviderReady)
    })
    onBeforeUnmount(() => {
      if (interval) window.clearInterval(interval)
      window.removeEventListener('nimiq-pay:provider-ready', onProviderReady)
      window.removeEventListener('focus', onProviderReady)
    })
  }

  return {
    available: computed(() => Boolean(provider.value)),
    detecting: readonly(detecting),
    detectProvider,
    connectAndSign
  }
}
