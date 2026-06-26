import { useEffect, useState, useMemo } from 'react'
import { Heart, X, HelpCircle, Download, Camera } from 'lucide-react'
import { useSelectionStore } from '@/store/useSelectionStore'
import type { PhotoStatus } from '@/data/mockPhotos'

interface StatItemProps {
  icon: typeof Heart
  label: string
  count: number
  color: string
}

function StatItem({ icon: Icon, label, count, color }: StatItemProps) {
  const [animKey, setAnimKey] = useState(0)

  useEffect(() => {
    setAnimKey((k) => k + 1)
  }, [count])

  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[56px]">
      <div className="flex items-center gap-1">
        <Icon className={`w-3 h-3 ${color}`} />
        <span
          key={animKey}
          className={`text-base font-display font-semibold ${color} animate-count-bump`}
        >
          {count}
        </span>
      </div>
      <span className="text-[10px] font-body text-warm-300/50 tracking-wide">
        {label}
      </span>
    </div>
  )
}

const STATS: { key: PhotoStatus; icon: typeof Heart; label: string; color: string }[] = [
  { key: 'selected', icon: Heart, label: '已选', color: 'text-sage-light' },
  { key: 'rejected', icon: X, label: '不要', color: 'text-warm-300/40' },
  { key: 'undecided', icon: HelpCircle, label: '待定', color: 'text-blush-light' },
]

export default function StatsBar() {
  const photos = useSelectionStore((s) => s.photos)
  const exportCSV = useSelectionStore((s) => s.exportCSV)
  const isPhotographerMode = useSelectionStore((s) => s.isPhotographerMode)
  const togglePhotographerMode = useSelectionStore((s) => s.togglePhotographerMode)

  const counts = useMemo(() => ({
    selected: photos.filter((p) => p.status === 'selected').length,
    rejected: photos.filter((p) => p.status === 'rejected').length,
    undecided: photos.filter((p) => p.status === 'undecided').length,
    total: photos.length,
  }), [photos])

  const handleExport = () => {
    const csv = exportCSV()
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `选片清单_${new Date().toLocaleDateString('zh-CN')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 glass-bar border-t border-warm-200/60">
      <div className="max-w-lg mx-auto flex items-center justify-center gap-6 py-3">
        {STATS.map(({ key, icon, label, color }) => (
          <StatItem
            key={key}
            icon={icon}
            label={label}
            count={counts[key]}
            color={color}
          />
        ))}
        <div className="h-6 w-px bg-warm-200" />
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-base font-display font-semibold text-rose-gold">
            {counts.total}
          </span>
          <span className="text-[10px] font-body text-warm-300/50 tracking-wide">总计</span>
        </div>
        <div className="h-6 w-px bg-warm-200" />
        <button
          onClick={handleExport}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-body bg-rose-gold/10 text-rose-gold hover:bg-rose-gold/20 transition-all duration-200 min-h-[44px]"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">导出CSV</span>
        </button>
        <button
          onClick={togglePhotographerMode}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-body transition-all duration-200 min-h-[44px] ${
            isPhotographerMode
              ? 'bg-rose-gold text-white shadow-sm'
              : 'bg-warm-200/60 text-warm-300/60 hover:bg-warm-200'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isPhotographerMode ? '摄影师模式' : '摄影师'}</span>
        </button>
      </div>
    </div>
  )
}
