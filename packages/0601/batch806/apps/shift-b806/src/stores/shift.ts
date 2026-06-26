import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Staff, Shift, Conflict, ConnectionStatus } from '../types'
import { mockApi } from '../services/mockApi'

export const useShiftStore = defineStore('shift', () => {
  const staff = ref<Staff[]>([])
  const shifts = ref<Shift[]>([])
  const conflicts = ref<Conflict[]>([])
  const connectionStatus = ref<ConnectionStatus>('connected')
  const currentDept = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastRequestId = ref<number | null>(null)
  const fetchAbortController = ref<AbortController | null>(null)

  const dates = computed(() => {
    const set = new Set(shifts.value.map((s) => s.date))
    return Array.from(set).sort()
  })

  const departments = computed(() => {
    return mockApi.getDepartments()
  })

  const filteredStaff = computed(() => {
    if (!currentDept.value) return staff.value
    return staff.value.filter((s) => s.department === currentDept.value)
  })

  const filteredShifts = computed(() => {
    if (!currentDept.value) return shifts.value
    return shifts.value.filter((s) => s.department === currentDept.value)
  })

  const filteredConflicts = computed(() => {
    if (!currentDept.value) return conflicts.value
    return conflicts.value.filter((c) => {
      const shift = shifts.value.find((s) => s.staffId === c.staffId && s.date === c.date)
      return shift?.department === currentDept.value
    })
  })

  function getStaffById(id: string): Staff | undefined {
    return staff.value.find((s) => s.id === id)
  }

  function getShiftsByStaffAndDate(staffId: string, date: string): Shift[] {
    return filteredShifts.value.filter((s) => s.staffId === staffId && s.date === date)
  }

  function getConflictsByStaffAndDate(staffId: string, date: string): Conflict[] {
    return filteredConflicts.value.filter((c) => c.staffId === staffId && c.date === date)
  }

  function isTimeSlotInConflict(staffId: string, date: string, hour: number): boolean {
    return filteredConflicts.value.some(
      (c) => c.staffId === staffId && c.date === date && hour >= c.startTime && hour < c.endTime
    )
  }

  function setDepartment(dept: string | null) {
    if (dept === currentDept.value) {
      return
    }
    currentDept.value = dept
    fetchAllData()
  }

  async function fetchAllData() {
    if (loading.value) {
      return
    }

    if (fetchAbortController.value) {
      fetchAbortController.value.abort()
    }
    fetchAbortController.value = new AbortController()
    const signal = fetchAbortController.value.signal

    loading.value = true
    error.value = null

    try {
      const promise = mockApi.getAllData(currentDept.value || undefined) as any
      const currentRequestId = promise.__requestId || Date.now()
      lastRequestId.value = currentRequestId

      const res = await promise

      if (signal.aborted) {
        return
      }

      if (lastRequestId.value !== currentRequestId) {
        return
      }

      if (res.success && res.data) {
        staff.value = res.data.staff
        shifts.value = res.data.shifts
        conflicts.value = res.data.conflicts
      }
    } catch (e) {
      if (signal.aborted) {
        return
      }
      error.value = e instanceof Error ? e.message : '加载数据失败'
    } finally {
      if (fetchAbortController.value?.signal === signal) {
        loading.value = false
        fetchAbortController.value = null
      }
    }
  }

  async function refreshData() {
    if (loading.value) {
      return
    }
    await fetchAllData()
  }

  function handleConnectionChange(status: ConnectionStatus) {
    connectionStatus.value = status
    if (status === 'connected') {
      fetchAllData()
    }
  }

  function init() {
    connectionStatus.value = mockApi.getStatus()
    mockApi.onStatusChange(handleConnectionChange)
    fetchAllData()
  }

  function forceDisconnect() {
    mockApi.forceDisconnect()
  }

  function forceReconnect() {
    mockApi.forceReconnect()
  }

  return {
    staff,
    shifts,
    conflicts,
    connectionStatus,
    currentDept,
    loading,
    error,
    dates,
    departments,
    filteredStaff,
    filteredShifts,
    filteredConflicts,
    getStaffById,
    getShiftsByStaffAndDate,
    getConflictsByStaffAndDate,
    isTimeSlotInConflict,
    setDepartment,
    fetchAllData,
    refreshData,
    init,
    forceDisconnect,
    forceReconnect,
  }
})
