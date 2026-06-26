export interface ScanRecord {
  id: string
  barcode: string
  quantity: number
  timestamp: number
  status: 'queued' | 'pending' | 'synced' | 'failed'
  error?: string
}

export interface QueueItem {
  id: string
  record: ScanRecord
  retryCount: number
  addedAt: number
}

export interface SyncResult {
  success: boolean
  recordId: string
  error?: string
}
