import type { DailyTide, ChartMode } from "@/types/tide";
import { parseTideTime, formatTideTime, getStartOfDay } from "./timeConverter";

export interface ChartPoint {
  timeLabel: string;
  timeValue: number;
  height: number;
  current: number;
  isEvent?: "high" | "low" | null;
  eventHeight?: number;
  eventTime?: string;
  isNextDay?: boolean;
}

export function convertToChartData(
  dailyTide: DailyTide,
): ChartPoint[] {
  const dayStart = getStartOfDay(dailyTide.date);

  return dailyTide.curve.map((point) => {
    const t = parseTideTime(point.time);
    const hoursSinceMidnight = t.diff(dayStart, "hours").hours;

    const event = dailyTide.events.find((e) => {
      const eventTime = parseTideTime(e.time);
      const diffMinutes = Math.abs(eventTime.diff(t, "minutes").minutes);
      return diffMinutes < 6;
    });

    return {
      timeLabel: formatTideTime(t, "HH:mm"),
      timeValue: Math.max(0, Math.min(24, hoursSinceMidnight)),
      height: point.height,
      current: point.currentSpeed,
      isEvent: event ? event.type : null,
      eventHeight: event?.height,
      eventTime: event ? formatTideTime(parseTideTime(event.time), "HH:mm") : undefined,
      isNextDay: event?.isNextDay,
    };
  });
}

export const X_AXIS_CONFIG = {
  type: "number" as const,
  domain: [0, 24] as [number, number],
  ticks: [0, 3, 6, 9, 12, 15, 18, 21, 24],
  tickFormatter: (val: number) => `${val.toString().padStart(2, "0")}:00`,
  allowDataOverflow: false,
};

export function getYAxisConfig(points: ChartPoint[], mode: ChartMode) {
  const values = points.map((p) => (mode === "height" ? p.height : p.current));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const padding = Math.max(range * 0.15, 10);

  return {
    domain: [min - padding, max + padding] as [number, number],
    type: "number" as const,
  };
}
