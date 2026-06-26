import { getCongestionColor, getCongestionLabel, getDifficultyLabel } from "@/utils/congestionColor";
import type { SlopeData } from "@/utils/congestionColor";
import { RefreshCw, MountainSnow } from "lucide-react";
import { useState } from "react";

interface InfoPanelProps {
  slopes: SlopeData[];
  selectedSlopeId: string | null;
  lastUpdate: string;
  timeIndex: number;
  onRefresh: () => void;
  onSlopeSelect: (id: string | null) => void;
}

export default function InfoPanel({
  slopes,
  selectedSlopeId,
  lastUpdate,
  timeIndex,
  onRefresh,
  onSlopeSelect,
}: InfoPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1.5 px-2 py-4 rounded-xl
          bg-white/10 backdrop-blur-xl border border-white/20 text-white/90
          hover:bg-white/20 transition-all duration-300 cursor-pointer"
      >
        <MountainSnow size={18} />
        <span className="text-[10px] font-medium writing-vertical">雪道信息</span>
      </button>
    );
  }

  return (
    <div
      className="fixed left-4 top-1/2 -translate-y-1/2 z-20 w-72 max-h-[70vh] flex flex-col
        bg-white/8 backdrop-blur-2xl border border-white/15 rounded-2xl
        shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-hidden"
    >
      <div className="px-4 pt-4 pb-2.5 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MountainSnow size={18} className="text-cyan-300" />
            <h2 className="text-base font-bold text-white tracking-wide" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              冰雪雪场
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white
                transition-all duration-200 cursor-pointer"
              title="刷新数据"
            >
              <RefreshCw size={13} />
            </button>
            <button
              onClick={() => setCollapsed(true)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white
                transition-all duration-200 cursor-pointer text-[10px]"
            >
              ◀
            </button>
          </div>
        </div>
        <p className="text-[10px] text-white/40 mt-1">实时监控 · {lastUpdate}</p>
      </div>

      <div className="px-4 py-2.5 border-b border-white/10">
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
            <span className="text-white/60">通畅</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
            <span className="text-white/60">较拥挤</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
            <span className="text-white/60">拥挤</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {slopes
          .sort((a, b) => (b.history[timeIndex]?.congestion ?? b.congestion) - (a.history[timeIndex]?.congestion ?? a.congestion))
          .map((slope) => {
            const congestion = slope.history[timeIndex]?.congestion ?? slope.congestion;
            const c = getCongestionColor(congestion);
            const colorHex = `#${c.getHexString()}`;
            const isSelected = selectedSlopeId === slope.id;
            return (
              <div
                key={slope.id}
                onClick={() => onSlopeSelect(isSelected ? null : slope.id)}
                className={`group px-3 py-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? "bg-white/20 border border-cyan-400/40 shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                    : "bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium transition-colors ${isSelected ? "text-cyan-300" : "text-white/90"}`}>
                    {slope.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-md font-medium"
                      style={{
                        backgroundColor: `${colorHex}20`,
                        color: colorHex,
                        border: `1px solid ${colorHex}40`,
                      }}
                    >
                      {getDifficultyLabel(slope.difficulty)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${congestion}%`,
                        backgroundColor: colorHex,
                        boxShadow: `0 0 6px ${colorHex}50`,
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-0.5 min-w-[48px] justify-end">
                    <span className="text-xs font-mono font-bold" style={{ color: colorHex }}>
                      {congestion}%
                    </span>
                    <span className="text-[9px] text-white/40">{getCongestionLabel(congestion)}</span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
