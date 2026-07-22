import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNimiqPay } from '../app/composables/useNimiqPay'

const address = 'NQ72 H8J9 MQ3R HPTC 53HR S1YF CJA2 92LD VVFG'

beforeEach(() => {
  delete window.nimiq
})

describe('Nimiq Pay provider bridge', () => {
  it('connects, chooses the wallet account, and signs the login challenge', async () => {
    const provider = {
      connect: vi.fn(async () => undefined),
      listAccounts: vi.fn(async () => [address]),
      sign: vi.fn(async () => ({ publicKey: 'ab'.repeat(32), signature: 'cd'.repeat(64) }))
    }
    window.nimiq = provider

    const nimiq = useNimiqPay()
    const proof = await nimiq.connectAndSign('challenge')

    expect(provider.connect).toHaveBeenCalledOnce()
    expect(provider.listAccounts).toHaveBeenCalledOnce()
    expect(provider.sign).toHaveBeenCalledWith('challenge')
    expect(proof).toEqual({
      address,
      publicKeyHex: 'ab'.repeat(32),
      signatureHex: 'cd'.repeat(64)
    })
  })

  it('surfaces provider rejection messages without creating a proof', async () => {
    window.nimiq = {
      listAccounts: vi.fn(async () => ({ error: { message: 'Request rejected' } })),
      sign: vi.fn()
    }

    await expect(useNimiqPay().connectAndSign('challenge')).rejects.toThrow('Request rejected')
  })
})
