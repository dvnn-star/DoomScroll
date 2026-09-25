import type { ProtocolWithReturn } from 'webext-bridge'

export interface BlockedSite {
  id: string
  domain: string // e.g., "tiktok.com"
  sessionTime: number
  overrideUsed: boolean
  limitMs: number
}

export interface StorageSchema {
  blockedSites: BlockedSite[]
  strictMode: boolean
  lastResetDate: string
}

declare module 'webext-bridge' {
  export interface ProtocolMap {
    'session-update': { siteId: string, delta: number }
    'warning-show': { siteId: string, remaining: number }
    'limit-reached': { siteId: string }
    'override-activate': ProtocolWithReturn<{ siteId: string }, { success: boolean }>
    'state-sync': StorageSchema
  }
}
