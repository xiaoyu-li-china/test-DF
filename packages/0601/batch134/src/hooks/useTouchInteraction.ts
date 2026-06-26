import { useCallback, useRef } from 'react'

export function useTouchInteraction() {
  const lastTapRef = useRef(0)
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const preventDoubleTapZoom = useCallback((e: React.TouchEvent) => {
    const now = Date.now()
    const diff = now - lastTapRef.current

    if (diff < 300) {
      e.preventDefault()
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current)
      }
      touchTimerRef.current = setTimeout(() => {
        lastTapRef.current = 0
      }, 300)
    }

    lastTapRef.current = now
  }, [])

  const preventContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  return {
    preventDoubleTapZoom,
    preventContextMenu,
    cardTouchClass: 'photo-card-touch',
  }
}
