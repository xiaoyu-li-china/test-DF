import { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { usePriceStore } from '../store/usePriceStore';

export function PriceChart() {
  const { records, selectedCategory, setSelectedCategory } = usePriceStore();
  const [autoRotateIndex, setAutoRotateIndex] = useState(0);

  const topCategories = useMemo(() => {
    return records.slice(0, 6).map((r) => r.category);
  }, [records]);

  useEffect(() => {
    if (topCategories.length === 0) return;

    const timer = setInterval(() => {
      setAutoRotateIndex((prev) => {
        const nextIndex = (prev + 1) % topCategories.length;
        setSelectedCategory(topCategories[nextIndex]);
        return nextIndex;
      });
    }, 8000);

    return () => clearInterval(timer);
  }, [topCategories, setSelectedCategory]);

  const currentRecord = useMemo(() => {
    return records.find((r) => r.category === selectedCategory);
  }, [records, selectedCategory]);

  const getDateLabels = () => {
    const labels = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
    }
    return labels;
  };

  const option = useMemo(() => {
    if (!currentRecord) {
      return {};
    }

    return {
      backgroundColor: 'transparent',
      title: {
        text: `${currentRecord.categoryIcon} ${currentRecord.category} - 7日均价走势`,
        left: 'center',
        top: 10,
        textStyle: {
          color: '#fff',
          fontSize: 18,
          fontWeight: 'bold',
        },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: '#2E7D32',
        textStyle: {
          color: '#fff',
        },
        formatter: (params: any) => {
          const data = params[0];
          return `<div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 4px;">${data.axisValue}</div>
            <div>均价: <span style="color: #FFD700; font-weight: bold;">¥${data.value.toFixed(2)}</span></div>
          </div>`;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '60px',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: getDateLabels(),
        axisLine: {
          lineStyle: {
            color: '#4B5563',
          },
        },
        axisLabel: {
          color: '#9CA3AF',
          fontSize: 12,
        },
      },
      yAxis: {
        type: 'value',
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: '#9CA3AF',
          formatter: '¥{value}',
        },
        splitLine: {
          lineStyle: {
            color: '#374151',
            type: 'dashed',
          },
        },
      },
      series: [
        {
          name: '均价',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 10,
          lineStyle: {
            width: 3,
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: '#2E7D32' },
                { offset: 1, color: '#4CAF50' },
              ],
            },
          },
          itemStyle: {
            color: '#4CAF50',
            borderColor: '#fff',
            borderWidth: 2,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(76, 175, 80, 0.4)' },
                { offset: 1, color: 'rgba(76, 175, 80, 0.05)' },
              ],
            },
          },
          data: currentRecord.history7Days,
        },
      ],
    };
  }, [currentRecord]);

  return (
    <div className="bg-gray-900 rounded-xl p-6 h-full flex flex-col">
      <div className="flex flex-wrap gap-2 mb-4">
        {topCategories.map((cat, idx) => {
          const record = records.find((r) => r.category === cat);
          return (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setAutoRotateIndex(idx);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {record?.categoryIcon} {cat}
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0">
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>

      {currentRecord && (
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-gray-400 text-sm">今日价格</div>
            <div className="text-yellow-400 text-2xl font-bold">
              ¥{currentRecord.price.toFixed(2)}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-gray-400 text-sm">昨日价格</div>
            <div className="text-white text-2xl font-bold">
              ¥{currentRecord.yesterdayPrice.toFixed(2)}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-gray-400 text-sm">涨跌幅</div>
            <div
              className={`text-2xl font-bold ${
                currentRecord.change >= 0 ? 'text-red-400' : 'text-green-400'
              }`}
            >
              {currentRecord.change >= 0 ? '↑' : '↓'}
              {Math.abs(currentRecord.change).toFixed(2)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
