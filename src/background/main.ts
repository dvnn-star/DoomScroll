import { onMessage, sendMessage } from 'webext-bridge/background'
import type { StorageSchema } from '../../shim'
import { getStorage, resetDailyIfNeeded, setStorage } from '~/logic/storage'

if (import.meta.hot) {
  // @ts-expect-error for background HMR
  import('/@vite/client')
  import('./contentScriptHMR')
}

const ALARM_TICK = 'stopdoom-tick'
const OVERRIDE_DURATION_MS = 15 * 60 * 1000
const WARNING_BEFORE_MS = 5 * 60 * 1000

type Site = 'tiktok' | 'instagram'

function getSite(url: string): Site | null {
  if (url.includes('tiktok.com'))
    return 'tiktok'
  if (url.includes('instagram.com'))
    return 'instagram'
  return null
}

function sessionKey(site: Site): keyof StorageSchema {
  return site === 'tiktok' ? 'tiktokSessionTime' : 'instagramSessionTime'
}

function limitKey(site: Site): keyof StorageSchema {
  return site === 'tiktok' ? 'tiktokLimit' : 'instagramLimit'
}

function overrideKey(site: Site): keyof StorageSchema {
  return site === 'tiktok' ? 'tiktokOverrideUsed' : 'instagramOverrideUsed'
}

async function getActiveSiteTabs(): Promise<{ site: Site, tabId: number }[]> {
  const tabs = await browser.tabs.query({ active: true })
  const result: { site: Site, tabId: number }[] = []
  for (const tab of tabs) {
    if (!tab.url || !tab.id)
      continue
    const site = getSite(tab.url)
    if (site)
      result.push({ site, tabId: tab.id })
  }
  return tabs
    .filter(t => t.url && t.id && getSite(t.url))
    .map(t => ({ site: getSite(t.url!)!, tabId: t.id! }))
}

async function closeAllSiteTabs(site: Site): Promise<void> {
  const tabs = await browser.tabs.query({})
  const toClose = tabs
    .filter(t => t.id && t.url && getSite(t.url) === site)
    .map(t => t.id!)
  if (toClose.length > 0)
    await browser.tabs.remove(toClose)
}

async function notifyWarning(site: Site, remaining: number): Promise<void> {
  const siteLabel = site === 'tiktok' ? 'TikTok' : 'Instagram'
  const mins = Math.ceil(remaining / 60000)
  browser.notifications.create(`warn-${site}`, {
    type: 'basic',
    iconUrl: 'assets/icon-512.png',
    title: 'StopDoomscrolling',
    message: `${siteLabel}: ${mins} minute${mins !== 1 ? 's' : ''} remaining before your session ends.`,
  })
}

async function tick(): Promise<void> {
  const state = await resetDailyIfNeeded()
  const activeTabs = await getActiveSiteTabs()

  const sitesActive = new Set(activeTabs.map(t => t.site))

  for (const site of ['tiktok', 'instagram'] as Site[]) {
    if (!state.enabledSites.includes(site))
      continue
    if (!sitesActive.has(site))
      continue

    const sessionTime = (state[sessionKey(site)] as number) + 1000
    const limit = state[limitKey(site)] as number
    const overrideUsed = state[overrideKey(site)] as boolean

    const update: Partial<StorageSchema> = { [sessionKey(site)]: sessionTime }
    await setStorage(update)

    if (sessionTime >= limit) {
      await closeAllSiteTabs(site)
      for (const { tabId } of activeTabs.filter(t => t.site === site)) {
        sendMessage('limit-reached', { site }, { context: 'content-script', tabId }).catch(() => {})
      }
      continue
    }

    const remaining = limit - sessionTime
    if (remaining <= WARNING_BEFORE_MS && remaining > WARNING_BEFORE_MS - 1000) {
      await notifyWarning(site, remaining)
      for (const { tabId } of activeTabs.filter(t => t.site === site)) {
        sendMessage('warning-show', { site, remaining }, { context: 'content-script', tabId }).catch(() => {})
      }
    }

    if (!overrideUsed) {
      for (const { tabId } of activeTabs.filter(t => t.site === site)) {
        sendMessage('state-sync', state, { context: 'content-script', tabId }).catch(() => {})
      }
    }
  }
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
      tiktokSessionTime: 0,
      instagramSessionTime: 0,
      tiktokOverrideUsed: false,
      instagramOverrideUsed: false,
      tiktokLimit: 30 * 60 * 1000,
      instagramLimit: 30 * 60 * 1000,
      strictMode: false,
      lastResetDate: new Date().toLocaleDateString(),
      enabledSites: ['tiktok', 'instagram'],
    })
  }
})

onMessage('override-activate', async ({ data }) => {
  const { site } = data
  const state = await getStorage()

  if (state.strictMode)
    return { success: false }

  const used = state[overrideKey(site)] as boolean
  if (used)
    return { success: false }

  const sessionTime = (state[sessionKey(site)] as number) - OVERRIDE_DURATION_MS
  await setStorage({
    [overrideKey(site)]: true,
    [sessionKey(site)]: Math.max(0, sessionTime),
  })

  return { success: true }
})
