import { useRef, useEffect, useState } from 'react';
import { Pause, Play, AlertTriangle } from 'lucide-react';
import { usePriceStore } from '../store/usePriceStore';

export function PriceScroll() {
  const { records, isScrolling, toggleScrolling, setSelectedCategory, selectedCategory } = usePriceStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const itemsPerPage = 8;
  const totalPages = Math.ceil(records.length / itemsPerPage);

  useEffect(() => {
    if (!isScrolling || totalPages <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalPages);
    }, 5000);

    return () => clearInterval(timer);
  }, [isScrolling, totalPages]);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollHeight = scrollRef.current.scrollHeight / totalPages;
      scrollRef.current.scrollTo({
        top: currentIndex * scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [currentIndex, totalPages]);

  const visibleRecords = records.slice(0, 20);

  return (
    <div className="bg-gray-900 rounded-xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="text-3xl">📋</span>
          今日菜价
        </h2>
        <button
          onClick={toggleScrolling}
          className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
        >
          {isScrolling ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3 text-gray-400 text-sm font-semibold px-2">
        <span>摊位</span>
        <span>品类</span>
        <span>价格</span>
        <span>涨跌</span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-hidden"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="space-y-2">
          {visibleRecords.map((record) => (
            <div
              key={record.id}
              onClick={() => setSelectedCategory(record.category)}
              className={`grid grid-cols-4 gap-2 p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-700 relative ${
                selectedCategory === record.category
                  ? 'bg-green-800 bg-opacity-40 ring-2 ring-green-500'
                  : record.isAbnormal
                  ? 'bg-red-900 bg-opacity-20 ring-1 ring-red-500 ring-opacity-50'
                  : 'bg-gray-800'
              }`}
            >
              <span className="text-gray-300 font-mono text-lg">
                {record.stallNumber}
              </span>
              <span className="text-white font-medium flex items-center gap-1">
                <span className="text-xl">{record.categoryIcon}</span>
                {record.category}
                {record.isAbnormal && (
                  <AlertTriangle className="w-4 h-4 text-red-400 ml-1" />
                )}
              </span>
              <span className="text-yellow-400 font-bold text-xl">
                ¥{record.price.toFixed(2)}
              </span>
              <span
                className={`font-bold text-lg ${
                  record.isAbnormal
                    ? 'text-red-500 animate-pulse'
                    : record.change >= 0
                    ? 'text-red-400'
                    : 'text-green-400'
                }`}
              >
                {record.change >= 0 ? '↑' : '↓'}
                {Math.abs(record.change).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-1">
        {Array.from({ length: totalPages }).map((_, idx) => (
          <div
            key={idx}
            className={`w-2 h-2 rounded-full transition-colors ${
              idx === currentIndex ? 'bg-green-500' : 'bg-gray-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
