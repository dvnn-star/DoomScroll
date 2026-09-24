import type { StorageSchema } from '../../shim'

const DEFAULT_LIMIT_MS = 30 * 60 * 1000
const today = () => new Date().toLocaleDateString()

const DEFAULTS: StorageSchema = {
  tiktokSessionTime: 0,
  instagramSessionTime: 0,
  tiktokOverrideUsed: false,
  instagramOverrideUsed: false,
  tiktokLimit: DEFAULT_LIMIT_MS,
  instagramLimit: DEFAULT_LIMIT_MS,
  strictMode: false,
  lastResetDate: today(),
  enabledSites: ['tiktok', 'instagram'],
}

export async function getStorage(): Promise<StorageSchema> {
  const data = await browser.storage.local.get(Object.keys(DEFAULTS))
  return { ...DEFAULTS, ...data } as StorageSchema
}

export async function setStorage(partial: Partial<StorageSchema>): Promise<void> {
  await browser.storage.local.set(partial)
}

export async function resetDailyIfNeeded(): Promise<StorageSchema> {
  const state = await getStorage()
  if (state.lastResetDate !== today()) {
    const reset: Partial<StorageSchema> = {
      tiktokOverrideUsed: false,
      instagramOverrideUsed: false,
      tiktokSessionTime: 0,
      instagramSessionTime: 0,
      lastResetDate: today(),
    }
    await setStorage(reset)
    return { ...state, ...reset }
  }
  return state
}
