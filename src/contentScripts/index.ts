import { onMessage, sendMessage } from 'webext-bridge/content-script'
import { createApp, ref } from 'vue'
import App from './views/App.vue'
import { setupApp } from '~/logic/common-setup'

async function getMatchedSiteId(): Promise<string | null> {
  const state = await browser.storage.local.get('blockedSites') as { blockedSites?: { id: string, domain: string }[] }
  const sites = state.blockedSites ?? []
  const host = location.hostname.replace(/^www\./, '')
  const match = sites.find((s) => {
    const d = s.domain.replace(/^www\./, '')
    return host === d || host.endsWith(`.${d}`)
  })
  return match?.id ?? null
}

;(async () => {
  const siteId = await getMatchedSiteId()
  if (!siteId)
    return

  const container = document.createElement('div')
  container.id = __NAME__
  const root = document.createElement('div')
  const styleEl = document.createElement('link')
  const shadowDOM = container.attachShadow?.({ mode: __DEV__ ? 'open' : 'closed' }) || container
  styleEl.setAttribute('rel', 'stylesheet')
  styleEl.setAttribute('href', browser.runtime.getURL('dist/contentScripts/style.css'))
  shadowDOM.appendChild(styleEl)
  shadowDOM.appendChild(root)
  document.body.appendChild(container)

  const showWarning = ref(false)
  const warningRemaining = ref(0)
  const limitReached = ref(false)
  const currentSiteId = ref(siteId)

  // Real-time active session heartbeat
  let lastHeartbeat = Date.now()
  const HEARTBEAT_INTERVAL_MS = 1000

  setInterval(() => {
    if (document.visibilityState === 'visible') {
      const now = Date.now()
      const delta = Math.min(now - lastHeartbeat, 3000)
      lastHeartbeat = now

      sendMessage('session-update', { siteId, delta }, 'background').catch(() => {})

      if (showWarning.value && warningRemaining.value > 0) {
        warningRemaining.value = Math.max(0, warningRemaining.value - delta)
      }
    }
    else {
      lastHeartbeat = Date.now()
    }
  }, HEARTBEAT_INTERVAL_MS)

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      lastHeartbeat = Date.now()
    }
  })

  onMessage('warning-show', ({ data }) => {
    if (data.siteId !== siteId)
      return
    showWarning.value = true
    warningRemaining.value = data.remaining
  })

  onMessage('limit-reached', ({ data }) => {
    if (data.siteId !== siteId)
      return
    limitReached.value = true
    showWarning.value = false
  })

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
})()
