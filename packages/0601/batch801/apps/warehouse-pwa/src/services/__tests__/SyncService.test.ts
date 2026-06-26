import { describe, it, expect, beforeEach } from 'vitest'
import { OfflineQueue } from '../OfflineQueue'
import type { ScanRecord } from '../../types'

describe('SyncService offline queue integration', () => {
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

  it('records are queued with "queued" status when added offline', () => {
    const record = makeRecord('q1')
    record.status = 'queued'
    queue.addScanRecord(record)
    queue.enqueue(record)

    const scanList = queue.getScanList()
    expect(scanList).toHaveLength(1)
    expect(scanList[0].status).toBe('queued')

    const q = queue.getQueue()
    expect(q).toHaveLength(1)
    expect(q[0].record.status).toBe('queued')
  })

  it('failed sync keeps record in queue with error', () => {
    const record = makeRecord('q3', 'queued')
    queue.enqueue(record)
    queue.addScanRecord(record)

    queue.markAsPending('q3')
    queue.markAsFailed('q3')
    queue.updateRetryCount('q3')
    queue.updateScanRecordStatus('q3', 'failed')
    queue.updateScanRecordError('q3', 'Server error')

    const q = queue.getQueue()
    expect(q).toHaveLength(1)
    expect(q[0].record.status).toBe('failed')
    expect(q[0].retryCount).toBe(1)

    const list = queue.getScanList()
    expect(list).toHaveLength(1)
    expect(list[0].status).toBe('failed')
    expect(list[0].error).toBe('Server error')
  })

  it('successful sync removes record from both queue and scan list', () => {
    const record = makeRecord('q4', 'queued')
    queue.enqueue(record)
    queue.addScanRecord(record)

    queue.markAsPending('q4')
    queue.dequeue('q4')
    queue.removeScanRecord('q4')

    expect(queue.getQueue()).toHaveLength(0)
    expect(queue.getScanList()).toHaveLength(0)
  })

  it('multiple records are all queued and preserved until synced', () => {
    const records = [makeRecord('m1'), makeRecord('m2'), makeRecord('m3')]
    for (const r of records) {
      queue.enqueue(r)
      queue.addScanRecord(r)
    }

    expect(queue.getQueue()).toHaveLength(3)
    expect(queue.getScanList()).toHaveLength(3)

    queue.dequeue('m1')
    queue.removeScanRecord('m1')

    expect(queue.getQueue()).toHaveLength(2)
    expect(queue.getScanList()).toHaveLength(2)

    queue.dequeue('m2')
    queue.removeScanRecord('m2')

    expect(queue.getQueue()).toHaveLength(1)
    expect(queue.getScanList()).toHaveLength(1)
  })

  it('simulates online event sync flow: queued -> pending -> synced -> removed', () => {
    const record = makeRecord('s1')
    queue.enqueue(record)
    queue.addScanRecord(record)

    expect(queue.getQueue()[0].record.status).toBe('queued')

    queue.markAsPending('s1')
    queue.updateScanRecordStatus('s1', 'pending')
    expect(queue.getQueue()[0].record.status).toBe('pending')
    expect(queue.getScanList()[0].status).toBe('pending')

    queue.dequeue('s1')
    queue.removeScanRecord('s1')
    expect(queue.getQueue()).toHaveLength(0)
    expect(queue.getScanList()).toHaveLength(0)
  })

  it('simulates failed sync flow: queued -> pending -> failed (kept with error)', () => {
    const record = makeRecord('f1')
    queue.enqueue(record)
    queue.addScanRecord(record)

    queue.markAsPending('f1')
    queue.updateScanRecordStatus('f1', 'pending')

    queue.markAsFailed('f1')
    queue.updateRetryCount('f1')
    queue.updateScanRecordStatus('f1', 'failed')
    queue.updateScanRecordError('f1', 'Connection timeout')

    expect(queue.getQueue()).toHaveLength(1)
    expect(queue.getQueue()[0].record.status).toBe('failed')
    expect(queue.getQueue()[0].retryCount).toBe(1)
    expect(queue.getScanList()[0].status).toBe('failed')
    expect(queue.getScanList()[0].error).toBe('Connection timeout')
  })

  it('mixed success and failure: successful removed, failed kept', () => {
    const r1 = makeRecord('mix1')
    const r2 = makeRecord('mix2')
    queue.enqueue(r1)
    queue.enqueue(r2)
    queue.addScanRecord(r1)
    queue.addScanRecord(r2)

    queue.markAsPending('mix1')
    queue.dequeue('mix1')
    queue.removeScanRecord('mix1')

    queue.markAsPending('mix2')
    queue.markAsFailed('mix2')
    queue.updateRetryCount('mix2')
    queue.updateScanRecordStatus('mix2', 'failed')
    queue.updateScanRecordError('mix2', 'Server error')

    expect(queue.getQueue()).toHaveLength(1)
    expect(queue.getQueue()[0].id).toBe('mix2')
    expect(queue.getScanList()).toHaveLength(1)
    expect(queue.getScanList()[0].status).toBe('failed')
  })
})
