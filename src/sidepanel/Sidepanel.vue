<script setup lang="ts">
function openOptionsPage() {
  browser.runtime.openOptionsPage()
}
</script>

<template>
  <main class="w-full px-4 py-5 text-center text-gray-700">
    <div class="text-2xl mb-2">
      🛑
    </div>
    <div class="font-semibold">
      StopDoomscrolling
    </div>
    <button class="btn mt-4" @click="openOptionsPage">
      Open Settings
    </button>
  </main>
</template>
