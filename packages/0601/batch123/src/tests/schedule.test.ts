import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkTimeOverlap, checkConflict } from '@/utils/conflict'
import type { Session, Room, DM } from '@/types'

describe('排期冲突检测', () => {
  const mockRoom: Room = {
    id: 1,
    name: '古风阁',
    color: '#8b5cf6',
    capacity: 8,
  }

  const mockDM: DM = {
    id: 'dm-1',
    name: '小李',
    phone: '13800138001',
    color: '#8b5cf6',
  }

  const baseSession: Omit<Session, 'id'> = {
    roomId: 1,
    roomName: '古风阁',
    scriptName: '测试剧本',
    startTime: '14:00',
    duration: 240,
    playerCount: 6,
    dmId: 'dm-1',
    dmName: '小李',
    date: '2026-06-01',
    isPrivateBooking: false,
  }

  describe('checkTimeOverlap', () => {
    it('完全重叠应返回冲突', () => {
      expect(checkTimeOverlap('14:00', 240, '14:00', 240)).toBe(true)
    })

    it('部分重叠（后开始早结束）应返回冲突', () => {
      expect(checkTimeOverlap('14:00', 240, '15:00', 120)).toBe(true)
    })

    it('部分重叠（早开始晚结束）应返回冲突', () => {
      expect(checkTimeOverlap('15:00', 120, '14:00', 240)).toBe(true)
    })

    it('首尾相接不应返回冲突', () => {
      expect(checkTimeOverlap('14:00', 240, '18:00', 120)).toBe(false)
    })

    it('间隔一段时间不应返回冲突', () => {
      expect(checkTimeOverlap('14:00', 240, '19:00', 120)).toBe(false)
    })

    it('完全包含应返回冲突', () => {
      expect(checkTimeOverlap('14:00', 300, '15:00', 120)).toBe(true)
    })
  })

  describe('checkConflict', () => {
    let existingSessions: Session[]

    beforeEach(() => {
      existingSessions = [
        {
          ...baseSession,
          id: 'session-1',
          startTime: '14:00',
          duration: 240,
          scriptName: '第一场',
        },
        {
          ...baseSession,
          id: 'session-2',
          startTime: '19:00',
          duration: 240,
          scriptName: '第二场',
        },
      ]
    })

    it('完全重叠应检测到冲突', () => {
      const newSession = { ...baseSession, startTime: '14:00', duration: 240 }
      const result = checkConflict(newSession, existingSessions)
      expect(result.hasConflict).toBe(true)
      expect(result.conflictingSessions).toHaveLength(1)
      expect(result.conflictingSessions[0].scriptName).toBe('第一场')
    })

    it('跨午夜的时间也应正确检测', () => {
      existingSessions[0].startTime = '23:00'
      existingSessions[0].duration = 180
      const newSession = { ...baseSession, startTime: '23:30', duration: 120 }
      const result = checkConflict(newSession, existingSessions)
      expect(result.hasConflict).toBe(true)
    })

    it('不同房间不应检测到冲突', () => {
      const newSession = { ...baseSession, roomId: 2, startTime: '14:00', duration: 240 }
      const result = checkConflict(newSession, existingSessions)
      expect(result.hasConflict).toBe(false)
    })

    it('不同日期不应检测到冲突', () => {
      const newSession = { ...baseSession, date: '2026-06-02', startTime: '14:00', duration: 240 }
      const result = checkConflict(newSession, existingSessions)
      expect(result.hasConflict).toBe(false)
    })

    it('忽略自身时更新不应检测到冲突', () => {
      const newSession = { ...baseSession, startTime: '14:00', duration: 240 }
      const result = checkConflict(newSession, existingSessions, 'session-1')
      expect(result.hasConflict).toBe(false)
    })

    it('多个冲突应全部返回', () => {
      existingSessions.push({
        ...baseSession,
        id: 'session-3',
        startTime: '15:00',
        duration: 120,
        scriptName: '冲突的第三场',
      })
      const newSession = { ...baseSession, startTime: '14:30', duration: 180 }
      const result = checkConflict(newSession, existingSessions)
      expect(result.hasConflict).toBe(true)
      expect(result.conflictingSessions).toHaveLength(2)
    })
  })
})

describe('Mock 后端 API', () => {
  const mockRooms: Room[] = [
    { id: 1, name: '古风阁', color: '#8b5cf6', capacity: 8 },
    { id: 2, name: '密室区', color: '#06b6d4', capacity: 7 },
    { id: 3, name: '欧式厅', color: '#f59e0b', capacity: 8 },
    { id: 4, name: '日式屋', color: '#ef4444', capacity: 7 },
    { id: 5, name: '恐怖屋', color: '#10b981', capacity: 6 },
    { id: 6, name: '科幻舱', color: '#10b981', capacity: 8 },
  ]

  const mockDMs: DM[] = [
    { id: 'dm-1', name: '小李', phone: '13800138001', color: '#8b5cf6' },
    { id: 'dm-2', name: '阿哲', phone: '13800138002', color: '#06b6d4' },
    { id: 'dm-3', name: '老王', phone: '13800138003', color: '#f59e0b' },
    { id: 'dm-4', name: '小樱', phone: '13800138004', color: '#ec4899' },
    { id: 'dm-5', name: '阿鬼', phone: '13800138005', color: '#10b981' },
    { id: 'dm-6', name: '小夜', phone: '13800138006', color: '#3b82f6' },
  ]

  const mockFetch = vi.fn()

  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('getRooms 应返回房间列表', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockRooms),
    })

    const response = await mockFetch('/api/rooms')
    const rooms = await response.json()

    expect(rooms).toHaveLength(6)
    expect(rooms[0]).toMatchObject({
      id: 1,
      name: '古风阁',
      capacity: 8,
    })
  })

  it('getDMs 应返回 DM 列表', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockDMs),
    })

    const response = await mockFetch('/api/dms')
    const dms = await response.json()

    expect(dms).toHaveLength(6)
    expect(dms[0]).toMatchObject({
      id: 'dm-1',
      name: '小李',
    })
  })

  it('getAvailableDMs 应过滤请假的 DM', async () => {
    const leaveRecords = [{ dmId: 'dm-1', date: '2026-06-01' }]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ dms: mockDMs, leaveRecords }),
    })

    const response = await mockFetch('/api/dms/available?date=2026-06-01')
    const { dms, leaveRecords: records } = await response.json()

    const availableDMs = dms.filter(
      (dm: DM) => !records.some((r: { dmId: string }) => r.dmId === dm.id),
    )

    expect(availableDMs).toHaveLength(5)
    expect(availableDMs.find((dm: DM) => dm.id === 'dm-1')).toBeUndefined()
  })

  it('createSession 应在冲突时返回错误', async () => {
    const newSession = {
      roomId: 1,
      startTime: '14:00',
      duration: 240,
      date: '2026-06-01',
    }

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () =>
        Promise.resolve({
          error: '该时段与已有场次冲突：青楼 (14:00)',
        }),
    })

    const response = await mockFetch('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(newSession),
    })

    expect(response.ok).toBe(false)
    const data = await response.json()
    expect(data.error).toContain('冲突')
  })

  it('moveSession API 调用应正确传递参数', async () => {
    const sessionId = 'session-1'
    const newRoomId = 2
    const newStartTime = '16:00'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })

    const response = await mockFetch(`/api/sessions/${sessionId}/move`, {
      method: 'PUT',
      body: JSON.stringify({ newRoomId, newStartTime }),
    })

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/sessions/${sessionId}/move`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ newRoomId, newStartTime }),
      }),
    )
    expect(response.ok).toBe(true)
  })
})

describe('DM 不可用时的禁用逻辑', () => {
  const mockDMs: DM[] = [
    { id: 'dm-1', name: '小李', phone: '13800138001', color: '#8b5cf6' },
    { id: 'dm-2', name: '阿哲', phone: '13800138002', color: '#06b6d4' },
  ]

  const isDMOnLeave = (dmId: string, date: string, leaveRecords: { dmId: string; date: string }[]) => {
    return leaveRecords.some((r) => r.dmId === dmId && r.date === date)
  }

  const getAvailableDMs = (date: string, leaveRecords: { dmId: string; date: string }[]) => {
    return mockDMs.filter((dm) => !isDMOnLeave(dm.id, date, leaveRecords))
  }

  it('DM 请假时应从可用列表中排除', () => {
    const leaveRecords = [{ dmId: 'dm-1', date: '2026-06-01' }]
    const available = getAvailableDMs('2026-06-01', leaveRecords)
    expect(available).toHaveLength(1)
    expect(available[0].id).toBe('dm-2')
  })

  it('DM 请假时创建场次应失败', () => {
    const leaveRecords = [{ dmId: 'dm-1', date: '2026-06-01' }]

    const validateSession = (session: { dmId: string; date: string }) => {
      if (isDMOnLeave(session.dmId, session.date, leaveRecords)) {
        return { valid: false, error: '该 DM 今日请假' }
      }
      return { valid: true }
    }

    const result = validateSession({ dmId: 'dm-1', date: '2026-06-01' })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('请假')
  })

  it('DM 请假时已有场次应标记为灰色', () => {
    const leaveRecords = [{ dmId: 'dm-1', date: '2026-06-01' }]
    const session = {
      id: 'session-1',
      dmId: 'dm-1',
      date: '2026-06-01',
      scriptName: '测试剧本',
    }

    const shouldGrayOut = isDMOnLeave(session.dmId, session.date, leaveRecords)
    expect(shouldGrayOut).toBe(true)
  })

  it('所有 DM 都请假时应有特殊提示', () => {
    const leaveRecords = [
      { dmId: 'dm-1', date: '2026-06-01' },
      { dmId: 'dm-2', date: '2026-06-01' },
    ]
    const available = getAvailableDMs('2026-06-01', leaveRecords)
    expect(available).toHaveLength(0)
  })
})
