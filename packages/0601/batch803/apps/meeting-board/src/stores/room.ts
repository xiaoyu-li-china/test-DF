import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Room, WSMessage, Booking } from '../types'
import { ws } from '../services/ws'

export const useRoomStore = defineStore('room', () => {
  const rooms = ref<Room[]>([])
  const connected = ref(false)
  const currentFloor = ref<number | null>(null)
  const selectedRoomId = ref<string | null>(null)
  const modalVisible = ref(false)

  const filteredRooms = computed(() => {
    if (currentFloor.value === null || currentFloor.value === undefined) return rooms.value
    const floorNum = Number(currentFloor.value)
    if (isNaN(floorNum)) return rooms.value
    return rooms.value.filter((r) => Number(r.floor) === floorNum)
  })

  const floors = computed(() => {
    const set = new Set(rooms.value.map((r) => Number(r.floor)))
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

  function handleMessage(msg: WSMessage) {
    if (msg.type === 'rooms') {
      rooms.value = msg.payload
      connected.value = true
    } else if (msg.type === 'error') {
      connected.value = false
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
    currentFloor.value = floor === null ? null : Number(floor)
  }

  function openModal(roomId: string) {
    selectedRoomId.value = roomId
    modalVisible.value = true
  }

  function closeModal() {
    modalVisible.value = false
    selectedRoomId.value = null
  }

  return {
    rooms,
    connected,
    currentFloor,
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
    openModal,
    closeModal,
  }
})
