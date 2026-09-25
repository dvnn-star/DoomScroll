<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSessionStore } from '~/stores/session'

const store = useSessionStore()
onMounted(() => store.load())

const MAX_LIMIT_MIN = 120
const MIN_LIMIT_MIN = 1

const newDomain = ref('')
const addError = ref('')
const savedId = ref('')

async function addSite() {
  addError.value = ''
  const val = newDomain.value.trim()
  if (!val) {
    addError.value = 'Please enter a domain.'
    return
  }
  const clean = val.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  if (!clean.includes('.')) {
    addError.value = 'Enter a valid domain (e.g. youtube.com)'
    return
  }
  if (store.blockedSites.find(s => s.id === clean)) {
    addError.value = `${clean} is already in the list.`
    return
  }
  await store.addSite(clean)
  newDomain.value = ''
}

async function removeSite(id: string) {
  await store.removeSite(id)
}

async function saveLimit(id: string, minutes: number) {
  const clamped = Math.max(MIN_LIMIT_MIN, Math.min(MAX_LIMIT_MIN, minutes))
  await store.setLimit(id, clamped * 60 * 1000)
  savedId.value = id
  setTimeout(() => {
    savedId.value = ''
  }, 1500)
}

async function toggleStrictMode() {
  await store.save({ strictMode: !store.strictMode })
}

async function resetData() {
  const updated = store.blockedSites.map(s => ({ ...s, sessionTime: 0, overrideUsed: false }))
  await store.save({
    blockedSites: updated,
    lastResetDate: new Date().toLocaleDateString(),
  })
}

function getLimitMinutes(id: string) {
  const site = store.blockedSites.find(s => s.id === id)
  return site ? Math.round(site.limitMs / 60000) : 30
}

const limitInputs = ref<Record<string, number>>({})

onMounted(async () => {
  await store.load()
  for (const s of store.blockedSites)
    limitInputs.value[s.id] = Math.round(s.limitMs / 60000)
})
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
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 class="font-semibold text-gray-900 mb-1">
            Add Website
          </h2>
          <p class="text-xs text-gray-400 mb-3">
            Enter any domain to limit (e.g. youtube.com, twitter.com)
          </p>
          <div class="flex gap-2">
            <input
              v-model="newDomain"
              type="text"
              placeholder="youtube.com"
              class="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              @keydown.enter="addSite"
            >
            <button
              class="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-lg cursor-pointer border-0 font-medium transition-colors"
              @click="addSite"
            >
              Add
            </button>
          </div>
          <p v-if="addError" class="text-xs text-red-500 mt-2">
            {{ addError }}
          </p>
        </div>

        <div v-if="store.blockedSites.length === 0" class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center text-gray-400 text-sm">
          No sites added yet. Add a domain above to start limiting.
        </div>

        <div
          v-for="site in store.blockedSites"
          :key="site.id"
          class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-800">{{ site.domain }}</span>
              <span
                v-if="site.overrideUsed"
                class="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full"
              >override used</span>
            </div>
            <button
              class="text-xs text-red-400 hover:text-red-600 cursor-pointer bg-transparent border-0 font-medium"
              @click="removeSite(site.id)"
            >
              Remove
            </button>
          </div>

          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-500 shrink-0">Limit (min):</label>
            <input
              v-model.number="limitInputs[site.id]"
              type="number"
              :min="MIN_LIMIT_MIN"
              :max="MAX_LIMIT_MIN"
              class="w-20 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
            <span class="text-xs text-gray-400">max {{ MAX_LIMIT_MIN }}</span>
            <button
              class="ml-auto text-xs px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg cursor-pointer border-0 font-medium transition-colors"
              @click="saveLimit(site.id, limitInputs[site.id] ?? getLimitMinutes(site.id))"
            >
              {{ savedId === site.id ? 'Saved ✓' : 'Save' }}
            </button>
          </div>
          <p class="text-xs text-gray-400 mt-1">
            Warning shown 5 min before limit · {{ Math.round(site.sessionTime / 60000) }} min used today
          </p>
        </div>

        <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="font-semibold text-gray-900">
                Strict Mode
              </h2>
              <p class="text-xs text-gray-400 mt-0.5">
                Disables the 15-minute override for all sites.
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
            Strict Mode is on. Override is disabled.
          </div>
        </div>

        <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 class="font-semibold text-gray-900 mb-1">
            Reset Today's Data
          </h2>
          <p class="text-xs text-gray-400 mb-3">
            Clears session time and override state for all sites.
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
