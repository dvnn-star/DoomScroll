<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { sendMessage } from 'webext-bridge/content-script'
import type { Ref } from 'vue'

const props = defineProps<{
  siteId: Ref<string>
  remaining: number
}>()

const emit = defineEmits<{
  dismiss: []
}>()

const localRemaining = ref(props.remaining)

watch(() => props.remaining, (newVal) => {
  localRemaining.value = newVal
})

let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    if (localRemaining.value > 0)
      localRemaining.value = Math.max(0, localRemaining.value - 1000)
  }, 1000)
})

onUnmounted(() => {
  if (timer)
    clearInterval(timer)
})

const formattedTime = computed(() => {
  const totalSec = Math.max(0, Math.floor(localRemaining.value / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
})

async function useOverride() {
  const result = await sendMessage('override-activate', { siteId: props.siteId.value }, 'background')
  if (result?.success)
    emit('dismiss')
}
</script>

<template>
  <div class="fixed top-4 left-1/2 -translate-x-1/2 z-[2147483647] w-[340px] bg-white rounded-2xl shadow-xl border border-gray-200 p-5 font-sans">
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-xl">
        ⏳
      </div>
      <div class="flex-1">
        <p class="font-semibold text-gray-900 text-sm">
          {{ siteId.value }}: {{ formattedTime }} left
        </p>
        <p class="text-gray-500 text-xs mt-0.5">
          Your session limit is almost up. Time to wrap up?
        </p>
      </div>
    </div>
    <div class="mt-4 flex gap-2">
      <button
        class="flex-1 text-xs px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer border-0 font-medium transition-colors"
        @click="emit('dismiss')"
      >
        Got it
      </button>
      <button
        class="flex-1 text-xs px-3 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 cursor-pointer border-0 font-medium transition-colors"
        @click="useOverride"
      >
        +15 min override
      </button>
    </div>
  </div>
</template>
