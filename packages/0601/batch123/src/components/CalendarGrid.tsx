import { useState, useCallback, useRef, useEffect } from 'react'
import { Plus, Clock } from 'lucide-react'
import type { Session, DragState } from '@/types'
import { useScheduleStore } from '@/store/useScheduleStore'
import SessionCard from './SessionCard'
import {
  ROOMS,
  TIME_SLOTS,
  SLOT_HEIGHT,
  SLOT_MINUTES,
  ROOM_HEADER_WIDTH,
  TIME_AXIS_HEIGHT,
  getTimeSlotIndex,
  timeToMinutes,
  minutesToTime,
  getTimeByIndex,
} from '@/utils/time'
import { findConflictsForRoom, checkConflict } from '@/utils/conflict'
import { cn } from '@/lib/utils'

interface CalendarGridProps {
  onEditSession: (session: Session) => void
  onCreateSession: (roomId: number, startTime: string) => void
}

export default function CalendarGrid({ onEditSession, onCreateSession }: CalendarGridProps) {
  const { selectedDate, sessions, moveSession } = useScheduleStore()
  const gridRef = useRef<HTMLDivElement>(null)
  const ghostRef = useRef<HTMLDivElement>(null)

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    sessionId: null,
    startRoomId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    offsetX: 0,
    offsetY: 0,
    targetRoomId: null,
    targetStartTime: null,
  })

  const [hoveredCell, setHoveredCell] = useState<{ roomId: number; time: string } | null>(null)
  const [dragError, setDragError] = useState<string | null>(null)

  const todaySessions = sessions.filter((s) => s.date === selectedDate)

  const conflictSessionIds = ROOMS.flatMap((room) =>
    findConflictsForRoom(room.id, selectedDate, sessions).map((s) => s.id),
  )

  const handleDragStart = useCallback(
    (state: DragState, _e: React.PointerEvent) => {
      setDragState(state)
      setDragError(null)
    },
    [],
  )

  const getRoomAndTimeFromPoint = useCallback(
    (clientX: number, clientY: number): { roomId: number | null; startTime: string | null } => {
      if (!gridRef.current) return { roomId: null, startTime: null }

      const gridRect = gridRef.current.getBoundingClientRect()
      const x = clientX - gridRect.left
      const y = clientY - gridRect.top

      if (x < ROOM_HEADER_WIDTH) return { roomId: null, startTime: null }
      if (y < TIME_AXIS_HEIGHT) return { roomId: null, startTime: null }

      const roomIndex = Math.floor((y - TIME_AXIS_HEIGHT) / (SLOT_HEIGHT * TIME_SLOTS.length))
      if (roomIndex < 0 || roomIndex >= ROOMS.length) return { roomId: null, startTime: null }

      const timeY = y - TIME_AXIS_HEIGHT - roomIndex * SLOT_HEIGHT * TIME_SLOTS.length
      const slotIndex = Math.floor(timeY / SLOT_HEIGHT)
      const startTime = getTimeByIndex(slotIndex)

      return { roomId: ROOMS[roomIndex].id, startTime }
    },
    [],
  )

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragState.isDragging) return

      const { roomId, startTime } = getRoomAndTimeFromPoint(e.clientX, e.clientY)

      setDragState((prev) => ({
        ...prev,
        currentX: e.clientX,
        currentY: e.clientY,
        targetRoomId: roomId,
        targetStartTime: startTime,
      }))

      if (ghostRef.current && dragState.sessionId) {
        const session = sessions.find((s) => s.id === dragState.sessionId)
        if (session) {
          const slotSpan = Math.ceil(session.duration / SLOT_MINUTES)
          const height = slotSpan * SLOT_HEIGHT - 4
          ghostRef.current.style.left = `${e.clientX - dragState.offsetX}px`
          ghostRef.current.style.top = `${e.clientY - dragState.offsetY}px`
          ghostRef.current.style.width = `${gridRef.current?.clientWidth! - ROOM_HEADER_WIDTH - 16}px`
          ghostRef.current.style.height = `${height}px`
        }
      }
    },
    [dragState, sessions, getRoomAndTimeFromPoint],
  )

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (!dragState.isDragging || !dragState.sessionId) {
        setDragState((prev) => ({ ...prev, isDragging: false }))
        return
      }

      const { roomId, startTime } = getRoomAndTimeFromPoint(e.clientX, e.clientY)

      if (roomId && startTime && dragState.sessionId) {
        const result = moveSession(dragState.sessionId, roomId, startTime)
        if (!result.success && result.error) {
          setDragError(result.error)
          setTimeout(() => setDragError(null), 2500)
        }
      }

      setDragState({
        isDragging: false,
        sessionId: null,
        startRoomId: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        offsetX: 0,
        offsetY: 0,
        targetRoomId: null,
        targetStartTime: null,
      })
    },
    [dragState, getRoomAndTimeFromPoint, moveSession],
  )

  useEffect(() => {
    if (dragState.isDragging) {
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
      window.addEventListener('pointercancel', handlePointerUp)
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'grabbing'
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [dragState.isDragging, handlePointerMove, handlePointerUp])

  const handleCellClick = useCallback(
    (roomId: number, startTime: string) => {
      if (dragState.isDragging) return
      onCreateSession(roomId, startTime)
    },
    [dragState.isDragging, onCreateSession],
  )

  const getDragPreviewSession = (): Session | null => {
    if (!dragState.sessionId) return null
    return sessions.find((s) => s.id === dragState.sessionId) ?? null
  }

  const previewSession = getDragPreviewSession()
  const isTargetValid = dragState.targetRoomId && dragState.targetStartTime && previewSession
  const wouldConflict = isTargetValid
    ? checkConflict(
        {
          ...previewSession,
          roomId: dragState.targetRoomId!,
          startTime: dragState.targetStartTime!,
          roomName: ROOMS.find((r) => r.id === dragState.targetRoomId)?.name ?? '',
        },
        sessions,
        previewSession.id,
      ).hasConflict
    : false

  return (
    <div className="relative flex-1 overflow-auto" ref={gridRef}>
      <div
        className="relative"
        style={{
          minWidth: `calc(${ROOM_HEADER_WIDTH}px + ${TIME_SLOTS.length * 200}px)`,
          minHeight: `calc(${TIME_AXIS_HEIGHT}px + ${ROOMS.length * TIME_SLOTS.length * SLOT_HEIGHT}px)`,
        }}
      >
        <div
          className="sticky top-0 left-0 z-30 bg-murder-bg border-b border-white/5"
          style={{ height: TIME_AXIS_HEIGHT, width: ROOM_HEADER_WIDTH }}
        />

        <div
          className="sticky top-0 z-20 bg-murder-bg border-b border-white/5 flex"
          style={{
            marginLeft: ROOM_HEADER_WIDTH,
            marginTop: -TIME_AXIS_HEIGHT,
            height: TIME_AXIS_HEIGHT,
          }}
        >
          {TIME_SLOTS.map((time, i) => (
            <div
              key={time}
              className={cn(
                'flex items-center px-3 text-xs text-gray-400 border-l border-white/5',
                i % 2 === 0 ? 'font-medium text-gray-300' : '',
              )}
              style={{ width: '200px' }}
            >
              <Clock size={12} className="mr-1 text-gray-500" />
              {time}
            </div>
          ))}
        </div>

        {ROOMS.map((room, roomIdx) => {
          const roomSessions = todaySessions.filter((s) => s.roomId === room.id)
          const hasConflict = findConflictsForRoom(room.id, selectedDate, sessions).length > 0

          return (
            <div
              key={room.id}
              className="flex"
              style={{
                height: TIME_SLOTS.length * SLOT_HEIGHT,
              }}
            >
              <div
                className={cn(
                  'sticky left-0 z-20 flex flex-col items-center justify-center border-r border-b border-white/5',
                  hasConflict && 'bg-red-500/5',
                )}
                style={{
                  width: ROOM_HEADER_WIDTH,
                  backgroundColor: hasConflict ? undefined : `${room.color}08`,
                  borderLeft: `3px solid ${room.color}`,
                }}
              >
                <div
                  className="w-3 h-3 rounded-full mb-1"
                  style={{ backgroundColor: room.color }}
                />
                <span className="font-medium text-white text-sm">{room.name}</span>
                <span className="text-xs text-gray-500">{roomSessions.length} 场</span>
                {hasConflict && (
                  <span className="text-xs text-red-400 mt-0.5 animate-pulse-soft">⚠ 冲突</span>
                )}
              </div>

              <div className="relative flex-1" style={{ width: TIME_SLOTS.length * 200 }}>
                {TIME_SLOTS.map((time, timeIdx) => (
                  <div
                    key={`${room.id}-${time}`}
                    className={cn(
                      'absolute border-r border-b border-white/5 cursor-pointer transition-colors',
                      timeIdx % 2 === 1 ? 'bg-white/[0.01]' : '',
                      hoveredCell?.roomId === room.id &&
                        hoveredCell?.time === time &&
                        'bg-murder-gold/10',
                      dragState.isDragging &&
                        dragState.targetRoomId === room.id &&
                        dragState.targetStartTime === time &&
                        (wouldConflict ? 'bg-red-500/20' : 'bg-emerald-500/10'),
                    )}
                    style={{
                      left: timeIdx * 200,
                      top: 0,
                      width: '200px',
                      height: SLOT_HEIGHT,
                    }}
                    onClick={() => handleCellClick(room.id, time)}
                    onMouseEnter={() => setHoveredCell({ roomId: room.id, time })}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    {hoveredCell?.roomId === room.id && hoveredCell?.time === time && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Plus size={16} className="text-murder-gold" />
                      </div>
                    )}
                  </div>
                ))}

                <div className="absolute inset-0 pointer-events-none">
                  {roomSessions.map((session) => (
                    <div
                      key={session.id}
                      className="absolute pointer-events-auto"
                      style={{
                        left: getTimeSlotIndex(session.startTime) * 200,
                        top: 0,
                        width: `${Math.ceil(session.duration / SLOT_MINUTES) * 200}px`,
                        height: '100%',
                      }}
                    >
                      <SessionCard
                        session={session}
                        onEdit={onEditSession}
                        onDragStart={handleDragStart}
                        isDragging={dragState.sessionId === session.id}
                        hasConflict={conflictSessionIds.includes(session.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {dragState.isDragging && previewSession && ghostRef.current && (
        <div
          ref={ghostRef}
          className={cn(
            'fixed z-50 rounded-lg pointer-events-none shadow-2xl opacity-80',
            wouldConflict ? 'ring-2 ring-red-500' : 'ring-2 ring-murder-gold',
          )}
          style={{
            backgroundColor: `${ROOMS.find((r) => r.id === previewSession.roomId)?.color}30`,
            borderLeft: `3px solid ${ROOMS.find((r) => r.id === previewSession.roomId)?.color}`,
          }}
        >
          <div className="p-3 h-full flex flex-col justify-center">
            <div className="font-medium text-sm text-white">{previewSession.scriptName}</div>
            <div className="text-xs text-white/60 mt-1">
              {dragState.targetRoomId
                ? `移至 ${ROOMS.find((r) => r.id === dragState.targetRoomId)?.name}`
                : '拖动中...'}
            </div>
            {wouldConflict && (
              <div className="text-xs text-red-400 mt-1">⚠ 时间冲突</div>
            )}
          </div>
        </div>
      )}

      {dragError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-red-500/90 text-white rounded-lg shadow-xl animate-scale-in flex items-center gap-2">
          <span>{dragError}</span>
        </div>
      )}
    </div>
  )
}
