import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Popup from '~/popup/Popup.vue'
import Options from '~/options/Options.vue'
import { useSessionStore } from '~/stores/session'

describe('popup Component', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await browser.storage.local.clear()
  })

  it('renders extension title', async () => {
    const wrapper = mount(Popup)
    expect(wrapper.text()).toContain('StopDoomscrolling')
  })

  it('renders settings link', async () => {
    const wrapper = mount(Popup)
    expect(wrapper.find('button').text()).toBe('Settings')
  })

  it('renders empty message when no sites are tracked', async () => {
    const store = useSessionStore()
    store.blockedSites = []
    const wrapper = mount(Popup)
    expect(wrapper.text()).toContain('No sites tracked')
  })

  it('renders tracked sites when available', async () => {
    const store = useSessionStore()
    store.blockedSites = [
      { id: 'youtube.com', domain: 'youtube.com', limitMs: 1800000, sessionTime: 0, overrideUsed: false },
    ]
    const wrapper = mount(Popup)
    expect(wrapper.text()).toContain('youtube.com')
  })

  it('shows +15 min override button when override is available', async () => {
    const store = useSessionStore()
    store.blockedSites = [
      { id: 'youtube.com', domain: 'youtube.com', limitMs: 1800000, sessionTime: 0, overrideUsed: false },
    ]
    const wrapper = mount(Popup)
    expect(wrapper.find('button.text-amber-600').exists()).toBe(true)
  })

  it('hides override button when strict mode is active', async () => {
    const store = useSessionStore()
    store.strictMode = true
    store.blockedSites = [
      { id: 'youtube.com', domain: 'youtube.com', limitMs: 1800000, sessionTime: 0, overrideUsed: false },
    ]
    const wrapper = mount(Popup)
    expect(wrapper.text()).toContain('Strict mode')
    expect(wrapper.find('button.text-amber-600').exists()).toBe(false)
  })
})

describe('options Component', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await browser.storage.local.clear()
  })

  it('renders Add Website section', async () => {
    const wrapper = mount(Options)
    expect(wrapper.text()).toContain('Add Website')
  })

  it('renders Strict Mode toggle', async () => {
    const wrapper = mount(Options)
    expect(wrapper.text()).toContain('Strict Mode')
  })

  it('renders Reset section', async () => {
    const wrapper = mount(Options)
    expect(wrapper.text()).toContain('Reset Today\'s Data')
  })

  it('adds a new site when input filled and add clicked', async () => {
    const store = useSessionStore()
    await store.load()
    const wrapper = mount(Options)

    const input = wrapper.find('input[placeholder="youtube.com"]')
    await input.setValue('reddit.com')
    await wrapper.find('button.bg-teal-600').trigger('click')

    expect(store.blockedSites.map(s => s.domain)).toContain('reddit.com')
  })

  it('validates invalid domain on add', async () => {
    const wrapper = mount(Options)
    const input = wrapper.find('input[placeholder="youtube.com"]')
    await input.setValue('nodomain')
    await wrapper.find('button.bg-teal-600').trigger('click')
    expect(wrapper.text()).toContain('Enter a valid domain')
  })

  it('displays strict mode warning when strict mode is active', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useSessionStore()
    await store.save({ strictMode: true })

    const wrapper = mount(Options, { global: { plugins: [pinia] } })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Strict Mode is on')
  })
})
