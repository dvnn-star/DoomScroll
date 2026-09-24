<script setup lang="ts">
import type { Ref } from 'vue'
import WarningBanner from './WarningBanner.vue'

defineProps<{
  site: Ref<'tiktok' | 'instagram'>
  showWarning: Ref<boolean>
  warningRemaining: Ref<number>
  limitReached: Ref<boolean>
}>()

const emit = defineEmits<{
  'dismiss-warning': []
}>()
</script>

<template>
  <div>
    <WarningBanner
      v-if="showWarning.value"
      :site="site"
      :remaining="warningRemaining.value"
      @dismiss="emit('dismiss-warning')"
    />
    <div
      v-if="limitReached.value"
      class="fixed inset-0 z-[2147483647] bg-white/95 flex flex-col items-center justify-center font-sans"
    >
      <div class="text-5xl mb-4">
        ✋
      </div>
      <h2 class="text-xl font-bold text-gray-900 mb-2">
        Session limit reached
      </h2>
      <p class="text-gray-500 text-sm text-center max-w-xs">
        This tab will close momentarily. Take a break — you've got this.
      </p>
    </div>
  </div>
</template>
