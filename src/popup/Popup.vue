<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { sendMessage } from 'webext-bridge/popup'
import { useSessionStore } from '~/stores/session'

const store = useSessionStore()

onMounted(() => store.load())

function openOptionsPage() {
  browser.runtime.openOptionsPage()
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

type Site = 'tiktok' | 'instagram'

const sites: { key: Site, label: string }[] = [
  { key: 'tiktok', label: 'TikTok' },
  { key: 'instagram', label: 'Instagram' },
]

function sessionTime(site: Site) {
  return site === 'tiktok' ? store.tiktokSessionTime : store.instagramSessionTime
}

function remaining(site: Site) {
  return site === 'tiktok' ? store.tiktokRemaining : store.instagramRemaining
}

function limit(site: Site) {
  return site === 'tiktok' ? store.tiktokLimit : store.instagramLimit
}

function overrideUsed(site: Site) {
  return site === 'tiktok' ? store.tiktokOverrideUsed : store.instagramOverrideUsed
}

function progress(site: Site) {
  const lim = limit(site)
  return lim > 0 ? Math.min(100, (sessionTime(site) / lim) * 100) : 0
}

async function activateOverride(site: Site) {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true })
  const tab = tabs[0]
  if (!tab?.id)
    return
  await sendMessage('override-activate', { site }, 'background')
  await store.load()
}

const isEnabled = computed(() => store.enabledSites.length > 0)
</script>

<template>
  <main class="w-[320px] bg-white text-gray-800 font-sans">
    <div class="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-lg">🛑</span>
        <span class="font-semibold text-sm text-gray-900">StopDoomscrolling</span>
      </div>
      <button
        class="text-xs text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-0"
        @click="openOptionsPage"
      >
        Settings
      </button>
    </div>

    <div v-if="!isEnabled" class="px-4 py-6 text-center text-gray-400 text-sm">
      No sites being tracked. Open Settings to configure.
    </div>

    <div v-else class="divide-y divide-gray-50">
      <div v-for="s in sites" :key="s.key" class="px-4 py-4">
        <div class="flex items-center justify-between mb-2">
          <span class="font-medium text-sm text-gray-800">{{ s.label }}</span>
          <span
            class="text-xs px-2 py-0.5 rounded-full font-medium"
            :class="remaining(s.key) <= 0 ? 'bg-red-100 text-red-600' : remaining(s.key) <= 5 * 60 * 1000 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'"
          >
            {{ remaining(s.key) <= 0 ? 'Limit reached' : `${formatTime(remaining(s.key))} left` }}
          </span>
        </div>

        <div class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            class="h-full rounded-full transition-all"
            :class="progress(s.key) >= 100 ? 'bg-red-500' : progress(s.key) >= 80 ? 'bg-amber-400' : 'bg-teal-500'"
            :style="{ width: `${progress(s.key)}%` }"
          />
        </div>

        <div class="flex items-center justify-between text-xs text-gray-400">
          <span>{{ formatTime(sessionTime(s.key)) }} used of {{ formatTime(limit(s.key)) }}</span>
          <button
            v-if="!store.strictMode && !overrideUsed(s.key)"
            class="text-xs text-amber-600 hover:text-amber-700 cursor-pointer bg-transparent border-0 font-medium"
            @click="activateOverride(s.key)"
          >
            Use +15 min
          </button>
          <span v-else-if="overrideUsed(s.key)" class="text-gray-300">Override used</span>
          <span v-else-if="store.strictMode" class="text-gray-300">Strict mode</span>
        </div>
      </div>
    </div>
  </main>
</template>
