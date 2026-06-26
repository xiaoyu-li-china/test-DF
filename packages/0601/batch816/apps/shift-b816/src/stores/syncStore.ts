import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface PendingUpdate {
  timestamp: number
  data: unknown
}

export const useSyncStore = defineStore('sync', () => {
  const isOnline = ref(navigator.onLine)
  const lastSyncTime = ref(Date.now())
  const pendingUpdates = ref<PendingUpdate[]>([])
  const listenersBound = ref(false)

  const syncStatusText = computed(() => {
    if (!isOnline.value) return '同步中断'
    return '已同步'
  })

  function handleOnline() {
    setOnline(true)
  }

  function handleOffline() {
    setOnline(false)
  }

  function setOnline(status: boolean) {
    const wasOffline = !isOnline.value
    isOnline.value = status
    if (status && wasOffline) {
      syncOnReconnect()
    }
  }

  function queueUpdate(data: unknown) {
    if (!isOnline.value) {
      pendingUpdates.value.push({
        timestamp: Date.now(),
        data,
      })
    }
  }

  async function syncOnReconnect() {
    if (pendingUpdates.value.length > 0) {
      const updates = [...pendingUpdates.value]
      pendingUpdates.value = []
      for (const update of updates) {
        await new Promise((r) => setTimeout(r, 50))
      }
    }
    lastSyncTime.value = Date.now()
  }

  function initNetworkListeners() {
    if (listenersBound.value) return
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    listenersBound.value = true
  }

  function destroyNetworkListeners() {
    if (!listenersBound.value) return
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    listenersBound.value = false
  }

  return {
    isOnline,
    lastSyncTime,
    pendingUpdates,
    syncStatusText,
    setOnline,
    queueUpdate,
    syncOnReconnect,
    initNetworkListeners,
    destroyNetworkListeners,
  }
})
