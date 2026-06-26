import type { Staff, Shift, Conflict } from '../types'

export interface ExportRow {
  员工姓名: string
  科室: string
  职位: string
  日期: string
  班次类型: string
  开始时间: string
  结束时间: string
  时长: string
  是否冲突: string
  冲突描述: string
}

function formatShiftType(type: string): string {
  const map: Record<string, string> = {
    morning: '早班',
    afternoon: '中班',
    night: '夜班',
    overtime: '加班',
  }
  return map[type] || type
}

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`
}

function getConflictDescription(
  staffId: string,
  date: string,
  startTime: number,
  endTime: number,
  conflicts: Conflict[]
): string {
  const relevant = conflicts.filter(
    (c) =>
      c.staffId === staffId &&
      c.date === date &&
      endTime > c.startTime &&
      startTime < c.endTime
  )
  return relevant.map((c) => c.description).join('; ') || ''
}

function hasConflict(
  staffId: string,
  date: string,
  startTime: number,
  endTime: number,
  conflicts: Conflict[]
): boolean {
  return conflicts.some(
    (c) =>
      c.staffId === staffId &&
      c.date === date &&
      endTime > c.startTime &&
      startTime < c.endTime
  )
}

export function generateExportData(
  staff: Staff[],
  shifts: Shift[],
  conflicts: Conflict[]
): ExportRow[] {
  const rows: ExportRow[] = []
  const staffMap = new Map(staff.map((s) => [s.id, s]))

  const sortedShifts = [...shifts].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    if (a.staffId !== b.staffId) {
      const staffA = staffMap.get(a.staffId)?.name || ''
      const staffB = staffMap.get(b.staffId)?.name || ''
      return staffA.localeCompare(staffB, 'zh-CN')
    }
    return a.startTime - b.startTime
  })

  for (const shift of sortedShifts) {
    const staffMember = staffMap.get(shift.staffId)
    if (!staffMember) continue

    const duration = shift.endTime - shift.startTime
    const isConflict = hasConflict(shift.staffId, shift.date, shift.startTime, shift.endTime, conflicts)
    const conflictDesc = getConflictDescription(
      shift.staffId,
      shift.date,
      shift.startTime,
      shift.endTime,
      conflicts
    )

    rows.push({
      员工姓名: staffMember.name,
      科室: staffMember.department,
      职位: staffMember.position,
      日期: shift.date,
      班次类型: formatShiftType(shift.type),
      开始时间: formatHour(shift.startTime),
      结束时间: formatHour(shift.endTime),
      时长: `${duration} 小时`,
      是否冲突: isConflict ? '是' : '否',
      冲突描述: conflictDesc,
    })
  }

  return rows
}

export function rowsToCSV(rows: ExportRow[]): string {
  if (rows.length === 0) {
    return ''
  }

  const headers = Object.keys(rows[0]) as (keyof ExportRow)[]

  const escapeValue = (value: string): string => {
    const str = String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const headerRow = headers.map((h) => escapeValue(h)).join(',')
  const dataRows = rows.map((row) => headers.map((h) => escapeValue(row[h])).join(','))

  return [headerRow, ...dataRows].join('\n')
}

export function downloadCSV(csvContent: string, filename: string): void {
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function generateFilename(dept: string | null): string {
  const now = new Date()
  const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`
  const deptPart = dept ? `_${dept}` : ''
  return `排班数据${deptPart}_${timestamp}.csv`
}
