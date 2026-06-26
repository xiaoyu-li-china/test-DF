<template>
  <div
    v-if="connectionStatus !== 'connected'"
    class="w-full h-10 flex items-center justify-center text-white font-medium transition-colors duration-300"
    :class="bannerClass"
  >
    <span class="animate-pulse mr-2 text-lg">●</span>
    <span>{{ bannerText }}</span>
    <button
      v-if="connectionStatus === 'disconnected'"
      class="ml-4 px-3 py-1 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors text-sm"
      @click="handleReconnect"
    >
      立即重连
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useShiftStore } from '../stores/shift'
import type { ConnectionStatus } from '../types'

const store = useShiftStore()

const connectionStatus = computed<ConnectionStatus>(() => store.connectionStatus)

const bannerClass = computed(() => {
  switch (connectionStatus.value) {
    case 'disconnected':
      return 'bg-red-600'
    case 'reconnecting':
      return 'bg-yellow-500'
    default:
      return 'bg-green-500'
  }
})

const bannerText = computed(() => {
  switch (connectionStatus.value) {
    case 'disconnected':
      return '同步中断 - 数据可能已过期，请检查网络连接'
    case 'reconnecting':
      return '正在重新连接...'
    default:
      return '连接正常'
  }
})

function handleReconnect() {
  store.forceReconnect()
}
</script>
