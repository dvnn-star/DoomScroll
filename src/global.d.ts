declare const __DEV__: boolean
/** Extension name, defined in packageJson.name */
declare const __NAME__: string

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<object, object, unknown>
  export default component
}

// webextension-polyfill browser global (auto-imported via vite config)
declare const browser: typeof import('webextension-polyfill')
