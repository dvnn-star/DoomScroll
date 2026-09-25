import path from 'node:path'
import fs from 'fs-extra'
import { expect, extensionPath, test } from './fixtures'

function popupUrl(extensionId: string) {
  return `chrome-extension://${extensionId}/dist/popup/index.html`
}

function optionsUrl(extensionId: string) {
  return `chrome-extension://${extensionId}/dist/options/index.html`
}

// ─── Popup ────────────────────────────────────────────────────────────────────

test.describe('Popup', () => {
  test('shows extension title', async ({ page, extensionId }) => {
    await page.goto(popupUrl(extensionId))
    await expect(page.locator('text=StopDoomscrolling').first()).toBeVisible()
  })

  test('shows Settings link', async ({ page, extensionId }) => {
    await page.goto(popupUrl(extensionId))
    await expect(page.locator('button', { hasText: 'Settings' })).toBeVisible()
  })

  test('shows default blocked sites tiktok.com and instagram.com', async ({ page, extensionId }) => {
    await page.goto(popupUrl(extensionId))
    await expect(page.locator('text=tiktok.com')).toBeVisible()
    await expect(page.locator('text=instagram.com')).toBeVisible()
  })

  test('shows time remaining for each site', async ({ page, extensionId }) => {
    await page.goto(popupUrl(extensionId))
    const leftBadges = page.locator('text=left')
    await expect(leftBadges.first()).toBeVisible()
  })

  test('shows progress bar for each site', async ({ page, extensionId }) => {
    await page.goto(popupUrl(extensionId))
    const bars = page.locator('.rounded-full.transition-all')
    await expect(bars.first()).toBeVisible()
  })

  test('shows +15 min override button when override not used', async ({ page, extensionId }) => {
    await page.goto(popupUrl(extensionId))
    await expect(page.locator('button', { hasText: '+15 min' }).first()).toBeVisible()
  })

  test('Settings button opens options page', async ({ page, extensionId, context }) => {
    await page.goto(popupUrl(extensionId))
    const [optionsPage] = await Promise.all([
      context.waitForEvent('page'),
      page.locator('button', { hasText: 'Settings' }).click(),
    ])
    await optionsPage.waitForLoadState()
    await expect(optionsPage.locator('text=StopDoomscrolling').first()).toBeVisible()
    await optionsPage.close()
  })
})

// ─── Options: Add / Remove Site ───────────────────────────────────────────────

test.describe('Options — Add/Remove site', () => {
  test('shows Add Website section', async ({ page, extensionId }) => {
    await page.goto(optionsUrl(extensionId))
    await expect(page.locator('text=Add Website')).toBeVisible()
  })

  test('shows domain input placeholder', async ({ page, extensionId }) => {
    await page.goto(optionsUrl(extensionId))
    await expect(page.locator('input[placeholder="youtube.com"]')).toBeVisible()
  })

  test('adds a new site', async ({ page, extensionId }) => {
    await page.goto(optionsUrl(extensionId))
    await page.locator('input[placeholder="youtube.com"]').fill('youtube.com')
    await page.locator('button', { hasText: 'Add' }).click()
    await expect(page.locator('text=youtube.com').first()).toBeVisible()
  })

  test('rejects duplicate domain', async ({ page, extensionId }) => {
    await page.goto(optionsUrl(extensionId))
    await page.locator('input[placeholder="youtube.com"]').fill('tiktok.com')
    await page.locator('button', { hasText: 'Add' }).click()
    await expect(page.locator('text=already in the list')).toBeVisible()
  })

  test('rejects empty input', async ({ page, extensionId }) => {
    await page.goto(optionsUrl(extensionId))
    await page.locator('button', { hasText: 'Add' }).click()
    await expect(page.locator('text=Please enter a domain')).toBeVisible()
  })

  test('rejects invalid domain without dot', async ({ page, extensionId }) => {
    await page.goto(optionsUrl(extensionId))
    await page.locator('input[placeholder="youtube.com"]').fill('notadomain')
    await page.locator('button', { hasText: 'Add' }).click()
    await expect(page.locator('text=valid domain')).toBeVisible()
  })

  test('strips https:// prefix when adding', async ({ page, extensionId }) => {
    await page.goto(optionsUrl(extensionId))
    await page.locator('input[placeholder="youtube.com"]').fill('https://reddit.com/r/all')
    await page.locator('button', { hasText: 'Add' }).click()
    await expect(page.locator('text=reddit.com').first()).toBeVisible()
  })

  test('removes a site', async ({ page, extensionId }) => {
    await page.goto(optionsUrl(extensionId))
    await page.locator('input[placeholder="youtube.com"]').fill('removetest.com')
    await page.locator('button', { hasText: 'Add' }).click()
    await expect(page.locator('text=removetest.com')).toBeVisible()

    const row = page.locator('div').filter({ hasText: /^removetest\.com/ }).last()
    await row.locator('button', { hasText: 'Remove' }).click()
    await expect(page.locator('text=removetest.com')).not.toBeVisible()
  })

  test('pressing Enter in input adds site', async ({ page, extensionId }) => {
    await page.goto(optionsUrl(extensionId))
    await page.locator('input[placeholder="youtube.com"]').fill('entertest.com')
    await page.locator('input[placeholder="youtube.com"]').press('Enter')
    await expect(page.locator('text=entertest.com').first()).toBeVisible()
  })
})

// ─── Options: Limit ───────────────────────────────────────────────────────────

test.describe('Options — Per-site limit', () => {
  test('shows limit input for each site', async ({ page, extensionId }) => {
    await page.goto(optionsUrl(extensionId))
    const limitInputs = page.locator('input[type="number"]')
    await expect(limitInputs.first()).toBeVisible()
  })

  test('saves a custom limit', async ({ page, extensionId }) => {
    await page.goto(optionsUrl(extensionId))
    const firstInput = page.locator('input[type="number"]').first()
    await firstInput.fill('45')
    await page.locator('button', { hasText: 'Save' }).first().click()
    await expect(page.locator('text=Saved ✓').first()).toBeVisible()
  })

  test('shows max 120 min label', async ({ page, extensionId }) => {
    await page.goto(optionsUrl(extensionId))
    await expect(page.locator('text=max 120').first()).toBeVisible()
  })

  test('shows warning timing note', async ({ page, extensionId }) => {
    await page.goto(optionsUrl(extensionId))
    await expect(page.locator('text=Warning shown 5 min before limit').first()).toBeVisible()
  })

  test('shows session usage in minutes', async ({ page, extensionId }) => {
    await page.goto(optionsUrl(extensionId))
    await expect(page.locator('text=min used today').first()).toBeVisible()
  })
})

// ─── Options: Strict Mode ─────────────────────────────────────────────────────

test.describe('Options — Strict Mode', () => {
  test('shows Strict Mode section', async ({ page, extensionId }) => {
    await page.goto(optionsUrl(extensionId))
    await expect(page.locator('text=Strict Mode').first()).toBeVisible()
  })

  test('strict mode toggle enables and shows warning', async ({ page, extensionId }) => {
    await page.goto(optionsUrl(extensionId))
    const toggle = page.locator('input[type="checkbox"]').last()
    await toggle.check({ force: true })
    await expect(page.locator('text=Strict Mode is on')).toBeVisible()
  })

  test('strict mode can be disabled', async ({ page, extensionId }) => {
    await page.goto(optionsUrl(extensionId))
    const toggle = page.locator('input[type="checkbox"]').last()
    await toggle.check({ force: true })
    await expect(page.locator('text=Strict Mode is on')).toBeVisible()
    await toggle.uncheck({ force: true })
    await expect(page.locator('text=Strict Mode is on')).not.toBeVisible()
  })

  test('popup shows Strict mode label when enabled', async ({ page, extensionId, context }) => {
    const optPage = await context.newPage()
    await optPage.goto(optionsUrl(extensionId))
    const toggle = optPage.locator('input[type="checkbox"]').last()
    await toggle.check({ force: true })
    await optPage.close()

    await page.goto(popupUrl(extensionId))
    await expect(page.locator('text=Strict mode').first()).toBeVisible()

    // cleanup — disable strict mode
    const cleanup = await context.newPage()
    await cleanup.goto(optionsUrl(extensionId))
    const cleanToggle = cleanup.locator('input[type="checkbox"]').last()
    await cleanToggle.uncheck({ force: true })
    await cleanup.close()
  })
})

// ─── Options: Reset ───────────────────────────────────────────────────────────

test.describe('Options — Reset session data', () => {
  test('shows Reset section', async ({ page, extensionId }) => {
    await page.goto(optionsUrl(extensionId))
    await expect(page.locator('text=Reset Today\'s Data')).toBeVisible()
  })

  test('shows reset button', async ({ page, extensionId }) => {
    await page.goto(optionsUrl(extensionId))
    await expect(page.locator('button', { hasText: 'Reset session data' })).toBeVisible()
  })

  test('reset button is clickable and does not crash', async ({ page, extensionId }) => {
    await page.goto(optionsUrl(extensionId))
    await page.locator('button', { hasText: 'Reset session data' }).click()
    await expect(page.locator('text=StopDoomscrolling').first()).toBeVisible()
  })
})

// ─── Manifest ─────────────────────────────────────────────────────────────────

test.describe('Manifest', () => {
  test('manifest has correct permissions', async () => {
    const manifest = fs.readJsonSync(path.join(extensionPath, 'manifest.json'))
    expect(manifest.permissions).toContain('storage')
    expect(manifest.permissions).toContain('tabs')
    expect(manifest.permissions).toContain('alarms')
    expect(manifest.permissions).toContain('notifications')
  })

  test('manifest has all_urls host permission for dynamic site matching', async () => {
    const manifest = fs.readJsonSync(path.join(extensionPath, 'manifest.json'))
    expect(manifest.host_permissions).toContain('*://*/*')
  })

  test('manifest content_scripts matches all urls', async () => {
    const manifest = fs.readJsonSync(path.join(extensionPath, 'manifest.json'))
    const matches = manifest.content_scripts?.[0]?.matches ?? []
    expect(matches).toContain('*://*/*')
  })

  test('manifest has service worker', async () => {
    const manifest = fs.readJsonSync(path.join(extensionPath, 'manifest.json'))
    expect(manifest.background?.service_worker).toBe('dist/background/index.mjs')
  })

  test('manifest version is 3', async () => {
    const manifest = fs.readJsonSync(path.join(extensionPath, 'manifest.json'))
    expect(manifest.manifest_version).toBe(3)
  })
})

// ─── Content Script ───────────────────────────────────────────────────────────

test.describe('Content Script', () => {
  test('does not inject on non-blocked site', async ({ page }) => {
    await page.goto('https://example.com')
    await page.waitForTimeout(1500)
    const shadowHost = page.locator('#stopdoomscrolling')
    await expect(shadowHost).not.toBeVisible()
  })
})
