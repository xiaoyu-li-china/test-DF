import { useState } from 'react'
import { X, User, Calendar, Check, X as XIcon } from 'lucide-react'
import { useScheduleStore } from '@/store/useScheduleStore'
import { DMS, formatDisplayDate } from '@/utils/time'
import { cn } from '@/lib/utils'

interface DMManagerProps {
  isOpen: boolean
  onClose: () => void
}

export default function DMManager({ isOpen, onClose }: DMManagerProps) {
  const { selectedDate, isDMOnLeave, addLeaveRecord, removeLeaveRecord, getSessionsByDMAndDate } =
    useScheduleStore()

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const toggleLeave = (dmId: string, dmName: string) => {
    const sessions = getSessionsByDMAndDate(dmId, selectedDate)
    if (sessions.length > 0 && !isDMOnLeave(dmId, selectedDate)) {
      const confirmed = window.confirm(
        `${dmName} 今日已有 ${sessions.length} 场排期，标记请假后这些场次会显示为灰色，确定继续吗？`,
      )
      if (!confirmed) return
    }

    if (isDMOnLeave(dmId, selectedDate)) {
      removeLeaveRecord(dmId, selectedDate)
    } else {
      addLeaveRecord({ dmId, date: selectedDate, note: '' })
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onMouseDown={handleBackdropClick}
    >
      <div className="bg-murder-surface rounded-2xl border border-white/10 w-full max-w-lg mx-4 shadow-2xl animate-scale-in overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div>
            <h2 className="font-serif text-xl text-white font-semibold">DM 管理</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatDisplayDate(selectedDate)} · 标记请假后自动禁止排该 DM 的场
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {DMS.map((dm) => {
            const onLeave = isDMOnLeave(dm.id, selectedDate)
            const sessionsCount = getSessionsByDMAndDate(dm.id, selectedDate).length

            return (
              <div
                key={dm.id}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-xl border transition-all',
                  onLeave
                    ? 'bg-red-500/5 border-red-500/20'
                    : 'bg-murder-card border-white/5 hover:border-white/10',
                )}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${dm.color}20` }}
                >
                  <User size={18} style={{ color: dm.color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{dm.name}</span>
                    {onLeave && (
                      <span className="text-[10px] px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full">
                        请假中
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      今日 {sessionsCount} 场
                    </span>
                    <span>{dm.phone}</span>
                  </div>
                </div>

                <button
                  onClick={() => toggleLeave(dm.id, dm.name)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    onLeave
                      ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10',
                  )}
                >
                  {onLeave ? (
                    <>
                      <XIcon size={14} />
                      取消请假
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      标记请假
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        <div className="px-6 py-4 border-t border-white/5 bg-murder-bg/50">
          <p className="text-xs text-gray-500 text-center">
            💡 标记请假后，该 DM 的已有场次会变灰，新建场次时无法选择该 DM
          </p>
        </div>
      </div>
    </div>
  )
}
