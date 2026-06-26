import type { ConsultationType, TimeSlot, BookingResult, UploadedFile } from '@/types'
import { CONSULTATION_TYPES, LAWYERS, addBooking, cancelBooking, getBookings, generateAllSlots } from './mockData'

export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: {
    code: number
    message: string
  }
}

export interface SlotWithAvailability {
  slot: TimeSlot
  available: boolean
  expired: boolean
  availableLawyers: string[]
}

export interface FetchSlotsParams {
  type: ConsultationType
  date?: string
}

export interface CreateBookingParams {
  type: ConsultationType
  slotId: string
  name: string
  phone: string
  summary: string
  wantReminder: boolean
  files: UploadedFile[]
}

export interface RescheduleParams {
  originalBookingNo: string
  type: ConsultationType
  newSlotId: string
  name: string
  wantReminder: boolean
  files: UploadedFile[]
}

const SLOT_DURATION = 30

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isSlotExpired(slot: TimeSlot): boolean {
  const now = new Date()
  const [y, m, d] = slot.date.split('-').map(Number)
  const [h, min] = slot.startTime.split(':').map(Number)
  const slotDate = new Date(y, m - 1, d, h, min)
  return slotDate < now
}

function getAvailableLawyerForSlot(type: ConsultationType, slotId: string): typeof LAWYERS {
  const bookedLawyerIds = getBookings()
    .filter((b) => b.slotId === slotId)
    .map((b) => b.lawyerId)

  return LAWYERS.filter(
    (l) => l.types.includes(type) && !bookedLawyerIds.includes(l.id)
  )
}

function getRandomLawyer(lawyers: typeof LAWYERS): typeof LAWYERS[number] {
  const idx = Math.floor(Math.random() * lawyers.length)
  return lawyers[idx]
}

function generateBookingNo(): string {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const rand = String(Math.floor(Math.random() * 9000) + 1000)
  return `YY${datePart}${rand}`
}

export async function fetchSlotsAvailability(
  params: FetchSlotsParams
): Promise<ApiResponse<SlotWithAvailability[]>> {
  await delay(300)

  const allSlots = generateAllSlots()

  const slots = params.date
    ? allSlots.filter((s) => s.date === params.date)
    : allSlots

  /**
   * 时段可用性计算 - 与后端对齐逻辑
   *
   * 后端判断逻辑（此处 mock 实现）：
   * 1. 检查时段基础状态 (time_slots.available)
   * 2. 检查时段是否过期 (current_time > slot.start_time)
   * 3. 检查该时段该咨询类型是否有可用律师
   *    - 从 bookings 表查询 slot_id 下已预约的 lawyer_ids
   *    - 从 lawyers 表查询该 type 下的律师集合
   *    - 取差集即为可用律师
   * 4. 三个条件全部满足才返回 available = true
   *
   * 返回 SlotWithAvailability 扩展结构：
   * - slot: 原始 TimeSlot 数据（与 time_slots 表字段对齐）
   * - available: 最终可用性（经过三层校验）
   * - expired: 是否已过期（UI 展示 disabled 状态）
   * - availableLawyers: 可用律师 ID 列表（用于 debug 和冲突检测）
   */
  const result: SlotWithAvailability[] = slots.map((slot) => {
    const expired = isSlotExpired(slot)
    const availableLawyers = getAvailableLawyerForSlot(params.type, slot.id)
    const available = slot.available && !expired && availableLawyers.length > 0

    return {
      slot,
      available,
      expired,
      availableLawyers: availableLawyers.map((l) => l.id),
    }
  })

  return { success: true, data: result }
}

export async function createBooking(
  params: CreateBookingParams
): Promise<ApiResponse<BookingResult>> {
  await delay(800)

  const allSlots = generateAllSlots()

  const slot = allSlots.find((s) => s.id === params.slotId)

  if (!slot) {
    return {
      success: false,
      error: { code: 404, message: '时段不存在' },
    }
  }

  if (isSlotExpired(slot)) {
    return {
      success: false,
      error: { code: 400, message: '该时段已过期' },
    }
  }

  const existingBooking = getBookings().find(
    (b) => b.slotId === params.slotId && b.type === params.type
  )

  if (existingBooking) {
    return {
      success: false,
      error: { code: 409, message: '该时段已被预约，请选择其他时段' },
    }
  }

  const availableLawyers = getAvailableLawyerForSlot(params.type, params.slotId)
  if (availableLawyers.length === 0) {
    return {
      success: false,
      error: { code: 409, message: '该时段同类型律师已约满' },
    }
  }

  if (Math.random() < 0.05) {
    return {
      success: false,
      error: { code: 409, message: '网络延迟，该时段刚刚被预约，请刷新后重试' },
    }
  }

  const lawyer = getRandomLawyer(availableLawyers)
  const bookingNo = generateBookingNo()

  addBooking({
    bookingNo,
    lawyerId: lawyer.id,
    slotId: params.slotId,
    type: params.type,
  })

  const typeInfo = CONSULTATION_TYPES.find((t) => t.id === params.type)

  const result: BookingResult = {
    bookingNo,
    lawyerName: lawyer.name,
    date: slot.date,
    time: `${slot.startTime}-${slot.endTime}`,
    typeName: typeInfo?.label || '',
    userName: params.name.trim(),
    wantReminder: params.wantReminder,
    files: params.files,
  }

  return { success: true, data: result }
}

export async function rescheduleBooking(
  params: RescheduleParams
): Promise<ApiResponse<BookingResult>> {
  await delay(800)

  const allSlots = generateAllSlots()

  const originalBooking = getBookings().find(
    (b) => b.bookingNo === params.originalBookingNo
  )

  if (!originalBooking) {
    return {
      success: false,
      error: { code: 404, message: '原预约不存在' },
    }
  }

  const newSlot = allSlots.find((s) => s.id === params.newSlotId)
  if (!newSlot) {
    return {
      success: false,
      error: { code: 404, message: '新时段不存在' },
    }
  }

  if (isSlotExpired(newSlot)) {
    return {
      success: false,
      error: { code: 400, message: '新时段已过期' },
    }
  }

  const existingBooking = getBookings().find(
    (b) =>
      b.slotId === params.newSlotId &&
      b.type === params.type &&
      b.bookingNo !== params.originalBookingNo
  )

  if (existingBooking) {
    return {
      success: false,
      error: { code: 409, message: '该时段已被预约，请选择其他时段' },
    }
  }

  const availableLawyers = getAvailableLawyerForSlot(params.type, params.newSlotId)
  if (availableLawyers.length === 0) {
    return {
      success: false,
      error: { code: 409, message: '同类型律师已约满，无法改期到此时段' },
    }
  }

  cancelBooking(params.originalBookingNo)

  const lawyer = getRandomLawyer(availableLawyers)
  const bookingNo = generateBookingNo()

  addBooking({
    bookingNo,
    lawyerId: lawyer.id,
    slotId: params.newSlotId,
    type: params.type,
  })

  const typeInfo = CONSULTATION_TYPES.find((t) => t.id === params.type)

  const result: BookingResult = {
    bookingNo,
    lawyerName: lawyer.name,
    date: newSlot.date,
    time: `${newSlot.startTime}-${newSlot.endTime}`,
    typeName: typeInfo?.label || '',
    userName: params.name.trim(),
    wantReminder: params.wantReminder,
    files: params.files,
  }

  return { success: true, data: result }
}

export async function releaseSlot(slotId: string, bookingNo: string): Promise<ApiResponse<null>> {
  await delay(300)
  cancelBooking(bookingNo)
  return { success: true, data: null }
}

export function isSlotExpiredPublic(slot: TimeSlot): boolean {
  return isSlotExpired(slot)
}
