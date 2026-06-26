export interface Staff {
  id: string
  name: string
  avatar: string
  dept: string
  role: string
}

export type ShiftType = 'morning' | 'afternoon' | 'night' | 'off'

export interface ShiftSlot {
  staffId: string
  day: number
  hour: number
  type: ShiftType
}

export interface Conflict {
  id: string
  staffId: string
  day: number
  hour: number
  reason: string
}

export interface ShiftData {
  staffList: Staff[]
  shifts: ShiftSlot[]
  conflicts: Conflict[]
}
