import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { TrendingUp } from 'lucide-react';
import type { EChartsOption } from 'echarts';
import type { SKUItem } from '../types';

interface TrendChartProps {
  historyData: { timestamp: string; items: SKUItem[] }[];
  warehouseFilter?: string;
}

export function TrendChart({ historyData, warehouseFilter }: TrendChartProps) {
  const chartOption = useMemo((): EChartsOption => {
    const filteredHistory = historyData.map((record) => {
      if (!warehouseFilter) return record;
      return {
        ...record,
        items: record.items.filter((item) => item.warehouse === warehouseFilter),
      };
    });

    const timestamps = filteredHistory.map((record) => {
      const date = new Date(record.timestamp);
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    });

    const totalQuantity = filteredHistory.map(
      (record) =>
        record.items.reduce((sum, item) => sum + item.quantity, 0)
    );

    const lowStockCount = filteredHistory.map(
      (record) =>
        record.items.filter((item) => item.quantity <= item.threshold).length
    );

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: 'rgba(100, 116, 139, 0.5)',
        textStyle: {
          color: '#e2e8f0',
        },
      },
      legend: {
        data: ['库存总量', '预警数量'],
        textStyle: {
          color: '#94a3b8',
        },
        top: 10,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: 60,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: timestamps,
        axisLine: {
          lineStyle: {
            color: '#475569',
          },
        },
        axisLabel: {
          color: '#64748b',
          fontSize: 10,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: '库存总量',
          nameTextStyle: {
            color: '#64748b',
          },
          axisLine: {
            lineStyle: {
              color: '#475569',
            },
          },
          axisLabel: {
            color: '#64748b',
          },
          splitLine: {
            lineStyle: {
              color: 'rgba(71, 85, 105, 0.3)',
            },
          },
        },
        {
          type: 'value',
          name: '预警数量',
          nameTextStyle: {
            color: '#64748b',
          },
          axisLine: {
            lineStyle: {
              color: '#475569',
            },
          },
          axisLabel: {
            color: '#64748b',
          },
          splitLine: {
            show: false,
          },
        },
      ],
      series: [
        {
          name: '库存总量',
          type: 'line',
          smooth: true,
          data: totalQuantity,
          lineStyle: {
            color: '#22d3ee',
            width: 2,
          },
          areaStyle: {
            color: {
              type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: 'rgba(34, 211, 238, 0.3)',
              },
              {
                offset: 1,
                color: 'rgba(34, 211, 238, 0)',
              },
            ],
          },
          },
          itemStyle: {
            color: '#22d3ee',
          },
        },
        {
          name: '预警数量',
          type: 'line',
          smooth: true,
          yAxisIndex: 1,
          data: lowStockCount,
          lineStyle: {
            color: '#f87171',
            width: 2,
          },
          itemStyle: {
            color: '#f87171',
          },
        },
      ],
    };
  }, [historyData, warehouseFilter]);

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="p-4 border-b border-slate-700/50">
        <h3 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          库存趋势
        </h3>
      </div>
      <div className="p-4">
        <ReactECharts
          option={chartOption}
          style={{ height: '300px' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
    </div>
  );
}
