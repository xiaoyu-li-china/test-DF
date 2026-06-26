import { useMemo, useState } from 'react'
import { useInventoryStore } from '@/store/useInventoryStore'
import { useWarehouseFilter } from '@/hooks/useWarehouseFilter'
import { AlertTriangle, Package, Download, Check, X } from 'lucide-react'

export default function StockTable() {
  const allSkus = useInventoryStore((s) => s.skus)
  const warehouse = useWarehouseFilter()
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle')
  const [exportedIds, setExportedIds] = useState<Set<string>>(new Set())
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set())

  const skus = useMemo(() => {
    if (!warehouse) return allSkus
    return allSkus.filter((s) => s.warehouse === warehouse)
  }, [allSkus, warehouse])

  const exportToCSV = async () => {
    setExportStatus('exporting')
    
    const data = skus
      .filter((s) => !exportedIds.has(s.id))
      .map((s) => ({
        SKU: s.id,
        品名: s.name,
        仓库: s.warehouse,
        库存: s.stock,
        阈值: s.threshold,
        状态: s.stock < s.threshold ? '低库存' : '正常',
      }))

    if (data.length === 0) {
      setExportStatus('error')
      setTimeout(() => setExportStatus('idle'), 2000)
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 800))

    const willFail = Math.random() < 0.3
    if (willFail) {
      setExportStatus('error')
      const failed = new Set(skus.filter((s) => !exportedIds.has(s.id)).map((s) => s.id))
      setFailedIds(failed)
      setTimeout(() => {
        setExportStatus('idle')
      }, 3000)
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
    skus.forEach((s) => newExported.add(s.id))
    setExportedIds(newExported)
    setFailedIds(new Set())
    setExportStatus('success')
    setTimeout(() => setExportStatus('idle'), 2000)
  }

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
        <button
          onClick={exportToCSV}
          disabled={exportStatus === 'exporting'}
          className={`
            ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
            ${exportStatus === 'exporting' ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : ''}
            ${exportStatus === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : ''}
            ${exportStatus === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : ''}
            ${exportStatus === 'idle' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20' : ''}
          `}
        >
          {exportStatus === 'exporting' && <Download className="w-4 h-4 animate-pulse" />}
          {exportStatus === 'success' && <Check className="w-4 h-4" />}
          {exportStatus === 'error' && <X className="w-4 h-4" />}
          {exportStatus === 'idle' && <Download className="w-4 h-4" />}
          {exportStatus === 'exporting' ? '导出中...' : exportStatus === 'success' ? '导出成功' : exportStatus === 'error' ? '导出失败' : '导出 CSV'}
        </button>
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
            {skus.map((sku, i) => {
              const isLow = sku.stock < sku.threshold
              const isFailed = failedIds.has(sku.id)
              const isExported = exportedIds.has(sku.id)
              return (
                <tr
                  key={sku.id}
                  className={`
                    border-t border-slate-700/30 transition-colors duration-300
                    ${isFailed ? 'bg-red-500/15 hover:bg-red-500/25 border-red-500/30' : ''}
                    ${!isFailed && isLow ? 'bg-amber-500/10 hover:bg-amber-500/20' : ''}
                    ${!isFailed && !isLow && i % 2 === 0 ? 'bg-slate-900/30 hover:bg-slate-800/40' : ''}
                    ${!isFailed && !isLow && i % 2 !== 0 ? 'hover:bg-slate-800/40' : ''}
                    ${isExported ? 'opacity-40' : ''}
                  `}
                >
                  <td className="py-2.5 px-4 font-mono text-slate-300 text-xs">
                    {sku.id}
                  </td>
                  <td className="py-2.5 px-4 text-slate-200">{sku.name}</td>
                  <td className="py-2.5 px-4 text-slate-400">{sku.warehouse}</td>
                  <td
                    className={`py-2.5 px-4 text-right font-mono font-semibold ${
                      isLow ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {sku.stock}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                    {sku.threshold}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {isLow ? (
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
          </tbody>
        </table>
      </div>
    </div>
  )
}
