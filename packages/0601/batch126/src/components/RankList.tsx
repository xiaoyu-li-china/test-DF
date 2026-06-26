import { useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { usePriceStore } from '../store/usePriceStore';

export function RankList() {
  const { records, setSelectedCategory } = usePriceStore();

  const { topGainers, topLosers, abnormalCount } = useMemo(() => {
    const sorted = [...records].sort((a, b) => b.change - a.change);
    return {
      topGainers: sorted.filter((r) => r.change > 0).slice(0, 5),
      topLosers: sorted.filter((r) => r.change < 0).slice(-5).reverse(),
      abnormalCount: records.filter((r) => r.isAbnormal).length,
    };
  }, [records]);

  const getRankStyle = (index: number) => {
    const styles = [
      'bg-gradient-to-r from-yellow-500 to-yellow-400 text-yellow-900',
      'bg-gradient-to-r from-gray-400 to-gray-300 text-gray-700',
      'bg-gradient-to-r from-amber-600 to-amber-500 text-amber-100',
    ];
    return styles[index] || 'bg-gray-600 text-gray-200';
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {abnormalCount > 0 && (
        <div className="bg-red-900 bg-opacity-40 border border-red-500 border-opacity-50 rounded-xl p-4 flex items-center gap-3 animate-pulse">
          <AlertTriangle className="w-6 h-6 text-red-400" />
          <div>
            <div className="text-red-300 font-bold text-lg">⚠️ 异常波动预警</div>
            <div className="text-red-200 text-sm">
              今日共 <span className="text-red-400 font-bold text-xl">{abnormalCount}</span> 个品种日环比超20%，请注意核查！
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 flex-1">
        <div className="bg-gray-900 rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-red-500 bg-opacity-20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white">涨幅榜 TOP5</h2>
          </div>

          <div className="flex-1 space-y-3">
            {topGainers.map((record, index) => (
              <div
                key={record.id}
                onClick={() => setSelectedCategory(record.category)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors ${
                  record.isAbnormal ? 'bg-red-900 bg-opacity-20 ring-1 ring-red-500 ring-opacity-40' : 'bg-gray-800'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getRankStyle(
                    index
                  )}`}
                >
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium flex items-center gap-1">
                    <span className="text-lg">{record.categoryIcon}</span>
                    {record.category}
                    {record.isAbnormal && (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {record.stallNumber} · ¥{record.price.toFixed(2)}
                  </div>
                </div>
                <div className={`font-bold text-xl ${record.isAbnormal ? 'text-red-500 animate-pulse' : 'text-red-400'}`}>
                  +{record.change.toFixed(1)}%
                </div>
              </div>
            ))}
            {topGainers.length === 0 && (
              <div className="text-gray-500 text-center py-8">暂无上涨品种</div>
            )}
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-green-500 bg-opacity-20 rounded-lg">
              <TrendingDown className="w-6 h-6 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white">跌幅榜 TOP5</h2>
          </div>

          <div className="flex-1 space-y-3">
            {topLosers.map((record, index) => (
              <div
                key={record.id}
                onClick={() => setSelectedCategory(record.category)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors ${
                  record.isAbnormal ? 'bg-red-900 bg-opacity-20 ring-1 ring-red-500 ring-opacity-40' : 'bg-gray-800'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getRankStyle(
                    index
                )}`}
                >
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium flex items-center gap-1">
                    <span className="text-lg">{record.categoryIcon}</span>
                    {record.category}
                    {record.isAbnormal && (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {record.stallNumber} · ¥{record.price.toFixed(2)}
                  </div>
                </div>
                <div className={`font-bold text-xl ${record.isAbnormal ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
                  {record.change.toFixed(1)}%
                </div>
              </div>
            ))}
            {topLosers.length === 0 && (
              <div className="text-gray-500 text-center py-8">暂无下跌品种</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
