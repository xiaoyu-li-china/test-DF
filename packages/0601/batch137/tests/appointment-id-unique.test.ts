import { describe, it, expect, beforeEach, vi } from 'vitest'
import { submitAppointment } from '@/lib/mockApi'
import type { AppointmentRequest } from '@/lib/types'

describe('预约号生成唯一性', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  const createBaseRequest = (): AppointmentRequest => ({
    date: '2026-06-15',
    slotId: 'morning',
    address: '测试地址',
    city: '测试城市',
    district: '测试区域',
    pianoBrand: '雅马哈',
    name: '测试',
    phone: '13800138000',
  })

  it('预约号以 TN 前缀开头', () => {
    const result = submitAppointment(createBaseRequest())
    expect(result.appointmentId).toMatch(/^TN/)
  })

  it('预约号长度符合预期（TN + 时间戳哈希 + 随机串，至少10位）', () => {
    const result = submitAppointment(createBaseRequest())
    expect(result.appointmentId.length).toBeGreaterThanOrEqual(10)
  })

  it('预约号仅包含大写字母和数字', () => {
    const result = submitAppointment(createBaseRequest())
    expect(result.appointmentId).toMatch(/^TN[A-Z0-9]+$/)
  })

  it('同一毫秒内的两次预约生成不同的预约号', () => {
    const fixedTime = 1717286400000
    vi.setSystemTime(fixedTime)

    const ids: string[] = []
    for (let i = 0; i < 5; i++) {
      const result = submitAppointment({
        ...createBaseRequest(),
        phone: `1380013800${i}`,
      })
      ids.push(result.appointmentId)
    }

    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(5)
  })

  it('不同日期不同时段的预约均生成唯一编号', () => {
    const dates = ['2026-06-10', '2026-06-11', '2026-06-12']
    const slots = ['morning', 'afternoon', 'evening']
    const ids: string[] = []
    let idx = 0

    for (const date of dates) {
      for (const slotId of slots) {
        const result = submitAppointment({
          ...createBaseRequest(),
          date,
          slotId,
          phone: `138001380${String(idx).padStart(2, '0')}`,
        })
        ids.push(result.appointmentId)
        idx++
      }
    }

    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(9)
  })

  it('批量生成100个预约号，全部唯一', () => {
    const ids: string[] = []
    for (let i = 0; i < 100; i++) {
      const result = submitAppointment({
        ...createBaseRequest(),
        phone: `138${String(i).padStart(8, '0')}`,
      })
      ids.push(result.appointmentId)
    }

    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(100)
  })

  it('预约成功后可通过预约号从 localStorage 读取详情', () => {
    const result = submitAppointment(createBaseRequest())
    const stored = localStorage.getItem(`appointment_${result.appointmentId}`)
    expect(stored).not.toBeNull()

    const detail = JSON.parse(stored!)
    expect(detail.appointmentId).toBe(result.appointmentId)
    expect(detail.date).toBe('2026-06-15')
    expect(detail.phone).toBe('138****8000')
  })
})
