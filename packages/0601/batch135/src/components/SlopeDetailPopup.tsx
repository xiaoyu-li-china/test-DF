import { X, Clock, CableCar, Mountain, TrendingUp } from "lucide-react";
import type { SlopeData } from "@/utils/congestionColor";
import { getCongestionColor, getDifficultyLabel, getCongestionLabel } from "@/utils/congestionColor";

interface SlopeDetailPopupProps {
  slope: SlopeData;
  currentTimeIndex: number;
  onClose: () => void;
}

function getLiftTypeLabel(type: string): string {
  switch (type) {
    case "chairlift":
      return "吊椅";
    case "gondola":
      return "缆车";
    case "t-bar":
      return "拖牵";
    default:
      return "未知";
  }
}

function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case "beginner":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "intermediate":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "advanced":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    default:
      return "bg-gray-500/20 text-gray-400";
  }
}

export default function SlopeDetailPopup({ slope, currentTimeIndex, onClose }: SlopeDetailPopupProps) {
  const congestion = slope.history[currentTimeIndex]?.congestion ?? slope.congestion;
  const color = getCongestionColor(congestion);
  const colorHex = `#${color.getHexString()}`;

  return (
    <div
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-80
        bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl
        shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden"
    >
      <div
        className="h-2"
        style={{
          backgroundColor: colorHex,
          boxShadow: `0 0 16px ${colorHex}60`,
        }}
      />

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">{slope.name}</h3>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${getDifficultyColor(
                  slope.difficulty
                )}`}
              >
                {getDifficultyLabel(slope.difficulty)}
              </span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                style={{
                  backgroundColor: `${colorHex}20`,
                  color: colorHex,
                  border: `1px solid ${colorHex}40`,
                }}
              >
                {getCongestionLabel(congestion)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white
              transition-all duration-200 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white/5 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-white/40 text-[10px] mb-1">
              <TrendingUp size={10} />
              拥挤度
            </div>
            <div className="text-2xl font-bold" style={{ color: colorHex }}>
              {congestion}%
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-white/40 text-[10px] mb-1">
              <Clock size={10} />
              等待时间
            </div>
            <div className="text-2xl font-bold text-white/90">
              {slope.waitTime}<span className="text-sm text-white/50 ml-1">分钟</span>
            </div>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-3 mb-4">
          <div className="flex items-center gap-1.5 text-white/40 text-[10px] mb-2">
            <CableCar size={10} />
            缆车信息
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white/90 text-sm font-medium">{slope.lift.name}</div>
              <div className="text-white/40 text-xs">
                {getLiftTypeLabel(slope.lift.type)} · {slope.lift.capacity}人/次
              </div>
            </div>
            <Mountain size={20} className="text-cyan-400" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/40 text-[10px]">今日趋势</span>
            <span className="text-white/30 text-[10px]">{slope.history[0].time} - {slope.history[slope.history.length - 1].time}</span>
          </div>
          <div className="h-14 bg-white/5 rounded-lg p-2 flex items-end gap-0.5">
            {slope.history.map((h, i) => {
              const c = getCongestionColor(h.congestion);
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t transition-all duration-500"
                  style={{
                    height: `${Math.max(10, h.congestion)}%`,
                    backgroundColor: `#${c.getHexString()}`,
                    opacity: i === currentTimeIndex ? 1 : 0.4,
                    boxShadow: i === currentTimeIndex ? `0 0 8px #${c.getHexString()}` : "none",
                  }}
                  title={`${h.time}: ${h.congestion}%`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
