import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PoolCreateForm from '../app/components/PoolCreateForm.vue'

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.stubGlobal('navigateTo', vi.fn())
  vi.stubGlobal('$fetch', vi.fn(async () => ({
    pool: {
      code: 'office',
      title: 'Office Cup',
      imageDataUrl: null,
      competitionMode: 'ballot_pickem',
      knockoutPickemStartRound: 'round_of_16',
      createdAt: '2026-06-01T00:00:00.000Z'
    },
    inviteUrl: '/invite/office'
  })))
})

describe('PoolCreateForm', () => {
  it('shows a mandatory Pickem start-round question after pressing the Pickem button', async () => {
    const wrapper = mount(PoolCreateForm)

    expect(wrapper.find('#pickem-start-round').exists()).toBe(false)

    await wrapper.get('button[aria-pressed="false"]').trigger('click')

    const select = wrapper.get('#pickem-start-round')
    const submit = wrapper.get('button[type="submit"]')

    expect(wrapper.text()).toContain("At what round should this Pick'em be enabled?")
    expect(select.attributes('required')).toBeDefined()
    expect((submit.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('submits Pickem mode and selected start round', async () => {
    const wrapper = mount(PoolCreateForm)

    await wrapper.get('#pool-title').setValue('Office Cup')
    await wrapper.get('button[aria-pressed="false"]').trigger('click')
    await wrapper.get('#pickem-start-round').setValue('round_of_16')
    await wrapper.get('form').trigger('submit')

    expect(vi.mocked(globalThis.$fetch)).toHaveBeenCalledWith('/api/pools', expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({
        title: 'Office Cup',
        competitionMode: 'ballot_pickem',
        knockoutPickemStartRound: 'round_of_16'
      })
    }))
  })
})
