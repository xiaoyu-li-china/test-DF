import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import { Waves, Zap } from "lucide-react";
import type { DailyTide } from "@/types/tide";
import { useTideStore } from "@/store/useTideStore";
import {
  convertToChartData,
  X_AXIS_CONFIG,
  getYAxisConfig,
  type ChartPoint,
} from "@/utils/chartDataConverter";

interface Props {
  dailyTide: DailyTide;
}

export function TideChart({ dailyTide }: Props) {
  const { chartMode, setChartMode } = useTideStore();

  const chartData = useMemo(
    () => convertToChartData(dailyTide),
    [dailyTide]
  );

  const yAxisConfig = useMemo(
    () => getYAxisConfig(chartData, chartMode),
    [chartData, chartMode]
  );

  const eventPoints = useMemo(
    () =>
      chartData.filter(
        (p): p is ChartPoint & { isEvent: "high" | "low"; eventTime: string } =>
          p.isEvent !== null
      ),
    [chartData]
  );

  const getGradientColors = () => {
    if (chartMode === "height") {
      return {
        start: "#0B3D6B",
        end: "rgba(11, 61, 107, 0.1)",
        stroke: "#0B3D6B",
      };
    }
    return {
      start: "#00B4D8",
      end: "rgba(0, 180, 216, 0.15)",
      stroke: "#00B4D8",
    };
  };

  const colors = getGradientColors();
  const yAxisLabel = chartMode === "height" ? "潮高 (cm)" : "流速 (m/s)";

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: { payload: ChartPoint }[];
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const point = payload[0].payload;

    return (
      <div className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-ocean-100">
        <div className="text-sm font-medium text-ocean-800">{point.timeLabel}</div>
        <div className="text-xs text-ocean-600">
          {chartMode === "height" ? (
            <>潮高: {point.height.toFixed(0)} cm</>
          ) : (
            <>流速: {point.current.toFixed(2)} m/s</>
          )}
        </div>
        {point.isEvent && (
          <div
            className={`text-xs font-bold mt-1 ${
              point.isEvent === "high" ? "text-coral-500" : "text-tide-500"
            }`}
          >
            {point.isEvent === "high" ? "▲ 高潮" : "▼ 低潮"} {point.eventTime}
            {point.isNextDay && " (次日)"}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4 text-ocean-500" />
          <h3 className="font-serif font-bold text-ocean-800">
            {chartMode === "height" ? "潮高曲线" : "潮流速度曲线"}
          </h3>
        </div>

        <div className="flex p-0.5 bg-ocean-50 rounded-full">
          <button
            onClick={() => setChartMode("height")}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
              transition-all duration-200
              ${
                chartMode === "height"
                  ? "bg-ocean-700 text-white shadow-md"
                  : "text-ocean-600 hover:bg-ocean-100"
              }
            `}
          >
            <Waves className="w-4 h-4" />
            潮高
          </button>
          <button
            onClick={() => setChartMode("current")}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
              transition-all duration-200
              ${
                chartMode === "current"
                  ? "bg-tide-500 text-white shadow-md"
                  : "text-ocean-600 hover:bg-ocean-100"
              }
            `}
          >
            <Zap className="w-4 h-4" />
            潮流
          </button>
        </div>
      </div>

      <div className="bg-sand-50/50 rounded-xl p-3 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="tideGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.start} stopOpacity={0.8} />
                <stop offset="95%" stopColor={colors.end} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e0e7ff"
              vertical={true}
              horizontal={true}
            />

            <XAxis
              {...X_AXIS_CONFIG}
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={{ stroke: "#cbd5e1" }}
              tickLine={{ stroke: "#cbd5e1" }}
            />

            <YAxis
              {...yAxisConfig}
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={{ stroke: "#cbd5e1" }}
              tickLine={{ stroke: "#cbd5e1" }}
              label={{
                value: yAxisLabel,
                angle: -90,
                position: "insideLeft",
                style: { fill: "#64748b", fontSize: 11 },
              }}
              width={45}
            />

            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey={chartMode === "height" ? "height" : "current"}
              stroke={colors.stroke}
              strokeWidth={2.5}
              fill="url(#tideGradient)"
              dot={false}
              activeDot={{ r: 6, fill: colors.stroke, stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive={true}
              animationDuration={600}
            />

            {eventPoints.map((point, i) => (
              <ReferenceDot
                key={i}
                x={point.timeValue}
                y={chartMode === "height" ? point.height : point.current}
                r={5}
                fill={point.isEvent === "high" ? "#FF6B35" : "#00B4D8"}
                stroke="#fff"
                strokeWidth={2}
                opacity={point.isNextDay ? 0.6 : 1}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-6 text-xs text-ocean-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-coral-400 border-2 border-white shadow" />
          <span>高潮</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-tide-400 border-2 border-white shadow" />
          <span>低潮</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-ocean-300/50 border-2 border-white shadow" />
          <span>次日极值</span>
        </div>
      </div>
    </div>
  );
}
