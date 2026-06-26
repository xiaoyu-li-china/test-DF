import type { Staff, ShiftSlot, Conflict, ShiftData } from './types'

const DEPARTMENTS = ['内科', '外科', '急诊', '儿科', '妇产科']

const NAMES_BY_DEPT: Record<string, string[]> = {
  '内科': ['张伟', '李芳', '王磊', '赵静', '陈洋'],
  '外科': ['刘明', '杨华', '黄强', '周丽', '吴刚'],
  '急诊': ['孙超', '马莉', '朱勇', '胡敏', '郭涛'],
  '儿科': ['何雪', '林峰', '徐颖', '梁宇', '邓瑶'],
  '妇产科': ['罗琳', '宋健', '谢婷', '韩博', '唐娜'],
}

function generateStaffList(): Staff[] {
  const staff: Staff[] = []
  let id = 1
  for (const dept of DEPARTMENTS) {
    const names = NAMES_BY_DEPT[dept]
    for (const name of names) {
      staff.push({
        id: `s${id}`,
        name,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
        dept,
        role: id % 3 === 0 ? '护士长' : id % 5 === 0 ? '主任' : '护士',
      })
      id++
    }
  }
  return staff
}

function generateShifts(staffList: Staff[]): ShiftSlot[] {
  const shifts: ShiftSlot[] = []
  const types: Array<'morning' | 'afternoon' | 'night' | 'off'> = ['morning', 'afternoon', 'night', 'off']

  for (const staff of staffList) {
    for (let day = 0; day < 7; day++) {
      const roll = Math.random()
      let type: ShiftSlot['type']
      if (roll < 0.35) type = 'morning'
      else if (roll < 0.65) type = 'afternoon'
      else if (roll < 0.85) type = 'night'
      else type = 'off'

      shifts.push({
        staffId: staff.id,
        day,
        hour: type === 'morning' ? 8 : type === 'afternoon' ? 14 : type === 'night' ? 22 : 0,
        type,
      })
    }
  }
  return shifts
}

function generateConflicts(shifts: ShiftSlot[], staffList: Staff[]): Conflict[] {
  const conflicts: Conflict[] = []
  const deptStaffMap: Record<string, string[]> = {}
  for (const s of staffList) {
    if (!deptStaffMap[s.dept]) deptStaffMap[s.dept] = []
    deptStaffMap[s.dept].push(s.id)
  }

  for (const dept of Object.keys(deptStaffMap)) {
    const ids = deptStaffMap[dept]
    for (let day = 0; day < 7; day++) {
      const deptShifts = shifts.filter(
        (s) => ids.includes(s.staffId) && s.day === day && s.type !== 'off'
      )
      const typeCount: Record<string, number> = {}
      for (const s of deptShifts) {
        typeCount[s.type] = (typeCount[s.type] || 0) + 1
      }
      for (const [shiftType, count] of Object.entries(typeCount)) {
        if (count <= 1) {
          if (Math.random() < 0.2) {
            const targetStaff = staffList.find((st) => st.id === deptShifts[0]?.staffId)
            if (targetStaff) {
              conflicts.push({
                id: `c${dept}-${day}-${shiftType}`,
                staffId: targetStaff.id,
                day,
                hour: shiftType === 'morning' ? 8 : shiftType === 'afternoon' ? 14 : 22,
                reason: `${dept} ${['周一','周二','周三','周四','周五','周六','周日'][day]} ${shiftType === 'morning' ? '早班' : shiftType === 'afternoon' ? '午班' : '夜班'} 仅${count}人值班`,
              })
            }
          }
        }
      }
    }
  }

  for (let i = 0; i < 4; i++) {
    const staff = staffList[Math.floor(Math.random() * staffList.length)]
    const day = Math.floor(Math.random() * 7)
    const existingShift = shifts.find((s) => s.staffId === staff.id && s.day === day)
    if (existingShift && existingShift.type !== 'off') {
      const extraType = existingShift.type === 'morning' ? 'night' : 'morning'
      conflicts.push({
        id: `c-overlap-${staff.id}-${day}`,
        staffId: staff.id,
        day,
        hour: extraType === 'morning' ? 8 : 22,
        reason: `${staff.name} 在${['周一','周二','周三','周四','周五','周六','周日'][day]}存在班次重叠`,
      })
    }
  }

  return conflicts
}

const cachedData: { value: ShiftData | null } = { value: null }

export async function fetchShiftData(dept?: string): Promise<ShiftData> {
  await new Promise((r) => setTimeout(r, 300 + Math.random() * 400))

  if (!cachedData.value) {
    const staffList = generateStaffList()
    const shifts = generateShifts(staffList)
    const conflicts = generateConflicts(shifts, staffList)
    cachedData.value = { staffList, shifts, conflicts }
  }

  const data = cachedData.value

  if (dept) {
    const filteredStaff = data.staffList.filter((s) => s.dept === dept)
    const filteredIds = new Set(filteredStaff.map((s) => s.id))
    return {
      staffList: filteredStaff,
      shifts: data.shifts.filter((s) => filteredIds.has(s.staffId)),
      conflicts: data.conflicts.filter((c) => filteredIds.has(c.staffId)),
    }
  }

  return {
    staffList: [...data.staffList],
    shifts: [...data.shifts],
    conflicts: [...data.conflicts],
  }
}

export function getDepartments(): string[] {
  return [...DEPARTMENTS]
}
