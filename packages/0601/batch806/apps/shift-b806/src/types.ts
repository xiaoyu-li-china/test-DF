export interface Staff {
  id: string
  name: string
  department: string
  avatar?: string
  position: string
}

export interface Shift {
  id: string
  staffId: string
  date: string
  startTime: number
  endTime: number
  type: 'morning' | 'afternoon' | 'night' | 'overtime'
  department: string
}

export interface Conflict {
  id: string
  staffId: string
  date: string
  startTime: number
  endTime: number
  type: 'overlap' | 'overwork' | 'missing'
  description: string
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
