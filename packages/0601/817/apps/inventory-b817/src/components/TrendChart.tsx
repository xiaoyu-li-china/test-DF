import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { useInventoryStore } from '@/store/useInventoryStore'
import { useWarehouseFilter } from '@/hooks/useWarehouseFilter'
import { TrendingUp } from 'lucide-react'

export default function TrendChart() {
  const allSkus = useInventoryStore((s) => s.skus)
  const trends = useInventoryStore((s) => s.trends)
  const warehouse = useWarehouseFilter()

  const filteredSkus = useMemo(() => {
    if (!warehouse) return allSkus
    return allSkus.filter((s) => s.warehouse === warehouse)
  }, [allSkus, warehouse])

  const lowStockSkus = useMemo(
    () => filteredSkus.filter((s) => s.stock < s.threshold),
    [filteredSkus]
  )

  const displaySkus = useMemo(() => {
    if (lowStockSkus.length > 0) return lowStockSkus.slice(0, 5)
    return filteredSkus.slice(0, 5)
  }, [lowStockSkus, filteredSkus])

  const displayIds = useMemo(
    () => new Set(displaySkus.map((s) => s.id)),
    [displaySkus]
  )

  const filteredTrends = useMemo(
    () => trends.filter((t) => displayIds.has(t.skuId)),
    [trends, displayIds]
  )

  const option = useMemo(() => {
    const timeSet = new Set<number>()
    const bySku = new Map<string, Map<number, number>>()

    for (const t of filteredTrends) {
      timeSet.add(t.timestamp)
      if (!bySku.has(t.skuId)) bySku.set(t.skuId, new Map())
      bySku.get(t.skuId)!.set(t.timestamp, t.stock)
    }

    const times = Array.from(timeSet).sort((a, b) => a - b)
    const skuNames = new Map(displaySkus.map((s) => [s.id, s.name]))

    const series = Array.from(bySku.entries()).map(([skuId, points]) => {
      const data = times.map((t) => points.get(t) ?? null)
      const sku = displaySkus.find((s) => s.id === skuId)
      const isLow = sku ? sku.stock < sku.threshold : false
      return {
        name: skuNames.get(skuId) ?? skuId,
        type: 'line' as const,
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: {
          width: 2,
          color: isLow ? '#f59e0b' : '#06b6d4',
        },
        itemStyle: {
          color: isLow ? '#f59e0b' : '#06b6d4',
        },
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: isLow ? 'rgba(245,158,11,0.25)' : 'rgba(6,182,212,0.25)' },
              { offset: 1, color: 'rgba(0,0,0,0)' },
            ],
          },
        },
        data,
      }
    })

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis' as const,
        backgroundColor: 'rgba(15,23,42,0.9)',
        borderColor: 'rgba(100,116,139,0.3)',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
      },
      legend: {
        top: 0,
        right: 0,
        textStyle: { color: '#94a3b8', fontSize: 11 },
        itemWidth: 16,
        itemHeight: 8,
      },
      grid: {
        top: 36,
        right: 16,
        bottom: 32,
        left: 48,
      },
      xAxis: {
        type: 'category' as const,
        data: times.map((t) => {
          const d = new Date(t)
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
        }),
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#64748b', fontSize: 10 },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value' as const,
        axisLine: { show: false },
        axisLabel: { color: '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      series,
    }
  }, [filteredTrends, displaySkus])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-semibold text-slate-100 tracking-wide">
          库存趋势
        </h2>
        {lowStockSkus.length > 0 && (
          <span className="ml-2 text-xs text-amber-400">
            优先展示低库存 SKU
          </span>
        )}
      </div>
      <div className="flex-1 min-h-0 rounded-xl border border-slate-700/50 bg-slate-900/30 p-2">
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge
        />
      </div>
    </div>
  )
}
