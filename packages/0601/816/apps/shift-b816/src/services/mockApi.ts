export interface Staff {
  id: string
  name: string
  dept: string
  role: string
  avatar: string
}

export interface Shift {
  id: string
  staffId: string
  date: string
  slot: string
  dept: string
}

export interface Conflict {
  staffId: string
  staffName: string
  date: string
  slot: string
  type: 'double_booked' | 'over_capacity'
  message: string
}

const DEPARTMENTS = ['内科', '外科', '急诊', '儿科']

const STAFF_POOL: Staff[] = [
  { id: 's1', name: '张伟', dept: '内科', role: '主治医师', avatar: '👨‍⚕️' },
  { id: 's2', name: '李娜', dept: '内科', role: '住院医师', avatar: '👩‍⚕️' },
  { id: 's3', name: '王强', dept: '外科', role: '主治医师', avatar: '👨‍⚕️' },
  { id: 's4', name: '赵敏', dept: '外科', role: '住院医师', avatar: '👩‍⚕️' },
  { id: 's5', name: '刘洋', dept: '急诊', role: '主治医师', avatar: '👨‍⚕️' },
  { id: 's6', name: '陈静', dept: '急诊', role: '住院医师', avatar: '👩‍⚕️' },
  { id: 's7', name: '周磊', dept: '儿科', role: '主治医师', avatar: '👨‍⚕️' },
  { id: 's8', name: '吴芳', dept: '儿科', role: '住院医师', avatar: '👩‍⚕️' },
  { id: 's9', name: '孙涛', dept: '内科', role: '护士长', avatar: '👨‍⚕️' },
  { id: 's10', name: '郑丽', dept: '外科', role: '护士长', avatar: '👩‍⚕️' },
  { id: 's11', name: '黄鑫', dept: '急诊', role: '护士', avatar: '👨‍⚕️' },
  { id: 's12', name: '许婷', dept: '儿科', role: '护士', avatar: '👩‍⚕️' },
]

const TIME_SLOTS = ['早班 08:00-16:00', '白班 09:00-17:00', '晚班 16:00-24:00', '夜班 00:00-08:00']

function generateDates(count: number): string[] {
  const dates: string[] = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

let shiftIdCounter = 0

function generateShifts(): Shift[] {
  const dates = generateDates(7)
  const shifts: Shift[] = []

  for (const date of dates) {
    for (const dept of DEPARTMENTS) {
      const deptStaff = STAFF_POOL.filter((s) => s.dept === dept)
      const slots = TIME_SLOTS
      for (const slot of slots) {
        const picked = deptStaff[Math.floor(Math.random() * deptStaff.length)]
        shifts.push({
          id: `shift-${++shiftIdCounter}`,
          staffId: picked.id,
          date,
          slot,
          dept,
        })
      }
    }
  }

  const conflictDate = dates[1]
  const conflictStaff = STAFF_POOL[0]
  shifts.push({
    id: `shift-${++shiftIdCounter}`,
    staffId: conflictStaff.id,
    date: conflictDate,
    slot: TIME_SLOTS[0],
    dept: conflictStaff.dept,
  })

  const overcapDate = dates[3]
  const overcapDept = '急诊'
  const overcapSlot = TIME_SLOTS[2]
  const overcapStaff = STAFF_POOL.filter((s) => s.dept === overcapDept)
  for (const s of overcapStaff) {
    if (!shifts.find((sh) => sh.staffId === s.id && sh.date === overcapDate && sh.slot === overcapSlot)) {
      shifts.push({
        id: `shift-${++shiftIdCounter}`,
        staffId: s.id,
        date: overcapDate,
        slot: overcapSlot,
        dept: overcapDept,
      })
    }
  }

  return shifts
}

let cachedShifts: Shift[] | null = null
let online = true
let syncVersion = 1

let tokenValid = true
let refreshShouldFail = false
let refreshCallCount = 0

export function getStaffPool(): Staff[] {
  return [...STAFF_POOL]
}

export function getDepartments(): string[] {
  return [...DEPARTMENTS]
}

export function getTimeSlots(): string[] {
  return [...TIME_SLOTS]
}

export async function fetchShifts(dept?: string): Promise<{ shifts: Shift[]; version: number }> {
  await delay(50)

  if (!online) {
    throw new Error('NETWORK_ERROR')
  }

  if (!tokenValid) {
    throw new Error('401_UNAUTHORIZED')
  }

  if (!cachedShifts) {
    cachedShifts = generateShifts()
  }

  let result = cachedShifts
  if (dept) {
    result = result.filter((s) => s.dept === dept)
  }

  return { shifts: [...result], version: syncVersion }
}

export async function refreshToken(): Promise<boolean> {
  refreshCallCount++
  await delay(100)
  if (refreshShouldFail) {
    return false
  }
  tokenValid = true
  return true
}

export function setTokenExpired(expired: boolean = true): void {
  tokenValid = !expired
}

export function setRefreshShouldFail(fail: boolean = true): void {
  refreshShouldFail = fail
}

export function getRefreshCallCount(): number {
  return refreshCallCount
}

export function resetAuthState(): void {
  tokenValid = true
  refreshShouldFail = false
  refreshCallCount = 0
}

export function detectConflicts(shifts: Shift[]): Conflict[] {
  const conflicts: Conflict[] = []

  const byStaffSlot = new Map<string, Shift[]>()
  for (const s of shifts) {
    const key = `${s.staffId}::${s.date}::${s.slot}`
    if (!byStaffSlot.has(key)) byStaffSlot.set(key, [])
    byStaffSlot.get(key)!.push(s)
  }

  for (const [, group] of byStaffSlot) {
    if (group.length > 1) {
      const staff = STAFF_POOL.find((s) => s.id === group[0].staffId)!
      conflicts.push({
        staffId: staff.id,
        staffName: staff.name,
        date: group[0].date,
        slot: group[0].slot,
        type: 'double_booked',
        message: `${staff.name} 在 ${group[0].date} ${group[0].slot} 被重复排班`,
      })
    }
  }

  const byDeptSlot = new Map<string, Shift[]>()
  for (const s of shifts) {
    const key = `${s.dept}::${s.date}::${s.slot}`
    if (!byDeptSlot.has(key)) byDeptSlot.set(key, [])
    byDeptSlot.get(key)!.push(s)
  }

  for (const [, group] of byDeptSlot) {
    if (group.length > 3) {
      const names = group.map((g) => STAFF_POOL.find((s) => s.id === g.staffId)?.name || g.staffId)
      conflicts.push({
        staffId: '',
        staffName: names.join('、'),
        date: group[0].date,
        slot: group[0].slot,
        type: 'over_capacity',
        message: `${group[0].dept} ${group[0].date} ${group[0].slot} 人员超限（${group.length}人）`,
      })
    }
  }

  return conflicts
}

export function simulateDisconnect(): void {
  online = false
}

export function simulateReconnect(): void {
  online = true
  syncVersion++
}

export function isOnline(): boolean {
  return online
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
