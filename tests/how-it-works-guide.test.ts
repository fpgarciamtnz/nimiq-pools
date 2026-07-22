import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HowItWorksGuide from '../app/components/HowItWorksGuide.vue'

describe('HowItWorksGuide', () => {
  it('keeps the special scoring joke collapsed by default in the tournament scoring guide', () => {
    const wrapper = mount(HowItWorksGuide, {
      props: {
        context: 'league'
      },
      global: {
        stubs: {
          TeamFlag: { template: '<span data-test="team-flag" />' }
        }
      }
    })

    const specialRules = wrapper.get('details.special-rules')

    expect(specialRules.attributes('open')).toBeUndefined()
    expect(specialRules.get('summary').text()).toContain('Special rules')
    expect(specialRules.text()).toContain('besties with the admin')
    expect(specialRules.text()).toContain('Croatia')
    expect(specialRules.text()).toContain('Uruguay')
    expect(specialRules.text()).toContain('Canada')
    expect(specialRules.text()).toContain('Saudi Arabia')
    expect(specialRules.text()).not.toContain('No actual points are awarded by this rule.')
    expect(specialRules.findAll('[data-test="team-flag"]')).toHaveLength(4)
  })

  it('does not show the tournament-only special scoring joke in the standalone guide', () => {
    const wrapper = mount(HowItWorksGuide, {
      props: {
        context: 'standalone'
      },
      global: {
        stubs: {
          TeamFlag: { template: '<span data-test="team-flag" />' }
        }
      }
    })

    expect(wrapper.find('details.special-rules').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('besties with the admin')
  })

  it('shows only scoring rules that add points', () => {
    const wrapper = mount(HowItWorksGuide, {
      props: {
        context: 'league'
      }
    })

    expect(wrapper.findAll('.score-token')).toHaveLength(4)
    expect(wrapper.text()).not.toContain('Goal against')
    expect(wrapper.text()).not.toContain('Shootout')
  })
})
