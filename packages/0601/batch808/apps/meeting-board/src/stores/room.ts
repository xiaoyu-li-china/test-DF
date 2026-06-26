import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Room, WSMessage, Booking, RoomStatus } from '../types'
import { ws } from '../services/ws'

interface FilterOptions {
  floor: number | null
  status: RoomStatus | null
  minCapacity: number | null
  search: string
}

interface QueuedRequest {
  id: string
  url: string
  body: Record<string, unknown>
  createdAt: number
  retries: number
}

interface BookingCreateRequest {
  roomId: string
  date: string
  startTime: string
  endTime: string
  title: string
  organizer: string
  attendees: string[]
}

const BASE_URL = 'http://localhost:3002'

export const useRoomStore = defineStore('room', () => {
  const rooms = ref<Room[]>([])
  const connected = ref(false)
  const selectedRoomId = ref<string | null>(null)
  const modalVisible = ref(false)
  const offlineQueue = ref<QueuedRequest[]>([])
  const isFlushingQueue = ref(false)

  const filters = ref<FilterOptions>({
    floor: null,
    status: null,
    minCapacity: null,
    search: '',
  })

  const filteredRooms = computed(() => {
    let result = [...rooms.value]

    if (filters.value.floor !== null) {
      result = result.filter((r) => r.floor === filters.value.floor)
    }

    if (filters.value.status !== null) {
      result = result.filter((r) => r.status === filters.value.status)
    }

    if (filters.value.minCapacity !== null) {
      result = result.filter((r) => r.capacity >= filters.value.minCapacity!)
    }

    if (filters.value.search) {
      const searchLower = filters.value.search.toLowerCase()
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(searchLower) ||
          (r.meeting && r.meeting.toLowerCase().includes(searchLower))
      )
    }

    return result
  })

  const floors = computed(() => {
    const set = new Set(rooms.value.map((r) => r.floor))
    return Array.from(set).sort((a, b) => a - b)
  })

  const occupiedCount = computed(() => filteredRooms.value.filter((r) => r.status === 'occupied').length)
  const idleCount = computed(() => filteredRooms.value.filter((r) => r.status === 'idle').length)

  const selectedRoom = computed(() => {
    if (!selectedRoomId.value) return null
    return rooms.value.find((r) => r.id === selectedRoomId.value) || null
  })

  const selectedBookings = computed((): Booking[] => {
    if (!selectedRoomId.value) return []
    return ws.getBookings(selectedRoomId.value)
  })

  const queueLength = computed(() => offlineQueue.value.length)

  function handleMessage(msg: WSMessage) {
    if (msg.type === 'rooms') {
      rooms.value = msg.payload
      connected.value = true
    } else if (msg.type === 'error') {
      connected.value = false
    }
  }

  async function flushQueue() {
    if (isFlushingQueue.value || offlineQueue.value.length === 0) return
    if (!connected.value) return

    isFlushingQueue.value = true
    const queueCopy = [...offlineQueue.value]
    const failed: QueuedRequest[] = []

    for (const req of queueCopy) {
      try {
        const res = await fetch(`${BASE_URL}${req.url}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        offlineQueue.value = offlineQueue.value.filter((q) => q.id !== req.id)
      } catch {
        if (req.retries < 3) {
          failed.push({ ...req, retries: req.retries + 1 })
        } else {
          offlineQueue.value = offlineQueue.value.filter((q) => q.id !== req.id)
        }
      }
    }

    offlineQueue.value = [...failed, ...offlineQueue.value.filter((q) => !queueCopy.some((c) => c.id === q.id))]
    isFlushingQueue.value = false
  }

  watch(connected, (newVal) => {
    if (newVal) {
      flushQueue()
    }
  })

  function enqueueRequest(url: string, body: Record<string, unknown>) {
    const req: QueuedRequest = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      url,
      body,
      createdAt: Date.now(),
      retries: 0,
    }
    offlineQueue.value.push(req)
  }

  async function createBooking(data: BookingCreateRequest): Promise<void> {
    if (!connected.value) {
      enqueueRequest('/bookings', data as unknown as Record<string, unknown>)
      return
    }
    try {
      const res = await fetch(`${BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch {
      enqueueRequest('/bookings', data as unknown as Record<string, unknown>)
    }
  }

  function connect() {
    ws.onMessage(handleMessage)
    ws.connect()
  }

  function disconnect() {
    ws.disconnect()
    connected.value = false
  }

  function setFloor(floor: number | null) {
    if (floor === null) {
      filters.value.floor = null
      return
    }
    const floorNum = Number(floor)
    if (isNaN(floorNum)) {
      filters.value.floor = null
      return
    }
    if (floors.value.length > 0 && !floors.value.includes(floorNum)) {
      filters.value.floor = null
      return
    }
    filters.value.floor = floorNum
  }

  function setStatusFilter(status: RoomStatus | null) {
    filters.value.status = status
  }

  function setMinCapacityFilter(capacity: number | null) {
    filters.value.minCapacity = capacity
  }

  function setSearchFilter(search: string) {
    filters.value.search = search
  }

  function clearFilters() {
    filters.value = {
      floor: null,
      status: null,
      minCapacity: null,
      search: '',
    }
  }

  function openModal(roomId: string) {
    selectedRoomId.value = roomId
    modalVisible.value = true
  }

  function closeModal() {
    modalVisible.value = false
    selectedRoomId.value = null
  }

  function clearQueue() {
    offlineQueue.value = []
  }

  return {
    rooms,
    connected,
    filters,
    offlineQueue,
    queueLength,
    isFlushingQueue,
    filteredRooms,
    floors,
    occupiedCount,
    idleCount,
    selectedRoom,
    selectedBookings,
    modalVisible,
    connect,
    disconnect,
    setFloor,
    setStatusFilter,
    setMinCapacityFilter,
    setSearchFilter,
    clearFilters,
    createBooking,
    flushQueue,
    clearQueue,
    openModal,
    closeModal,
  }
})
