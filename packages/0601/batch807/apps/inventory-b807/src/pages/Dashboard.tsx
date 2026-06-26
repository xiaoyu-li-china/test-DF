import { useEffect, useState } from 'react';
import { Warehouse, Filter } from 'lucide-react';
import { useInventoryStore } from '../store/useInventoryStore';
import { useMockWebSocket } from '../hooks/useMockWebSocket';
import { StockTable } from '../components/StockTable';
import { AlertPanel } from '../components/AlertPanel';
import { TrendChart } from '../components/TrendChart';
import type { Warehouse as WarehouseType } from '../types';

const warehouses: WarehouseType[] = ['A仓', 'B仓', 'C仓', 'D仓'];

export function Dashboard() {
  const { items, isConnected, lastUpdateTime, historyData } = useInventoryStore();
  const [warehouseFilter, setWarehouseFilter] = useState<string | undefined>();

  useMockWebSocket();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const warehouseParam = params.get('warehouse');
    if (warehouseParam) {
      setWarehouseFilter(decodeURIComponent(warehouseParam));
    }
  }, []);

  const handleWarehouseChange = (warehouse: string | undefined) => {
    setWarehouseFilter(warehouse);
    const url = new URL(window.location.href);
    if (warehouse) {
      url.searchParams.set('warehouse', warehouse);
    } else {
      url.searchParams.delete('warehouse');
    }
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <div className="min-h-screen p-6">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Warehouse className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">库存预警大屏</h1>
              <p className="text-slate-400 text-sm">实时监控库存状态与预警信息</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-slate-400">
              <Filter className="w-4 h-4" />
              <span className="text-sm">仓库筛选:</span>
            </div>
            <select
              value={warehouseFilter || ''}
              onChange={(e) =>
                handleWarehouseChange(e.target.value || undefined)
              }
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="">全部仓库</option>
              {warehouses.map((wh) => (
                <option key={wh} value={wh}>
                  {wh}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <TrendChart historyData={historyData} warehouseFilter={warehouseFilter} />
          <StockTable items={items} warehouseFilter={warehouseFilter} />
        </div>
        <div className="lg:col-span-1">
          <AlertPanel
            items={items}
            isConnected={isConnected}
            lastUpdateTime={lastUpdateTime}
            warehouseFilter={warehouseFilter}
          />
        </div>
      </div>

      <footer className="mt-8 text-center text-slate-500 text-sm">
        <p>数据每 8 秒自动更新 | 模拟 WebSocket 实时推送</p>
      </footer>
    </div>
  );
}
