import { useEffect } from "react";
import { Anchor, Loader2 } from "lucide-react";
import { useTideStore } from "@/store/useTideStore";
import { AreaSelector } from "@/components/AreaSelector";
import { DateTabs } from "@/components/DateTabs";
import { FishingIndexCard } from "@/components/FishingIndexCard";
import { TideSchedule } from "@/components/TideSchedule";
import { TideChart } from "@/components/TideChart";

export default function Home() {
  const { tideData, selectedDateIndex, selectedAreaId, loading, error, loadTideData } =
    useTideStore();

  useEffect(() => {
    loadTideData(selectedAreaId);
  }, [loadTideData, selectedAreaId]);

  const currentDayTide = tideData?.forecast[selectedDateIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-50 via-tide-50 to-sand-100">
      <div className="mx-auto max-w-md px-4 py-6">
        <header className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <Anchor className="w-6 h-6 text-ocean-600" />
            <h1 className="font-serif text-2xl font-bold text-ocean-800">
              潮汐预报
            </h1>
          </div>
          <p className="text-sm text-ocean-500">
            浙江近海 · 钓鱼助手
          </p>
        </header>

        <div className="space-y-5">
          <AreaSelector />

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 bg-white/60 rounded-xl">
              <Loader2 className="w-8 h-8 text-ocean-500 animate-spin mb-3" />
              <p className="text-ocean-500 text-sm">正在加载潮汐数据...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-center">
              {error}
            </div>
          )}

          {!loading && !error && tideData && currentDayTide && (
            <>
              <DateTabs />

              <FishingIndexCard
                fishingIndex={currentDayTide.fishingIndex}
                moonPhase={currentDayTide.moonPhase}
              />

              <TideChart dailyTide={currentDayTide} />

              <TideSchedule events={currentDayTide.events} />

              <div className="pt-2 pb-4 text-center text-xs text-ocean-400">
                数据更新时间: {tideData.requestTime.slice(11, 19)} · 仅供参考
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
