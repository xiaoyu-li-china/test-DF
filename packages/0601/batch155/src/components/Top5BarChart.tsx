import { useMemo } from 'react'
import type { BusRoute } from '@/types'
import { BarChart3 } from 'lucide-react'
import { safeNum } from '@/lib/utils'

interface Top5BarChartProps {
  routes: BusRoute[]
}

export default function Top5BarChart({ routes }: Top5BarChartProps) {
  const { barWidths, maxDelay } = useMemo(() => {
    const delays = routes.map(r => safeNum(r.delayMinutes, 0))
    const maxD = Math.max(...delays, 1)
    const widths = delays.map(d => (d / maxD) * 100)
    return { barWidths: widths, maxDelay: maxD }
  }, [routes])

  if (routes.length === 0) {
    return (
      <div className="h-full rounded-xl bg-[#111633]/60 border border-[#1a2045] p-4 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-8 h-8 text-[#2a3060] mx-auto mb-2" />
          <p className="text-xs text-[#5a6080]">暂无晚点线路</p>
        </div>
      </div>
    )
  }

  const styles = useMemo(() => {
    return routes.map((route, idx) => {
      const delay = safeNum(route.delayMinutes, 0)
      const ratio = maxDelay > 0 ? delay / maxDelay : 0
      let barColor: string
      let glowColor: string
      if (ratio > 0.8) {
        barColor = 'from-[#ff3d71] to-[#ff1744]'
        glowColor = 'shadow-[0_0_12px_rgba(255,61,113,0.3)]'
      } else if (ratio > 0.5) {
        barColor = 'from-[#ffaa00] to-[#ff6d00]'
        glowColor = 'shadow-[0_0_8px_rgba(255,170,0,0.2)]'
      } else {
        barColor = 'from-[#ffaa00] to-[#ffcc00]'
        glowColor = 'shadow-[0_0_8px_rgba(255,170,0,0.2)]'
      }
      const nameColor = idx === 0 ? 'text-[#ff3d71]' : idx === 1 ? 'text-[#ff6d00]' : 'text-[#ffaa00]'
      return { barColor, glowColor, nameColor }
    })
  }, [routes, maxDelay])

  return (
    <div className="h-full rounded-xl bg-[#111633]/60 border border-[#1a2045] p-4 backdrop-blur-sm flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-[#ff3d71]" />
        <h2 className="text-sm font-semibold text-[#e0e6ff] tracking-wide">晚点 Top5</h2>
        <span className="ml-auto text-[10px] text-[#7b89b8]">按晚点时长排序</span>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-3">
        {routes.map((route, idx) => {
          const style = styles[idx]
          const width = barWidths[idx] ?? 0
          return (
            <div key={route.routeId} className="flex items-center gap-3">
              <div className="w-14 flex-shrink-0">
                <span className={`text-sm font-bold font-display ${style.nameColor}`}>
                  {route.routeName}
                </span>
              </div>

              <div className="flex-1 h-7 bg-[#0a0e27]/60 rounded-md overflow-hidden relative">
                <div
                  className={`h-full rounded-md bg-gradient-to-r ${style.barColor} transition-all duration-700 ease-out ${style.glowColor}`}
                  style={{ width: `${width}%` }}
                />
                <div
                  className="absolute top-0 left-0 h-full rounded-md bg-gradient-to-r from-white/5 to-transparent pointer-events-none"
                  style={{ width: `${width}%` }}
                />
              </div>

              <div className="w-16 flex-shrink-0 text-right">
                <span className="text-sm font-mono font-bold text-[#ff3d71] tabular-nums">
                  +{safeNum(route.delayMinutes, 0)}
                </span>
                <span className="text-[10px] text-[#7b89b8] ml-0.5">分</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
