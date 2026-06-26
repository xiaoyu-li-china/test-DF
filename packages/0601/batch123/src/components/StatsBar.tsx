import { Users, CalendarCheck, TrendingUp, AlertTriangle } from 'lucide-react'
import { useScheduleStore } from '@/store/useScheduleStore'
import { ROOMS } from '@/utils/time'
import { findConflictsForRoom } from '@/utils/conflict'

export default function StatsBar() {
  const { selectedDate, sessions } = useScheduleStore()

  const todaySessions = sessions.filter((s) => s.date === selectedDate)
  const totalSessions = todaySessions.length
  const totalPlayers = todaySessions.reduce((sum, s) => sum + s.playerCount, 0)

  const utilizationByRoom = ROOMS.map((room) => {
    const roomSessions = todaySessions.filter((s) => s.roomId === room.id)
    const totalMinutes = roomSessions.reduce((sum, s) => sum + s.duration, 0)
    const utilizationPercent = Math.round((totalMinutes / 960) * 100)
    const hasConflict = findConflictsForRoom(room.id, selectedDate, sessions).length > 0
    return {
      room,
      count: roomSessions.length,
      utilization: Math.min(utilizationPercent, 100),
      hasConflict,
    }
  })

  const totalConflicts = utilizationByRoom.filter((r) => r.hasConflict).length

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="flex items-center gap-2 px-4 py-2 bg-murder-surface rounded-lg border border-white/5">
        <CalendarCheck size={18} className="text-murder-gold" />
        <span className="text-gray-400 text-sm">今日场次</span>
        <span className="text-white font-semibold text-lg">{totalSessions}</span>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 bg-murder-surface rounded-lg border border-white/5">
        <Users size={18} className="text-emerald-400" />
        <span className="text-gray-400 text-sm">预约人数</span>
        <span className="text-white font-semibold text-lg">{totalPlayers}</span>
      </div>

      {totalConflicts > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 rounded-lg border border-red-500/30 animate-pulse-soft">
          <AlertTriangle size={18} className="text-red-400" />
          <span className="text-red-400 text-sm font-medium">
            {totalConflicts} 个房间存在冲突
          </span>
        </div>
      )}

      <div className="flex items-center gap-3 ml-auto">
        {utilizationByRoom.map(({ room, utilization, hasConflict }) => (
          <div key={room.id} className="flex flex-col items-center gap-1">
            <div className="text-xs text-gray-400">{room.name}</div>
            <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${utilization}%`,
                  backgroundColor: hasConflict ? '#ef4444' : room.color,
                }}
              />
            </div>
            <div className={`text-xs font-medium ${hasConflict ? 'text-red-400' : 'text-gray-300'}`}>
              {utilization}%
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
