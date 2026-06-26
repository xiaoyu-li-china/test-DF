import { DateTime } from "luxon";
import type { TidePoint, TideEvent, DailyTide } from "@/types/tide";
import { parseTideTime, getStartOfDay } from "./timeConverter";

function interpolatePoint(
  p1: TidePoint,
  p2: TidePoint,
  targetTime: DateTime
): TidePoint {
  const t1 = parseTideTime(p1.time);
  const t2 = parseTideTime(p2.time);
  const ratio = targetTime.diff(t1, "minutes").minutes / t2.diff(t1, "minutes").minutes;

  const height = p1.height + (p2.height - p1.height) * ratio;
  const currentSpeed = p1.currentSpeed + (p2.currentSpeed - p1.currentSpeed) * ratio;

  return {
    time: targetTime.toISO() || "",
    height: Math.round(height * 10) / 10,
    currentSpeed: Math.round(currentSpeed * 100) / 100,
  };
}

export function resolveCrossDayEvents(
  events: TideEvent[],
  dayStart: DateTime
): { dayEvents: TideEvent[]; overflowEvents: TideEvent[] } {
  const dayEnd = dayStart.plus({ days: 1 });
  const nextDayCutoff = dayEnd.plus({ hours: 3 });

  const dayEvents: TideEvent[] = [];
  const overflowEvents: TideEvent[] = [];

  for (const event of events) {
    const eventTime = parseTideTime(event.time);

    if (eventTime < dayStart) continue;

    if (eventTime >= dayStart && eventTime < dayEnd) {
      dayEvents.push({ ...event, isNextDay: false });
    } else if (eventTime >= dayEnd && eventTime < nextDayCutoff) {
      dayEvents.push({ ...event, isNextDay: true });
      overflowEvents.push({ ...event, isNextDay: false });
    } else {
      overflowEvents.push(event);
    }
  }

  dayEvents.sort((a, b) =>
    parseTideTime(a.time).toMillis() - parseTideTime(b.time).toMillis()
  );

  return { dayEvents, overflowEvents };
}

export function ensureFullDayCurve(
  rawCurve: TidePoint[],
  dayStart: DateTime
): TidePoint[] {
  const dayEnd = dayStart.plus({ days: 1 });
  const points: TidePoint[] = [];

  const firstPointTime = parseTideTime(rawCurve[0].time);
  if (firstPointTime > dayStart) {
    const prevPoint = rawCurve.find((p) => parseTideTime(p.time) < dayStart);
    const nextPoint = rawCurve.find((p) => parseTideTime(p.time) >= dayStart);
    if (prevPoint && nextPoint) {
      points.push(interpolatePoint(prevPoint, nextPoint, dayStart));
    }
  }

  for (const point of rawCurve) {
    const t = parseTideTime(point.time);
    if (t >= dayStart && t <= dayEnd) {
      points.push(point);
    }
  }

  const lastPointTime = parseTideTime(points[points.length - 1].time);
  if (lastPointTime < dayEnd) {
    const nextPoint = rawCurve.find((p) => parseTideTime(p.time) >= dayEnd);
    if (nextPoint) {
      points.push(interpolatePoint(points[points.length - 1], nextPoint, dayEnd));
    }
  }

  return points;
}

export function processDayTide(
  extendedCurve: TidePoint[],
  allEvents: TideEvent[],
  dateStr: string
): DailyTide {
  const dayStart = getStartOfDay(dateStr);
  const fullCurve = ensureFullDayCurve(extendedCurve, dayStart);
  const { dayEvents } = resolveCrossDayEvents(allEvents, dayStart);

  return {
    date: dateStr,
    events: dayEvents,
    curve: fullCurve,
    moonPhase: { phase: 0, name: "", illumination: 0 },
    fishingIndex: { score: 3, reason: "" },
  };
}

export { interpolatePoint };
