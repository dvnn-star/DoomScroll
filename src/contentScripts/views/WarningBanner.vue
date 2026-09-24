<script setup lang="ts">
import { sendMessage } from 'webext-bridge/content-script'
import type { Ref } from 'vue'

const props = defineProps<{
  site: Ref<'tiktok' | 'instagram'>
  remaining: number
}>()

const emit = defineEmits<{
  dismiss: []
}>()

const siteLabel = props.site.value === 'tiktok' ? 'TikTok' : 'Instagram'
const mins = Math.ceil(props.remaining / 60000)

async function useOverride() {
  const result = await sendMessage('override-activate', { site: props.site.value }, 'background')
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
          {{ siteLabel }}: {{ mins }} minute{{ mins !== 1 ? 's' : '' }} left
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
