import { useMemo } from 'react'
import { useInventoryStore } from '@/store/useInventoryStore'
import { useWarehouseFilter } from '@/hooks/useWarehouseFilter'
import { AlertTriangle, WifiOff, Bell } from 'lucide-react'

export default function AlertPanel() {
  const allAlerts = useInventoryStore((s) => s.alerts)
  const isConnected = useInventoryStore((s) => s.isConnected)
  const warehouse = useWarehouseFilter()

  const alerts = useMemo(() => {
    if (!warehouse) return allAlerts
    return allAlerts.filter((a) => a.warehouse === warehouse)
  }, [allAlerts, warehouse])

  const uniqueAlerts = useMemo(() => {
    const seen = new Set<string>()
    return alerts.filter((a) => {
      if (seen.has(a.skuId)) return false
      seen.add(a.skuId)
      return true
    })
  }, [alerts])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-5 h-5 text-amber-400" />
        <h2 className="text-lg font-semibold text-slate-100 tracking-wide">
          预警面板
        </h2>
        <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
          {uniqueAlerts.length} 条预警
        </span>
      </div>

      {!isConnected && (
        <div className="mb-3 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/15 border border-red-500/30 animate-pulse">
          <WifiOff className="w-5 h-5 text-red-400 shrink-0" />
          <span className="text-red-300 font-semibold text-sm">数据中断</span>
          <span className="text-red-400/60 text-xs ml-auto">等待重连...</span>
        </div>
      )}

      <div className="flex-1 overflow-auto space-y-2 pr-1">
        {uniqueAlerts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-slate-500">
            <Bell className="w-8 h-8 mb-2 opacity-30" />
            <span className="text-sm">暂无预警</span>
          </div>
        )}
        {uniqueAlerts.map((alert) => (
          <div
            key={alert.id}
            className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/40 hover:border-amber-500/30 transition-colors duration-200"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-200 text-sm truncate">
                    {alert.skuName}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {alert.skuId}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span className="text-slate-400">{alert.warehouse}</span>
                  <span className="text-amber-400 font-mono font-semibold">
                    库存 {alert.currentStock}
                  </span>
                  <span className="text-slate-500 font-mono">
                    阈值 {alert.threshold}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
