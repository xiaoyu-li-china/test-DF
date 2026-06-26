import type { PlayerStatus, Room } from '@/types'

export const ROOMS: Room[] = [
  { id: 1, name: '古风阁', color: '#8b5cf6', capacity: 8 },
  { id: 2, name: '密室区', color: '#06b6d4', capacity: 7 },
  { id: 3, name: '欧式厅', color: '#f59e0b', capacity: 8 },
  { id: 4, name: '日式屋', color: '#ef4444', capacity: 7 },
  { id: 5, name: '恐怖屋', color: '#10b981', capacity: 6 },
  { id: 6, name: '科幻舱', color: '#10b981', capacity: 8 },
]

export const DMS = [
  { id: 'dm-1', name: '小李', phone: '13800138001', color: '#8b5cf6' },
  { id: 'dm-2', name: '阿哲', phone: '13800138002', color: '#06b6d4' },
  { id: 'dm-3', name: '老王', phone: '13800138003', color: '#f59e0b' },
  { id: 'dm-4', name: '小樱', phone: '13800138004', color: '#ec4899' },
  { id: 'dm-5', name: '阿鬼', phone: '13800138005', color: '#10b981' },
  { id: 'dm-6', name: '小夜', phone: '13800138006', color: '#3b82f6' },
]

export const getPlayerStatus = (playerCount: number, capacity: number): PlayerStatus => {
  const ratio = playerCount / capacity
  if (ratio >= 1) return 'full'
  if (ratio >= 0.8) return 'nearFull'
  return 'normal'
}

export const getStatusColor = (status: PlayerStatus): string => {
  switch (status) {
    case 'full':
      return '#ef4444'
    case 'nearFull':
      return '#f97316'
    default:
      return '#10b981'
  }
}

export const TIME_SLOTS = [
  '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00', '23:30',
  '00:00', '00:30', '01:00', '01:30',
  '02:00',
]

export const SLOT_MINUTES = 30
export const SLOT_HEIGHT = 56
export const ROOM_HEADER_WIDTH = 120
export const TIME_AXIS_HEIGHT = 48

export const getTimeSlotIndex = (time: string): number => {
  return TIME_SLOTS.indexOf(time)
}

export const getTimeByIndex = (index: number): string | null => {
  if (index < 0 || index >= TIME_SLOTS.length) return null
  return TIME_SLOTS[index]
}

export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number)
  if (hours < 10) {
    return (hours + 24) * 60 + minutes
  }
  return hours * 60 + minutes
}

export const minutesToTime = (totalMinutes: number): string => {
  let hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours >= 24) hours -= 24
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

export const getSessionTimeRange = (startTime: string, duration: number): { start: number; end: number } => {
  const start = timeToMinutes(startTime)
  const end = start + duration
  return { start, end }
}

export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0]
}

export const formatDisplayDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekDays[date.getDay()]}`
}

export const getTodayDate = (): string => {
  return formatDate(new Date())
}

export const addDays = (dateStr: string, days: number): string => {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + days)
  return formatDate(date)
}
