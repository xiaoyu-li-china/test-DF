import { offlineQueue } from './OfflineQueue'
import type { ScanRecord, SyncResult, QueueItem } from '../types'

const SYNC_API = '/api/sync'
const BASE_RETRY_DELAY = 2000
const MAX_RETRY_DELAY = 30000
const ITEM_COOLDOWN_MS = 3000

export class SyncService {
  private static instance: SyncService
  private isOnline: boolean
  private isSyncing: boolean = false
  private syncScheduled: boolean = false
  private networkListeners: Set<(online: boolean) => void> = new Set()
  private syncListeners: Set<(results: SyncResult[]) => void> = new Set()
  private inFlightItems: Set<string> = new Set()
  private lastAttemptAt: Map<string, number> = new Map()
  private scheduledSyncTimer: ReturnType<typeof setTimeout> | null = null

  private constructor() {
    this.isOnline = navigator.onLine
    this.setupNetworkListeners()
    if (this.isOnline) {
      this.scheduleSync(1000)
    }
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService()
    }
    return SyncService.instance
  }

  subscribeToNetwork(callback: (online: boolean) => void): () => void {
    this.networkListeners.add(callback)
    callback(this.isOnline)
    return () => this.networkListeners.delete(callback)
  }

  subscribeToSync(callback: (results: SyncResult[]) => void): () => void {
    this.syncListeners.add(callback)
    return () => this.syncListeners.delete(callback)
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.notifyNetworkListeners()
      this.scheduleSync(500)
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      this.notifyNetworkListeners()
      this.cancelScheduledSync()
    })
  }

  private notifyNetworkListeners(): void {
    this.networkListeners.forEach((cb) => cb(this.isOnline))
  }

  private notifySyncListeners(results: SyncResult[]): void {
    this.syncListeners.forEach((cb) => cb(results))
  }

  isNetworkOnline(): boolean {
    return this.isOnline
  }

  async addRecord(record: ScanRecord): Promise<void> {
    if (this.isOnline) {
      record.status = 'queued'
    } else {
      record.status = 'queued'
    }

    offlineQueue.addScanRecord(record)
    offlineQueue.enqueue(record)

    if (this.isOnline) {
      this.scheduleSync(500)
    }
  }

  private scheduleSync(delayMs: number): void {
    if (this.syncScheduled) return

    this.syncScheduled = true

    if (this.scheduledSyncTimer) {
      clearTimeout(this.scheduledSyncTimer)
    }

    this.scheduledSyncTimer = setTimeout(() => {
      this.syncScheduled = false
      this.startSyncLoop()
    }, delayMs)
  }

  private cancelScheduledSync(): void {
    if (this.scheduledSyncTimer) {
      clearTimeout(this.scheduledSyncTimer)
      this.scheduledSyncTimer = null
    }
    this.syncScheduled = false
  }

  private async startSyncLoop(): Promise<void> {
    if (this.isSyncing) return
    this.isSyncing = true

    try {
      let hasWork = true
      while (hasWork && this.isOnline) {
        const results = await this.processQueue()
        hasWork = results.length > 0

        if (hasWork && this.isOnline) {
          const nextDelay = this.calculateNextSyncDelay()
          await this.delay(nextDelay)
        }
      }
    } finally {
      this.isSyncing = false
      this.inFlightItems.clear()

      const remainingQueue = offlineQueue.getQueue()
      if (remainingQueue.length > 0 && this.isOnline) {
        const nextDelay = this.calculateNextSyncDelay()
        this.scheduleSync(nextDelay)
      }
    }
  }

  private calculateNextSyncDelay(): number {
    const queue = offlineQueue.getQueue()
    if (queue.length === 0) return 0

    const now = Date.now()
    let minDelay = MAX_RETRY_DELAY

    for (const item of queue) {
      const lastAttempt = this.lastAttemptAt.get(item.id) || 0
      const retryDelay = this.getExponentialBackoff(item.retryCount)
      const timeUntilNextAttempt = Math.max(0, lastAttempt + retryDelay - now)
      minDelay = Math.min(minDelay, timeUntilNextAttempt)
    }

    return Math.min(minDelay, MAX_RETRY_DELAY)
  }

  private getExponentialBackoff(retryCount: number): number {
    const delay = BASE_RETRY_DELAY * Math.pow(2, Math.min(retryCount, 5))
    return Math.min(delay, MAX_RETRY_DELAY)
  }

  private async processQueue(): Promise<SyncResult[]> {
    const results: SyncResult[] = []
    const queue = offlineQueue.getQueue()

    if (queue.length === 0 || !this.isOnline) {
      return results
    }

    const now = Date.now()

    for (const item of queue) {
      if (!this.isOnline) break

      if (this.inFlightItems.has(item.id)) continue

      const lastAttempt = this.lastAttemptAt.get(item.id) || 0
      const cooldownRemaining = lastAttempt + ITEM_COOLDOWN_MS - now
      if (cooldownRemaining > 0) continue

      const retryDelay = this.getExponentialBackoff(item.retryCount)
      const retryRemaining = lastAttempt + retryDelay - now
      if (retryRemaining > 0) continue

      this.inFlightItems.add(item.id)
      this.lastAttemptAt.set(item.id, now)

      try {
        offlineQueue.markAsPending(item.id)
        offlineQueue.updateScanRecordStatus(item.id, 'pending')

        const result = await this.syncItem(item)
        results.push(result)

        if (result.success) {
          offlineQueue.dequeue(item.id)
          offlineQueue.removeScanRecord(item.id)
          this.lastAttemptAt.delete(item.id)
        } else {
          offlineQueue.updateRetryCount(item.id)
          offlineQueue.markAsFailed(item.id)
          offlineQueue.updateQueueItemError(item.id, result.error || 'Unknown error')
          offlineQueue.updateScanRecordStatus(item.id, 'failed')
          offlineQueue.updateScanRecordError(item.id, result.error || 'Unknown error')
        }
      } finally {
        this.inFlightItems.delete(item.id)
      }

      await this.delay(300)
    }

    if (results.length > 0) {
      this.notifySyncListeners(results)
    }

    return results
  }

  private async syncItem(item: QueueItem): Promise<SyncResult> {
    try {
      const response = await this.postToServer(item.record)
      return {
        success: response.success,
        recordId: item.id,
        error: response.error
      }
    } catch (error) {
      return {
        success: false,
        recordId: item.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async postToServer(record: ScanRecord): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!this.isOnline) {
          reject(new Error('Network offline'))
          return
        }

        console.log(`[SyncService] POST ${SYNC_API}`, {
          id: record.id,
          barcode: record.barcode,
          timestamp: new Date(record.timestamp).toLocaleTimeString()
        })

        const shouldFail = Math.random() < 0.1
        if (shouldFail) {
          resolve({ success: false, error: 'Server error' })
        } else {
          resolve({ success: true })
        }
      }, 300)
    })
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  triggerSync(): Promise<SyncResult[]> {
    if (!this.isOnline) {
      return Promise.resolve([])
    }

    this.lastAttemptAt.clear()
    this.scheduleSync(0)
    return Promise.resolve([])
  }

  getPendingCount(): number {
    return offlineQueue.getQueue().length
  }

  getRetryDelay(itemId: string): number {
    const queue = offlineQueue.getQueue()
    const item = queue.find((i) => i.id === itemId)
    if (!item) return 0

    const lastAttempt = this.lastAttemptAt.get(itemId) || 0
    const retryDelay = this.getExponentialBackoff(item.retryCount)
    return Math.max(0, lastAttempt + retryDelay - Date.now())
  }
}

export const syncService = SyncService.getInstance()
