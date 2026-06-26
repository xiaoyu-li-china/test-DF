import { useState, useCallback } from 'react'
import { Plus, Sparkles, Users, FileDown } from 'lucide-react'
import type { Session, ModalMode } from '@/types'
import DateNavigator from '@/components/DateNavigator'
import StatsBar from '@/components/StatsBar'
import CalendarGrid from '@/components/CalendarGrid'
import SessionModal from '@/components/SessionModal'
import DMManager from '@/components/DMManager'
import { useScheduleStore } from '@/store/useScheduleStore'
import { ROOMS, DMS, formatDisplayDate } from '@/utils/time'
import { exportScheduleToPDF } from '@/utils/exportPDF'

export default function Home() {
  const { selectedDate, sessions, getDMsOnLeave } = useScheduleStore()

  const [modalState, setModalState] = useState<{
    isOpen: boolean
    mode: ModalMode
    initialData?: Partial<Session>
  }>({
    isOpen: false,
    mode: 'create',
  })

  const [dmManagerOpen, setDmManagerOpen] = useState(false)
  const [exportStatus, setExportStatus] = useState<string | null>(null)

  const handleEditSession = useCallback((session: Session) => {
    setModalState({
      isOpen: true,
      mode: 'edit',
      initialData: session,
    })
  }, [])

  const handleCreateSession = useCallback((roomId: number, startTime: string) => {
    setModalState({
      isOpen: true,
      mode: 'create',
      initialData: {
        roomId,
        startTime,
        date: selectedDate,
      },
    })
  }, [selectedDate])

  const handleQuickCreate = useCallback(() => {
    setModalState({
      isOpen: true,
      mode: 'create',
      initialData: {
        date: selectedDate,
      },
    })
  }, [selectedDate])

  const handleCloseModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }))
  }, [])

  const handleExportPDF = useCallback(async () => {
    const todaySessions = sessions.filter((s) => s.date === selectedDate)
    setExportStatus('正在生成排班表...')

    await exportScheduleToPDF({
      sessions: todaySessions,
      rooms: ROOMS,
      dms: DMS,
      date: selectedDate,
      onProgress: (msg) => setExportStatus(msg),
      onComplete: () => {
        setTimeout(() => setExportStatus(null), 2000)
      },
      onError: () => {
        setExportStatus('导出失败，请重试')
        setTimeout(() => setExportStatus(null), 3000)
      },
    })
  }, [sessions, selectedDate])

  const dmsOnLeave = getDMsOnLeave(selectedDate)

  return (
    <div className="min-h-screen bg-murder-bg text-sans">
      <div className="h-screen flex flex-col">
        <header className="border-b border-white/5 bg-murder-surface/50 backdrop-blur-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-murder-gold to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-murder-gold/20">
                  <Sparkles size={22} className="text-murder-bg" />
                </div>
                <div>
                  <h1 className="font-serif text-xl font-bold text-white tracking-wide">
                    剧本杀排期系统
                  </h1>
                  <p className="text-xs text-gray-400">
                    6 间主题房 · {formatDisplayDate(selectedDate)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {exportStatus && (
                  <span className="text-sm text-murder-gold animate-pulse-soft">
                    {exportStatus}
                  </span>
                )}

                <button
                  onClick={() => setDmManagerOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-murder-card text-white hover:bg-white/5 border border-white/10 rounded-xl transition-all hover:scale-105 active:scale-95"
                >
                  <Users size={18} />
                  DM 管理
                  {dmsOnLeave.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-red-500 text-white rounded-full">
                      {dmsOnLeave.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/5 text-white hover:bg-white/10 border border-white/10 rounded-xl transition-all hover:scale-105 active:scale-95"
                >
                  <FileDown size={18} />
                  导出 PDF
                </button>

                <button
                  onClick={handleQuickCreate}
                  className="flex items-center gap-2 px-5 py-2.5 bg-murder-gold text-murder-bg font-semibold rounded-xl hover:bg-murder-gold-light transition-all shadow-lg shadow-murder-gold/20 hover:shadow-murder-gold/30 hover:scale-105 active:scale-95"
                >
                  <Plus size={18} />
                  新建场次
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 py-3 border-t border-white/5 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <DateNavigator />
              <StatsBar />
            </div>
          </div>
        </header>

        <CalendarGrid
          onEditSession={handleEditSession}
          onCreateSession={handleCreateSession}
        />

        <footer className="border-t border-white/5 bg-murder-surface/30 px-6 py-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              💡 提示：点击空白格子快速新建，拖拽场次卡片可调整时间与房间
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-soft" />
              数据自动保存
            </span>
          </div>
        </footer>
      </div>

      <SessionModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        initialData={modalState.initialData}
        onClose={handleCloseModal}
      />

      <DMManager isOpen={dmManagerOpen} onClose={() => setDmManagerOpen(false)} />
    </div>
  )
}
