export type RoomStatus = 'occupied' | 'idle'

export interface Room {
  id: string
  name: string
  floor: number
  capacity: number
  status: RoomStatus
  meeting?: string
  endTime?: string
  occupiedAt?: number
}

export interface Booking {
  id: string
  roomId: string
  date: string
  startTime: string
  endTime: string
  title: string
  organizer: string
  attendees: string[]
}

export interface WSMessage {
  type: 'rooms' | 'error'
  payload: Room[]
}
