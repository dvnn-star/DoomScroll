import { onMessage } from 'webext-bridge/content-script'
import { createApp, ref } from 'vue'
import type { BlockedSite } from '../../shim'
import App from './views/App.vue'
import { setupApp } from '~/logic/common-setup'
import { getStorage } from '~/logic/storage'
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

  function startTracking(site: BlockedSite) {
    currentSite = site
    currentSiteId.value = site.id
    mountUi()
  }

  function stopTracking() {
    currentSite = null
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
