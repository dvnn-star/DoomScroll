import { onMessage, sendMessage } from 'webext-bridge/background'
import type { BlockedSite } from '../../shim'
import { getStorage, resetDailyIfNeeded, setStorage } from '~/logic/storage'

if (import.meta.hot) {
  // @ts-expect-error for background HMR
  import('/@vite/client')
  import('./contentScriptHMR')
}

const ALARM_TICK = 'stopdoom-tick'
const OVERRIDE_DURATION_MS = 15 * 60 * 1000
const WARNING_BEFORE_MS = 5 * 60 * 1000
const TICK_INTERVAL_MS = 1000

// Track last tick time to ensure accurate 1-second intervals
let lastTickTime = 0

function matchesDomain(url: string, domain: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
    const d = domain.replace(/^www\./, '').toLowerCase()
    return host === d || host.endsWith(`.${d}`)
  }
  catch {
    return false
  }
}

function getSiteForUrl(url: string, sites: BlockedSite[]): BlockedSite | null {
  return sites.find(s => matchesDomain(url, s.domain)) ?? null
}

async function getActiveBlockedTabs(): Promise<{ site: BlockedSite, tabId: number }[]> {
  const state = await getStorage()
  const tabs = await browser.tabs.query({ active: true })
  const result: { site: BlockedSite, tabId: number }[] = []
  for (const tab of tabs) {
    const url = tab.url || tab.pendingUrl
    if (!url || !tab.id)
      continue
    const site = getSiteForUrl(url, state.blockedSites)
    if (site)
      result.push({ site, tabId: tab.id })
  }
  return result
}

async function closeTabsForSite(siteId: string): Promise<void> {
  const state = await getStorage()
  const tabs = await browser.tabs.query({})
  const toClose = tabs
    .filter(t => t.id && (t.url || t.pendingUrl) && getSiteForUrl(t.url || t.pendingUrl!, state.blockedSites)?.id === siteId)
    .map(t => t.id!)
  if (toClose.length > 0)
    await browser.tabs.remove(toClose)
}

async function notifyWarning(site: BlockedSite, remaining: number): Promise<void> {
  const mins = Math.ceil(remaining / 60000)
  browser.notifications.create(`warn-${site.id}`, {
    type: 'basic',
    iconUrl: 'assets/icon-512.png',
    title: 'StopDoomscrolling',
    message: `${site.domain}: ${mins} minute${mins !== 1 ? 's' : ''} remaining.`,
  })
}

async function applyTimeUpdate(siteId: string, delta: number): Promise<void> {
  const state = await resetDailyIfNeeded()
  const siteIndex = state.blockedSites.findIndex(s => s.id === siteId)
  if (siteIndex === -1)
    return

  const site = state.blockedSites[siteIndex]
  const newSessionTime = site.sessionTime + delta
  const updatedSites = [...state.blockedSites]
  updatedSites[siteIndex] = { ...site, sessionTime: newSessionTime }

  if (newSessionTime >= site.limitMs) {
    await closeTabsForSite(site.id)
    const activeTabs = await browser.tabs.query({})
    for (const tab of activeTabs) {
      const url = tab.url || tab.pendingUrl
      if (tab.id && url && matchesDomain(url, site.domain)) {
        sendMessage('limit-reached', { siteId: site.id }, { context: 'content-script', tabId: tab.id }).catch(() => {})
      }
    }
  }
  else {
    const remaining = site.limitMs - newSessionTime
    const prevRemaining = site.limitMs - site.sessionTime
    if (remaining <= WARNING_BEFORE_MS && prevRemaining > WARNING_BEFORE_MS) {
      await notifyWarning(site, remaining)
    }

    if (remaining <= WARNING_BEFORE_MS) {
      const activeTabs = await browser.tabs.query({})
      for (const tab of activeTabs) {
        const url = tab.url || tab.pendingUrl
        if (tab.id && url && matchesDomain(url, site.domain)) {
          sendMessage('warning-show', { siteId: site.id, remaining }, { context: 'content-script', tabId: tab.id }).catch(() => {})
        }
      }
    }
  }

  await setStorage({ blockedSites: updatedSites })
}

async function tick(): Promise<void> {
  const now = Date.now()

  // Ensure we only tick once per second
  if (now - lastTickTime < TICK_INTERVAL_MS)
    return
  lastTickTime = now

  const activeTabs = await getActiveBlockedTabs()
  if (activeTabs.length === 0)
    return

  for (const { site } of activeTabs) {
    await applyTimeUpdate(site.id, TICK_INTERVAL_MS)
  }
}

// Single alarm-based tick - reliable for service workers
browser.alarms.create(ALARM_TICK, { periodInMinutes: 1 / 60 })

browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_TICK)
    await tick()
})

// Tab events to immediately check when user switches to a blocked site
browser.tabs.onActivated.addListener(() => {
  tick().catch(() => {})
})

browser.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    tick().catch(() => {})
  }
})

browser.runtime.onInstalled.addListener(async () => {
  await getStorage()
})

onMessage('override-activate', async ({ data }) => {
  const { siteId } = data
  const state = await getStorage()

  if (state.strictMode)
    return { success: false }

  const site = state.blockedSites.find(s => s.id === siteId)
  if (!site || site.overrideUsed)
    return { success: false }

  const updated = state.blockedSites.map(s =>
    s.id === siteId
      ? { ...s, overrideUsed: true, sessionTime: Math.max(0, s.sessionTime - OVERRIDE_DURATION_MS) }
      : s,
  )
  await setStorage({ blockedSites: updated })
  return { success: true }
})
