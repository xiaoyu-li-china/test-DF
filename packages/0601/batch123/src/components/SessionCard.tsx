import { useState, useCallback, useRef, useEffect } from 'react'
import { GripVertical, Clock, Users, User, Ban, Crown } from 'lucide-react'
import type { Session, DragState } from '@/types'
import { getTimeSlotIndex, SLOT_HEIGHT, SLOT_MINUTES, ROOM_HEADER_WIDTH, getPlayerStatus, getStatusColor, ROOMS } from '@/utils/time'
import { cn } from '@/lib/utils'
import { useScheduleStore } from '@/store/useScheduleStore'

interface SessionCardProps {
  session: Session
  onEdit: (session: Session) => void
  onDragStart: (state: DragState, e: React.PointerEvent) => void
  isDragging: boolean
  hasConflict: boolean
}

export default function SessionCard({
  session,
  onEdit,
  onDragStart,
  isDragging,
  hasConflict,
}: SessionCardProps) {
  const { isDMOnLeave } = useScheduleStore()
  const cardRef = useRef<HTMLDivElement>(null)
  const [isPointerDown, setIsPointerDown] = useState(false)
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 })
  const dragStartPos = useRef({ x: 0, y: 0 })
  const hasMoved = useRef(false)

  const room = ROOMS.find((r) => r.id === session.roomId)
  const dmOnLeave = isDMOnLeave(session.dmId, session.date)
  const playerStatus = room ? getPlayerStatus(session.playerCount, room.capacity) : 'normal'
  const statusColor = getStatusColor(playerStatus)
  const isPrivateBooking = session.isPrivateBooking

  const startIndex = getTimeSlotIndex(session.startTime)
  const slotSpan = Math.ceil(session.duration / SLOT_MINUTES)
  const top = startIndex * SLOT_HEIGHT
  const height = slotSpan * SLOT_HEIGHT - 4

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      setIsPointerDown(true)
      hasMoved.current = false
      dragStartPos.current = { x: e.clientX, y: e.clientY }
      setPointerPos({ x: e.clientX, y: e.clientY })
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPointerDown) return
      setPointerPos({ x: e.clientX, y: e.clientY })

      const deltaX = Math.abs(e.clientX - dragStartPos.current.x)
      const deltaY = Math.abs(e.clientY - dragStartPos.current.y)

      if (!hasMoved.current && (deltaX > 5 || deltaY > 5)) {
        hasMoved.current = true
        const rect = cardRef.current?.getBoundingClientRect()
        if (rect) {
          onDragStart(
            {
              isDragging: true,
              sessionId: session.id,
              startRoomId: session.roomId,
              startX: dragStartPos.current.x,
              startY: dragStartPos.current.y,
              currentX: e.clientX,
              currentY: e.clientY,
              offsetX: dragStartPos.current.x - rect.left,
              offsetY: dragStartPos.current.y - rect.top,
              targetRoomId: null,
              targetStartTime: null,
            },
            e,
          )
        }
      }
    },
    [isPointerDown, session, onDragStart],
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!hasMoved.current && isPointerDown) {
        onEdit(session)
      }
      setIsPointerDown(false)
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    },
    [isPointerDown, session, onEdit],
  )

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      setIsPointerDown(false)
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    },
    [],
  )

  const endTime = (() => {
    const [h, m] = session.startTime.split(':').map(Number)
    const totalMin = h * 60 + m + session.duration
    let endH = Math.floor(totalMin / 60)
    const endM = totalMin % 60
    if (endH >= 24) endH -= 24
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
  })()

  const getStatusText = () => {
    if (playerStatus === 'full') return '满员'
    if (playerStatus === 'nearFull') return '即将满员'
    return null
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        'absolute left-1 right-1 rounded-lg overflow-hidden cursor-grab select-none transition-all duration-150',
        'hover:shadow-xl hover:scale-[1.02]',
        isDragging && 'opacity-40 pointer-events-none',
        isPointerDown && !isDragging && 'cursor-grabbing',
        hasConflict && 'ring-2 ring-red-500 ring-offset-1 ring-offset-murder-surface',
        dmOnLeave && 'grayscale opacity-60',
      )}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: isPrivateBooking
          ? 'rgba(236, 72, 153, 0.15)'
          : room
            ? `${room.color}20`
            : 'rgba(255,255,255,0.1)',
        borderLeft: `3px solid ${isPrivateBooking ? '#ec4899' : room?.color || '#666'}`,
        borderTop: `2px solid ${statusColor}`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <div className="h-full p-2 flex flex-col">
        <div className="flex items-start gap-1">
          <GripVertical
            size={14}
            className="text-white/40 mt-0.5 flex-shrink-0 cursor-grab"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <div
                className={cn(
                  'font-medium text-sm text-white truncate',
                  height < 70 && 'text-xs',
                )}
              >
                {session.scriptName}
              </div>
              {isPrivateBooking && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 flex items-center gap-0.5"
                  style={{
                    backgroundColor: 'rgba(236, 72, 153, 0.3)',
                    color: '#ec4899',
                  }}
                >
                  <Crown size={10} />
                  包场
                </span>
              )}
              {playerStatus !== 'normal' && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                  style={{
                    backgroundColor: `${statusColor}30`,
                    color: statusColor,
                  }}
                >
                  {getStatusText()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div
          className={cn(
            'flex flex-col gap-0.5 mt-1',
            height < 90 && 'flex-row flex-wrap gap-x-2',
          )}
        >
          <div className="flex items-center gap-1 text-xs text-white/70">
            <Clock size={12} />
            <span>
              {session.startTime}-{endTime}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs" style={{ color: statusColor }}>
            <Users size={12} />
            <span>
              {session.playerCount}
              {room ? `/${room.capacity}` : ''}人
            </span>
          </div>
          <div
            className={cn(
              'flex items-center gap-1 text-xs',
              dmOnLeave ? 'text-red-400' : 'text-white/70',
            )}
          >
            {dmOnLeave ? <Ban size={12} /> : <User size={12} />}
            <span>DM {session.dmName}</span>
            {dmOnLeave && <span className="text-[10px]">(请假)</span>}
          </div>
        </div>

        {hasConflict && (
          <div className="mt-auto text-xs text-red-400 font-medium animate-pulse-soft">
            ⚠ 时间冲突
          </div>
        )}
      </div>
    </div>
  )
}

