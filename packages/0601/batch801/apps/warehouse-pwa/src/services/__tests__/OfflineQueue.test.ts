import { describe, it, expect, beforeEach } from 'vitest'
import { OfflineQueue } from '../OfflineQueue'
import type { ScanRecord } from '../../types'

describe('OfflineQueue', () => {
  let queue: OfflineQueue

  beforeEach(() => {
    localStorage.clear()
    queue = new (OfflineQueue as any)()
  })

  const makeRecord = (id: string, status: ScanRecord['status'] = 'queued'): ScanRecord => ({
    id,
    barcode: `BC-${id}`,
    quantity: 1,
    timestamp: Date.now(),
    status
  })

  it('enqueues a record and retrieves it from the queue', () => {
    const record = makeRecord('r1')
    queue.enqueue(record)
    const q = queue.getQueue()
    expect(q).toHaveLength(1)
    expect(q[0].id).toBe('r1')
    expect(q[0].record.status).toBe('queued')
  })

  it('adds a record to scan list', () => {
    const record = makeRecord('r2')
    queue.addScanRecord(record)
    const list = queue.getScanList()
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe('r2')
  })

  it('dequeues a record on success', () => {
    const record = makeRecord('r3')
    queue.enqueue(record)
    queue.dequeue('r3')
    expect(queue.getQueue()).toHaveLength(0)
  })

  it('removes a scan record on success', () => {
    const record = makeRecord('r4')
    queue.addScanRecord(record)
    queue.removeScanRecord('r4')
    expect(queue.getScanList()).toHaveLength(0)
  })

  it('marks record as pending during sync', () => {
    const record = makeRecord('r5', 'queued')
    queue.enqueue(record)
    queue.markAsPending('r5')
    const q = queue.getQueue()
    expect(q[0].record.status).toBe('pending')
  })

  it('marks record as failed and updates error on sync failure', () => {
    const record = makeRecord('r6', 'pending')
    queue.enqueue(record)
    queue.markAsFailed('r6')
    queue.updateQueueItemError('r6', 'Server error')
    const q = queue.getQueue()
    expect(q[0].record.status).toBe('failed')
    expect(q[0].record.error).toBe('Server error')
  })

  it('updates scan list status and preserves record on failure', () => {
    const record = makeRecord('r7', 'queued')
    queue.addScanRecord(record)
    queue.updateScanRecordStatus('r7', 'failed')
    queue.updateScanRecordError('r7', 'Network offline')
    const list = queue.getScanList()
    expect(list).toHaveLength(1)
    expect(list[0].status).toBe('failed')
    expect(list[0].error).toBe('Network offline')
  })

  it('failed record stays in queue for retry', () => {
    const record = makeRecord('r8')
    queue.enqueue(record)
    queue.markAsFailed('r8')
    queue.updateRetryCount('r8')
    const q = queue.getQueue()
    expect(q).toHaveLength(1)
    expect(q[0].retryCount).toBe(1)
    expect(q[0].record.status).toBe('failed')
  })

  it('successful sync removes from both queue and scan list', () => {
    const record = makeRecord('r9')
    queue.enqueue(record)
    queue.addScanRecord(record)
    queue.dequeue('r9')
    queue.removeScanRecord('r9')
    expect(queue.getQueue()).toHaveLength(0)
    expect(queue.getScanList()).toHaveLength(0)
  })

  it('clearAll removes everything', () => {
    const record = makeRecord('r10')
    queue.enqueue(record)
    queue.addScanRecord(record)
    queue.clearAll()
    expect(queue.getQueue()).toHaveLength(0)
    expect(queue.getScanList()).toHaveLength(0)
  })
})
