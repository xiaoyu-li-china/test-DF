import { useState, useEffect, useCallback, useMemo } from "react";
import Scene from "@/components/Scene";
import InfoPanel from "@/components/InfoPanel";
import TimelineSlider from "@/components/TimelineSlider";
import SlopeDetailPopup from "@/components/SlopeDetailPopup";
import slopesData from "@/data/slopes.json";
import {
  getSlopesAtTime,
  getSlopeById,
  getTimeLabels,
  simulateCongestionUpdate,
} from "@/utils/slopeDataUtils";
import type { SlopeData } from "@/utils/slopeSchema";

function formatTime(d: Date): string {
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function Home() {
  const baseSlopes = useMemo(() => slopesData as SlopeData[], []);
  const timeLabels = useMemo(() => getTimeLabels(baseSlopes), [baseSlopes]);

  const [slopes, setSlopes] = useState<SlopeData[]>(baseSlopes);
  const [selectedSlopeId, setSelectedSlopeId] = useState<string | null>(null);
  const [timeIndex, setTimeIndex] = useState(timeLabels.length - 1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(formatTime(new Date()));

  const slopesWithTime = useMemo(
    () => getSlopesAtTime(slopes, timeIndex),
    [slopes, timeIndex]
  );

  const selectedSlope = useMemo(
    () => getSlopeById(slopes, selectedSlopeId),
    [slopes, selectedSlopeId]
  );

  const handleTimeIndexChange = useCallback(
    (update: number | ((prev: number) => number)) => {
      if (typeof update === "function") {
        setTimeIndex((prev) => update(prev));
      } else {
        setTimeIndex(update);
      }
    },
    []
  );

  const refresh = useCallback(() => {
    setSlopes((prev) => simulateCongestionUpdate(prev));
    setLastUpdate(formatTime(new Date()));
  }, []);

  useEffect(() => {
    const interval = setInterval(refresh, 12000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleSlopeClick = useCallback((id: string | null) => {
    setSelectedSlopeId(id);
    setIsPlaying(false);
  }, []);

  return (
    <div className="w-screen h-screen relative overflow-hidden">
      <Scene slopes={slopesWithTime} selectedSlopeId={selectedSlopeId} onSlopeClick={handleSlopeClick} />

      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <h1
          className="text-2xl font-bold text-white/90 tracking-[0.2em] drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
          style={{ fontFamily: "'Orbitron', sans-serif" }}
        >
          SKI RESORT LIVE
        </h1>
        <p className="text-center text-xs text-white/40 mt-1 tracking-wider">
          实时雪道拥挤度监控系统
        </p>
      </div>

      <InfoPanel
        slopes={slopes}
        selectedSlopeId={selectedSlopeId}
        lastUpdate={lastUpdate}
        timeIndex={timeIndex}
        onRefresh={refresh}
        onSlopeSelect={handleSlopeClick}
      />

      <TimelineSlider
        times={timeLabels}
        currentIndex={timeIndex}
        isPlaying={isPlaying}
        onIndexChange={handleTimeIndexChange}
        onPlayToggle={() => setIsPlaying((p) => !p)}
      />

      {selectedSlope && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
            onClick={() => setSelectedSlopeId(null)}
          />
          <SlopeDetailPopup
            slope={selectedSlope}
            currentTimeIndex={timeIndex}
            onClose={() => setSelectedSlopeId(null)}
          />
        </>
      )}

      <div className="fixed bottom-24 right-4 z-20 text-[10px] text-white/25 pointer-events-none">
        拖拽旋转 · 滚轮缩放 · 右键平移 · 点击雪道查看详情
      </div>
    </div>
  );
}
