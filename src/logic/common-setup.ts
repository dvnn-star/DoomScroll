import type { App } from 'vue'
import { createPinia } from 'pinia'

export function setupApp(app: App) {
  app.use(createPinia())

  app.config.globalProperties.$app = {
    context: '',
  }

  app.provide('app', app.config.globalProperties.$app)
}
