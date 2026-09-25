import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSessionStore } from '~/stores/session'
import { getStorage, makeSite, resetDailyIfNeeded, setStorage } from '~/logic/storage'

describe('storage Logic', () => {
  beforeEach(async () => {
    await browser.storage.local.clear()
  })

  it('makeSite creates correct schema with default 30 min limit', () => {
    const site = makeSite('youtube.com')
    expect(site.id).toBe('youtube.com')
    expect(site.domain).toBe('youtube.com')
    expect(site.sessionTime).toBe(0)
    expect(site.overrideUsed).toBe(false)
    expect(site.limitMs).toBe(30 * 60 * 1000)
  })

  it('getStorage returns default blocked sites when empty', async () => {
    const state = await getStorage()
    expect(state.blockedSites.length).toBe(2)
    const domains = state.blockedSites.map(s => s.domain)
    expect(domains).toContain('tiktok.com')
    expect(domains).toContain('instagram.com')
    expect(state.strictMode).toBe(false)
  })

  it('setStorage persists changes', async () => {
    await setStorage({ strictMode: true })
    const state = await getStorage()
    expect(state.strictMode).toBe(true)
  })

  it('resetDailyIfNeeded resets session times and override when date changes', async () => {
    const yesterday = '2026-01-01'
    await setStorage({
      lastResetDate: yesterday,
      blockedSites: [
        { ...makeSite('tiktok.com'), sessionTime: 25 * 60 * 1000, overrideUsed: true },
      ],
    })

    const state = await resetDailyIfNeeded()
    expect(state.blockedSites[0].sessionTime).toBe(0)
    expect(state.blockedSites[0].overrideUsed).toBe(false)
    expect(state.lastResetDate).toBe(new Date().toLocaleDateString())
  })

  it('resetDailyIfNeeded preserves custom limits across reset', async () => {
    const yesterday = '2026-01-01'
    await setStorage({
      lastResetDate: yesterday,
      blockedSites: [
        { ...makeSite('tiktok.com'), limitMs: 45 * 60 * 1000, sessionTime: 45 * 60 * 1000 },
      ],
    })

    const state = await resetDailyIfNeeded()
    expect(state.blockedSites[0].limitMs).toBe(45 * 60 * 1000)
    expect(state.blockedSites[0].sessionTime).toBe(0)
  })

  it('resetDailyIfNeeded does not reset if date is today', async () => {
    const today = new Date().toLocaleDateString()
    await setStorage({
      lastResetDate: today,
      blockedSites: [
        { ...makeSite('tiktok.com'), sessionTime: 25 * 60 * 1000, overrideUsed: true },
      ],
    })

    const state = await resetDailyIfNeeded()
    expect(state.blockedSites[0].sessionTime).toBe(25 * 60 * 1000)
    expect(state.blockedSites[0].overrideUsed).toBe(true)
  })
})

describe('session Store', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await browser.storage.local.clear()
  })

  it('initializes with empty sites before load', () => {
    const store = useSessionStore()
    expect(store.blockedSites).toEqual([])
  })

  it('load populates store from storage', async () => {
    const store = useSessionStore()
    await store.load()
    expect(store.blockedSites.length).toBe(2)
  })

  it('addSite adds a new cleaned domain', async () => {
    const store = useSessionStore()
    await store.load()
    await store.addSite('https://www.youtube.com/watch?v=123')
    expect(store.blockedSites.map(s => s.domain)).toContain('youtube.com')
  })

  it('addSite rejects duplicate domain', async () => {
    const store = useSessionStore()
    await store.load()
    const countBefore = store.blockedSites.length
    await store.addSite('tiktok.com')
    expect(store.blockedSites.length).toBe(countBefore)
  })

  it('removeSite removes site by id', async () => {
    const store = useSessionStore()
    await store.load()
    await store.removeSite('tiktok.com')
    expect(store.blockedSites.find(s => s.id === 'tiktok.com')).toBeUndefined()
    expect(store.blockedSites.find(s => s.id === 'instagram.com')).toBeDefined()
  })

  it('setLimit clamps to min 1 minute and max 120 minutes', async () => {
    const store = useSessionStore()
    await store.load()

    // Test above max (120 min = 7,200,000 ms)
    await store.setLimit('tiktok.com', 300 * 60 * 1000)
    expect(store.getSite('tiktok.com')?.limitMs).toBe(120 * 60 * 1000)

    // Test below min (1 min = 60,000 ms)
    await store.setLimit('tiktok.com', 0)
    expect(store.getSite('tiktok.com')?.limitMs).toBe(60 * 1000)
  })

  it('calculates remaining time correctly', async () => {
    const store = useSessionStore()
    await store.load()
    await store.updateSite('tiktok.com', {
      limitMs: 30 * 60 * 1000,
      sessionTime: 10 * 60 * 1000,
    })
    expect(store.remaining('tiktok.com')).toBe(20 * 60 * 1000)
  })

  it('remaining time never goes below zero', async () => {
    const store = useSessionStore()
    await store.load()
    await store.updateSite('tiktok.com', {
      limitMs: 30 * 60 * 1000,
      sessionTime: 35 * 60 * 1000,
    })
    expect(store.remaining('tiktok.com')).toBe(0)
  })

  it('triggers warning exactly within 5 minutes before limit', async () => {
    const store = useSessionStore()
    await store.load()
    const limit = 30 * 60 * 1000

    // At 24 min (6 min remaining): no warning
    await store.updateSite('tiktok.com', { limitMs: limit, sessionTime: 24 * 60 * 1000 })
    expect(store.isWarning('tiktok.com')).toBe(false)

    // At 25 min (5 min remaining): warning active
    await store.updateSite('tiktok.com', { limitMs: limit, sessionTime: 25 * 60 * 1000 })
    expect(store.isWarning('tiktok.com')).toBe(true)

    // At 29 min (1 min remaining): warning still active
    await store.updateSite('tiktok.com', { limitMs: limit, sessionTime: 29 * 60 * 1000 })
    expect(store.isWarning('tiktok.com')).toBe(true)

    // At 30 min (limit reached): warning false (handled by limit-reached)
    await store.updateSite('tiktok.com', { limitMs: limit, sessionTime: 30 * 60 * 1000 })
    expect(store.isWarning('tiktok.com')).toBe(false)
  })

  it('canOverride returns true only when override not used', async () => {
    const store = useSessionStore()
    await store.load()
    expect(store.canOverride('tiktok.com')).toBe(true)

    await store.updateSite('tiktok.com', { overrideUsed: true })
    expect(store.canOverride('tiktok.com')).toBe(false)
  })

  it('canOverride returns false for ALL sites in Strict Mode', async () => {
    const store = useSessionStore()
    await store.load()
    await store.save({ strictMode: true })
    expect(store.canOverride('tiktok.com')).toBe(false)
    expect(store.canOverride('instagram.com')).toBe(false)
  })

  it('sites have independent override states', async () => {
    const store = useSessionStore()
    await store.load()
    await store.updateSite('tiktok.com', { overrideUsed: true })
    expect(store.canOverride('tiktok.com')).toBe(false)
    expect(store.canOverride('instagram.com')).toBe(true)
  })

  it('increments session time and reflects in remaining time in real time', async () => {
    const store = useSessionStore()
    await store.load()
    const initialRemaining = store.remaining('tiktok.com')

    // Simulate 5 seconds elapsed
    const site = store.getSite('tiktok.com')!
    await store.updateSite('tiktok.com', { sessionTime: site.sessionTime + 5000 })

    expect(store.remaining('tiktok.com')).toBe(initialRemaining - 5000)
  })
})
