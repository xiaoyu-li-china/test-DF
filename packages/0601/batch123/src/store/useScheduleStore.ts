import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session, DM, LeaveRecord } from '@/types'
import { checkConflict } from '@/utils/conflict'
import { ROOMS, DMS, getTodayDate } from '@/utils/time'

interface ScheduleState {
  sessions: Session[]
  dms: DM[]
  leaveRecords: LeaveRecord[]
  selectedDate: string
  setSelectedDate: (date: string) => void
  addSession: (session: Omit<Session, 'id'>) => { success: boolean; error?: string }
  updateSession: (id: string, updates: Partial<Session>) => { success: boolean; error?: string }
  deleteSession: (id: string) => void
  moveSession: (id: string, newRoomId: number, newStartTime: string) => { success: boolean; error?: string }
  getSessionsByDate: (date: string) => Session[]
  getSessionsByRoomAndDate: (roomId: number, date: string) => Session[]
  addLeaveRecord: (record: LeaveRecord) => void
  removeLeaveRecord: (dmId: string, date: string) => void
  isDMOnLeave: (dmId: string, date: string) => boolean
  getAvailableDMs: (date: string) => DM[]
  getDMsOnLeave: (date: string) => DM[]
  getSessionsByDMAndDate: (dmId: string, date: string) => Session[]
}

const generateId = (): string => {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

const createMockSessions = (): Session[] => {
  const today = getTodayDate()
  return [
    {
      id: generateId(),
      roomId: 1,
      roomName: '古风阁',
      scriptName: '青楼',
      startTime: '14:00',
      duration: 300,
      playerCount: 7,
      dmId: 'dm-1',
      dmName: '小李',
      date: today,
      isPrivateBooking: false,
    },
    {
      id: generateId(),
      roomId: 2,
      roomName: '密室区',
      scriptName: '第二十二条校规',
      startTime: '19:00',
      duration: 270,
      playerCount: 6,
      dmId: 'dm-2',
      dmName: '阿哲',
      date: today,
      isPrivateBooking: true,
      privateBookingNote: '公司团建包场',
    },
    {
      id: generateId(),
      roomId: 3,
      roomName: '欧式厅',
      scriptName: '持斧奥夫',
      startTime: '13:30',
      duration: 360,
      playerCount: 5,
      dmId: 'dm-3',
      dmName: '老王',
      date: today,
      isPrivateBooking: false,
    },
    {
      id: generateId(),
      roomId: 4,
      roomName: '日式屋',
      scriptName: '漓川怪谈簿',
      startTime: '15:00',
      duration: 300,
      playerCount: 6,
      dmId: 'dm-4',
      dmName: '小樱',
      date: today,
      isPrivateBooking: false,
    },
    {
      id: generateId(),
      roomId: 5,
      roomName: '恐怖屋',
      scriptName: '一点半',
      startTime: '20:00',
      duration: 240,
      playerCount: 6,
      dmId: 'dm-5',
      dmName: '阿鬼',
      date: today,
      isPrivateBooking: false,
    },
    {
      id: generateId(),
      roomId: 6,
      roomName: '科幻舱',
      scriptName: '死者在幻夜中醒来',
      startTime: '18:00',
      duration: 360,
      playerCount: 6,
      dmId: 'dm-6',
      dmName: '小夜',
      date: today,
      isPrivateBooking: true,
      privateBookingNote: '生日派对包场',
    },
    {
      id: generateId(),
      roomId: 1,
      roomName: '古风阁',
      scriptName: '鸢飞戾天',
      startTime: '21:00',
      duration: 270,
      playerCount: 5,
      dmId: 'dm-1',
      dmName: '小李',
      date: today,
      isPrivateBooking: false,
    },
    {
      id: generateId(),
      roomId: 3,
      roomName: '欧式厅',
      scriptName: '年轮',
      startTime: '22:00',
      duration: 240,
      playerCount: 8,
      dmId: 'dm-3',
      dmName: '老王',
      date: today,
      isPrivateBooking: false,
    },
  ]
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      sessions: createMockSessions(),
      dms: DMS,
      leaveRecords: [],
      selectedDate: getTodayDate(),

      setSelectedDate: (date: string) => set({ selectedDate: date }),

      addSession: (sessionData) => {
        const { sessions, isDMOnLeave } = get()
        const room = ROOMS.find((r) => r.id === sessionData.roomId)
        if (!room) {
          return { success: false, error: '房间不存在' }
        }

        if (isDMOnLeave(sessionData.dmId, sessionData.date)) {
          const dm = DMS.find((d) => d.id === sessionData.dmId)
          return {
            success: false,
            error: `${dm?.name || '该 DM'} 今日请假，无法安排`,
          }
        }

        const conflict = checkConflict(sessionData, sessions)
        if (conflict.hasConflict) {
          const conflictInfo = conflict.conflictingSessions
            .map((s) => `${s.scriptName} (${s.startTime})`)
            .join('、')
          return {
            success: false,
            error: `该时段与已有场次冲突：${conflictInfo}`,
          }
        }

        const newSession: Session = {
          ...sessionData,
          id: generateId(),
          roomName: room.name,
          isPrivateBooking: sessionData.isPrivateBooking ?? false,
          privateBookingNote: sessionData.privateBookingNote,
        }

        set({ sessions: [...sessions, newSession] })
        return { success: true }
      },

      updateSession: (id, updates) => {
        const { sessions, isDMOnLeave } = get()
        const existing = sessions.find((s) => s.id === id)
        if (!existing) {
          return { success: false, error: '场次不存在' }
        }

        const updatedSession = { ...existing, ...updates }
        if (updates.roomId !== undefined) {
          const room = ROOMS.find((r) => r.id === updates.roomId)
          if (room) {
            updatedSession.roomName = room.name
          }
        }

        if (updates.dmId !== undefined && isDMOnLeave(updatedSession.dmId, updatedSession.date)) {
          const dm = DMS.find((d) => d.id === updatedSession.dmId)
          return {
            success: false,
            error: `${dm?.name || '该 DM'} 今日请假，无法安排`,
          }
        }

        const conflict = checkConflict(updatedSession, sessions, id)
        if (conflict.hasConflict) {
          const conflictInfo = conflict.conflictingSessions
            .map((s) => `${s.scriptName} (${s.startTime})`)
            .join('、')
          return {
            success: false,
            error: `该时段与已有场次冲突：${conflictInfo}`,
          }
        }

        set({
          sessions: sessions.map((s) => (s.id === id ? updatedSession : s)),
        })
        return { success: true }
      },

      deleteSession: (id) => {
        const { sessions } = get()
        set({ sessions: sessions.filter((s) => s.id !== id) })
      },

      moveSession: (id, newRoomId, newStartTime) => {
        const { sessions, isDMOnLeave } = get()
        const existing = sessions.find((s) => s.id === id)
        if (!existing) {
          return { success: false, error: '场次不存在' }
        }

        const room = ROOMS.find((r) => r.id === newRoomId)
        if (!room) {
          return { success: false, error: '房间不存在' }
        }

        if (isDMOnLeave(existing.dmId, existing.date)) {
          const dm = DMS.find((d) => d.id === existing.dmId)
          return {
            success: false,
            error: `${dm?.name || '该 DM'} 今日请假，无法移动`,
          }
        }

        const updatedSession: Session = {
          ...existing,
          roomId: newRoomId,
          roomName: room.name,
          startTime: newStartTime,
        }

        const conflict = checkConflict(updatedSession, sessions, id)
        if (conflict.hasConflict) {
          const conflictInfo = conflict.conflictingSessions
            .map((s) => `${s.scriptName} (${s.startTime})`)
            .join('、')
          return {
            success: false,
            error: `移动后与已有场次冲突：${conflictInfo}`,
          }
        }

        set({
          sessions: sessions.map((s) => (s.id === id ? updatedSession : s)),
        })
        return { success: true }
      },

      getSessionsByDate: (date) => {
        return get().sessions.filter((s) => s.date === date)
      },

      getSessionsByRoomAndDate: (roomId, date) => {
        return get().sessions.filter((s) => s.roomId === roomId && s.date === date)
      },

      addLeaveRecord: (record) => {
        const { leaveRecords } = get()
        const exists = leaveRecords.some(
          (r) => r.dmId === record.dmId && r.date === record.date,
        )
        if (!exists) {
          set({ leaveRecords: [...leaveRecords, record] })
        }
      },

      removeLeaveRecord: (dmId, date) => {
        const { leaveRecords } = get()
        set({
          leaveRecords: leaveRecords.filter(
            (r) => !(r.dmId === dmId && r.date === date),
          ),
        })
      },

      isDMOnLeave: (dmId, date) => {
        return get().leaveRecords.some((r) => r.dmId === dmId && r.date === date)
      },

      getAvailableDMs: (date) => {
        const { dms, isDMOnLeave } = get()
        return dms.filter((dm) => !isDMOnLeave(dm.id, date))
      },

      getDMsOnLeave: (date) => {
        const { dms, leaveRecords } = get()
        const leaveDMIds = leaveRecords
          .filter((r) => r.date === date)
          .map((r) => r.dmId)
        return dms.filter((dm) => leaveDMIds.includes(dm.id))
      },

      getSessionsByDMAndDate: (dmId, date) => {
        return get().sessions.filter((s) => s.dmId === dmId && s.date === date)
      },
    }),
    {
      name: 'schedule-store',
    },
  ),
)

