import type { Session, ConflictResult } from '@/types'
import { timeToMinutes } from './time'

export const checkTimeOverlap = (
  startTimeA: string,
  durationA: number,
  startTimeB: string,
  durationB: number,
): boolean => {
  const startA = timeToMinutes(startTimeA)
  const endA = startA + durationA
  const startB = timeToMinutes(startTimeB)
  const endB = startB + durationB
  return startA < endB && startB < endA
}

export const checkConflict = (
  sessionToCheck: Omit<Session, 'id'>,
  allSessions: Session[],
  ignoreId?: string,
): ConflictResult => {
  const { roomId, date, startTime, duration } = sessionToCheck

  const conflictingSessions = allSessions.filter((s) => {
    if (ignoreId && s.id === ignoreId) return false
    if (s.roomId !== roomId || s.date !== date) return false
    return checkTimeOverlap(startTime, duration, s.startTime, s.duration)
  })

  return {
    hasConflict: conflictingSessions.length > 0,
    conflictingSessions,
  }
}

export const findConflictsForRoom = (
  roomId: number,
  date: string,
  allSessions: Session[],
): Session[] => {
  const roomSessions = allSessions.filter((s) => s.roomId === roomId && s.date === date)
  const conflicts: Session[] = []

  for (let i = 0; i < roomSessions.length; i++) {
    for (let j = i + 1; j < roomSessions.length; j++) {
      if (checkTimeOverlap(
        roomSessions[i].startTime,
        roomSessions[i].duration,
        roomSessions[j].startTime,
        roomSessions[j].duration,
      )) {
        if (!conflicts.includes(roomSessions[i])) conflicts.push(roomSessions[i])
        if (!conflicts.includes(roomSessions[j])) conflicts.push(roomSessions[j])
      }
    }
  }

  return conflicts
}
