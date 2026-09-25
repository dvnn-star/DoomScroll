import { onMessage, sendMessage } from 'webext-bridge/content-script'
import { createApp, ref } from 'vue'
import type { BlockedSite } from '../../shim'
import App from './views/App.vue'
import { setupApp } from '~/logic/common-setup'
import { getStorage, setStorage } from '~/logic/storage'
import '../styles'

function getMatchedSite(sites: BlockedSite[]): BlockedSite | null {
  const host = location.hostname.replace(/^www\./, '').toLowerCase()
  return sites.find((s) => {
    const d = s.domain.replace(/^www\./, '').toLowerCase()
    return host === d || host.endsWith(`.${d}`)
  }) ?? null
}

;(async () => {
  const showWarning = ref(false)
  const warningRemaining = ref(0)
  const limitReached = ref(false)
  const currentSiteId = ref('')

  let currentSite: BlockedSite | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let lastHeartbeat = Date.now()
  let isMounted = false

  function mountUi() {
    if (isMounted || document.getElementById(__NAME__))
      return
    isMounted = true

    const container = document.createElement('div')
    container.id = __NAME__
    const root = document.createElement('div')
    const styleEl = document.createElement('link')
    const shadowDOM = container.attachShadow?.({ mode: __DEV__ ? 'open' : 'closed' }) || container
    styleEl.setAttribute('rel', 'stylesheet')
    styleEl.setAttribute('href', browser.runtime.getURL('dist/contentScripts/style.css'))
    shadowDOM.appendChild(styleEl)
    shadowDOM.appendChild(root)

    const attach = () => {
      if (document.body) {
        document.body.appendChild(container)
      }
      else if (document.documentElement) {
        document.documentElement.appendChild(container)
      }
    }

    if (document.body || document.documentElement) {
      attach()
    }
    else {
      document.addEventListener('DOMContentLoaded', attach)
    }

    const app = createApp(App, {
      siteId: currentSiteId,
      showWarning,
      warningRemaining,
      limitReached,
      onDismissWarning: () => {
        showWarning.value = false
      },
    })
    setupApp(app)
    app.mount(root)
  }

  async function sendHeartbeat() {
    if (!currentSite)
      return
    if (document.visibilityState !== 'visible') {
      lastHeartbeat = Date.now()
      return
    }

    const siteId = currentSite.id
    const now = Date.now()
    const delta = Math.min(Math.max(now - lastHeartbeat, 1000), 3000)
    lastHeartbeat = now

    let bgHandled = false

    // 1. Native message to wake service worker
    try {
      if (typeof browser !== 'undefined' && browser.runtime?.sendMessage) {
        const res = await browser.runtime.sendMessage({ type: 'session-update', siteId, delta }) as { success?: boolean } | undefined
        if (res?.success)
          bgHandled = true
      }
    }
    catch {
      // background service worker waking or inactive
    }

    // 2. webext-bridge message
    sendMessage('session-update', { siteId, delta }, 'background').catch(() => {})

    // 3. Fallback: Directly update local storage if background didn't ack
    if (!bgHandled) {
      try {
        const state = await getStorage()
        const idx = state.blockedSites.findIndex(s => s.id === siteId)
        if (idx !== -1) {
          const site = state.blockedSites[idx]
          const newSessionTime = site.sessionTime + delta
          const updated = [...state.blockedSites]
          updated[idx] = { ...site, sessionTime: newSessionTime }
          await setStorage({ blockedSites: updated })

          if (newSessionTime >= site.limitMs) {
            limitReached.value = true
            showWarning.value = false
            setTimeout(() => {
              window.location.replace('about:blank')
            }, 1200)
          }
          else {
            const remaining = site.limitMs - newSessionTime
            if (remaining <= 5 * 60 * 1000) {
              showWarning.value = true
              warningRemaining.value = remaining
            }
          }
        }
      }
      catch {}
    }

    if (showWarning.value && warningRemaining.value > 0) {
      warningRemaining.value = Math.max(0, warningRemaining.value - delta)
    }
  }

  function startTracking(site: BlockedSite) {
    currentSite = site
    currentSiteId.value = site.id
    mountUi()

    if (heartbeatTimer)
      clearInterval(heartbeatTimer)

    lastHeartbeat = Date.now()
    heartbeatTimer = setInterval(sendHeartbeat, 1000)
    // Run immediate heartbeat on start
    sendHeartbeat().catch(() => {})
  }

  function stopTracking() {
    currentSite = null
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  // Initial site detection
  const state = await getStorage()
  const matched = getMatchedSite(state.blockedSites)
  if (matched) {
    startTracking(matched)
  }

  // Listen for storage changes (e.g. user adds/removes domain in Options)
  if (typeof browser !== 'undefined' && browser.storage?.onChanged) {
    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.blockedSites) {
        const newSites = changes.blockedSites.newValue as BlockedSite[] | undefined
        if (newSites) {
          const m = getMatchedSite(newSites)
          if (m) {
            startTracking(m)
          }
          else {
            stopTracking()
          }
        }
      }
    })
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      lastHeartbeat = Date.now()
      if (currentSite)
        sendHeartbeat().catch(() => {})
    }
  })

  onMessage('warning-show', ({ data }) => {
    if (currentSite && data.siteId !== currentSite.id)
      return
    showWarning.value = true
    warningRemaining.value = data.remaining
  })

  onMessage('limit-reached', ({ data }) => {
    if (currentSite && data.siteId !== currentSite.id)
      return
    limitReached.value = true
    showWarning.value = false
    setTimeout(() => {
      window.location.replace('about:blank')
    }, 1200)
  })
})()
