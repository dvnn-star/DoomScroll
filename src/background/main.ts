import { onMessage, sendMessage } from 'webext-bridge/background'
import type { BlockedSite } from '../../shim'
import { getStorage, makeSite, resetDailyIfNeeded, setStorage } from '~/logic/storage'

if (import.meta.hot) {
  // @ts-expect-error for background HMR
  import('/@vite/client')
  import('./contentScriptHMR')
}

const ALARM_TICK = 'stopdoom-tick'
const OVERRIDE_DURATION_MS = 15 * 60 * 1000
const WARNING_BEFORE_MS = 5 * 60 * 1000

function matchesDomain(url: string, domain: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    const d = domain.replace(/^www\./, '')
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
  const tabs = await browser.tabs.query({})
  const result: { site: BlockedSite, tabId: number }[] = []
  for (const tab of tabs) {
    if (!tab.url || !tab.id)
      continue
    const site = getSiteForUrl(tab.url, state.blockedSites)
    if (site)
      result.push({ site, tabId: tab.id })
  }
  return result
}

async function closeTabsForSite(siteId: string): Promise<void> {
  const state = await getStorage()
  const tabs = await browser.tabs.query({})
  const toClose = tabs
    .filter(t => t.id && t.url && getSiteForUrl(t.url, state.blockedSites)?.id === siteId)
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

async function tick(): Promise<void> {
  const state = await resetDailyIfNeeded()
  const activeTabs = await getActiveBlockedTabs()

  const activeSiteIds = new Set(activeTabs.map(t => t.site.id))
  const updatedSites = [...state.blockedSites]

  for (let i = 0; i < updatedSites.length; i++) {
    const site = updatedSites[i]
    if (!activeSiteIds.has(site.id))
      continue

    const sessionTime = site.sessionTime + 1000
    updatedSites[i] = { ...site, sessionTime }

    if (sessionTime >= site.limitMs) {
      await closeTabsForSite(site.id)
      for (const { tabId } of activeTabs.filter(t => t.site.id === site.id))
        sendMessage('limit-reached', { siteId: site.id }, { context: 'content-script', tabId }).catch(() => {})
      continue
    }

    const remaining = site.limitMs - sessionTime
    if (remaining <= WARNING_BEFORE_MS && remaining > WARNING_BEFORE_MS - 1000) {
      await notifyWarning(site, remaining)
      for (const { tabId } of activeTabs.filter(t => t.site.id === site.id))
        sendMessage('warning-show', { siteId: site.id, remaining }, { context: 'content-script', tabId }).catch(() => {})
    }
  }

  await setStorage({ blockedSites: updatedSites })
}

browser.alarms.create(ALARM_TICK, { periodInMinutes: 1 / 60 })

browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_TICK)
    await tick()
})

browser.runtime.onInstalled.addListener(async () => {
  const state = await getStorage()
  if (!state.lastResetDate) {
    await setStorage({
      blockedSites: [makeSite('tiktok.com'), makeSite('instagram.com')],
      strictMode: false,
      lastResetDate: new Date().toLocaleDateString(),
    })
  }
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
