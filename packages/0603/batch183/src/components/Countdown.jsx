import { useState, useEffect, useRef, useMemo } from 'react'
import './Countdown.css'

const DEFAULT_FORMAT = '{d}天{h}时{m}分{s}秒'

// eslint-disable-next-line react-refresh/only-export-components
export function calculateTimeLeft(targetDate) {
  const now = Date.now()
  const difference = targetDate - now

  if (difference <= 0) {
    return null
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function formatCountdown(timeLeft, format) {
  const hasDays = timeLeft.days > 0
  const hasHours = hasDays || timeLeft.hours > 0
  const hasMinutes = hasHours || timeLeft.minutes > 0

  let result = format

  if (!hasDays) {
    result = result.replace(/\{d\}[^{]*/g, '')
  }
  if (!hasHours) {
    result = result.replace(/\{h\}[^{]*/g, '')
  }
  if (!hasMinutes) {
    result = result.replace(/\{m\}[^{]*/g, '')
  }

  result = result
    .replace(/\{d\}/g, String(timeLeft.days).padStart(2, '0'))
    .replace(/\{h\}/g, String(timeLeft.hours).padStart(2, '0'))
    .replace(/\{m\}/g, String(timeLeft.minutes).padStart(2, '0'))
    .replace(/\{s\}/g, String(timeLeft.seconds).padStart(2, '0'))

  return result
}

export default function Countdown({ targetDate, format = DEFAULT_FORMAT, onEnd }) {
  const [tick, setTick] = useState(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const timeLeft = useMemo(() => calculateTimeLeft(targetDate), [targetDate, tick])
  const onEndRef = useRef(onEnd)
  const endedRef = useRef(false)
  const rafRef = useRef(null)
  const lastSecondRef = useRef(null)

  useEffect(() => {
    onEndRef.current = onEnd
  }, [onEnd])

  useEffect(() => {
    endedRef.current = false
    lastSecondRef.current = timeLeft?.seconds ?? null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDate])

  useEffect(() => {
    if (timeLeft !== null) {
      endedRef.current = false
    }

    if (timeLeft === null && !endedRef.current) {
      endedRef.current = true
      onEndRef.current?.()
    }
  }, [timeLeft])

  useEffect(() => {
    if (timeLeft === null) {
      return
    }

    const tick = () => {
      const newTimeLeft = calculateTimeLeft(targetDate)

      if (newTimeLeft === null) {
        setTick(t => t + 1)
        return
      }

      if (newTimeLeft.seconds !== lastSecondRef.current) {
        setTick(t => t + 1)
        lastSecondRef.current = newTimeLeft.seconds
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [targetDate, timeLeft])

  if (timeLeft === null) {
    return <div className="countdown-ended" data-testid="countdown-ended">已结束</div>
  }

  if (format) {
    return (
      <div className="countdown-container" data-testid="countdown-container">
        <span className="countdown-formatted" data-testid="countdown-formatted">
          {formatCountdown(timeLeft, format)}
        </span>
      </div>
    )
  }

  return (
    <div className="countdown-container" data-testid="countdown-container">
      <div className="countdown-item">
        <span className="countdown-value" data-testid="countdown-days">
          {String(timeLeft.days).padStart(2, '0')}
        </span>
        <span className="countdown-label">天</span>
      </div>
      <span className="countdown-separator">:</span>
      <div className="countdown-item">
        <span className="countdown-value" data-testid="countdown-hours">
          {String(timeLeft.hours).padStart(2, '0')}
        </span>
        <span className="countdown-label">时</span>
      </div>
      <span className="countdown-separator">:</span>
      <div className="countdown-item">
        <span className="countdown-value" data-testid="countdown-minutes">
          {String(timeLeft.minutes).padStart(2, '0')}
        </span>
        <span className="countdown-label">分</span>
      </div>
      <span className="countdown-separator">:</span>
      <div className="countdown-item">
        <span className="countdown-value" data-testid="countdown-seconds">
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
        <span className="countdown-label">秒</span>
      </div>
    </div>
  )
}
