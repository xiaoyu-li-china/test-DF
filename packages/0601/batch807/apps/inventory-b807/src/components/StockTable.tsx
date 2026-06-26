import { useMemo, useState, useCallback } from 'react';
import { AlertTriangle, Download, Loader2, CheckCircle, XCircle } from 'lucide-react';
import type { SKUItem } from '../types';
import { exportToCSV } from '../utils/csvExport';

interface StockTableProps {
  items: SKUItem[];
  warehouseFilter?: string;
}

interface ExportEntry {
  id: string;
  item: SKUItem;
  status: 'pending' | 'success' | 'failed';
}

export function StockTable({ items, warehouseFilter }: StockTableProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportEntries, setExportEntries] = useState<ExportEntry[]>([]);

  const filteredItems = useMemo(() => {
    if (!warehouseFilter) return items;
    return items.filter((item) => item.warehouse === warehouseFilter);
  }, [items, warehouseFilter]);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    const newEntries: ExportEntry[] = filteredItems.map((item) => ({
      id: `export-${item.id}-${Date.now()}`,
      item,
      status: 'pending' as const,
    }));
    setExportEntries(newEntries);

    try {
      const result = await exportToCSV(items, warehouseFilter);

      setExportEntries((prev) =>
        prev.map((entry) => {
          if (result.successIds.includes(entry.item.id)) {
            return { ...entry, status: 'success' as const };
          }
          if (result.failedIds.includes(entry.item.id)) {
            return { ...entry, status: 'failed' as const };
          }
          return entry;
        })
      );

      setTimeout(() => {
        setExportEntries((prev) => prev.filter((e) => e.status !== 'success'));
      }, 2000);
    } catch {
      setExportEntries((prev) =>
        prev.map((entry) => ({ ...entry, status: 'failed' as const }))
      );
    } finally {
      setIsExporting(false);
    }
  }, [filteredItems, items, warehouseFilter]);

  const failedExportItems = useMemo(
    () => exportEntries.filter((e) => e.status === 'failed'),
    [exportEntries]
  );

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
          <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
          库存明细
          <span className="text-sm font-normal text-slate-400 ml-2">
            ({filteredItems.length} 条)
          </span>
        </h3>
        <button
          onClick={handleExport}
          disabled={isExporting || filteredItems.length === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            isExporting
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-cyan-600 hover:bg-cyan-500 text-white active:scale-95'
          }`}
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              导出中...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              导出 CSV
            </>
          )}
        </button>
      </div>

      {failedExportItems.length > 0 && (
        <div className="p-3 bg-red-900/30 border-b border-red-700/30">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-red-400">
              导出失败 ({failedExportItems.length} 条)
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {failedExportItems.map((entry) => (
              <span
                key={entry.id}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-red-900/50 border border-red-700/50 text-red-300"
              >
                <XCircle className="w-3 h-3" />
                {entry.item.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-auto max-h-96">
        <table className="w-full">
          <thead className="bg-slate-900/50 sticky top-0">
            <tr className="text-sm text-slate-400">
              <th className="px-4 py-3 text-left font-medium">SKU</th>
              <th className="px-4 py-3 text-left font-medium">商品名称</th>
              <th className="px-4 py-3 text-left font-medium">仓库</th>
              <th className="px-4 py-3 text-center font-medium">分类</th>
              <th className="px-4 py-3 text-right font-medium">库存</th>
              <th className="px-4 py-3 text-right font-medium">阈值</th>
              <th className="px-4 py-3 text-center font-medium">更新时间</th>
              <th className="px-4 py-3 text-center font-medium">导出</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => {
              const isLowStock = item.quantity <= item.threshold;
              const exportEntry = exportEntries.find(
                (e) => e.item.id === item.id
              );
              const exportStatus = exportEntry?.status;

              return (
                <tr
                  key={item.id}
                  className="border-b border-slate-700/30 transition-colors hover:bg-slate-700/30"
                  style={
                    exportStatus === 'failed'
                      ? { backgroundColor: 'rgba(239, 68, 68, 0.25)' }
                      : isLowStock
                        ? { backgroundColor: 'rgba(239, 68, 68, 0.15)' }
                        : {}
                  }
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-slate-300">
                      {item.sku}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isLowStock && (
                        <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                      )}
                      <span
                        className={`font-medium ${
                          isLowStock ? 'text-red-400' : 'text-slate-200'
                        }`}
                      >
                        {item.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs rounded-full bg-slate-700 text-slate-300">
                      {item.warehouse}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-400 text-sm">
                    {item.category}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-bold ${
                      isLowStock ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-400">
                    {item.threshold}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500 text-xs">
                    {formatTime(item.lastUpdated)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {exportStatus === 'pending' && (
                      <Loader2 className="w-4 h-4 text-cyan-400 animate-spin mx-auto" />
                    )}
                    {exportStatus === 'success' && (
                      <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto" />
                    )}
                    {exportStatus === 'failed' && (
                      <XCircle className="w-4 h-4 text-red-400 mx-auto" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
