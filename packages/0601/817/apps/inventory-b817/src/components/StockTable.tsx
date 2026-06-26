import { useMemo, useState, useCallback } from 'react'
import { useInventoryStore } from '@/store/useInventoryStore'
import { useWarehouseFilter } from '@/hooks/useWarehouseFilter'
import { AlertTriangle, Package, Download, Check, X, RotateCw } from 'lucide-react'

export default function StockTable() {
  const allSkus = useInventoryStore((s) => s.skus)
  const warehouse = useWarehouseFilter()
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle')
  const [exportedIds, setExportedIds] = useState<Set<string>>(new Set())
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set())

  const filteredSkus = useMemo(() => {
    if (!warehouse) return allSkus
    return allSkus.filter((s) => s.warehouse === warehouse)
  }, [allSkus, warehouse])

  const visibleSkus = useMemo(
    () => filteredSkus.filter((s) => !exportedIds.has(s.id)),
    [filteredSkus, exportedIds]
  )

  const failedCount = useMemo(
    () => visibleSkus.filter((s) => failedIds.has(s.id)).length,
    [visibleSkus, failedIds]
  )

  const exportToCSV = useCallback(async () => {
    setExportStatus('exporting')

    const targetSkus = visibleSkus.filter((s) => !failedIds.has(s.id))
    if (targetSkus.length === 0 && failedIds.size === 0) {
      setExportStatus('idle')
      return
    }

    const itemsToExport = targetSkus.length > 0 ? targetSkus : visibleSkus.filter((s) => failedIds.has(s.id))

    const data = itemsToExport.map((s) => ({
      SKU: s.id,
      品名: s.name,
      仓库: s.warehouse,
      库存: s.stock,
      阈值: s.threshold,
      状态: s.stock < s.threshold ? '低库存' : '正常',
    }))

    await new Promise((resolve) => setTimeout(resolve, 800))

    const willFail = Math.random() < 0.3
    if (willFail) {
      setExportStatus('error')
      setFailedIds(new Set(itemsToExport.map((s) => s.id)))
      return
    }

    const headers = Object.keys(data[0]).join(',')
    const rows = data.map((row) => Object.values(row).join(','))
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory_${warehouse || 'all'}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)

    const newExported = new Set(exportedIds)
    itemsToExport.forEach((s) => newExported.add(s.id))
    setExportedIds(newExported)
    setFailedIds(new Set())
    setExportStatus('success')
    setTimeout(() => setExportStatus('idle'), 2000)
  }, [visibleSkus, failedIds, exportedIds, warehouse])

  const retryExport = useCallback(() => {
    setFailedIds(new Set())
    setExportStatus('idle')
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <Package className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-semibold text-slate-100 tracking-wide">
          库存明细
        </h2>
        {warehouse && (
          <span className="px-2 py-0.5 text-xs rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            {warehouse}
          </span>
        )}
        <span className="text-xs text-slate-500">
          {visibleSkus.length} / {filteredSkus.length} 条
        </span>
        <div className="ml-auto flex items-center gap-2">
          {failedCount > 0 && exportStatus !== 'exporting' && (
            <button
              onClick={retryExport}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all duration-200"
            >
              <RotateCw className="w-3 h-3" />
              重试 ({failedCount})
            </button>
          )}
          <button
            onClick={exportToCSV}
            disabled={exportStatus === 'exporting' || visibleSkus.length === 0}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
              ${exportStatus === 'exporting' ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : ''}
              ${exportStatus === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : ''}
              ${exportStatus === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : ''}
              ${exportStatus === 'idle' && visibleSkus.length > 0 ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20' : ''}
              ${exportStatus === 'idle' && visibleSkus.length === 0 ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : ''}
            `}
          >
            {exportStatus === 'exporting' && <Download className="w-4 h-4 animate-pulse" />}
            {exportStatus === 'success' && <Check className="w-4 h-4" />}
            {exportStatus === 'error' && <X className="w-4 h-4" />}
            {exportStatus === 'idle' && <Download className="w-4 h-4" />}
            {exportStatus === 'exporting'
              ? '导出中...'
              : exportStatus === 'success'
                ? '导出成功'
                : exportStatus === 'error'
                  ? '导出失败'
                  : '导出 CSV'}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto rounded-xl border border-slate-700/50">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-800/90 backdrop-blur text-slate-400">
              <th className="text-left py-2.5 px-4 font-medium">SKU</th>
              <th className="text-left py-2.5 px-4 font-medium">品名</th>
              <th className="text-left py-2.5 px-4 font-medium">仓库</th>
              <th className="text-right py-2.5 px-4 font-medium">库存</th>
              <th className="text-right py-2.5 px-4 font-medium">阈值</th>
              <th className="text-center py-2.5 px-4 font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {visibleSkus.map((sku, i) => {
              const isLow = sku.stock < sku.threshold
              const isFailed = failedIds.has(sku.id)
              return (
                <tr
                  key={sku.id}
                  className={`
                    border-t transition-colors duration-300
                    ${isFailed ? 'bg-red-500/15 hover:bg-red-500/25 border-red-500/30' : 'border-slate-700/30'}
                    ${!isFailed && isLow ? 'bg-amber-500/10 hover:bg-amber-500/20' : ''}
                    ${!isFailed && !isLow && i % 2 === 0 ? 'bg-slate-900/30 hover:bg-slate-800/40' : ''}
                    ${!isFailed && !isLow && i % 2 !== 0 ? 'hover:bg-slate-800/40' : ''}
                  `}
                >
                  <td className="py-2.5 px-4 font-mono text-slate-300 text-xs">
                    {sku.id}
                    {isFailed && <X className="inline w-3 h-3 ml-1.5 text-red-400" />}
                  </td>
                  <td className="py-2.5 px-4 text-slate-200">{sku.name}</td>
                  <td className="py-2.5 px-4 text-slate-400">{sku.warehouse}</td>
                  <td
                    className={`py-2.5 px-4 text-right font-mono font-semibold ${
                      isFailed ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {sku.stock}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                    {sku.threshold}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {isFailed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                        <X className="w-3 h-3" />
                        导出失败
                      </span>
                    ) : isLow ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <AlertTriangle className="w-3 h-3" />
                        低库存
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        正常
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
            {visibleSkus.length === 0 && filteredSkus.length > 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500 text-sm">
                  <Check className="w-5 h-5 mx-auto mb-2 text-emerald-400" />
                  全部条目已导出
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
