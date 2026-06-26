import type { Lawyer, TimeSlot, TypeInfo, ConsultationType } from '@/types'

export const CONSULTATION_TYPES: TypeInfo[] = [
  {
    id: 'labor',
    label: '劳动纠纷',
    icon: 'Briefcase',
    description: '工资拖欠、工伤赔偿、劳动合同等',
  },
  {
    id: 'marriage',
    label: '婚姻家事',
    icon: 'Heart',
    description: '离婚诉讼、财产分割、抚养权等',
  },
  {
    id: 'property',
    label: '物业纠纷',
    icon: 'Building2',
    description: '物业服务、维修基金、车位争议等',
  },
]

export const LAWYERS: Lawyer[] = [
  { id: 'L001', name: '张明远', types: ['labor', 'property'] },
  { id: 'L002', name: '李婉清', types: ['marriage', 'property'] },
  { id: 'L003', name: '王建国', types: ['labor'] },
  { id: 'L004', name: '陈思涵', types: ['marriage'] },
  { id: 'L005', name: '赵志远', types: ['property', 'labor'] },
]

export interface BookingRecord {
  bookingNo: string
  lawyerId: string
  slotId: string
  type: ConsultationType
}

const bookings: BookingRecord[] = []

export function getBookings(): BookingRecord[] {
  return bookings
}

export function addBooking(record: BookingRecord): void {
  bookings.push(record)
}

export function cancelBooking(bookingNo: string): void {
  const idx = bookings.findIndex((b) => b.bookingNo === bookingNo)
  if (idx !== -1) bookings.splice(idx, 1)
}

export function clearBookings(): void {
  bookings.length = 0
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function generateSlotsForDate(date: Date): TimeSlot[] {
  const dateStr = formatDate(date)
  const slots: TimeSlot[] = []
  const morningSlots = [
    { start: '09:00', end: '09:30' },
    { start: '09:30', end: '10:00' },
    { start: '10:00', end: '10:30' },
    { start: '10:30', end: '11:00' },
    { start: '11:00', end: '11:30' },
  ]
  const afternoonSlots = [
    { start: '14:00', end: '14:30' },
    { start: '14:30', end: '15:00' },
    { start: '15:00', end: '15:30' },
    { start: '15:30', end: '16:00' },
    { start: '16:00', end: '16:30' },
  ]

  const seed = date.getDate() + date.getMonth() * 31

  morningSlots.forEach((s, i) => {
    slots.push({
      id: `${dateStr}-M${i}`,
      date: dateStr,
      startTime: s.start,
      endTime: s.end,
      period: 'morning',
      available: (seed * 7 + i * 3) % 5 !== 0,
    })
  })

  afternoonSlots.forEach((s, i) => {
    slots.push({
      id: `${dateStr}-A${i}`,
      date: dateStr,
      startTime: s.start,
      endTime: s.end,
      period: 'afternoon',
      available: (seed * 11 + i * 5) % 4 !== 0,
    })
  })

  return slots
}

export function generateAllSlots(): TimeSlot[] {
  const allSlots: TimeSlot[] = []
  const today = new Date()
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    allSlots.push(...generateSlotsForDate(d))
  }
  return allSlots
}

export function getNext7Days(): Date[] {
  const days: Date[] = []
  const today = new Date()
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push(d)
  }
  return days
}

export function assignLawyer(type: ConsultationType, slotId: string): Lawyer {
  const bookedLawyerIds = getBookings()
    .filter((b) => b.slotId === slotId)
    .map((b) => b.lawyerId)

  const matching = LAWYERS.filter(
    (l) => l.types.includes(type) && !bookedLawyerIds.includes(l.id)
  )

  if (matching.length === 0) {
    throw new Error('NO_AVAILABLE_LAWYER')
  }

  const idx = Math.floor(Math.random() * matching.length)
  return matching[idx]
}

export function generateBookingNo(): string {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const rand = String(Math.floor(Math.random() * 9000) + 1000)
  return `YY${datePart}${rand}`
}
