import { useState, useEffect, useCallback, useRef } from 'react'
import type { DashboardData } from '@/types'
import { generateMockData } from '@/mock/data'
import { sanitizeData } from '@/lib/utils'

const REFRESH_INTERVAL = 30000

export function useBusData() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<number | null>(null)

  const refresh = useCallback(() => {
    try {
      const newData = generateMockData()
      const safeData = sanitizeData(newData)
      setData(safeData)
    } catch {
      setData(prev => prev ?? null)
    }
    setLoading(false)
    setCountdown(REFRESH_INTERVAL / 1000)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          queueMicrotask(refresh)
          return REFRESH_INTERVAL / 1000
        }
        return prev - 1
      })
    }, 1000)
    intervalRef.current = interval
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [refresh])

  return { data, countdown, loading }
}
