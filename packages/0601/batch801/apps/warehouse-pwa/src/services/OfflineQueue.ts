import type { ScanRecord, QueueItem } from '../types'

const STORAGE_KEY = 'warehouse_offline_queue'
const SCAN_LIST_KEY = 'warehouse_scan_list'

export class OfflineQueue {
  private static instance: OfflineQueue
  private listeners: Set<() => void> = new Set()

  private constructor() {}

  static getInstance(): OfflineQueue {
    if (!OfflineQueue.instance) {
      OfflineQueue.instance = new OfflineQueue()
    }
    return OfflineQueue.instance
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb())
  }

  getQueue(): QueueItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  private saveQueue(queue: QueueItem[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
    this.notify()
  }

  enqueue(record: ScanRecord): void {
    const queue = this.getQueue()
    const item: QueueItem = {
      id: record.id,
      record,
      retryCount: 0,
      addedAt: Date.now()
    }
    queue.push(item)
    this.saveQueue(queue)
  }

  dequeue(recordId: string): void {
    const queue = this.getQueue()
    const filtered = queue.filter((item) => item.id !== recordId)
    this.saveQueue(filtered)
  }

  updateRetryCount(recordId: string): void {
    const queue = this.getQueue()
    const item = queue.find((i) => i.id === recordId)
    if (item) {
      item.retryCount += 1
      this.saveQueue(queue)
    }
  }

  markAsFailed(recordId: string): void {
    const queue = this.getQueue()
    const item = queue.find((i) => i.id === recordId)
    if (item) {
      item.record.status = 'failed'
      this.saveQueue(queue)
    }
  }

  updateQueueItemError(recordId: string, error: string): void {
    const queue = this.getQueue()
    const item = queue.find((i) => i.id === recordId)
    if (item) {
      item.record.error = error
      this.saveQueue(queue)
    }
  }

  markAsPending(recordId: string): void {
    const queue = this.getQueue()
    const item = queue.find((i) => i.id === recordId)
    if (item) {
      item.record.status = 'pending'
      this.saveQueue(queue)
    }
  }

  getScanList(): ScanRecord[] {
    try {
      const data = localStorage.getItem(SCAN_LIST_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  saveScanList(list: ScanRecord[]): void {
    localStorage.setItem(SCAN_LIST_KEY, JSON.stringify(list))
    this.notify()
  }

  addScanRecord(record: ScanRecord): void {
    const list = this.getScanList()
    list.unshift(record)
    this.saveScanList(list)
  }

  updateScanRecordStatus(recordId: string, status: ScanRecord['status']): void {
    const list = this.getScanList()
    const record = list.find((r) => r.id === recordId)
    if (record) {
      record.status = status
      this.saveScanList(list)
    }
  }

  updateScanRecordError(recordId: string, error: string): void {
    const list = this.getScanList()
    const record = list.find((r) => r.id === recordId)
    if (record) {
      record.error = error
      this.saveScanList(list)
    }
  }

  removeScanRecord(recordId: string): void {
    const list = this.getScanList()
    const filtered = list.filter((r) => r.id !== recordId)
    this.saveScanList(filtered)
  }

  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(SCAN_LIST_KEY)
    this.notify()
  }
}

export const offlineQueue = OfflineQueue.getInstance()
