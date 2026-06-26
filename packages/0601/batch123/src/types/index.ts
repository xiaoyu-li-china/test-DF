export interface Room {
  id: number
  name: string
  color: string
  capacity: number
}

export interface DM {
  id: string
  name: string
  phone: string
  color: string
}

export interface LeaveRecord {
  dmId: string
  date: string
  note?: string
}

export interface Session {
  id: string
  roomId: number
  roomName: string
  scriptName: string
  startTime: string
  duration: number
  playerCount: number
  dmId: string
  dmName: string
  date: string
  isPrivateBooking: boolean
  privateBookingNote?: string
}

export interface ConflictResult {
  hasConflict: boolean
  conflictingSessions: Session[]
}

export type DragState = {
  isDragging: boolean
  sessionId: string | null
  startRoomId: number | null
  startX: number
  startY: number
  currentX: number
  currentY: number
  offsetX: number
  offsetY: number
  targetRoomId: number | null
  targetStartTime: string | null
}

export type ModalMode = 'create' | 'edit'

export type PlayerStatus = 'normal' | 'nearFull' | 'full'

