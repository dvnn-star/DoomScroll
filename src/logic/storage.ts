import type { BlockedSite, StorageSchema } from '../../shim'

const DEFAULT_LIMIT_MS = 30 * 60 * 1000
const today = () => new Date().toLocaleDateString()

export function makeSite(domain: string): BlockedSite {
  return {
    id: domain,
    domain,
    sessionTime: 0,
    overrideUsed: false,
    limitMs: DEFAULT_LIMIT_MS,
  }
}

const DEFAULTS: StorageSchema = {
  blockedSites: [
    makeSite('tiktok.com'),
    makeSite('instagram.com'),
  ],
  strictMode: false,
  lastResetDate: today(),
}

export async function getStorage(): Promise<StorageSchema> {
  const data = await browser.storage.local.get(Object.keys(DEFAULTS))
  const merged: StorageSchema = {
    ...DEFAULTS,
    ...data,
    blockedSites: (data.blockedSites && Array.isArray(data.blockedSites) && data.blockedSites.length > 0)
      ? data.blockedSites
      : DEFAULTS.blockedSites,
  }

  // Auto-initialize storage if empty or blockedSites missing
  if (!data.blockedSites || !Array.isArray(data.blockedSites) || data.blockedSites.length === 0) {
    await browser.storage.local.set(merged as unknown as Record<string, unknown>)
  }

  return merged
}

export async function setStorage(partial: Partial<StorageSchema>): Promise<void> {
  await browser.storage.local.set(partial)
}

export async function resetDailyIfNeeded(): Promise<StorageSchema> {
  const state = await getStorage()
  if (state.lastResetDate !== today()) {
    const reset: Partial<StorageSchema> = {
      blockedSites: state.blockedSites.map(s => ({
        ...s,
        sessionTime: 0,
        overrideUsed: false,
      })),
      lastResetDate: today(),
    }
    await setStorage(reset)
    return { ...state, ...reset }
  }
  return state
}
