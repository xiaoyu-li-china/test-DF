import { useMockWebSocket } from '@/hooks/useMockWebSocket'
import StockTable from '@/components/StockTable'
import AlertPanel from '@/components/AlertPanel'
import TrendChart from '@/components/TrendChart'
import { useInventoryStore } from '@/store/useInventoryStore'
import { Activity, Wifi, WifiOff } from 'lucide-react'

export default function Home() {
  useMockWebSocket()
  const isConnected = useInventoryStore((s) => s.isConnected)
  const skus = useInventoryStore((s) => s.skus)
  const lowCount = skus.filter((s) => s.stock < s.threshold).length

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-cyan-400" />
          <h1 className="text-xl font-bold tracking-wider text-slate-100">
            库存预警大屏
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>SKU 总数: <span className="text-slate-200 font-semibold">{skus.length}</span></span>
            <span className="text-slate-600">|</span>
            <span>低库存: <span className="text-amber-400 font-semibold">{lowCount}</span></span>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
            isConnected
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse'
          }`}>
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>已连接</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>已断线</span>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
        <section className="col-span-3 flex flex-col min-h-0">
          <AlertPanel />
        </section>
        <section className="col-span-5 flex flex-col min-h-0">
          <StockTable />
        </section>
        <section className="col-span-4 flex flex-col min-h-0">
          <TrendChart />
        </section>
      </main>
    </div>
  )
}
