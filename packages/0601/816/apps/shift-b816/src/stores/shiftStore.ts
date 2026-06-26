import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  fetchShifts,
  detectConflicts,
  getStaffPool,
  getDepartments,
  getTimeSlots,
  simulateDisconnect,
  simulateReconnect,
  refreshToken,
  type Shift,
  type Conflict,
  type Staff,
} from '../services/mockApi'

export const useShiftStore = defineStore('shift', () => {
  const shifts = ref<Shift[]>([])
  const conflicts = ref<Conflict[]>([])
  const staffPool = ref<Staff[]>([])
  const departments = ref<string[]>([])
  const timeSlots = ref<string[]>([])
  const loading = ref(false)
  const connected = ref(true)
  const syncInterrupted = ref(false)
  const lastVersion = ref(0)
  const currentDept = ref('')
  const authFailed = ref(false)

  let pollingTimer: number | null = null
  let pendingRefreshPromise: Promise<boolean> | null = null
  let refreshCallCountInternal = 0

  const conflictSlotKeys = computed(() => {
    const keys = new Set<string>()
    for (const c of conflicts.value) {
      keys.add(`${c.date}::${c.slot}`)
    }
    return keys
  })

  function isConflictSlot(date: string, slot: string): boolean {
    return conflictSlotKeys.value.has(`${date}::${slot}`)
  }

  async function ensureAuth(): Promise<boolean> {
    if (pendingRefreshPromise) {
      return pendingRefreshPromise
    }
    pendingRefreshPromise = (async () => {
      try {
        refreshCallCountInternal++
        const ok = await refreshToken()
        return ok
      } finally {
        pendingRefreshPromise = null
      }
    })()
    return pendingRefreshPromise
  }

  async function requestWithRefresh<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (e: any) {
      if (e.message === '401_UNAUTHORIZED') {
        const refreshed = await ensureAuth()
        if (refreshed) {
          return await fn()
        }
        authFailed.value = true
        throw new Error('AUTH_REFRESH_FAILED')
      }
      throw e
    }
  }

  async function loadShifts(dept?: string) {
    loading.value = true
    currentDept.value = dept || ''
    authFailed.value = false
    try {
      const { shifts: data, version } = await requestWithRefresh(() => fetchShifts(dept))
      shifts.value = data
      lastVersion.value = version
      conflicts.value = detectConflicts(data)
      connected.value = true
      syncInterrupted.value = false
    } catch (e: any) {
      if (e.message === 'NETWORK_ERROR') {
        connected.value = false
        syncInterrupted.value = true
      } else if (e.message !== 'AUTH_REFRESH_FAILED') {
        throw e
      }
    } finally {
      loading.value = false
    }
  }

  function startPolling(intervalMs: number = 5000) {
    stopPolling()
    pollingTimer = window.setInterval(async () => {
      if (connected.value && !authFailed.value) {
        try {
          const { shifts: data, version } = await requestWithRefresh(() =>
            fetchShifts(currentDept.value || undefined)
          )
          if (version > lastVersion.value) {
            shifts.value = data
            lastVersion.value = version
            conflicts.value = detectConflicts(data)
          }
        } catch (e: any) {
          if (e.message === 'NETWORK_ERROR') {
            connected.value = false
            syncInterrupted.value = true
          }
        }
      }
    }, intervalMs)
  }

  function stopPolling() {
    if (pollingTimer !== null) {
      clearInterval(pollingTimer)
      pollingTimer = null
    }
  }

  function reset() {
    stopPolling()
    shifts.value = []
    conflicts.value = []
    loading.value = false
    connected.value = true
    syncInterrupted.value = false
    currentDept.value = ''
    lastVersion.value = 0
    authFailed.value = false
    pendingRefreshPromise = null
    refreshCallCountInternal = 0
  }

  function getRefreshCallCountInternal(): number {
    return refreshCallCountInternal
  }

  async function reconnect() {
    simulateReconnect()
    syncInterrupted.value = false
    connected.value = true
    await loadShifts(currentDept.value || undefined)
  }

  function disconnect() {
    simulateDisconnect()
    connected.value = false
    syncInterrupted.value = true
  }

  function initMeta() {
    staffPool.value = getStaffPool()
    departments.value = getDepartments()
    timeSlots.value = getTimeSlots()
  }

  function getStaffById(id: string): Staff | undefined {
    return staffPool.value.find((s) => s.id === id)
  }

  return {
    shifts,
    conflicts,
    staffPool,
    departments,
    timeSlots,
    loading,
    connected,
    syncInterrupted,
    lastVersion,
    currentDept,
    authFailed,
    conflictSlotKeys,
    isConflictSlot,
    loadShifts,
    startPolling,
    stopPolling,
    reset,
    reconnect,
    disconnect,
    initMeta,
    getStaffById,
    getRefreshCallCountInternal,
  }
})
