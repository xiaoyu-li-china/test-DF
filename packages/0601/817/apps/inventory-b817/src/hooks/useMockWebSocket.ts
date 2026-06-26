import { useEffect } from 'react'
import { useInventoryStore } from '@/store/useInventoryStore'
import { mockWS } from '@/ws'
import { generateInitialData } from '@/mock/data'
import type { WSMessage, SKUItem } from '@/types'

export function useMockWebSocket() {
  const setSkus = useInventoryStore((s) => s.setSkus)
  const updateSku = useInventoryStore((s) => s.updateSku)
  const applySnapshot = useInventoryStore((s) => s.applySnapshot)
  const setConnected = useInventoryStore((s) => s.setConnected)

  useEffect(() => {
    const handleMessage = (msg: WSMessage) => {
      switch (msg.type) {
        case 'connected':
          setConnected(true)
          break
        case 'disconnected':
          setConnected(false)
          break
        case 'update':
          if (msg.payload && !Array.isArray(msg.payload)) {
            updateSku(msg.payload as SKUItem)
          }
          break
        case 'snapshot':
          if (msg.payload && Array.isArray(msg.payload)) {
            applySnapshot(msg.payload as SKUItem[])
          }
          break
      }
    }

    const handleLog = (level: 'info' | 'warn' | 'error', message: string) => {
      if (level === 'info') {
        console.debug(`[ws-hook] ${message}`)
      }
    }

    const initial = generateInitialData()
    setSkus(initial)

    const unsubMessage = mockWS.onMessage(handleMessage)
    const unsubLog = mockWS.onLog(handleLog)

    mockWS.connect(initial)

    return () => {
      unsubMessage()
      unsubLog()
      mockWS.destroy()
    }
  }, [setSkus, updateSku, applySnapshot, setConnected])
}
