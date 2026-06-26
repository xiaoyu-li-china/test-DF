import { DateTime } from "luxon";
import type { TidalConstant, TidePoint, TideEvent } from "@/types/tide";
import { getStartOfDay } from "./timeConverter";

const HOURS_PER_DAY = 24;
const MINUTES_PER_SAMPLE = 10;
const SAMPLES_PER_DAY = (HOURS_PER_DAY * 60) / MINUTES_PER_SAMPLE;

function julianDay(dt: DateTime): number {
  const Y = dt.year;
  const M = dt.month;
  const D = dt.day + dt.hour / 24 + dt.minute / 1440;
  let y = Y;
  let m = M;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + D + B - 1524.5;
}

function computeAstronomicArguments(dt: DateTime): Record<string, number> {
  const JD = julianDay(dt);
  const T = (JD - 2451545.0) / 36525;

  const s = 218.316 + 481267.8813 * T + 0.00132 * T * T;
  const h = 280.466 + 36000.7698 * T + 0.000303 * T * T;
  const p = 83.353 + 4069.0137 * T - 0.01032 * T * T;
  const N = 125.045 - 1934.1363 * T + 0.00207 * T * T;
  const pp = 282.938 + 1.7195 * T + 0.000457 * T * T;

  return {
    M: s - p,
    S: h - pp,
    N: -N,
    O: N,
    P: pp,
    K1: h + N - 90,
    O1: s - h + N - 90,
    Q1: s - h + N - 2 * (s - p) - 90,
    M2: 2 * (s - h),
    S2: 2 * (h - pp),
    K2: 2 * (h + N),
    N2: 2 * (s - h) - (s - p),
    P1: h - pp,
  };
}

function computeTideHeight(dt: DateTime, constants: TidalConstant[]): number {
  const args = computeAstronomicArguments(dt);
  const tHours = dt.hour + dt.minute / 60 + dt.second / 3600;

  let height = 0;
  for (const c of constants) {
    const speed = c.speed;
    let phase = c.phase;

    if (c.name === "M2") {
      phase += args.M2;
    } else if (c.name === "S2") {
      phase += args.S2;
    } else if (c.name === "N2") {
      phase += args.N2;
    } else if (c.name === "K2") {
      phase += args.K2;
    } else if (c.name === "K1") {
      phase += args.K1;
    } else if (c.name === "O1") {
      phase += args.O1;
    } else if (c.name === "P1") {
      phase += args.P1;
    } else if (c.name === "Q1") {
      phase += args.Q1;
    }

    const arg = (speed * tHours + phase) * (Math.PI / 180);
    height += c.amplitude * Math.cos(arg);
  }

  return Math.round(height * 10) / 10;
}

export function generateTideCurve(
  dateStr: string,
  constants: TidalConstant[],
  extraHoursStart: number = 0,
  extraHoursEnd: number = 0
): TidePoint[] {
  const dayStart = getStartOfDay(dateStr);
  const startTime = dayStart.minus({ hours: extraHoursStart });
  const endTime = dayStart.plus({ days: 1 }).plus({ hours: extraHoursEnd });
  const points: TidePoint[] = [];

  let current = startTime;
  while (current <= endTime) {
    const height = computeTideHeight(current, constants);
    points.push({
      time: current.toISO() || "",
      height,
      currentSpeed: 0,
    });
    current = current.plus({ minutes: MINUTES_PER_SAMPLE });
  }

  return points;
}

export function detectTideEvents(points: TidePoint[]): TideEvent[] {
  const events: TideEvent[] = [];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1].height;
    const curr = points[i].height;
    const next = points[i + 1].height;

    if (curr > prev && curr > next) {
      events.push({
        type: "high",
        time: points[i].time,
        height: curr,
      });
    } else if (curr < prev && curr < next) {
      events.push({
        type: "low",
        time: points[i].time,
        height: curr,
      });
    }
  }

  return events;
}

export function computeCurrentSpeed(
  points: TidePoint[],
  coefficient: number
): TidePoint[] {
  const result = points.map((point, i) => {
    let dh_dt = 0;
    if (i === 0) {
      dh_dt = (points[i + 1].height - point.height) / (MINUTES_PER_SAMPLE / 60);
    } else if (i === points.length - 1) {
      dh_dt = (point.height - points[i - 1].height) / (MINUTES_PER_SAMPLE / 60);
    } else {
      dh_dt = (points[i + 1].height - points[i - 1].height) / (2 * MINUTES_PER_SAMPLE / 60);
    }
    const speed = Math.abs(dh_dt) * coefficient;
    return {
      ...point,
      currentSpeed: Math.round(speed * 100) / 100,
    };
  });

  return result;
}

export const SAMPLES_PER_DAY_CONST = SAMPLES_PER_DAY;
