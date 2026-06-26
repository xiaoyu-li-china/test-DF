import type { SlopeData } from "./slopeSchema";

export function getCongestionAtTime(
  slope: SlopeData,
  timeIndex: number
): number {
  return slope.history[timeIndex]?.congestion ?? slope.congestion;
}

export function getSlopesAtTime(
  slopes: SlopeData[],
  timeIndex: number
): (SlopeData & { congestion: number })[] {
  return slopes.map((slope) => ({
    ...slope,
    congestion: getCongestionAtTime(slope, timeIndex),
  }));
}

export function sortSlopesByCongestion(
  slopes: SlopeData[],
  timeIndex: number,
  ascending: boolean = false
): SlopeData[] {
  return [...slopes].sort((a, b) => {
    const aCongestion = getCongestionAtTime(a, timeIndex);
    const bCongestion = getCongestionAtTime(b, timeIndex);
    return ascending ? aCongestion - bCongestion : bCongestion - aCongestion;
  });
}

export function getSlopeById(
  slopes: SlopeData[],
  id: string | null
): SlopeData | null {
  if (!id) return null;
  return slopes.find((s) => s.id === id) ?? null;
}

export function getAvgCongestion(
  slopes: SlopeData[],
  timeIndex: number
): number {
  if (slopes.length === 0) return 0;
  const total = slopes.reduce(
    (sum, s) => sum + getCongestionAtTime(s, timeIndex),
    0
  );
  return Math.round(total / slopes.length);
}

export function getPeakCongestionTime(slope: SlopeData): {
  time: string;
  congestion: number;
} {
  if (slope.history.length === 0) {
    return { time: "", congestion: slope.congestion };
  }
  let peak = slope.history[0];
  for (const entry of slope.history) {
    if (entry.congestion > peak.congestion) {
      peak = entry;
    }
  }
  return { time: peak.time, congestion: peak.congestion };
}

export function getCongestionTrend(
  slope: SlopeData,
  timeIndex: number
): "rising" | "falling" | "stable" {
  if (timeIndex <= 0 || timeIndex >= slope.history.length) {
    return "stable";
  }
  const current = getCongestionAtTime(slope, timeIndex);
  const previous = getCongestionAtTime(slope, timeIndex - 1);
  const diff = current - previous;
  if (diff > 5) return "rising";
  if (diff < -5) return "falling";
  return "stable";
}

export function simulateCongestionUpdate(
  slopes: SlopeData[]
): SlopeData[] {
  return slopes.map((slope) => {
    const newHistory = slope.history.map((h) => ({
      ...h,
      congestion: Math.max(
        0,
        Math.min(100, h.congestion + Math.floor(Math.random() * 15) - 7)
      ),
    }));
    return { ...slope, history: newHistory };
  });
}

export function getTimeLabels(slopes: SlopeData[]): string[] {
  if (slopes.length === 0 || slopes[0].history.length === 0) {
    return [];
  }
  return slopes[0].history.map((h) => h.time);
}

export function getSlopesByDifficulty(
  slopes: SlopeData[],
  difficulty: "beginner" | "intermediate" | "advanced"
): SlopeData[] {
  return slopes.filter((s) => s.difficulty === difficulty);
}

export function getDifficultyStats(
  slopes: SlopeData[],
  timeIndex: number
): Record<
  "beginner" | "intermediate" | "advanced",
  { count: number; avgCongestion: number }
> {
  const difficulties = ["beginner", "intermediate", "advanced"] as const;
  const stats = {} as Record<
    string,
    { count: number; avgCongestion: number }
  >;

  for (const diff of difficulties) {
    const filtered = getSlopesByDifficulty(slopes, diff);
    stats[diff] = {
      count: filtered.length,
      avgCongestion: getAvgCongestion(filtered, timeIndex),
    };
  }

  return stats;
}
