import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import fs from 'fs-extra'
import { type BrowserContext, test as base, chromium } from '@playwright/test'
import type { Manifest } from 'webextension-polyfill'

export { name } from '../package.json'

export const extensionPath = path.join(__dirname, '../extension')

export const test = base.extend<{
  context: BrowserContext
  extensionId: string
}>({
  context: async (_, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      executablePath: '/usr/bin/google-chrome',
      args: [
        '--headless=new',
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    })
    await use(context)
    await context.close()
  },
  extensionId: async ({ context }, use) => {
    // Trigger service worker by waiting or navigating
    let [background] = context.serviceWorkers()
    if (!background) {
      // open a dummy page to wake up chrome's extension system
      const wake = await context.newPage()
      await wake.goto('about:blank')
      await sleep(2000)
      await wake.close()
    }

    background = context.serviceWorkers()[0]

    // If still not registered, wait with longer timeout
    if (!background) {
      background = await context.waitForEvent('serviceworker', { timeout: 20000 }).catch(() => null) as typeof background
    }

    if (!background) {
      // We'll read the extension ID from chrome internals page
      const page = await context.newPage()
      await page.goto('chrome://extensions-internals/')
      await sleep(1000)
      const content = await page.content()
      await page.close()
      // Try to extract ID from service worker or from opened pages
      const match = content.match(/"id":"([a-z]{32})"/)
      if (match) {
        await use(match[1])
        return
      }
      throw new Error(`Cannot determine extension ID. Service workers: ${context.serviceWorkers().length}`)
    }

    const extensionId = background.url().split('/')[2]
    await sleep(500)
    await use(extensionId)
  },
})

export const expect = test.expect

export function isDevArtifact() {
  const manifest: Manifest.WebExtensionManifest = fs.readJsonSync(path.resolve(extensionPath, 'manifest.json'))
  return Boolean(
    typeof manifest.content_security_policy === 'object'
    && manifest.content_security_policy.extension_pages?.includes('localhost'),
  )
}
