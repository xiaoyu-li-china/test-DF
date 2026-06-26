import { useEffect, useRef, useCallback } from 'react'

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<() => void>()
  const intervalId = useRef<number | null>(null)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (delay === null) {
      return
    }

    intervalId.current = window.setInterval(() => {
      savedCallback.current?.()
    }, delay)

    return () => {
      if (intervalId.current !== null) {
        clearInterval(intervalId.current)
        intervalId.current = null
      }
    }
  }, [delay])

  const clear = useCallback(() => {
    if (intervalId.current !== null) {
      clearInterval(intervalId.current)
      intervalId.current = null
    }
  }, [])

  return { clear }
}

export function useTimeout(callback: () => void, delay: number | null) {
  const savedCallback = useRef<() => void>()
  const timeoutId = useRef<number | null>(null)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (delay === null) {
      return
    }

    timeoutId.current = window.setTimeout(() => {
      savedCallback.current?.()
    }, delay)

    return () => {
      if (timeoutId.current !== null) {
        clearTimeout(timeoutId.current)
        timeoutId.current = null
      }
    }
  }, [delay])

  const clear = useCallback(() => {
    if (timeoutId.current !== null) {
      clearTimeout(timeoutId.current)
      timeoutId.current = null
    }
  }, [])

  return { clear }
}

export class IntervalManager {
  private intervals: Map<string, number> = new Map()

  set(key: string, callback: () => void, delay: number) {
    this.clear(key)
    const id = window.setInterval(callback, delay)
    this.intervals.set(key, id)
    return id
  }

  clear(key: string) {
    const id = this.intervals.get(key)
    if (id !== undefined) {
      clearInterval(id)
      this.intervals.delete(key)
    }
  }

  clearAll() {
    this.intervals.forEach((id) => clearInterval(id))
    this.intervals.clear()
  }

  get size() {
    return this.intervals.size
  }
}

export const globalIntervalManager = new IntervalManager()
