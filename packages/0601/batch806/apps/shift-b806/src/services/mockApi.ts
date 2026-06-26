import type { Staff, Shift, Conflict, ConnectionStatus, ApiResponse } from '../types'

const mockStaff: Staff[] = [
  { id: 's1', name: '张伟', department: '内科', position: '主治医师' },
  { id: 's2', name: '李娜', department: '内科', position: '住院医师' },
  { id: 's3', name: '王强', department: '外科', position: '主治医师' },
  { id: 's4', name: '刘芳', department: '外科', position: '护士' },
  { id: 's5', name: '陈明', department: '急诊科', position: '主治医师' },
  { id: 's6', name: '赵丽', department: '急诊科', position: '护士' },
  { id: 's7', name: '孙磊', department: '内科', position: '主任医师' },
  { id: 's8', name: '周静', department: '外科', position: '护士长' },
]

const today = new Date().toISOString().split('T')[0]
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
const dayAfter = new Date(Date.now() + 172800000).toISOString().split('T')[0]

const mockShifts: Shift[] = [
  { id: 'sh1', staffId: 's1', date: today, startTime: 8, endTime: 16, type: 'morning', department: '内科' },
  { id: 'sh2', staffId: 's1', date: today, startTime: 14, endTime: 22, type: 'afternoon', department: '内科' },
  { id: 'sh3', staffId: 's2', date: today, startTime: 8, endTime: 16, type: 'morning', department: '内科' },
  { id: 'sh4', staffId: 's3', date: today, startTime: 16, endTime: 24, type: 'night', department: '外科' },
  { id: 'sh5', staffId: 's4', date: today, startTime: 8, endTime: 16, type: 'morning', department: '外科' },
  { id: 'sh6', staffId: 's4', date: today, startTime: 16, endTime: 24, type: 'night', department: '外科' },
  { id: 'sh7', staffId: 's5', date: today, startTime: 0, endTime: 8, type: 'night', department: '急诊科' },
  { id: 'sh8', staffId: 's5', date: today, startTime: 8, endTime: 16, type: 'morning', department: '急诊科' },
  { id: 'sh9', staffId: 's6', date: today, startTime: 16, endTime: 24, type: 'night', department: '急诊科' },
  { id: 'sh10', staffId: 's7', date: tomorrow, startTime: 8, endTime: 16, type: 'morning', department: '内科' },
  { id: 'sh11', staffId: 's7', date: tomorrow, startTime: 16, endTime: 24, type: 'night', department: '内科' },
  { id: 'sh12', staffId: 's8', date: tomorrow, startTime: 8, endTime: 16, type: 'morning', department: '外科' },
  { id: 'sh13', staffId: 's2', date: tomorrow, startTime: 8, endTime: 20, type: 'overtime', department: '内科' },
  { id: 'sh14', staffId: 's3', date: dayAfter, startTime: 8, endTime: 16, type: 'morning', department: '外科' },
  { id: 'sh15', staffId: 's1', date: dayAfter, startTime: 0, endTime: 8, type: 'night', department: '内科' },
  { id: 'sh16', staffId: 's1', date: dayAfter, startTime: 8, endTime: 16, type: 'morning', department: '内科' },
]

function detectConflicts(shifts: Shift[]): Conflict[] {
  const conflicts: Conflict[] = []
  const shiftMap = new Map<string, Shift[]>()

  for (const shift of shifts) {
    const key = `${shift.staffId}-${shift.date}`
    if (!shiftMap.has(key)) {
      shiftMap.set(key, [])
    }
    shiftMap.get(key)!.push(shift)
  }

  for (const [key, staffShifts] of shiftMap) {
    const [staffId, date] = key.split('-')
    const sorted = [...staffShifts].sort((a, b) => a.startTime - b.startTime)

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[i].endTime > sorted[j].startTime) {
          conflicts.push({
            id: `c-${staffId}-${date}-${i}-${j}`,
            staffId,
            date,
            startTime: sorted[j].startTime,
            endTime: Math.min(sorted[i].endTime, sorted[j].endTime),
            type: 'overlap',
            description: `排班时段冲突：${sorted[i].startTime}:00-${sorted[i].endTime}:00 与 ${sorted[j].startTime}:00-${sorted[j].endTime}:00 重叠`,
          })
        }
      }
    }

    const totalHours = staffShifts.reduce((sum, s) => sum + (s.endTime - s.startTime), 0)
    if (totalHours > 12) {
      conflicts.push({
        id: `c-overwork-${staffId}-${date}`,
        staffId,
        date,
        startTime: 0,
        endTime: 24,
        type: 'overwork',
        description: `工作时长超标：当日累计 ${totalHours} 小时，超过 12 小时限制`,
      })
    }
  }

  return conflicts
}

class MockApi {
  private connectionStatus: ConnectionStatus = 'connected'
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set()
  private disconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private inFlightRequests: Map<string, Promise<ApiResponse<any>>> = new Map()
  private requestIdCounter = 0
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()

  constructor() {
    this.scheduleRandomDisconnect()
  }

  private scheduleRandomDisconnect() {
    if (this.disconnectTimer) clearTimeout(this.disconnectTimer)
    this.disconnectTimer = setTimeout(() => {
      this.simulateDisconnect()
    }, 15000 + Math.random() * 15000)
  }

  private simulateDisconnect() {
    this.setStatus('disconnected')
    this.reconnectTimer = setTimeout(() => {
      this.setStatus('reconnecting')
      setTimeout(() => {
        this.setStatus('connected')
        this.scheduleRandomDisconnect()
      }, 2000)
    }, 5000)
  }

  private setStatus(status: ConnectionStatus) {
    this.connectionStatus = status
    this.statusListeners.forEach((cb) => cb(status))
  }

  onStatusChange(callback: (status: ConnectionStatus) => void) {
    this.statusListeners.add(callback)
    return () => this.statusListeners.delete(callback)
  }

  getStatus(): ConnectionStatus {
    return this.connectionStatus
  }

  private getRequestKey(action: string, params?: Record<string, any>): string {
    const paramStr = params ? JSON.stringify(params) : ''
    return `${action}-${paramStr}`
  }

  private debounce<T>(
    key: string,
    fn: () => Promise<T>,
    waitMs: number = 200
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const existingTimer = this.debounceTimers.get(key)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      const timer = setTimeout(async () => {
        this.debounceTimers.delete(key)
        try {
          const result = await fn()
          resolve(result)
        } catch (e) {
          reject(e)
        }
      }, waitMs)

      this.debounceTimers.set(key, timer)
    })
  }

  private withInFlightDeduplication<T>(
    key: string,
    fn: () => Promise<ApiResponse<T>>
  ): Promise<ApiResponse<T>> {
    const existing = this.inFlightRequests.get(key)
    if (existing) {
      return existing as Promise<ApiResponse<T>>
    }

    const requestId = ++this.requestIdCounter
    const promise = fn().finally(() => {
      const current = this.inFlightRequests.get(key)
      if (current === promise) {
        this.inFlightRequests.delete(key)
      }
    })

    ;(promise as any).__requestId = requestId
    this.inFlightRequests.set(key, promise)
    return promise
  }

  async getStaff(dept?: string): Promise<ApiResponse<Staff[]>> {
    const key = this.getRequestKey('getStaff', { dept })
    return this.withInFlightDeduplication(key, () =>
      this.delay(() => {
        let data = mockStaff
        if (dept) {
          data = data.filter((s) => s.department === dept)
        }
        return { success: true, data }
      })
    )
  }

  async getShifts(dept?: string): Promise<ApiResponse<Shift[]>> {
    const key = this.getRequestKey('getShifts', { dept })
    return this.withInFlightDeduplication(key, () =>
      this.delay(() => {
        let data = mockShifts
        if (dept) {
          data = data.filter((s) => s.department === dept)
        }
        return { success: true, data }
      })
    )
  }

  async getConflicts(dept?: string): Promise<ApiResponse<Conflict[]>> {
    const key = this.getRequestKey('getConflicts', { dept })
    return this.withInFlightDeduplication(key, () =>
      this.delay(() => {
        let shifts = mockShifts
        if (dept) {
          shifts = shifts.filter((s) => s.department === dept)
        }
        const conflicts = detectConflicts(shifts)
        return { success: true, data: conflicts }
      })
    )
  }

  async getAllData(dept?: string): Promise<ApiResponse<{ staff: Staff[]; shifts: Shift[]; conflicts: Conflict[] }>> {
    const key = this.getRequestKey('getAllData', { dept })
    return this.withInFlightDeduplication(key, () =>
      this.debounce(key, () =>
        this.delay(async () => {
          const [staffRes, shiftsRes, conflictsRes] = await Promise.all([
            this.getStaff(dept),
            this.getShifts(dept),
            this.getConflicts(dept),
          ])
          return {
            success: true,
            data: {
              staff: staffRes.data!,
              shifts: shiftsRes.data!,
              conflicts: conflictsRes.data!,
            },
          }
        })
      )
    )
  }

  getDepartments(): string[] {
    return Array.from(new Set(mockStaff.map((s) => s.department)))
  }

  private delay<T>(fn: () => ApiResponse<T> | Promise<ApiResponse<T>>): Promise<ApiResponse<T>> {
    return new Promise((resolve, reject) => {
      const delayMs = 300 + Math.random() * 500
      setTimeout(async () => {
        if (this.connectionStatus === 'disconnected') {
          reject(new Error('网络连接中断'))
          return
        }
        try {
          const result = await fn()
          resolve(result)
        } catch (e) {
          reject(e)
        }
      }, delayMs)
    })
  }

  forceDisconnect() {
    this.simulateDisconnect()
  }

  forceReconnect() {
    if (this.disconnectTimer) clearTimeout(this.disconnectTimer)
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.setStatus('connected')
    this.scheduleRandomDisconnect()
  }
}

export const mockApi = new MockApi()
