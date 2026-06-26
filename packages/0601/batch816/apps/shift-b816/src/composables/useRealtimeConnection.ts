import { ref, onUnmounted, onMounted } from 'vue'

interface UseRealtimeOptions {
  reconnectInterval?: number
  wsUrl?: string
}

export function useRealtimeConnection(options: UseRealtimeOptions = {}) {
  const { reconnectInterval = 5000 } = options

  const isConnected = ref(false)
  const wsInstance = ref<WebSocket | null>(null)
  const reconnectTimerId = ref<number | null>(null)
  const connectionAttempts = ref(0)

  function clearReconnectTimer() {
    if (reconnectTimerId.value !== null) {
      clearInterval(reconnectTimerId.value)
      reconnectTimerId.value = null
    }
  }

  function closeWebSocket() {
    if (wsInstance.value) {
      wsInstance.value.close()
      wsInstance.value = null
    }
  }

  function cleanup() {
    clearReconnectTimer()
    closeWebSocket()
  }

  function startReconnectTimer() {
    clearReconnectTimer()
    reconnectTimerId.value = window.setInterval(() => {
      connectionAttempts.value++
    }, reconnectInterval)
  }

  onMounted(() => {
    isConnected.value = true
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    isConnected,
    wsInstance,
    reconnectTimerId,
    connectionAttempts,
    startReconnectTimer,
    clearReconnectTimer,
    closeWebSocket,
    cleanup,
  }
}
