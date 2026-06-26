import { useState, useEffect, useCallback } from 'react'
import { offlineQueue } from '../services/OfflineQueue'
import { syncService } from '../services/SyncService'
import type { ScanRecord, SyncResult } from '../types'

export function useOfflineQueue() {
  const [scanList, setScanList] = useState<ScanRecord[]>([])
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [lastSyncResults, setLastSyncResults] = useState<SyncResult[]>([])

  const refreshData = useCallback(() => {
    setScanList(offlineQueue.getScanList())
    setPendingCount(syncService.getPendingCount())
  }, [])

  useEffect(() => {
    refreshData()
    const unsubscribeQueue = offlineQueue.subscribe(refreshData)
    const unsubscribeNetwork = syncService.subscribeToNetwork((online) => {
      setIsOnline(online)
      refreshData()
    })
    const unsubscribeSync = syncService.subscribeToSync((results) => {
      setLastSyncResults(results)
      refreshData()
    })

    return () => {
      unsubscribeQueue()
      unsubscribeNetwork()
      unsubscribeSync()
    }
  }, [refreshData])

  const addRecord = useCallback(async (barcode: string, quantity: number = 1) => {
    const record: ScanRecord = {
      id: crypto.randomUUID(),
      barcode,
      quantity,
      timestamp: Date.now(),
      status: 'queued'
    }
    await syncService.addRecord(record)
    refreshData()
    return record
  }, [refreshData])

  const triggerSync = useCallback(async () => {
    const results = await syncService.triggerSync()
    setLastSyncResults(results)
    refreshData()
    return results
  }, [refreshData])

  const clearAll = useCallback(() => {
    offlineQueue.clearAll()
    refreshData()
  }, [refreshData])

  return {
    scanList,
    isOnline,
    pendingCount,
    lastSyncResults,
    addRecord,
    triggerSync,
    clearAll,
    refreshData
  }
}
