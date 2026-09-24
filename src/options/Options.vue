<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSessionStore } from '~/stores/session'

const store = useSessionStore()
onMounted(() => store.load())

const MAX_LIMIT_MIN = 120
const MIN_LIMIT_MIN = 1

type Site = 'tiktok' | 'instagram'

const sites: { key: Site, label: string }[] = [
  { key: 'tiktok', label: 'TikTok' },
  { key: 'instagram', label: 'Instagram' },
]

function getLimitMinutes(site: Site): number {
  const ms = site === 'tiktok' ? store.tiktokLimit : store.instagramLimit
  return Math.round(ms / 60000)
}

const limitInputs = ref<Record<Site, number>>({
  tiktok: Math.round((store.tiktokLimit || 30 * 60 * 1000) / 60000),
  instagram: Math.round((store.instagramLimit || 30 * 60 * 1000) / 60000),
})

onMounted(() => {
  limitInputs.value.tiktok = getLimitMinutes('tiktok')
  limitInputs.value.instagram = getLimitMinutes('instagram')
})

async function saveLimit(site: Site) {
  let val = limitInputs.value[site]
  val = Math.max(MIN_LIMIT_MIN, Math.min(MAX_LIMIT_MIN, val))
  limitInputs.value[site] = val
  await store.setLimit(site, val * 60 * 1000)
}

async function toggleStrictMode() {
  await store.save({ strictMode: !store.strictMode })
}

async function toggleSite(site: Site) {
  const current = [...store.enabledSites]
  const idx = current.indexOf(site)
  if (idx >= 0)
    current.splice(idx, 1)
  else
    current.push(site)
  await store.save({ enabledSites: current })
}

async function resetData() {
  await store.save({
    tiktokSessionTime: 0,
    instagramSessionTime: 0,
    tiktokOverrideUsed: false,
    instagramOverrideUsed: false,
    lastResetDate: new Date().toLocaleDateString(),
  })
}

const isSiteEnabled = (site: Site) => store.enabledSites.includes(site)

const saved = ref(false)
async function save(site: Site) {
  await saveLimit(site)
  saved.value = true
  setTimeout(() => {
    saved.value = false
  }, 1500)
}
</script>

<template>
  <main class="min-h-screen bg-gray-50 font-sans">
    <div class="max-w-lg mx-auto py-10 px-4">
      <div class="flex items-center gap-3 mb-8">
        <span class="text-3xl">🛑</span>
        <div>
          <h1 class="text-xl font-bold text-gray-900">
            StopDoomscrolling
          </h1>
          <p class="text-xs text-gray-400">
            Settings
          </p>
        </div>
      </div>

      <div class="space-y-4">
        <div v-for="s in sites" :key="s.key" class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-gray-900">
              {{ s.label }}
            </h2>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                class="sr-only peer"
                :checked="isSiteEnabled(s.key)"
                @change="toggleSite(s.key)"
              >
              <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600" />
            </label>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">
                Daily limit (minutes)
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="limitInputs[s.key]"
                  type="number"
                  :min="MIN_LIMIT_MIN"
                  :max="MAX_LIMIT_MIN"
                  class="w-24 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  @blur="saveLimit(s.key)"
                >
                <span class="text-xs text-gray-400">max {{ MAX_LIMIT_MIN }} min</span>
                <button
                  class="ml-auto text-xs px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg cursor-pointer border-0 font-medium transition-colors"
                  @click="save(s.key)"
                >
                  {{ saved ? 'Saved ✓' : 'Save' }}
                </button>
              </div>
              <p class="text-xs text-gray-400 mt-1">
                Warning shown 5 minutes before limit
              </p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="font-semibold text-gray-900">
                Strict Mode
              </h2>
              <p class="text-xs text-gray-400 mt-0.5">
                Disables the 15-minute override. Limit is final.
              </p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                class="sr-only peer"
                :checked="store.strictMode"
                @change="toggleStrictMode"
              >
              <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500" />
            </label>
          </div>
          <div v-if="store.strictMode" class="mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
            Strict Mode is on. Override is disabled for all sites.
          </div>
        </div>

        <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 class="font-semibold text-gray-900 mb-2">
            Reset Today's Data
          </h2>
          <p class="text-xs text-gray-400 mb-3">
            Clears session time and override state. Does not change your limits.
          </p>
          <button
            class="text-xs px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg cursor-pointer border-0 font-medium transition-colors"
            @click="resetData"
          >
            Reset session data
          </button>
        </div>
      </div>

      <p class="text-center text-xs text-gray-300 mt-8">
        All data stored locally. No servers.
      </p>
    </div>
  </main>
</template>
