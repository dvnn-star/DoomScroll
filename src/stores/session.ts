import { defineStore } from 'pinia'
import type { StorageSchema } from '../../shim'
import { getStorage, setStorage } from '~/logic/storage'

const MAX_LIMIT_MS = 120 * 60 * 1000
const DEFAULT_LIMIT_MS = 30 * 60 * 1000

export const useSessionStore = defineStore('session', {
  state: (): StorageSchema => ({
    tiktokSessionTime: 0,
    instagramSessionTime: 0,
    tiktokOverrideUsed: false,
    instagramOverrideUsed: false,
    tiktokLimit: DEFAULT_LIMIT_MS,
    instagramLimit: DEFAULT_LIMIT_MS,
    strictMode: false,
    lastResetDate: new Date().toLocaleDateString(),
    enabledSites: ['tiktok', 'instagram'],
  }),

  getters: {
    tiktokRemaining: state => Math.max(0, state.tiktokLimit - state.tiktokSessionTime),
    instagramRemaining: state => Math.max(0, state.instagramLimit - state.instagramSessionTime),

    tiktokWarning: state =>
      state.tiktokSessionTime >= state.tiktokLimit - 5 * 60 * 1000
      && state.tiktokSessionTime < state.tiktokLimit,

    instagramWarning: state =>
      state.instagramSessionTime >= state.instagramLimit - 5 * 60 * 1000
      && state.instagramSessionTime < state.instagramLimit,

    canOverride: (state) => {
      return (site: 'tiktok' | 'instagram') => {
        if (state.strictMode)
          return false
        return site === 'tiktok' ? !state.tiktokOverrideUsed : !state.instagramOverrideUsed
      }
    },
  },

  actions: {
    async load() {
      const data = await getStorage()
      this.$patch(data)
    },

    async save(partial: Partial<StorageSchema>) {
      this.$patch(partial)
      await setStorage(partial)
    },

    async setLimit(site: 'tiktok' | 'instagram', ms: number) {
      const clamped = Math.min(Math.max(ms, 60 * 1000), MAX_LIMIT_MS)
      if (site === 'tiktok')
        await this.save({ tiktokLimit: clamped })
      else
        await this.save({ instagramLimit: clamped })
    },
  },
})
