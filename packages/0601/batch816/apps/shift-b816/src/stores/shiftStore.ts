import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Staff, ShiftSlot, Conflict } from '@/services/types'
import { fetchShiftData } from '@/services/mockApi'

export const useShiftStore = defineStore('shift', () => {
  const staffList = ref<Staff[]>([])
  const shifts = ref<ShiftSlot[]>([])
  const conflicts = ref<Conflict[]>([])
  const currentDept = ref<string>('')
  const loading = ref(false)
  const lastFetchTime = ref(0)

  const filteredStaff = computed(() => {
    if (!currentDept.value) return staffList.value
    return staffList.value.filter((s) => s.dept === currentDept.value)
  })

  const filteredShifts = computed(() => {
    if (!currentDept.value) return shifts.value
    const ids = new Set(filteredStaff.value.map((s) => s.id))
    return shifts.value.filter((s) => ids.has(s.staffId))
  })

  const filteredConflicts = computed(() => {
    if (!currentDept.value) return conflicts.value
    const ids = new Set(filteredStaff.value.map((s) => s.id))
    return conflicts.value.filter((c) => ids.has(c.staffId))
  })

  const conflictSet = computed(() => {
    const set = new Set<string>()
    for (const c of filteredConflicts.value) {
      set.add(`${c.day}-${c.hour}`)
    }
    return set
  })

  function hasConflict(day: number, hour: number): boolean {
    return conflictSet.value.has(`${day}-${hour}`)
  }

  function getStaffById(id: string): Staff | undefined {
    return staffList.value.find((s) => s.id === id)
  }

  function getShiftsForCell(day: number, hour: number): ShiftSlot[] {
    return filteredShifts.value.filter((s) => s.day === day && s.hour === hour)
  }

  async function fetchData(dept?: string) {
    loading.value = true
    try {
      const data = await fetchShiftData(dept)
      staffList.value = data.staffList
      shifts.value = data.shifts
      conflicts.value = data.conflicts
      lastFetchTime.value = Date.now()
    } finally {
      loading.value = false
    }
  }

  function setDept(dept: string) {
    currentDept.value = dept
  }

  return {
    staffList,
    shifts,
    conflicts,
    currentDept,
    loading,
    lastFetchTime,
    filteredStaff,
    filteredShifts,
    filteredConflicts,
    conflictSet,
    hasConflict,
    getStaffById,
    getShiftsForCell,
    fetchData,
    setDept,
  }
})
