import { useCallback, memo, useState } from 'react'
import { Check, X, HelpCircle, Lock, Unlock, MessageSquare } from 'lucide-react'
import { clsx } from 'clsx'
import type { Photo, PhotoStatus } from '@/data/mockPhotos'
import { SCENE_LABELS } from '@/data/mockPhotos'
import { useSelectionStore } from '@/store/useSelectionStore'
import { useTouchInteraction } from '@/hooks/useTouchInteraction'

interface PhotoCardProps {
  photo: Photo
  index: number
}

const STATUS_CONFIG: Record<PhotoStatus, { label: string; icon: typeof Check; activeClass: string; bgClass: string }> = {
  selected: {
    label: '要',
    icon: Check,
    activeClass: 'bg-sage-light text-white shadow-sm',
    bgClass: 'bg-sage-light/20 text-sage-light',
  },
  rejected: {
    label: '不要',
    icon: X,
    activeClass: 'bg-mist-light text-white shadow-sm',
    bgClass: 'bg-mist-light/40 text-warm-300/60',
  },
  undecided: {
    label: '待定',
    icon: HelpCircle,
    activeClass: 'bg-blush-light text-white shadow-sm',
    bgClass: 'bg-blush-light/30 text-blush-light',
  },
}

const PhotoCard = memo(function PhotoCard({ photo, index }: PhotoCardProps) {
  const setPhotoStatus = useSelectionStore((s) => s.setPhotoStatus)
  const toggleLock = useSelectionStore((s) => s.toggleLock)
  const updateNote = useSelectionStore((s) => s.updateNote)
  const isPhotographerMode = useSelectionStore((s) => s.isPhotographerMode)
  const { preventDoubleTapZoom, preventContextMenu } = useTouchInteraction()
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteValue, setNoteValue] = useState(photo.note)

  const handleStatus = useCallback(
    (status: PhotoStatus) => {
      if (photo.locked && !isPhotographerMode && status !== 'selected') return
      setPhotoStatus(photo.id, photo.status === status ? 'undecided' : status)
    },
    [photo.id, photo.status, photo.locked, isPhotographerMode, setPhotoStatus]
  )

  const handleImageTouch = useCallback((e: React.TouchEvent) => {
    preventDoubleTapZoom(e)
  }, [preventDoubleTapZoom])

  const handleNoteSubmit = useCallback(() => {
    updateNote(photo.id, noteValue)
    setShowNoteInput(false)
  }, [photo.id, noteValue, updateNote])

  const sceneLabel = SCENE_LABELS[photo.scene]

  return (
    <div
      className={clsx(
        'group rounded-xl overflow-hidden bg-white shadow-sm border border-warm-200/60 transition-all duration-300',
        'opacity-0 animate-fade-up photo-card-touch',
        photo.locked && 'ring-2 ring-rose-gold/40',
        !photo.locked && photo.status === 'selected' && 'ring-1 ring-sage-light/50',
        !photo.locked && photo.status === 'rejected' && 'ring-1 ring-mist-light/50 opacity-75',
        !photo.locked && photo.status === 'undecided' && 'ring-1 ring-blush-light/30',
      )}
      style={{ animationDelay: `${Math.min(index * 30, 600)}ms` }}
    >
      <div
        className="relative aspect-[4/3] overflow-hidden bg-warm-200/40"
        onTouchStart={handleImageTouch}
        onContextMenu={preventContextMenu}
      >
        <img
          src={photo.src}
          alt={`照片 ${photo.order}`}
          loading="lazy"
          draggable={false}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03] pointer-events-none select-none"
        />
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span className="bg-black/40 text-white text-[10px] font-body px-2 py-0.5 rounded-full">
            {sceneLabel}
          </span>
          {photo.locked && (
            <span className="bg-rose-gold/80 text-white text-[10px] font-body px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <Lock className="w-2.5 h-2.5" />
              锁定
            </span>
          )}
        </div>
        <div className="absolute top-2 right-2 bg-black/40 text-white text-xs font-body px-2 py-0.5 rounded-full">
          #{photo.order}
        </div>
      </div>

      <div className="flex items-center justify-between gap-1 p-3">
        <div className="flex items-center gap-1.5">
          {(Object.entries(STATUS_CONFIG) as [PhotoStatus, typeof STATUS_CONFIG.selected][]).map(
            ([status, config]) => {
              const Icon = config.icon
              const isActive = photo.status === status
              const isDisabled = photo.locked && !isPhotographerMode && status !== 'selected'
              return (
                <button
                  key={status}
                  onClick={() => handleStatus(status)}
                  disabled={isDisabled}
                  className={clsx(
                    'flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-body font-medium transition-all duration-200 min-h-[44px] min-w-[44px] justify-center select-none',
                    isActive ? config.activeClass : config.bgClass,
                    isDisabled && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{config.label}</span>
                </button>
              )
            }
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowNoteInput(!showNoteInput)}
            className={clsx(
              'p-2 rounded-full transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center',
              photo.note ? 'text-rose-gold bg-rose-gold/10' : 'text-warm-300/40 hover:text-warm-300/60'
            )}
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {isPhotographerMode && (
            <button
              onClick={() => toggleLock(photo.id)}
              className={clsx(
                'p-2 rounded-full transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center',
                photo.locked
                  ? 'text-rose-gold bg-rose-gold/10'
                  : 'text-warm-300/40 hover:text-warm-300/60'
              )}
            >
              {photo.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {showNoteInput && (
        <div className="px-3 pb-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNoteSubmit()}
              placeholder="添加备注..."
              className="flex-1 px-3 py-2 text-xs font-body border border-warm-200 rounded-lg bg-warm-50 text-warm-300/80 placeholder:text-warm-300/30 focus:outline-none focus:border-rose-gold/40"
            />
            <button
              onClick={handleNoteSubmit}
              className="px-3 py-2 text-xs font-body bg-rose-gold text-white rounded-lg min-h-[44px]"
            >
              确定
            </button>
          </div>
        </div>
      )}

      {photo.note && !showNoteInput && (
        <div className="px-3 pb-3">
          <p className="text-[11px] font-body text-warm-300/50 italic truncate">
            {photo.note}
          </p>
        </div>
      )}
    </div>
  )
})

export default PhotoCard
