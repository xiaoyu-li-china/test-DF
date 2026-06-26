import { describe, it, expect, beforeEach } from 'vitest'
import { getAvailableSlots, submitAppointment } from '@/lib/mockApi'
import type { AppointmentRequest } from '@/lib/types'

describe('时段冲突逻辑', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('新日期查询时段时，根据日期种子生成初始已预约时段', () => {
    const date1 = '2026-06-10'
    const date2 = '2026-06-11'

    const slots1 = getAvailableSlots(date1)
    const slots2 = getAvailableSlots(date2)

    expect(slots1).toHaveLength(3)
    expect(slots2).toHaveLength(3)

    expect(slots1.every((s) => ['morning', 'afternoon', 'evening'].includes(s.id))).toBe(true)
  })

  it('提交预约后，该时段在当日变为不可用', () => {
    let date = '2026-06-15'
    let availableSlot = getAvailableSlots(date).find((s) => s.available)

    if (!availableSlot) {
      date = '2026-06-16'
      availableSlot = getAvailableSlots(date).find((s) => s.available)
    }

    expect(availableSlot).toBeDefined()

    const request: AppointmentRequest = {
      date,
      slotId: availableSlot!.id,
      address: '测试地址',
      city: '测试城市',
      district: '测试区域',
      pianoBrand: '雅马哈',
      name: '测试',
      phone: '13800138000',
    }

    submitAppointment(request)

    const slotsAfter = getAvailableSlots(date)
    const bookedSlot = slotsAfter.find((s) => s.id === availableSlot.id)!

    expect(bookedSlot.available).toBe(false)
  })

  it('同一时段不能被重复预约（提交后再次查询应不可用）', () => {
    const date = '2026-06-20'
    const slotsBefore = getAvailableSlots(date)
    const availableSlot = slotsBefore.find((s) => s.available)
    expect(availableSlot).toBeDefined()

    const request: AppointmentRequest = {
      date,
      slotId: availableSlot!.id,
      address: '测试地址1',
      city: '北京',
      district: '朝阳区',
      pianoBrand: '卡瓦依',
      name: '用户A',
      phone: '13900139000',
    }

    const result1 = submitAppointment(request)
    expect(result1.success).toBe(true)

    const slotsAfter = getAvailableSlots(date)
    const nowUnavailable = slotsAfter.find((s) => s.id === availableSlot!.id)!
    expect(nowUnavailable.available).toBe(false)

    const request2: AppointmentRequest = {
      ...request,
      name: '用户B',
      phone: '13700137000',
    }
    submitAppointment(request2)

    const slotsAfter2 = getAvailableSlots(date)
    expect(slotsAfter2.find((s) => s.id === availableSlot!.id)!.available).toBe(false)
  })

  it('不同日期的相同时段互不影响', () => {
    const date1 = '2026-06-20'
    const date2 = '2026-06-21'

    const slots1Before = getAvailableSlots(date1)
    const slots2Before = getAvailableSlots(date2)
    const slotToBook = slots1Before.find((s) => s.available)
    expect(slotToBook).toBeDefined()

    const request: AppointmentRequest = {
      date: date1,
      slotId: slotToBook!.id,
      address: '测试',
      city: '上海',
      district: '浦东',
      pianoBrand: '施坦威',
      name: '测试',
      phone: '13600136000',
    }

    submitAppointment(request)

    const slots1After = getAvailableSlots(date1)
    const slots2After = getAvailableSlots(date2)

    expect(slots1After.find((s) => s.id === slotToBook!.id)!.available).toBe(false)

    const sameSlotInDate2 = slots2After.find((s) => s.id === slotToBook!.id)!
    const originalAvailability = slots2Before.find((s) => s.id === slotToBook!.id)!.available
    expect(sameSlotInDate2.available).toBe(originalAvailability)
  })

  it('已过日期时段查询正确（仅mock层验证种子逻辑）', () => {
    const date = '2026-06-01'
    const slots = getAvailableSlots(date)
    expect(slots).toHaveLength(3)
    expect(slots[0].label).toBe('上午')
  })
})
