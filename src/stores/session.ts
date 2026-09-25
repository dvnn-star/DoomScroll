import { defineStore } from 'pinia'
import type { BlockedSite, StorageSchema } from '../../shim'
import { getStorage, makeSite, setStorage } from '~/logic/storage'

const MAX_LIMIT_MS = 120 * 60 * 1000
const MIN_LIMIT_MS = 1 * 60 * 1000

export const useSessionStore = defineStore('session', {
  state: (): StorageSchema => ({
    blockedSites: [],
    strictMode: false,
    lastResetDate: new Date().toLocaleDateString(),
  }),

  getters: {
    getSite: state => (id: string) =>
      state.blockedSites.find(s => s.id === id),

    remaining: state => (id: string) => {
      const site = state.blockedSites.find(s => s.id === id)
      if (!site)
        return 0
      return Math.max(0, site.limitMs - site.sessionTime)
    },

    isWarning: state => (id: string) => {
      const site = state.blockedSites.find(s => s.id === id)
      if (!site)
        return false
      const rem = site.limitMs - site.sessionTime
      return rem <= 5 * 60 * 1000 && rem > 0
    },

    canOverride: state => (id: string) => {
      if (state.strictMode)
        return false
      const site = state.blockedSites.find(s => s.id === id)
      return site ? !site.overrideUsed : false
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

    async addSite(domain: string) {
      const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
      if (!clean || this.blockedSites.find(s => s.id === clean))
        return
      const updated = [...this.blockedSites, makeSite(clean)]
      await this.save({ blockedSites: updated })
    },

    async removeSite(id: string) {
      const updated = this.blockedSites.filter(s => s.id !== id)
      await this.save({ blockedSites: updated })
    },

    async updateSite(id: string, patch: Partial<BlockedSite>) {
      const updated = this.blockedSites.map(s =>
        s.id === id ? { ...s, ...patch } : s,
      )
      await this.save({ blockedSites: updated })
    },

    async setLimit(id: string, ms: number) {
      const clamped = Math.min(Math.max(ms, MIN_LIMIT_MS), MAX_LIMIT_MS)
      await this.updateSite(id, { limitMs: clamped })
    },
  },
})
