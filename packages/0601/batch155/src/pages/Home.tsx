import { useBusData } from '@/hooks/useBusData'
import Header from '@/components/Header'
import ArrivalTable from '@/components/ArrivalTable'
import GaugeChart from '@/components/GaugeChart'
import StatsCards from '@/components/StatsCards'
import Top5BarChart from '@/components/Top5BarChart'

export default function Home() {
  const { data, countdown, loading } = useBusData()

  if (loading || !data) {
    return (
      <div className="h-screen w-screen bg-[#0a0e27] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-[#00e5ff] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#7b89b8] tracking-wide">数据加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen bg-[#0a0e27] flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />

      <Header countdown={countdown} />

      <main className="flex-1 flex gap-4 p-4 min-h-0">
        <div className="w-[60%] flex-shrink-0 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <ArrivalTable routes={data.routes} />
        </div>

        <div className="w-[40%] flex flex-col gap-4 min-h-0">
          <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <GaugeChart value={data.onTimeRate} />
          </div>

          <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <StatsCards
              activeRoutes={data.activeRoutes}
              delayedRoutes={data.delayedRoutes}
              outOfServiceRoutes={data.outOfServiceRoutes}
            />
          </div>

          <div className="flex-1 min-h-0 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <Top5BarChart routes={data.top5Delayed} />
          </div>
        </div>
      </main>

      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00e5ff]/40 to-transparent" />
    </div>
  )
}
