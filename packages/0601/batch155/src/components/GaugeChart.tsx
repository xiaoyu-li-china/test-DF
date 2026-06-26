import { useEffect, useRef, useState } from 'react'
import { Gauge } from 'lucide-react'
import { safeNum } from '@/lib/utils'

interface GaugeChartProps {
  value: number
}

export default function GaugeChart({ value }: GaugeChartProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const prevValue = useRef(0)
  const rafId = useRef<number | null>(null)

  useEffect(() => {
    const start = safeNum(prevValue.current, 0)
    const end = safeNum(value, 0)
    const duration = 1000
    const startTime = performance.now()

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const next = safeNum(start + (end - start) * eased, start)
      setDisplayValue(next)
      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate)
      } else {
        prevValue.current = end
      }
    }

    rafId.current = requestAnimationFrame(animate)

    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current)
        rafId.current = null
      }
    }
  }, [value])

  const safeDisplayValue = safeNum(displayValue, 0)
  const clampedValue = Math.max(0, Math.min(100, safeDisplayValue))
  const angle = (clampedValue / 100) * 180
  const rad = ((angle - 180) * Math.PI) / 180
  const needleLen = 70
  const cx = 120
  const cy = 110
  const nx = cx + needleLen * Math.cos(rad)
  const ny = cy + needleLen * Math.sin(rad)

  const getColor = (v: number) => {
    if (v >= 90) return '#00e5ff'
    if (v >= 75) return '#ffaa00'
    return '#ff3d71'
  }

  const color = getColor(safeDisplayValue)

  const arcPath = (startAngle: number, endAngle: number, r: number) => {
    const s = ((startAngle - 180) * Math.PI) / 180
    const e = ((endAngle - 180) * Math.PI) / 180
    const x1 = cx + r * Math.cos(s)
    const y1 = cy + r * Math.sin(s)
    const x2 = cx + r * Math.cos(e)
    const y2 = cy + r * Math.sin(e)
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`
  }

  const ticks = Array.from({ length: 11 }, (_, i) => {
    const a = (i * 18 - 180) * (Math.PI / 180)
    const r1 = 80
    const r2 = i % 5 === 0 ? 90 : 85
    return {
      x1: cx + r1 * Math.cos(a),
      y1: cy + r1 * Math.sin(a),
      x2: cx + r2 * Math.cos(a),
      y2: cy + r2 * Math.sin(a),
      major: i % 5 === 0,
      val: i * 10,
    }
  })

  return (
    <div className="rounded-xl bg-[#111633]/60 border border-[#1a2045] p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-2">
        <Gauge className="w-4 h-4 text-[#00e5ff]" />
        <h2 className="text-sm font-semibold text-[#e0e6ff] tracking-wide">全网准点率</h2>
      </div>
      <div className="flex justify-center">
        <svg width="240" height="130" viewBox="0 0 240 130">
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff3d71" />
              <stop offset="50%" stopColor="#ffaa00" />
              <stop offset="100%" stopColor="#00e5ff" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path d={arcPath(0, 180, 90)} fill="none" stroke="#1a2045" strokeWidth="10" strokeLinecap="round" />

          <path
            d={arcPath(0, clampedValue / 100 * 180, 90)}
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth="10"
            strokeLinecap="round"
            filter="url(#glow)"
          />

          {ticks.map((t, i) => (
            <g key={i}>
              <line
                x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                stroke={t.major ? '#4a5280' : '#2a3060'}
                strokeWidth={t.major ? 2 : 1}
              />
              {t.major && (
                <text
                  x={cx + 65 * Math.cos((i * 18 - 180) * Math.PI / 180)}
                  y={cy + 65 * Math.sin((i * 18 - 180) * Math.PI / 180)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-[#5a6080] text-[9px] font-mono"
                >
                  {t.val}
                </text>
              )}
            </g>
          ))}

          <line
            x1={cx} y1={cy} x2={nx} y2={ny}
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            filter="url(#glow)"
          />
          <circle cx={cx} cy={cy} r={5} fill={color} filter="url(#glow)" />
          <circle cx={cx} cy={cy} r={2.5} fill="#0a0e27" />
        </svg>
      </div>
      <div className="text-center -mt-1">
        <span
          className="text-4xl font-bold font-display tabular-nums"
          style={{ color }}
        >
          {safeDisplayValue.toFixed(1)}
        </span>
        <span className="text-lg text-[#7b89b8] ml-0.5">%</span>
      </div>
    </div>
  )
}
