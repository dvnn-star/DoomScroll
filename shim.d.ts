import type { ProtocolWithReturn } from 'webext-bridge'

export interface StorageSchema {
  tiktokSessionTime: number
  instagramSessionTime: number
  tiktokOverrideUsed: boolean
  instagramOverrideUsed: boolean
  tiktokLimit: number
  instagramLimit: number
  strictMode: boolean
  lastResetDate: string
  enabledSites: ('tiktok' | 'instagram')[]
}

declare module 'webext-bridge' {
  export interface ProtocolMap {
    'session-update': { site: 'tiktok' | 'instagram', delta: number }
    'warning-show': { site: 'tiktok' | 'instagram', remaining: number }
    'limit-reached': { site: 'tiktok' | 'instagram' }
    'override-activate': ProtocolWithReturn<{ site: 'tiktok' | 'instagram' }, { success: boolean }>
    'state-sync': StorageSchema
  }
}
