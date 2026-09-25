import fs from 'fs-extra'
import type { Manifest } from 'webextension-polyfill'
import type PkgType from '../package.json'
import { isDev, isFirefox, port, r } from '../scripts/utils'

export async function getManifest() {
  const pkg = await fs.readJSON(r('package.json')) as typeof PkgType

  const manifest: Manifest.WebExtensionManifest = {
    manifest_version: 3,
    name: pkg.displayName || pkg.name,
    version: pkg.version,
    description: pkg.description,
    action: {
      default_icon: 'assets/icon-512.png',
      default_popup: 'dist/popup/index.html',
    },
    options_ui: {
      page: 'dist/options/index.html',
      open_in_tab: true,
    },
    background: isFirefox
      ? {
          scripts: ['dist/background/index.mjs'],
          type: 'module',
        }
      : {
          service_worker: 'dist/background/index.mjs',
        },
    icons: {
      16: 'assets/icon-512.png',
      48: 'assets/icon-512.png',
      128: 'assets/icon-512.png',
    },
    permissions: [
      'tabs',
      'storage',
      'activeTab',
      'alarms',
      'notifications',
    ],
    host_permissions: ['*://*/*'],
    content_scripts: [
      {
        matches: ['*://*/*'],
        js: ['dist/contentScripts/index.global.js'],
      },
    ],
    web_accessible_resources: [
      {
        resources: ['dist/contentScripts/style.css'],
        matches: ['*://*/*'],
      },
    ],
    content_security_policy: {
      extension_pages: isDev
        ? `script-src 'self' http://localhost:${port}; object-src 'self'`
        : 'script-src \'self\'; object-src \'self\'',
    },
  }

  return manifest
}
