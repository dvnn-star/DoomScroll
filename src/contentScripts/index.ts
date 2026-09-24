import { onMessage } from 'webext-bridge/content-script'
import { createApp, ref } from 'vue'
import App from './views/App.vue'
import { setupApp } from '~/logic/common-setup'

type Site = 'tiktok' | 'instagram'

function detectSite(): Site | null {
  const host = location.hostname
  if (host.includes('tiktok.com'))
    return 'tiktok'
  if (host.includes('instagram.com'))
    return 'instagram'
  return null
}

;(() => {
  const site = detectSite()
  if (!site)
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
  const currentSite = ref<Site>(site)

  onMessage('warning-show', ({ data }) => {
    if (data.site !== site)
      return
    showWarning.value = true
    warningRemaining.value = data.remaining
  })

  onMessage('limit-reached', ({ data }) => {
    if (data.site !== site)
      return
    limitReached.value = true
    showWarning.value = false
  })

  const app = createApp(App, {
    site: currentSite,
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
