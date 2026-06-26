import { useMemo } from 'react';
import { AlertTriangle, Wifi, WifiOff, Clock, Package } from 'lucide-react';
import type { SKUItem } from '../types';

interface AlertPanelProps {
  items: SKUItem[];
  isConnected: boolean;
  lastUpdateTime: string | null;
  warehouseFilter?: string;
}

export function AlertPanel({
  items,
  isConnected,
  lastUpdateTime,
  warehouseFilter,
}: AlertPanelProps) {
  const filteredItems = useMemo(() => {
    if (!warehouseFilter) return items;
    return items.filter((item) => item.warehouse === warehouseFilter);
  }, [items, warehouseFilter]);

  const lowStockItems = useMemo(() => {
    return filteredItems.filter((item) => item.quantity <= item.threshold);
  }, [filteredItems]);

  const totalItems = filteredItems.length;
  const totalQuantity = filteredItems.reduce((sum, item) => sum + item.quantity, 0);

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--';
    const date = new Date(isoString);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div
        className={`backdrop-blur-sm rounded-xl border p-4 transition-all ${
          isConnected
            ? 'bg-emerald-900/30 border-emerald-700/50'
            : 'bg-red-900/50 border-red-700/50 animate-pulse'
        }`}
      >
        <div className="flex items-center gap-3">
          {isConnected ? (
            <Wifi className="w-6 h-6 text-emerald-400" />
          ) : (
            <WifiOff className="w-6 h-6 text-red-400" />
          )}
          <div>
            <p
              className={`font-bold text-lg ${
                isConnected ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {isConnected ? '数据连接正常' : '数据中断'}
            </p>
            <p className="text-sm text-slate-400">
              {isConnected ? '实时接收库存数据' : '正在尝试重新连接...'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-slate-400">SKU 总数</span>
          </div>
          <p className="text-3xl font-bold text-blue-400">{totalItems}</p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <span className="text-sm text-slate-400">更新时间</span>
          </div>
          <p className="text-xl font-bold text-cyan-400">
            {formatTime(lastUpdateTime)}
          </p>
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-orange-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            库存预警
          </h3>
          <span
            className={`px-3 py-1 rounded-full text-sm font-bold ${
              lowStockItems.length > 0
                ? 'bg-red-900/50 text-red-400'
                : 'bg-emerald-900/50 text-emerald-400'
            }`}
          >
            {lowStockItems.length} 项
          </span>
        </div>
        <div className="max-h-64 overflow-auto">
          {lowStockItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>暂无库存预警</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/30">
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-200">
                      {item.name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {item.warehouse}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-mono">
                      {item.sku}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 font-bold">
                        {item.quantity}
                      </span>
                      <span className="text-slate-500">/</span>
                      <span className="text-slate-400">{item.threshold}</span>
                    </div>
                  </div>
                  <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          (item.quantity / Math.max(1, item.threshold)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-5 h-5 text-purple-400" />
          <span className="text-sm text-slate-400">库存总量统计</span>
        </div>
        <p className="text-3xl font-bold text-purple-400">
          {totalQuantity.toLocaleString()}
        </p>
        <p className="text-sm text-slate-500 mt-1">件商品</p>
      </div>
    </div>
  );
}
