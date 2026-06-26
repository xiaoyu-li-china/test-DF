import { clsx } from 'clsx'
import { useSelectionStore, type StatusFilter } from '@/store/useSelectionStore'
import { SCENE_LABELS, type Scene } from '@/data/mockPhotos'

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'selected', label: '要' },
  { key: 'rejected', label: '不要' },
  { key: 'undecided', label: '待定' },
]

const SCENE_TABS: { key: Scene | 'all'; label: string }[] = [
  { key: 'all', label: '全部场景' },
  ...Object.entries(SCENE_LABELS).map(([key, label]) => ({
    key: key as Scene,
    label,
  })),
]

export default function FilterBar() {
  const statusFilter = useSelectionStore((s) => s.statusFilter)
  const sceneFilter = useSelectionStore((s) => s.sceneFilter)
  const setStatusFilter = useSelectionStore((s) => s.setStatusFilter)
  const setSceneFilter = useSelectionStore((s) => s.setSceneFilter)

  return (
    <div className="sticky top-0 z-20 glass-bar">
      <div className="flex items-center justify-center gap-2 py-3 border-b border-warm-200/40">
        {SCENE_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSceneFilter(key)}
            className={clsx(
              'px-4 py-1.5 rounded-full text-xs font-body font-medium transition-all duration-200 min-h-[40px] flex items-center justify-center',
              sceneFilter === key
                ? 'bg-rose-gold/10 text-rose-gold border border-rose-gold/30'
                : 'bg-transparent text-warm-300/60 hover:text-warm-300/80 border border-transparent'
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 py-3">
        {STATUS_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={clsx(
              'px-5 py-2 rounded-full text-sm font-body font-medium transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center',
              statusFilter === key
                ? 'bg-rose-gold text-white shadow-sm shadow-rose-gold/20'
                : 'bg-warm-200/60 text-warm-300/70 hover:bg-warm-200'
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
