import { useRef, useMemo, useEffect, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useSelectionStore } from '@/store/useSelectionStore'
import PhotoCard from './PhotoCard'
import type { Photo } from '@/data/mockPhotos'

function useColumns() {
  const [cols, setCols] = useState(3)

  useEffect(() => {
    function calc() {
      const w = window.innerWidth
      if (w < 640) setCols(2)
      else if (w < 1024) setCols(2)
      else setCols(3)
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  return cols
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

const ROW_HEIGHT = 380
const GAP = 16

export default function PhotoGrid() {
  const cols = useColumns()
  const allPhotos = useSelectionStore((s) => s.photos)
  const statusFilter = useSelectionStore((s) => s.statusFilter)
  const sceneFilter = useSelectionStore((s) => s.sceneFilter)

  const photos = useMemo(() => {
    return allPhotos.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (sceneFilter !== 'all' && p.scene !== sceneFilter) return false
      return true
    })
  }, [allPhotos, statusFilter, sceneFilter])

  const rows = useMemo(() => chunkArray(photos, cols), [photos, cols])

  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT + GAP,
    overscan: 5,
  })

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-y-auto"
      style={{ height: 'calc(100vh - 260px)' }}
    >
      <div
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualItems.map((virtualRow) => {
          const rowPhotos: Photo[] = rows[virtualRow.index]
          return (
            <div
              key={virtualRow.key}
              className="absolute top-0 left-0 w-full"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
                height: `${virtualRow.size - GAP}px`,
              }}
            >
              <div
                className="grid gap-4 px-4 md:px-8"
                style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
              >
                {rowPhotos.map((photo) => (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    index={photos.indexOf(photo)}
                  />
                ))}
                {rowPhotos.length < cols &&
                  Array.from({ length: cols - rowPhotos.length }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
