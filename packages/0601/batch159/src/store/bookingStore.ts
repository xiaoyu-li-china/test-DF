import { create } from 'zustand'
import type { ConsultationType, TimeSlot, BookingResult, UploadedFile } from '@/types'
import { generateAllSlots, CONSULTATION_TYPES, clearBookings } from '@/data/mockData'
import {
  createBooking,
  rescheduleBooking,
  releaseSlot,
  fetchSlotsAvailability,
  isSlotExpiredPublic,
} from '@/data/api'

interface BookingState {
  step: number
  selectedType: ConsultationType | null
  selectedDate: string | null
  selectedSlot: TimeSlot | null
  name: string
  phone: string
  summary: string
  uploadedFiles: UploadedFile[]
  wantReminder: boolean
  allSlots: TimeSlot[]
  result: BookingResult | null
  submitting: boolean
  phoneError: string
  nameError: string
  bookingError: string
  rescheduleMode: boolean
  rescheduleFrom: BookingResult | null
  refreshingSlots: boolean
}

interface BookingActions {
  setSelectedType: (type: ConsultationType) => Promise<void>
  setSelectedDate: (date: string) => Promise<void>
  setSelectedSlot: (slot: TimeSlot | null) => void
  setName: (name: string) => void
  setPhone: (phone: string) => void
  setSummary: (summary: string) => void
  addUploadedFile: (file: UploadedFile) => void
  removeUploadedFile: (id: string) => void
  setWantReminder: (v: boolean) => void
  validateAndSubmit: () => Promise<boolean>
  startReschedule: () => Promise<void>
  cancelReschedule: () => Promise<void>
  rescheduleSubmit: () => Promise<boolean>
  refreshSlots: () => Promise<void>
  reset: () => void
}

const initialSlots = generateAllSlots()

/**
 * 前端 slot 状态与后端对齐函数
 *
 * 设计原则：本地状态 (allSlots) 是后端数据的缓存，每次 API 返回后
 * 以 API 返回的 available 字段为准进行合并，保留本地其他字段不变。
 *
 * 对齐策略：
 * 1. 以 slot.id 为关联键，建立 API 返回数据的 Map 索引
 * 2. 遍历本地 allSlots，对每个 slot 查找 API 返回的最新状态
 * 3. 只更新 available 字段，其他字段（date, startTime, period 等）保持不变
 * 4. 若 API 未返回该 slot 的信息，保持本地状态不变（后端无变更）
 *
 * 为什么不直接用 API 返回的数据替换本地 allSlots：
 * - 本地 allSlots 包含完整的 7 天 * 10 个时段数据
 * - API 可能只返回指定日期的子集（按 date 过滤）
 * - 本地缓存可减少重复请求和渲染抖动
 */
function mergeAvailability(baseSlots: TimeSlot[], apiSlots: { slot: TimeSlot; available: boolean; expired: boolean }[]): TimeSlot[] {
  const apiMap = new Map(apiSlots.map((a) => [a.slot.id, a]))
  return baseSlots.map((slot) => {
    const apiInfo = apiMap.get(slot.id)
    if (apiInfo) {
      return {
        ...slot,
        available: apiInfo.available,
      }
    }
    return slot
  })
}

export const useBookingStore = create<BookingState & BookingActions>((set, get) => ({
  step: 1,
  selectedType: null,
  selectedDate: null,
  selectedSlot: null,
  name: '',
  phone: '',
  summary: '',
  uploadedFiles: [],
  wantReminder: true,
  allSlots: initialSlots,
  result: null,
  submitting: false,
  phoneError: '',
  nameError: '',
  bookingError: '',
  rescheduleMode: false,
  rescheduleFrom: null,
  refreshingSlots: false,

  setSelectedType: async (type) => {
    set({
      selectedType: type,
      selectedDate: null,
      selectedSlot: null,
      bookingError: '',
      refreshingSlots: true,
    })

    try {
      const response = await fetchSlotsAvailability({ type })
      if (response.success && response.data) {
        set((s) => ({
          allSlots: mergeAvailability(s.allSlots, response.data!),
          refreshingSlots: false,
        }))
      }
    } catch {
      set({ refreshingSlots: false })
    }
  },

  setSelectedDate: async (date) => {
    set({ selectedDate: date, selectedSlot: null, bookingError: '' })

    const { selectedType } = get()
    if (selectedType) {
      try {
        const response = await fetchSlotsAvailability({ type: selectedType, date })
        if (response.success && response.data) {
          set((s) => ({
            allSlots: mergeAvailability(s.allSlots, response.data!),
          }))
        }
      } catch {
        // ignore
      }
    }
  },

  setSelectedSlot: (slot) => {
    set({ selectedSlot: slot, bookingError: '' })
  },

  setName: (name) => {
    set({ name, nameError: '' })
  },

  setPhone: (phone) => {
    set({ phone, phoneError: '' })
  },

  setSummary: (summary) =>
    set({ summary }),

  addUploadedFile: (file) =>
    set((s) => ({ uploadedFiles: [...s.uploadedFiles, file] })),

  removeUploadedFile: (id) =>
    set((s) => ({ uploadedFiles: s.uploadedFiles.filter((f) => f.id !== id) })),

  setWantReminder: (v) =>
    set({ wantReminder: v }),

  validateAndSubmit: async () => {
    const { name, phone, selectedType, selectedSlot, allSlots, uploadedFiles, wantReminder, summary } = get()
    let valid = true

    if (!name.trim()) {
      set({ nameError: '请输入姓名' })
      valid = false
    }

    if (!phone.trim()) {
      set({ phoneError: '请输入手机号' })
      valid = false
    } else if (!/^1[3-9]\d{9}$/.test(phone.trim())) {
      set({ phoneError: '请输入正确的手机号' })
      valid = false
    }

    if (!selectedType || !selectedSlot) {
      valid = false
    }

    if (!valid) return false

    const currentSlot = allSlots.find((s) => s.id === selectedSlot!.id)
    if (!currentSlot || !currentSlot.available) {
      set({ bookingError: '该时段已被预约，请选择其他时段' })
      return false
    }

    if (isSlotExpiredPublic(currentSlot)) {
      set({ bookingError: '该时段已过期，请选择其他时段' })
      return false
    }

    set({ submitting: true, bookingError: '' })

    const response = await createBooking({
      type: selectedType,
      slotId: selectedSlot.id,
      name,
      phone,
      summary,
      wantReminder,
      files: uploadedFiles,
    })

    if (!response.success) {
      set({
        submitting: false,
        bookingError: response.error?.message || '预约失败，请重试',
      })

      /**
       * 409 Conflict 处理 - 并发冲突修复机制
       *
       * 当后端返回 409 时，表示该时段在用户选择到提交的时间窗口内
       * 已被其他用户预约（典型的并发竞态条件）。此时需要：
       *
       * 1. 立即从后端拉取最新的时段可用性数据
       * 2. 用 mergeAvailability 合并到本地 allSlots 状态
       * 3. 清空已选中的 slot（因为它现在已不可用）
       * 4. 用户需要重新选择其他时段
       *
       * 这是乐观锁模式的前端实现：假设冲突概率低，
       * 仅在冲突发生时才执行状态同步。
       */
      if (response.error?.code === 409) {
        const { selectedType: currentType } = get()
        if (currentType) {
          const refresh = await fetchSlotsAvailability({ type: currentType })
          if (refresh.success && refresh.data) {
            set((s) => ({
              allSlots: mergeAvailability(s.allSlots, refresh.data!),
              selectedSlot: null,
            }))
          }
        }
      }

      return false
    }

    const result = response.data!
    const updatedSlots = allSlots.map((s) =>
      s.id === selectedSlot!.id ? { ...s, available: false } : s
    )

    set({
      result,
      submitting: false,
      step: 4,
      allSlots: updatedSlots,
      selectedSlot: null,
    })

    return true
  },

  startReschedule: async () => {
    const { result, selectedType, allSlots } = get()
    if (!result) return

    const typeInfo = CONSULTATION_TYPES.find((t) => t.label === result.typeName)
    const typeId = (typeInfo?.id || selectedType) as ConsultationType

    set({
      rescheduleMode: true,
      rescheduleFrom: result,
      result: null,
      selectedDate: null,
      selectedSlot: null,
      bookingError: '',
      submitting: true,
    })

    const [timeStart] = result.time.split('-')
    let originalSlotId: string | null = null

    for (const slot of allSlots) {
      if (slot.date === result.date && slot.startTime === timeStart) {
        originalSlotId = slot.id
        break
      }
    }

    if (originalSlotId) {
      await releaseSlot(originalSlotId, result.bookingNo)
    }

    try {
      if (typeId) {
        const response = await fetchSlotsAvailability({ type: typeId })
        if (response.success && response.data) {
          const updatedSlots = mergeAvailability(allSlots, response.data!)
          if (originalSlotId) {
            const idx = updatedSlots.findIndex((s) => s.id === originalSlotId)
            if (idx !== -1) {
              updatedSlots[idx] = { ...updatedSlots[idx], available: true }
            }
          }
          set({
            allSlots: updatedSlots,
            selectedType: typeId,
            submitting: false,
          })
        }
      }
    } catch {
      set({ submitting: false })
    }
  },

  cancelReschedule: async () => {
    const { rescheduleFrom } = get()
    if (rescheduleFrom) {
      const typeInfo = CONSULTATION_TYPES.find((t) => t.label === rescheduleFrom.typeName)

      await createBooking({
        type: typeInfo?.id || 'labor',
        slotId: '',
        name: rescheduleFrom.userName,
        phone: '',
        summary: '',
        wantReminder: rescheduleFrom.wantReminder,
        files: rescheduleFrom.files,
      })

      set({
        result: rescheduleFrom,
        rescheduleMode: false,
        rescheduleFrom: null,
      })
    } else {
      set({ rescheduleMode: false, rescheduleFrom: null })
    }
  },

  rescheduleSubmit: async () => {
    const { selectedSlot, selectedType, rescheduleFrom, allSlots, wantReminder, uploadedFiles, name } = get()

    if (!selectedSlot || !selectedType || !rescheduleFrom) return false

    const currentSlot = allSlots.find((s) => s.id === selectedSlot.id)
    if (!currentSlot || !currentSlot.available) {
      set({ bookingError: '该时段已被预约，请选择其他时段' })
      return false
    }

    if (isSlotExpiredPublic(currentSlot)) {
      set({ bookingError: '该时段已过期，请选择其他时段' })
      return false
    }

    set({ submitting: true, bookingError: '' })

    const response = await rescheduleBooking({
      originalBookingNo: rescheduleFrom.bookingNo,
      type: selectedType,
      newSlotId: selectedSlot.id,
      name,
      wantReminder,
      files: uploadedFiles,
    })

    if (!response.success) {
      set({
        submitting: false,
        bookingError: response.error?.message || '改期失败，请重试',
      })

      if (response.error?.code === 409) {
        const { selectedType: currentType } = get()
        if (currentType) {
          const refresh = await fetchSlotsAvailability({ type: currentType })
          if (refresh.success && refresh.data) {
            set((s) => ({
              allSlots: mergeAvailability(s.allSlots, refresh.data!),
              selectedSlot: null,
            }))
          }
        }
      }

      return false
    }

    const result = response.data!
    const updatedSlots = allSlots.map((s) =>
      s.id === selectedSlot.id ? { ...s, available: false } : s
    )

    set({
      result,
      submitting: false,
      step: 4,
      allSlots: updatedSlots,
      selectedSlot: null,
      rescheduleMode: false,
      rescheduleFrom: null,
    })

    return true
  },

  refreshSlots: async () => {
    const { selectedType, selectedDate } = get()
    if (!selectedType) return

    set({ refreshingSlots: true })
    try {
      const response = await fetchSlotsAvailability({
        type: selectedType,
        date: selectedDate || undefined,
      })
      if (response.success && response.data) {
        set((s) => ({
          allSlots: mergeAvailability(s.allSlots, response.data!),
          refreshingSlots: false,
        }))
      }
    } catch {
      set({ refreshingSlots: false })
    }
  },

  reset: () =>
    set({
      step: 1,
      selectedType: null,
      selectedDate: null,
      selectedSlot: null,
      name: '',
      phone: '',
      summary: '',
      uploadedFiles: [],
      wantReminder: true,
      result: null,
      submitting: false,
      phoneError: '',
      nameError: '',
      bookingError: '',
      rescheduleMode: false,
      rescheduleFrom: null,
    }),
}))

export function resetAllData() {
  clearBookings()
}
