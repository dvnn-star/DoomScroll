<script setup lang="ts">
import { onMounted } from 'vue'
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

function progress(sessionTime: number, limitMs: number) {
  return limitMs > 0 ? Math.min(100, (sessionTime / limitMs) * 100) : 0
}

async function activateOverride(siteId: string) {
  await sendMessage('override-activate', { siteId }, 'background')
  await store.load()
}
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

    <div v-if="store.blockedSites.length === 0" class="px-4 py-6 text-center text-gray-400 text-sm">
      No sites tracked. Open Settings to add a site.
    </div>

    <div v-else class="divide-y divide-gray-50">
      <div v-for="site in store.blockedSites" :key="site.id" class="px-4 py-4">
        <div class="flex items-center justify-between mb-2">
          <span class="font-medium text-sm text-gray-800 truncate max-w-[160px]">{{ site.domain }}</span>
          <span
            class="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
            :class="store.remaining(site.id) <= 0
              ? 'bg-red-100 text-red-600'
              : store.isWarning(site.id)
                ? 'bg-amber-100 text-amber-700'
                : 'bg-green-100 text-green-700'"
          >
            {{ store.remaining(site.id) <= 0 ? 'Limit reached' : `${formatTime(store.remaining(site.id))} left` }}
          </span>
        </div>

        <div class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            class="h-full rounded-full transition-all"
            :class="progress(site.sessionTime, site.limitMs) >= 100
              ? 'bg-red-500'
              : progress(site.sessionTime, site.limitMs) >= 80
                ? 'bg-amber-400'
                : 'bg-teal-500'"
            :style="{ width: `${progress(site.sessionTime, site.limitMs)}%` }"
          />
        </div>

        <div class="flex items-center justify-between text-xs text-gray-400">
          <span>{{ formatTime(site.sessionTime) }} / {{ formatTime(site.limitMs) }}</span>
          <button
            v-if="store.canOverride(site.id)"
            class="text-xs text-amber-600 hover:text-amber-700 cursor-pointer bg-transparent border-0 font-medium"
            @click="activateOverride(site.id)"
          >
            +15 min
          </button>
          <span v-else-if="site.overrideUsed" class="text-gray-300">Override used</span>
          <span v-else-if="store.strictMode" class="text-gray-300">Strict mode</span>
        </div>
      </div>
    </div>
  </main>
</template>
