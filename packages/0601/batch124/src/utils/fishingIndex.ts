import type { DailyTide, FishingIndex, TideEvent } from "@/types/tide";
import { parseTideTime, getStartOfDay } from "./timeConverter";

function getTideRange(events: TideEvent[]): number {
  if (events.length < 2) return 0;
  const heights = events.map((e) => e.height);
  return Math.max(...heights) - Math.min(...heights);
}

function isSpringTide(moonIllumination: number): boolean {
  return moonIllumination > 85 || moonIllumination < 15;
}

function isNeapTide(moonIllumination: number): boolean {
  return moonIllumination > 35 && moonIllumination < 65;
}

function countRisingTideWindows(events: TideEvent[], dateStr: string): number {
  const dayStart = getStartOfDay(dateStr);
  const dayEnd = dayStart.plus({ days: 1 });
  let risingWindows = 0;

  for (let i = 0; i < events.length - 1; i++) {
    if (events[i].type === "low" && events[i + 1].type === "high") {
      const lowTime = parseTideTime(events[i].time);
      const highTime = parseTideTime(events[i + 1].time);

      const windowStart = lowTime.minus({ hours: 1 });
      const windowEnd = highTime;

      if (
        (windowStart >= dayStart && windowStart < dayEnd) ||
        (windowEnd > dayStart && windowEnd <= dayEnd) ||
        (windowStart < dayStart && windowEnd > dayEnd)
      ) {
        risingWindows++;
      }
    }
  }

  return risingWindows;
}

export function calculateFishingIndex(
  dailyTide: DailyTide,
  moonIllumination: number
): FishingIndex {
  let score = 3;
  const reasons: string[] = [];

  const tideRange = getTideRange(dailyTide.events);

  if (tideRange > 400) {
    score += 1;
    reasons.push("大潮期，潮差大");
  } else if (tideRange < 200) {
    score -= 1;
    reasons.push("小潮期，潮差小");
  }

  if (isSpringTide(moonIllumination)) {
    score += 0.5;
    reasons.push("新月/满月，鱼口活跃");
  } else if (isNeapTide(moonIllumination)) {
    score -= 0.5;
    reasons.push("上下弦月，鱼口一般");
  }

  const risingWindows = countRisingTideWindows(dailyTide.events, dailyTide.date);
  if (risingWindows >= 2) {
    score += 0.5;
    reasons.push("多个涨潮窗口");
  }

  if (moonIllumination > 70) {
    score += 0.3;
    reasons.push("夜晚月光足");
  }

  const finalScore = Math.max(1, Math.min(5, Math.round(score))) as 1 | 2 | 3 | 4 | 5;

  const reasonTexts: Record<number, string> = {
    1: "今日不适宜钓鱼，建议改日出行",
    2: "钓鱼条件一般，建议选择涨潮时段",
    3: "钓鱼条件尚可，选择好时段有收获",
    4: "良好钓鱼日，潮况和月相都不错",
    5: "绝佳钓鱼日！大潮配合好时段，鱼口旺盛",
  };

  const extraReason = reasons.length > 0 ? `（${reasons.join("，")}）` : "";

  return {
    score: finalScore,
    reason: reasonTexts[finalScore] + extraReason,
  };
}
