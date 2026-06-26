import { useState, useEffect, useCallback } from 'react'
import { X, AlertCircle, CheckCircle, User, Crown } from 'lucide-react'
import type { Session, ModalMode, DM } from '@/types'
import { useScheduleStore } from '@/store/useScheduleStore'
import { ROOMS, TIME_SLOTS, DMS } from '@/utils/time'
import { checkConflict } from '@/utils/conflict'
import { cn } from '@/lib/utils'

interface SessionModalProps {
  isOpen: boolean
  mode: ModalMode
  initialData?: Partial<Session>
  onClose: () => void
}

const DURATION_OPTIONS = [
  { value: 120, label: '2小时' },
  { value: 150, label: '2.5小时' },
  { value: 180, label: '3小时' },
  { value: 210, label: '3.5小时' },
  { value: 240, label: '4小时' },
  { value: 270, label: '4.5小时' },
  { value: 300, label: '5小时' },
  { value: 330, label: '5.5小时' },
  { value: 360, label: '6小时' },
]

const PLAYER_OPTIONS = [4, 5, 6, 7, 8, 9, 10]

export default function SessionModal({
  isOpen,
  mode,
  initialData,
  onClose,
}: SessionModalProps) {
  const { addSession, updateSession, deleteSession, selectedDate, sessions, getAvailableDMs, isDMOnLeave } = useScheduleStore()

  const [formData, setFormData] = useState({
    roomId: initialData?.roomId ?? 1,
    scriptName: initialData?.scriptName ?? '',
    startTime: initialData?.startTime ?? '14:00',
    duration: initialData?.duration ?? 240,
    playerCount: initialData?.playerCount ?? 6,
    dmId: initialData?.dmId ?? DMS[0].id,
    dmName: initialData?.dmName ?? DMS[0].name,
    date: initialData?.date ?? selectedDate,
    isPrivateBooking: initialData?.isPrivateBooking ?? false,
    privateBookingNote: initialData?.privateBookingNote ?? '',
  })

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [liveConflict, setLiveConflict] = useState<string | null>(null)
  const [isShaking, setIsShaking] = useState(false)

  const availableDMs = getAvailableDMs(formData.date)
  const currentDM = DMS.find((d) => d.id === formData.dmId)
  const currentDMOnLeave = currentDM ? isDMOnLeave(currentDM.id, formData.date) : false

  useEffect(() => {
    setFormData({
      roomId: initialData?.roomId ?? 1,
      scriptName: initialData?.scriptName ?? '',
      startTime: initialData?.startTime ?? '14:00',
      duration: initialData?.duration ?? 240,
      playerCount: initialData?.playerCount ?? 6,
      dmId: initialData?.dmId ?? DMS[0].id,
      dmName: initialData?.dmName ?? DMS[0].name,
      date: initialData?.date ?? selectedDate,
      isPrivateBooking: initialData?.isPrivateBooking ?? false,
      privateBookingNote: initialData?.privateBookingNote ?? '',
    })
    setError(null)
    setSuccess(null)
    setLiveConflict(null)
  }, [initialData, selectedDate, isOpen])

  useEffect(() => {
    const checkData = {
      ...formData,
      roomName: ROOMS.find((r) => r.id === formData.roomId)?.name ?? '',
    }
    const result = checkConflict(checkData, sessions, initialData?.id)
    if (result.hasConflict) {
      const conflictInfo = result.conflictingSessions
        .map((s) => `${s.scriptName} (${s.startTime})`)
        .join('、')
      setLiveConflict(`⚠ 与 ${conflictInfo} 时间冲突`)
    } else {
      setLiveConflict(null)
    }
  }, [formData, sessions, initialData?.id])

  const validate = (): boolean => {
    if (!formData.scriptName.trim()) {
      setError('请输入剧本名称')
      return false
    }
    if (!formData.dmId) {
      setError('请选择 DM')
      return false
    }
    if (currentDMOnLeave) {
      setError(`${currentDM?.name} 今日请假，请选择其他 DM`)
      return false
    }
    return true
  }

  const handleDMChange = (dm: DM) => {
    setFormData({
      ...formData,
      dmId: dm.id,
      dmName: dm.name,
    })
  }

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)
      setSuccess(null)

      if (!validate()) {
        setIsShaking(true)
        setTimeout(() => setIsShaking(false), 500)
        return
      }

      const room = ROOMS.find((r) => r.id === formData.roomId)
      if (!room) return

      const sessionData = {
        ...formData,
        roomName: room.name,
      }

      let result
      if (mode === 'create') {
        result = addSession(sessionData)
      } else if (mode === 'edit' && initialData?.id) {
        result = updateSession(initialData.id, formData)
      }

      if (result?.success) {
        setSuccess(mode === 'create' ? '场次创建成功！' : '场次更新成功！')
        setTimeout(() => {
          onClose()
        }, 600)
      } else if (result?.error) {
        setError(result.error)
        setIsShaking(true)
        setTimeout(() => setIsShaking(false), 500)
      }
    },
    [formData, mode, initialData, addSession, updateSession, onClose],
  )

  const handleDelete = useCallback(() => {
    if (mode === 'edit' && initialData?.id) {
      if (window.confirm('确定要删除这个场次吗？')) {
        deleteSession(initialData.id)
        onClose()
      }
    }
  }, [mode, initialData, deleteSession, onClose])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onMouseDown={handleBackdropClick}
    >
      <div
        className={cn(
          'bg-murder-surface rounded-2xl border border-white/10 w-full max-w-md mx-4 shadow-2xl animate-scale-in overflow-hidden',
          isShaking && 'animate-shake',
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="font-serif text-xl text-white font-semibold">
            {mode === 'create' ? '新建场次' : '编辑场次'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">房间</label>
            <div className="grid grid-cols-3 gap-2">
              {ROOMS.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, roomId: room.id })}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    formData.roomId === room.id
                      ? 'text-white ring-2 ring-offset-2 ring-offset-murder-surface'
                      : 'bg-murder-card text-gray-400 hover:text-white',
                  )}
                  style={{
                    backgroundColor:
                      formData.roomId === room.id ? `${room.color}30` : undefined,
                    boxShadow:
                      formData.roomId === room.id ? `0 0 0 2px ${room.color}` : undefined,
                  }}
                >
                  {room.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1.5">剧本名称</label>
            <input
              type="text"
              value={formData.scriptName}
              onChange={(e) => setFormData({ ...formData, scriptName: e.target.value })}
              className="w-full px-4 py-2.5 bg-murder-card border border-white/5 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-murder-gold/50 transition-colors"
              placeholder="如：青楼、年轮、漓川怪谈簿"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">开始时间</label>
              <select
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-4 py-2.5 bg-murder-card border border-white/5 rounded-lg text-white focus:outline-none focus:border-murder-gold/50 transition-colors appearance-none cursor-pointer"
              >
                {TIME_SLOTS.filter((_, i) => i < TIME_SLOTS.length - 1).map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1.5">时长</label>
              <select
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                className="w-full px-4 py-2.5 bg-murder-card border border-white/5 rounded-lg text-white focus:outline-none focus:border-murder-gold/50 transition-colors appearance-none cursor-pointer"
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1.5">DM</label>
            {availableDMs.length === 0 ? (
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                ⚠ 今日所有 DM 都已请假，无法排场
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {DMS.map((dm) => {
                  const onLeave = isDMOnLeave(dm.id, formData.date)
                  return (
                    <button
                      key={dm.id}
                      type="button"
                      onClick={() => !onLeave && handleDMChange(dm)}
                      disabled={onLeave}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1',
                        onLeave && 'opacity-50 cursor-not-allowed line-through',
                        formData.dmId === dm.id && !onLeave
                          ? 'text-white ring-2 ring-offset-2 ring-offset-murder-surface'
                          : 'bg-murder-card text-gray-400 hover:text-white',
                      )}
                      style={{
                        backgroundColor:
                          formData.dmId === dm.id && !onLeave
                            ? `${dm.color}30`
                            : undefined,
                        boxShadow:
                          formData.dmId === dm.id && !onLeave
                            ? `0 0 0 2px ${dm.color}`
                            : undefined,
                      }}
                    >
                      <User size={12} />
                      {dm.name}
                      {onLeave && <span className="text-[10px]">(请假)</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1.5">人数</label>
            <div className="flex gap-1 flex-wrap">
              {PLAYER_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setFormData({ ...formData, playerCount: n })}
                  className={cn(
                    'w-9 h-9 rounded-lg text-sm font-medium transition-all',
                    formData.playerCount === n
                      ? 'bg-murder-gold text-murder-bg'
                      : 'bg-murder-card text-gray-400 hover:text-white',
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1.5">包场</label>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, isPrivateBooking: !formData.isPrivateBooking })
                }
                className={cn(
                  'w-full px-4 py-3 rounded-xl border transition-all flex items-center justify-between',
                  formData.isPrivateBooking
                    ? 'bg-pink-500/10 border-pink-500/30 text-pink-400'
                    : 'bg-murder-card border-white/5 text-gray-400 hover:border-white/10',
                )}
              >
                <span className="flex items-center gap-2">
                  <Crown
                    size={18}
                    className={formData.isPrivateBooking ? 'text-pink-400' : 'text-gray-500'}
                  />
                  <span className={formData.isPrivateBooking ? 'font-medium' : ''}>
                    标记为包场
                  </span>
                </span>
                <div
                  className={cn(
                    'w-11 h-6 rounded-full p-1 transition-colors',
                    formData.isPrivateBooking ? 'bg-pink-500' : 'bg-gray-600',
                  )}
                >
                  <div
                    className={cn(
                      'w-4 h-4 bg-white rounded-full shadow transition-transform',
                      formData.isPrivateBooking && 'translate-x-5',
                    )}
                  />
                </div>
              </button>

              {formData.isPrivateBooking && (
                <input
                  type="text"
                  value={formData.privateBookingNote}
                  onChange={(e) =>
                    setFormData({ ...formData, privateBookingNote: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-murder-card border border-white/5 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 transition-colors"
                  placeholder="包场备注（可选）：如 公司团建、生日派对"
                />
              )}
            </div>
          </div>

          {currentDMOnLeave && !liveConflict && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-red-400 text-sm">
                {currentDM?.name} 今日请假，请选择其他 DM
              </span>
            </div>
          )}

          {liveConflict && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-red-400 text-sm">{liveConflict}</span>
            </div>
          )}

          {error && !liveConflict && !currentDMOnLeave && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <CheckCircle size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-emerald-400 text-sm">{success}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {mode === 'edit' && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2.5 text-red-400 hover:bg-red-500/10 border border-red-500/30 rounded-lg transition-colors font-medium"
              >
                删除
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-murder-card text-gray-300 hover:bg-white/5 border border-white/5 rounded-lg transition-colors font-medium flex-1"
            >
              取消
            </button>
            <button
              type="submit"
              className={cn(
                'px-6 py-2.5 rounded-lg font-semibold transition-all flex-1',
                liveConflict || currentDMOnLeave || availableDMs.length === 0
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-murder-gold text-murder-bg hover:bg-murder-gold-light',
              )}
              disabled={!!liveConflict || currentDMOnLeave || availableDMs.length === 0}
            >
              {mode === 'create' ? '创建' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

