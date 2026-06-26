import type { BusRoute } from '@/types'
import { Clock, MapPin } from 'lucide-react'
import { formatETA } from '@/lib/utils'

interface ArrivalTableProps {
  routes: BusRoute[]
}

const STATUS_CONFIG = {
  'on-time': { label: '准时', color: 'text-[#00e5ff]', bg: 'bg-[#00e5ff]/10', dot: 'bg-[#00e5ff]' },
  'delayed': { label: '晚点', color: 'text-[#ff3d71]', bg: 'bg-[#ff3d71]/10', dot: 'bg-[#ff3d71]' },
  'arriving': { label: '即将到站', color: 'text-[#ffaa00]', bg: 'bg-[#ffaa00]/10', dot: 'bg-[#ffaa00]' },
  'out-of-service': { label: '停运', color: 'text-[#5a6080]', bg: 'bg-[#5a6080]/10', dot: 'bg-[#5a6080]' },
}

export default function ArrivalTable({ routes }: ArrivalTableProps) {
  const sorted = [...routes].sort((a, b) => {
    const order = { arriving: 0, delayed: 1, 'on-time': 2, 'out-of-service': 3 }
    return order[a.status] - order[b.status]
  })

  return (
    <div className="h-full flex flex-col rounded-xl bg-[#111633]/60 border border-[#1a2045] overflow-hidden backdrop-blur-sm">
      <div className="px-5 py-3 border-b border-[#1a2045] flex items-center gap-2">
        <Clock className="w-4 h-4 text-[#00e5ff]" />
        <h2 className="text-sm font-semibold text-[#e0e6ff] tracking-wide">线路到站预测</h2>
        <span className="ml-auto text-[10px] text-[#7b89b8]">{routes.length} 条线路</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="text-[10px] text-[#7b89b8] uppercase tracking-wider bg-[#0d1230]">
              <th className="text-left py-2.5 px-4 font-medium">线路</th>
              <th className="text-left py-2.5 px-3 font-medium">方向</th>
              <th className="text-center py-2.5 px-3 font-medium">预计到站</th>
              <th className="text-center py-2.5 px-3 font-medium">距到站</th>
              <th className="text-center py-2.5 px-3 font-medium">晚点</th>
              <th className="text-center py-2.5 px-4 font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((route, idx) => {
              const cfg = STATUS_CONFIG[route.status]
              const isDelayed = route.status === 'delayed'
              return (
                <tr
                  key={route.routeId}
                  className={`border-t border-[#1a2045]/60 transition-colors duration-300 hover:bg-[#1a2045]/30 ${
                    idx % 2 === 0 ? 'bg-transparent' : 'bg-[#0d1230]/40'
                  } ${isDelayed ? 'animate-pulse-subtle' : ''}`}
                >
                  <td className="py-2.5 px-4">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-[#7b89b8]" />
                      <span className="text-sm font-bold text-[#e0e6ff] font-display">{route.routeName}</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-[#7b89b8] max-w-[180px] truncate">
                    {route.direction}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {route.status === 'out-of-service' ? (
                      <span className="text-xs text-[#5a6080]">--:--</span>
                    ) : (
                      <span className="text-sm font-mono text-[#c0c8e8] tabular-nums">{formatETA(route.nextBusETA)}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {route.status === 'out-of-service' ? (
                      <span className="text-xs text-[#5a6080]">-</span>
                    ) : (
                      <span className={`text-sm font-mono tabular-nums ${
                        route.minutesAway <= 2 ? 'text-[#ffaa00] font-bold' : 'text-[#c0c8e8]'
                      }`}>
                        {route.minutesAway}分
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {route.delayMinutes > 0 ? (
                      <span className="text-sm font-mono text-[#ff3d71] tabular-nums font-semibold">
                        +{route.delayMinutes}分
                      </span>
                    ) : (
                      <span className="text-xs text-[#5a6080]">-</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${cfg.color} ${cfg.bg} ${isDelayed ? 'animate-glow-red' : ''}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
