import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NimiqLoginCard from '../app/components/auth/NimiqLoginCard.vue'

const loginWithNimiqPay = vi.fn()
const detectProvider = vi.fn()
const navigateTo = vi.fn()

beforeEach(() => {
  vi.unstubAllGlobals()
  loginWithNimiqPay.mockReset().mockResolvedValue({ id: 'user-one' })
  detectProvider.mockReset().mockResolvedValue(null)
  navigateTo.mockReset().mockResolvedValue(undefined)
  vi.stubGlobal('useRoute', () => ({ query: { redirect: '/tournament' } }))
  vi.stubGlobal('useWalletAuth', () => ({ loginWithNimiqPay }))
  vi.stubGlobal('useNimiqPay', () => ({
    available: ref(false),
    detecting: ref(false),
    detectProvider
  }))
  vi.stubGlobal('navigateTo', navigateTo)
})

describe('Nimiq login card', () => {
  it('explains the approval, connects, and returns to the requested page', async () => {
    const wrapper = mount(NimiqLoginCard)

    expect(wrapper.text()).toContain('No payment is made.')
    expect(wrapper.text()).toContain('Your leagues follow your wallet')
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(loginWithNimiqPay).toHaveBeenCalledOnce()
    expect(navigateTo).toHaveBeenCalledWith('/tournament')
  })

  it('shows a wallet rejection and stays on the login screen', async () => {
    loginWithNimiqPay.mockRejectedValueOnce(new Error('Approval rejected'))
    const wrapper = mount(NimiqLoginCard)

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('Approval rejected')
    expect(navigateTo).not.toHaveBeenCalled()
  })
})
